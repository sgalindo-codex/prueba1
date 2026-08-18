/**
 * Importación de catálogo desde CSV (lo que sale de guardar un Excel como CSV).
 *
 * Las columnas se detectan por su nombre, así que el orden da igual. Se aceptan
 * varias formas de nombrarlas para no tener que retocar el archivo:
 *
 *   producto | nombre            → nombre del producto        (obligatorio)
 *   categoria                    → categoría, se crea si no existe
 *   unidad                       → ud, pack, kg, g, L, ml
 *   stock | cantidad | tengo     → cuánto hay ahora
 *   minimo | stock minimo        → umbral de reposición
 *   supermercado | super | tienda→ supermercado, se crea si no existe
 *   precio                       → precio en ese supermercado
 *
 * Un producto puede repetirse en varias filas, una por supermercado: se funden
 * en un único producto con varios precios.
 */

import * as store from './store.js';
import { normalizar } from './ui.js';

const ALIAS = {
  nombre: ['producto', 'nombre', 'articulo', 'artículo', 'item', 'descripcion', 'descripción'],
  categoria: ['categoria', 'categoría', 'tipo', 'seccion', 'sección', 'familia'],
  unidad: ['unidad', 'ud', 'medida', 'formato'],
  stock: ['stock', 'cantidad', 'tengo', 'existencias', 'actual'],
  minimo: ['minimo', 'mínimo', 'stock minimo', 'stock mínimo', 'min', 'umbral'],
  supermercado: ['supermercado', 'super', 'súper', 'tienda', 'establecimiento', 'mercado'],
  precio: ['precio', 'coste', 'importe', 'pvp', 'euros', '€'],
};

const PALETA = ['#00A65A', '#0050AA', '#004E9F', '#D52B1E', '#E30613', '#FF9F0A', '#8E44AD', '#16A085'];

/** Divide un CSV respetando comillas dobles y saltos de línea dentro de campos. */
function parsearCSV(texto, separador) {
  const filas = [];
  let fila = [];
  let campo = '';
  let entreComillas = false;

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
      filas.push(fila);
      fila = [];
      campo = '';
    } else {
      campo += ch;
    }
  }

  if (campo !== '' || fila.length) {
    fila.push(campo);
    filas.push(fila);
  }

  return filas.filter((f) => f.some((c) => c.trim() !== ''));
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

/** Mapea índice de columna → campo lógico. */
function mapearCabecera(cabecera) {
  const mapa = {};
  cabecera.forEach((celda, i) => {
    const n = normalizar(celda).trim();
    for (const [campo, alias] of Object.entries(ALIAS)) {
      if (alias.some((a) => n === normalizar(a))) {
        if (mapa[campo] == null) mapa[campo] = i;
      }
    }
  });
  return mapa;
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
  const filas = parsearCSV(texto, separador);
  if (filas.length < 2) {
    throw new Error('El archivo no tiene filas de datos.');
  }

  const mapa = mapearCabecera(filas[0]);
  if (mapa.nombre == null) {
    throw new Error(
      'No encuentro la columna del producto. Debe llamarse "Producto" o "Nombre".'
    );
  }

  const celda = (fila, campo) => (mapa[campo] == null ? '' : (fila[mapa[campo]] ?? '').trim());

  const productos = new Map(); // clave normalizada → producto
  const supers = new Set();
  const categorias = new Set();
  let filasIgnoradas = 0;

  for (const fila of filas.slice(1)) {
    const nombre = celda(fila, 'nombre');
    if (!nombre) {
      filasIgnoradas++;
      continue;
    }

    const clave = normalizar(nombre);
    if (!productos.has(clave)) {
      productos.set(clave, {
        nombre,
        categoria: celda(fila, 'categoria') || null,
        unidad: celda(fila, 'unidad') || 'ud',
        stock: parsearNumero(celda(fila, 'stock'), 0),
        stockMinimo: parsearNumero(celda(fila, 'minimo'), 1),
        precios: {},
      });
    }

    const prod = productos.get(clave);
    // Las filas siguientes del mismo producto sólo aportan precios, salvo que
    // la primera viniera sin categoría.
    if (!prod.categoria && celda(fila, 'categoria')) prod.categoria = celda(fila, 'categoria');
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
  };
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
        stock: fila.stock,
        stockMinimo: fila.stockMinimo,
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
  const filas = [['Producto', 'Categoria', 'Unidad', 'Stock', 'Minimo', 'Supermercado', 'Precio']];

  for (const p of store.productos()) {
    const cat = store.categoria(p.categoriaId)?.nombre || '';
    const precios = store.preciosVigentes(p);
    if (precios.length === 0) {
      filas.push([p.nombre, cat, p.unidad, p.stock, p.stockMinimo, '', '']);
      continue;
    }
    for (const { supermercadoId, precio } of precios) {
      filas.push([
        p.nombre,
        cat,
        p.unidad,
        p.stock,
        p.stockMinimo,
        store.supermercado(supermercadoId)?.nombre || '',
        String(precio).replace('.', ','),
      ]);
    }
  }

  return filas
    .map((f) => f.map((c) => (/[;"\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(';'))
    .join('\n');
}
