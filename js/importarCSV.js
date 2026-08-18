/**
 * Importación de catálogo desde CSV (lo que sale de guardar un Excel como CSV).
 *
 * Las columnas se detectan por su nombre, así que el orden da igual. Se aceptan
 * varias formas de nombrarlas para no tener que retocar el archivo:
 *
 *   producto | nombre            → nombre del producto        (obligatorio)
 *   categoria                    → categoría, se crea si no existe
 *   marca                        → marca o fabricante
 *   formato                      → "Brick 1L", "Pack 4 x 125g"…
 *   unidad                       → ud, pack, kg, g, L, ml
 *   stock | cantidad | tengo     → cuánto hay ahora
 *   minimo | stock minimo        → umbral de reposición
 *   supermercado | cadena | tienda → supermercado, se crea si no existe
 *   precio                       → precio en ese supermercado
 *
 * El nombre de la columna no tiene que ser exacto: basta con que empiece por
 * uno de esos términos, así que "Precio aprox (EUR)" o "Cadena recomendada"
 * se reconocen solos.
 *
 * La cabecera tampoco tiene que estar en la primera fila: se busca entre las
 * primeras, saltando títulos y notas.
 *
 * Un producto puede repetirse en varias filas, una por supermercado: se funden
 * en un único producto con varios precios.
 */

import * as store from './store.js';
import { normalizar } from './ui.js';

/**
 * Alias por campo. El orden importa: el primero que encaje gana, y los campos
 * se prueban en el orden de este objeto, así que "formato" va antes que
 * "unidad" para que una columna llamada "Formato" no acabe en la otra.
 */
const ALIAS = {
  nombre: ['producto', 'nombre', 'articulo', 'artículo', 'descripcion', 'descripción', 'item'],
  categoria: ['categoria', 'categoría', 'seccion', 'sección', 'familia', 'momento', 'tipo'],
  marca: ['marca', 'fabricante'],
  formato: ['formato', 'envase', 'presentacion', 'presentación', 'tamaño'],
  unidad: ['unidad', 'unidades', 'medida', 'uds'],
  minimo: ['minimo', 'mínimo', 'stock minimo', 'stock mínimo', 'umbral'],
  stock: ['stock', 'cantidad', 'tengo', 'existencias', 'actual'],
  supermercado: [
    'supermercado',
    'cadena',
    'super',
    'súper',
    'tienda',
    'establecimiento',
    'mercado',
  ],
  precio: ['precio', 'coste', 'importe', 'pvp'],
};

/** Cuántas filas se miran buscando la cabecera antes de rendirse. */
const FILAS_CABECERA = 15;

const PALETA = ['#00A65A', '#0050AA', '#004E9F', '#D52B1E', '#E30613', '#FF9F0A', '#8E44AD', '#16A085'];

/**
 * Divide un CSV respetando comillas dobles y saltos de línea dentro de campos.
 *
 * Devuelve `{ filas, lineas }`: las filas en blanco se descartan, y `lineas`
 * guarda el número de línea original de cada fila superviviente para poder
 * decirle al usuario dónde estaba la cabecera en su archivo.
 */
function parsearCSV(texto, separador) {
  const filas = [];
  const lineas = [];
  let fila = [];
  let campo = '';
  let entreComillas = false;
  let linea = 1;

  const limpio = texto.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');

  for (let i = 0; i < limpio.length; i++) {
    const ch = limpio[i];

    if (entreComillas) {
      if (ch === '"') {
        if (limpio[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          entreComillas = false;
        }
      } else {
        campo += ch;
      }
      continue;
    }

    if (ch === '"') entreComillas = true;
    else if (ch === separador) {
      fila.push(campo);
      campo = '';
    } else if (ch === '\n') {
      fila.push(campo);
      if (fila.some((c) => c.trim() !== '')) {
        filas.push(fila);
        lineas.push(linea);
      }
      fila = [];
      campo = '';
      linea++;
    } else {
      campo += ch;
    }
  }

  if (campo !== '' || fila.length) {
    fila.push(campo);
    if (fila.some((c) => c.trim() !== '')) {
      filas.push(fila);
      lineas.push(linea);
    }
  }

  return { filas, lineas };
}

/** Elige el separador más probable mirando la primera línea. */
function detectarSeparador(texto) {
  const primera = texto.split('\n')[0] || '';
  const cuenta = (ch) => primera.split(ch).length - 1;
  const candidatos = [
    [';', cuenta(';')],
    [',', cuenta(',')],
    ['\t', cuenta('\t')],
  ].sort((a, b) => b[1] - a[1]);
  return candidatos[0][1] > 0 ? candidatos[0][0] : ',';
}

/**
 * Mapea índice de columna → campo lógico.
 *
 * Primero se buscan coincidencias exactas en toda la fila y sólo después las
 * que empiezan por el alias. Así una columna "Stock" se queda con `stock`
 * aunque otra se llame "Stock mínimo".
 */
function mapearCabecera(cabecera) {
  const mapa = {};
  const columnas = cabecera.map((c) => normalizar(c).trim());
  const usadas = new Set();

  const asignar = (campo, i) => {
    if (mapa[campo] != null || usadas.has(i)) return;
    mapa[campo] = i;
    usadas.add(i);
  };

  for (const [campo, alias] of Object.entries(ALIAS)) {
    const exacta = columnas.findIndex(
      (n, i) => !usadas.has(i) && alias.some((a) => n === normalizar(a))
    );
    if (exacta !== -1) asignar(campo, exacta);
  }

  for (const [campo, alias] of Object.entries(ALIAS)) {
    if (mapa[campo] != null) continue;
    const prefijo = columnas.findIndex(
      (n, i) => !usadas.has(i) && alias.some((a) => n.startsWith(normalizar(a)))
    );
    if (prefijo !== -1) asignar(campo, prefijo);
  }

  return mapa;
}

/**
 * Localiza la fila de cabecera: la que reconoce más columnas dentro de las
 * primeras. Los Excel suelen empezar con un título y una nota antes de la
 * tabla de verdad.
 */
function localizarCabecera(filas) {
  let mejor = { indice: -1, mapa: {}, reconocidas: 0 };

  for (let i = 0; i < Math.min(FILAS_CABECERA, filas.length); i++) {
    const mapa = mapearCabecera(filas[i]);
    if (mapa.nombre == null) continue;
    const reconocidas = Object.keys(mapa).length;
    if (reconocidas > mejor.reconocidas) mejor = { indice: i, mapa, reconocidas };
  }

  return mejor;
}

/** "1.234,56 €" y "1234.56" acaban ambos en 1234.56. */
function parsearPrecio(valor) {
  if (valor == null) return null;
  let s = String(valor).replace(/[^\d,.-]/g, '').trim();
  if (!s) return null;

  const tieneComa = s.includes(',');
  const tienePunto = s.includes('.');
  if (tieneComa && tienePunto) {
    // El último separador que aparece es el decimal.
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (tieneComa) {
    s = s.replace(',', '.');
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const parsearNumero = (valor, porDefecto = 0) => {
  const n = parsearPrecio(valor);
  return n == null ? porDefecto : n;
};

/**
 * Analiza el CSV sin tocar el estado. Devuelve lo que se importaría, para
 * poder enseñar una previsualización antes de confirmar.
 */
export function analizarCSV(texto) {
  const separador = detectarSeparador(texto);
  const { filas, lineas } = parsearCSV(texto, separador);
  if (filas.length < 2) {
    throw new Error('El archivo no tiene filas de datos.');
  }

  const { indice, mapa } = localizarCabecera(filas);
  if (indice === -1) {
    throw new Error(
      'No encuentro la columna del producto. Debe llamarse "Producto" o "Nombre".'
    );
  }

  const celda = (fila, campo) => (mapa[campo] == null ? '' : (fila[mapa[campo]] ?? '').trim());

  // Sin columnas de stock asumimos un par de cada cosa: la despensa arranca en
  // verde y el semáforo pasa por ámbar al gastar la primera unidad, en vez de
  // marcar el catálogo entero como agotado.
  const stockPorDefecto = mapa.stock == null ? 2 : 0;
  const minimoPorDefecto = mapa.minimo == null ? 1 : 0;

  const productos = new Map(); // clave normalizada → producto
  const supers = new Set();
  const categorias = new Set();
  let filasIgnoradas = 0;

  for (const fila of filas.slice(indice + 1)) {
    const nombre = celda(fila, 'nombre');
    if (!nombre) {
      filasIgnoradas++;
      continue;
    }

    const clave = normalizar(nombre);
    if (!productos.has(clave)) {
      const formato = celda(fila, 'formato');
      productos.set(clave, {
        nombre,
        categoria: celda(fila, 'categoria') || null,
        marca: celda(fila, 'marca') || null,
        formato: formato || null,
        unidad: celda(fila, 'unidad') || unidadDesde(formato),
        stock: parsearNumero(celda(fila, 'stock'), stockPorDefecto),
        stockMinimo: parsearNumero(celda(fila, 'minimo'), minimoPorDefecto),
        precios: {},
      });
    }

    const prod = productos.get(clave);
    // Las filas siguientes del mismo producto sólo aportan precios; el resto de
    // campos se completan únicamente si la primera fila los traía vacíos.
    if (!prod.categoria) prod.categoria = celda(fila, 'categoria') || null;
    if (!prod.marca) prod.marca = celda(fila, 'marca') || null;
    if (!prod.formato) prod.formato = celda(fila, 'formato') || null;
    if (prod.categoria) categorias.add(prod.categoria);

    const sup = celda(fila, 'supermercado');
    const precio = parsearPrecio(celda(fila, 'precio'));
    if (sup && precio != null) {
      prod.precios[sup] = precio;
      supers.add(sup);
    }
  }

  return {
    productos: [...productos.values()],
    supermercados: [...supers],
    categorias: [...categorias],
    filasIgnoradas,
    separador,
    filaCabecera: lineas[indice],
    columnas: Object.keys(mapa),
    stockAsumido: mapa.stock == null,
  };
}

/** Deduce la unidad del texto del formato: "EUR/kg" → kg, "Pack 4" → pack. */
function unidadDesde(formato) {
  const f = normalizar(formato);
  if (!f) return 'ud';
  if (f.includes('/kg') || f.includes('por kg')) return 'kg';
  if (f.includes('/l') || f.includes('por litro')) return 'L';
  if (f.startsWith('pack') || / x ?\d/.test(f) || /^\d+ x/.test(f)) return 'pack';
  return 'ud';
}

/**
 * Vuelca un análisis en el estado.
 * @param {'fusionar'|'reemplazar'} modo  fusionar respeta lo que ya hay;
 *                                        reemplazar borra el catálogo anterior.
 */
export function aplicarImportacion(analisis, modo = 'fusionar') {
  if (modo === 'reemplazar') store.vaciarTodo();

  // Categorías
  const idPorCategoria = new Map();
  for (const c of store.categorias()) idPorCategoria.set(normalizar(c.nombre), c.id);
  for (const nombre of analisis.categorias) {
    const clave = normalizar(nombre);
    if (!idPorCategoria.has(clave)) {
      idPorCategoria.set(clave, store.addCategoria({ nombre, icono: '🛒' }).id);
    }
  }

  // Supermercados
  const idPorSuper = new Map();
  for (const s of store.supermercados()) idPorSuper.set(normalizar(s.nombre), s.id);
  let iColor = store.supermercados().length;
  for (const nombre of analisis.supermercados) {
    const clave = normalizar(nombre);
    if (!idPorSuper.has(clave)) {
      const color = PALETA[iColor++ % PALETA.length];
      idPorSuper.set(clave, store.addSupermercado({ nombre, color }).id);
    }
  }

  // Productos
  const existentePorNombre = new Map();
  for (const p of store.productos()) existentePorNombre.set(normalizar(p.nombre), p);

  const resumen = { creados: 0, actualizados: 0, precios: 0 };

  for (const fila of analisis.productos) {
    const categoriaId = fila.categoria ? idPorCategoria.get(normalizar(fila.categoria)) ?? null : null;
    const precios = {};
    for (const [nombreSuper, precio] of Object.entries(fila.precios)) {
      const supId = idPorSuper.get(normalizar(nombreSuper));
      if (supId) precios[supId] = precio;
    }

    const existente = existentePorNombre.get(normalizar(fila.nombre));

    if (existente) {
      store.updateProducto(existente.id, {
        categoriaId: categoriaId ?? existente.categoriaId,
        unidad: fila.unidad || existente.unidad,
        marca: fila.marca ?? existente.marca ?? null,
        formato: fila.formato ?? existente.formato ?? null,
        // Sin columna de stock en el archivo, lo que ya tenías contado manda.
        stock: analisis.stockAsumido ? existente.stock : fila.stock,
        stockMinimo: analisis.stockAsumido ? existente.stockMinimo : fila.stockMinimo,
      });
      for (const [supId, precio] of Object.entries(precios)) {
        store.setPrecio(existente.id, supId, precio);
        resumen.precios++;
      }
      resumen.actualizados++;
    } else {
      const creado = store.addProducto({
        nombre: fila.nombre,
        categoriaId,
        unidad: fila.unidad,
        marca: fila.marca,
        formato: fila.formato,
        stock: fila.stock,
        stockMinimo: fila.stockMinimo,
        precios,
      });
      existentePorNombre.set(normalizar(fila.nombre), creado);
      resumen.creados++;
      resumen.precios += Object.keys(precios).length;
    }
  }

  return resumen;
}

/** Exporta el catálogo actual en el mismo formato que se importa. */
export function exportarCSV() {
  const filas = [
    ['Producto', 'Categoria', 'Marca', 'Formato', 'Unidad', 'Stock', 'Minimo', 'Supermercado', 'Precio'],
  ];

  for (const p of store.productos()) {
    const cat = store.categoria(p.categoriaId)?.nombre || '';
    const base = [p.nombre, cat, p.marca || '', p.formato || '', p.unidad, p.stock, p.stockMinimo];
    const precios = store.preciosVigentes(p);

    if (precios.length === 0) {
      filas.push([...base, '', '']);
      continue;
    }
    for (const { supermercadoId, precio } of precios) {
      filas.push([
        ...base,
        store.supermercado(supermercadoId)?.nombre || '',
        String(precio).replace('.', ','),
      ]);
    }
  }

  return filas
    .map((f) => f.map((c) => (/[;"\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(';'))
    .join('\n');
}
