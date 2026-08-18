/** Ajustes: resumen de la casa, historial de compras, importación y copias de seguridad. */

import * as store from '../store.js';
import { analizarCSV, aplicarImportacion, exportarCSV } from '../importarCSV.js';
import { esc, euros, cantidad, fecha, hoja, confirmar, toast, vacio } from '../ui.js';

/** Descarga un texto como archivo. En iOS abre la hoja de compartir. */
function descargar(nombre, contenido, tipo) {
  const blob = new Blob([contenido], { type: `${tipo};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const marcaTiempo = () => new Date().toISOString().slice(0, 10);

export default {
  id: 'ajustes',
  titulo: 'Ajustes',
  icono: '⚙️',

  montar(root) {
    root.innerHTML = '<div id="aj-raiz"></div>';
    const $raiz = root.querySelector('#aj-raiz');

    // ── Importación ─────────────────────────────────────────────────────────
    function previsualizar(texto) {
      let analisis;
      try {
        analisis = analizarCSV(texto);
      } catch (err) {
        toast(err.message, { tipo: 'error', duracion: 5000 });
        return;
      }

      if (analisis.productos.length === 0) {
        toast('No he encontrado ningún producto en el archivo', { tipo: 'error' });
        return;
      }

      const nuevosSupers = analisis.supermercados.filter(
        (n) => !store.supermercados().some((s) => s.nombre.toLowerCase() === n.toLowerCase())
      );

      hoja({
        titulo: 'Revisar importación',
        render: () => `
          <div class="resumen-final">
            <div class="resumen-final__fila"><span>Productos en el archivo</span><strong>${
              analisis.productos.length
            }</strong></div>
            <div class="resumen-final__fila"><span>Supermercados</span><strong>${
              analisis.supermercados.length
            }${nuevosSupers.length ? ` (${nuevosSupers.length} nuevos)` : ''}</strong></div>
            <div class="resumen-final__fila"><span>Categorías</span><strong>${
              analisis.categorias.length
            }</strong></div>
            ${
              analisis.filasIgnoradas
                ? `<div class="resumen-final__fila"><span>Filas sin nombre (se ignoran)</span><strong>${analisis.filasIgnoradas}</strong></div>`
                : ''
            }
            <div class="resumen-final__fila"><span>Cabecera detectada</span><strong>fila ${
              analisis.filaCabecera
            }</strong></div>
          </div>

          ${
            analisis.stockAsumido
              ? `<p class="campo__ayuda">
                   El archivo no trae columna de stock. Los productos nuevos entran con
                   2 unidades y mínimo 1; los que ya tengas conservan la cuenta actual.
                 </p>`
              : ''
          }

          <div class="bloque">
            <h3 class="bloque__titulo">Primeros productos</h3>
            <ul class="preview">
              ${analisis.productos
                .slice(0, 8)
                .map(
                  (p) => `<li class="preview__fila">
                    <span>${esc(p.nombre)}</span>
                    <span class="preview__meta">${esc(p.categoria || 'sin categoría')} · ${
                    Object.keys(p.precios).length
                  } precios</span>
                  </li>`
                )
                .join('')}
              ${
                analisis.productos.length > 8
                  ? `<li class="preview__fila preview__fila--resto">y ${
                      analisis.productos.length - 8
                    } más…</li>`
                  : ''
              }
            </ul>
          </div>

          <div class="hoja__acciones hoja__acciones--pila">
            <button class="btn btn--primario btn--bloque" data-accion="fusionar">
              Añadir a lo que ya tengo
            </button>
            <button class="btn btn--peligro-suave btn--bloque" data-accion="reemplazar">
              Reemplazar el catálogo entero
            </button>
          </div>
          <p class="campo__ayuda campo__ayuda--centro">
            "Añadir" actualiza los productos que ya existan por nombre y crea los que falten.
          </p>`,

        onMount: (rootHoja, cerrar) => {
          const aplicar = async (modo) => {
            if (modo === 'reemplazar') {
              const ok = await confirmar({
                titulo: 'Reemplazar catálogo',
                mensaje: `Se borran los ${
                  store.productos().length
                } productos actuales, la lista y el historial de compras, y se importan los del archivo.`,
                confirmar: 'Reemplazar',
              });
              if (!ok) return;
            }
            const resumen = aplicarImportacion(analisis, modo);
            cerrar();
            toast(
              `${resumen.creados} creados · ${resumen.actualizados} actualizados · ${resumen.precios} precios`,
              { tipo: 'ok', duracion: 4500 }
            );
            pintar();
          };

          rootHoja.querySelector('[data-accion="fusionar"]').addEventListener('click', () => aplicar('fusionar'));
          rootHoja.querySelector('[data-accion="reemplazar"]').addEventListener('click', () => aplicar('reemplazar'));
        },
      });
    }

    function abrirPegarCSV() {
      hoja({
        titulo: 'Pegar datos',
        render: () => `
          <p class="hoja__texto">
            Copia las celdas desde Excel o Google Sheets y pégalas aquí. La primera fila
            deben ser los títulos de columna.
          </p>
          <textarea id="csv-texto" class="campo__input campo__input--area" rows="9"
                    placeholder="Producto;Categoria;Unidad;Stock;Minimo;Supermercado;Precio"></textarea>
          <div class="hoja__acciones">
            <button class="btn btn--primario btn--bloque" data-accion="analizar">Analizar</button>
          </div>`,
        onMount: (rootHoja, cerrar) => {
          const $texto = rootHoja.querySelector('#csv-texto');
          $texto.focus();
          rootHoja.querySelector('[data-accion="analizar"]').addEventListener('click', () => {
            const texto = $texto.value.trim();
            if (!texto) return toast('Pega primero los datos', { tipo: 'aviso' });
            cerrar();
            setTimeout(() => previsualizar(texto), 300);
          });
        },
      });
    }

    function leerArchivo(input, alLeer) {
      const archivo = input.files?.[0];
      if (!archivo) return;
      const lector = new FileReader();
      lector.onload = () => alLeer(String(lector.result || ''));
      lector.onerror = () => toast('No he podido leer el archivo', { tipo: 'error' });
      lector.readAsText(archivo, 'utf-8');
      input.value = '';
    }

    // ── Historial de compras ────────────────────────────────────────────────
    function abrirHistorial() {
      const compras = store.historialCompras();
      hoja({
        titulo: 'Historial de compras',
        render: () =>
          compras.length === 0
            ? vacio('🧾', 'Todavía no has cerrado ninguna compra')
            : `<div class="filas">
                ${compras
                  .map((c) => {
                    const unidades = c.items.reduce((n, i) => n + i.cantidad, 0);
                    return `<div class="fila fila--estatica">
                      <span class="fila__cuerpo">
                        <span class="fila__titulo">${fecha(c.fecha)}</span>
                        <span class="fila__sub">${c.items.length} ${
                      c.items.length === 1 ? 'producto' : 'productos'
                    } · ${cantidad(unidades)} uds</span>
                      </span>
                      <strong>${euros(c.total)}</strong>
                    </div>`;
                  })
                  .join('')}
               </div>`,
      });
    }

    // ── Pintado ─────────────────────────────────────────────────────────────
    function pintar() {
      const productos = store.productos();
      const compras = store.historialCompras();
      const gastoTotal = compras.reduce((s, c) => s + (c.total || 0), 0);
      const valorInventario = productos.reduce((s, p) => {
        const mejor = store.mejorPrecio(p);
        return s + (mejor ? mejor.precio * p.stock : 0);
      }, 0);

      $raiz.innerHTML = `
        <section class="panel">
          <h2 class="panel__titulo">CASA J</h2>
          <div class="stats">
            <div class="stat"><span class="stat__num">${productos.length}</span><span class="stat__label">Productos</span></div>
            <div class="stat"><span class="stat__num">${store.supermercados().length}</span><span class="stat__label">Súpers</span></div>
            <div class="stat"><span class="stat__num">${store.categorias().length}</span><span class="stat__label">Categorías</span></div>
            <div class="stat"><span class="stat__num">${euros(valorInventario)}</span><span class="stat__label">Valor en casa</span></div>
          </div>
        </section>

        <section class="panel">
          <h2 class="panel__titulo">Compras</h2>
          <button class="fila" data-accion="historial">
            <span class="fila__cuerpo">
              <span class="fila__titulo">Historial</span>
              <span class="fila__sub">${compras.length} ${
        compras.length === 1 ? 'compra cerrada' : 'compras cerradas'
      } · ${euros(gastoTotal)} en total</span>
            </span>
            <span class="fila__flecha">›</span>
          </button>
        </section>

        <section class="panel">
          <h2 class="panel__titulo">Importar catálogo</h2>
          <p class="panel__texto">
            Desde Excel: <em>Archivo → Guardar como → CSV</em>. También puedes pegar las celdas
            directamente. Columnas reconocidas: Producto, Categoria, Unidad, Stock, Minimo,
            Supermercado, Precio.
          </p>
          <button class="fila" data-accion="csv-archivo">
            <span class="fila__icono">📄</span>
            <span class="fila__cuerpo"><span class="fila__titulo">Subir archivo CSV</span></span>
            <span class="fila__flecha">›</span>
          </button>
          <button class="fila" data-accion="csv-pegar">
            <span class="fila__icono">📋</span>
            <span class="fila__cuerpo"><span class="fila__titulo">Pegar desde Excel</span></span>
            <span class="fila__flecha">›</span>
          </button>
        </section>

        <section class="panel">
          <h2 class="panel__titulo">Copia de seguridad</h2>
          <p class="panel__texto">
            Los datos viven sólo en este dispositivo. Descarga una copia de vez en cuando
            para no perderlos si borras el navegador.
          </p>
          <button class="fila" data-accion="backup-descargar">
            <span class="fila__icono">💾</span>
            <span class="fila__cuerpo">
              <span class="fila__titulo">Descargar copia (JSON)</span>
              <span class="fila__sub">Todo: inventario, lista, precios e historial</span>
            </span>
            <span class="fila__flecha">›</span>
          </button>
          <button class="fila" data-accion="backup-restaurar">
            <span class="fila__icono">♻️</span>
            <span class="fila__cuerpo"><span class="fila__titulo">Restaurar desde copia</span></span>
            <span class="fila__flecha">›</span>
          </button>
          <button class="fila" data-accion="exportar-csv">
            <span class="fila__icono">📊</span>
            <span class="fila__cuerpo">
              <span class="fila__titulo">Exportar catálogo a CSV</span>
              <span class="fila__sub">Para abrirlo en Excel</span>
            </span>
            <span class="fila__flecha">›</span>
          </button>
        </section>

        <section class="panel panel--peligro">
          <h2 class="panel__titulo">Zona peligrosa</h2>
          <button class="fila fila--peligro" data-accion="vaciar">
            <span class="fila__cuerpo">
              <span class="fila__titulo">Borrar todos los productos</span>
              <span class="fila__sub">Mantiene supermercados y categorías</span>
            </span>
          </button>
          <button class="fila fila--peligro" data-accion="reset">
            <span class="fila__cuerpo">
              <span class="fila__titulo">Restaurar datos de ejemplo</span>
              <span class="fila__sub">Deja la app como recién instalada</span>
            </span>
          </button>
        </section>

        <p class="pie">
          CASA J · los datos se guardan en este dispositivo.<br>
          La sincronización entre móviles se puede añadir más adelante sin perder nada.
        </p>

        <input type="file" id="aj-file-csv" accept=".csv,.txt,text/csv,text/plain" hidden>
        <input type="file" id="aj-file-json" accept=".json,application/json" hidden>`;
    }

    // ── Eventos ─────────────────────────────────────────────────────────────
    $raiz.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-accion]');
      if (!btn) return;

      switch (btn.dataset.accion) {
        case 'historial':
          abrirHistorial();
          break;

        case 'csv-archivo':
          $raiz.querySelector('#aj-file-csv').click();
          break;

        case 'csv-pegar':
          abrirPegarCSV();
          break;

        case 'backup-descargar': {
          const json = store.exportar();
          descargar(`casaj-${marcaTiempo()}.json`, json, 'application/json');
          toast('Copia descargada', { tipo: 'ok' });
          break;
        }

        case 'backup-restaurar':
          $raiz.querySelector('#aj-file-json').click();
          break;

        case 'exportar-csv':
          descargar(`casaj-catalogo-${marcaTiempo()}.csv`, exportarCSV(), 'text/csv');
          toast('Catálogo exportado', { tipo: 'ok' });
          break;

        case 'vaciar': {
          const ok = await confirmar({
            titulo: 'Borrar todos los productos',
            mensaje: `Se borran ${
              store.productos().length
            } productos, la lista y el historial de compras. Los supermercados y categorías se mantienen.`,
            confirmar: 'Borrar todo',
          });
          if (ok) {
            store.vaciarTodo();
            toast('Productos borrados');
            pintar();
          }
          break;
        }

        case 'reset': {
          const ok = await confirmar({
            titulo: 'Restaurar datos de ejemplo',
            mensaje: 'Se pierde todo lo que hayas metido y vuelve el catálogo de ejemplo.',
            confirmar: 'Restaurar',
          });
          if (ok) {
            store.resetear();
            toast('Datos de ejemplo restaurados');
            pintar();
          }
          break;
        }
      }
    });

    $raiz.addEventListener('change', async (e) => {
      if (e.target.id === 'aj-file-csv') {
        leerArchivo(e.target, previsualizar);
        return;
      }

      if (e.target.id === 'aj-file-json') {
        const input = e.target;
        const ok = await confirmar({
          titulo: 'Restaurar copia',
          mensaje: 'Se reemplaza todo lo que hay ahora por el contenido de la copia.',
          confirmar: 'Restaurar',
        });
        if (!ok) {
          input.value = '';
          return;
        }
        leerArchivo(input, (texto) => {
          try {
            store.importar(texto);
            toast('Copia restaurada', { tipo: 'ok' });
            pintar();
          } catch (err) {
            toast(err.message, { tipo: 'error', duracion: 5000 });
          }
        });
      }
    });

    pintar();
    const desuscribir = store.subscribe(pintar);
    return () => desuscribir();
  },
};
