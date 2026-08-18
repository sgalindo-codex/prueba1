/**
 * Modo compra: pantalla para usar dentro del súper.
 *
 * Es una foto de la lista en el momento de empezar. Sólo lo que marques como
 * comprado suma al inventario al finalizar; lo que no compres se queda en la
 * lista para la próxima vez.
 */

import * as store from '../store.js';
import { esc, euros, cantidad, vacio, confirmar, toast, vibrar, hoja } from '../ui.js';

const navegar = (id) => document.dispatchEvent(new CustomEvent('casaj:navegar', { detail: { id } }));

export default {
  id: 'compra',
  titulo: 'Comprar',
  icono: '🛒',

  montar(root) {
    root.innerHTML = '<div id="compra-raiz" class="grupos"></div>';
    const $raiz = root.querySelector('#compra-raiz');

    /** No repintamos mientras se está escribiendo en un campo: perdería el foco. */
    const escribiendo = () => {
      const a = document.activeElement;
      return a && $raiz.contains(a) && (a.tagName === 'INPUT' || a.tagName === 'SELECT');
    };

    // ── Pintado ─────────────────────────────────────────────────────────────
    function pintarSinCompra() {
      const pendientes = store.lista().length;
      $raiz.innerHTML = `
        ${vacio(
          '🛒',
          'No hay ninguna compra en marcha',
          pendientes
            ? `Tienes ${pendientes} ${pendientes === 1 ? 'producto' : 'productos'} en la lista.`
            : 'Primero añade productos a la lista.'
        )}
        <div class="hoja__acciones hoja__acciones--centro">
          ${
            pendientes
              ? '<button class="btn btn--primario" data-accion="iniciar">Empezar compra</button>'
              : '<button class="btn btn--ghost" data-accion="ir-lista">Ir a la lista</button>'
          }
        </div>`;
    }

    function filaCompra(item) {
      const p = store.producto(item.productoId);
      if (!p) return '';
      const subtotal = item.precio != null ? item.precio * item.cantidad : null;

      return `
        <article class="compra-item ${item.comprado ? 'is-comprado' : ''}" data-id="${esc(p.id)}">
          <button class="check" data-accion="toggle" aria-label="Marcar como comprado"
                  aria-pressed="${item.comprado}">
            ${item.comprado ? '✓' : ''}
          </button>
          <div class="compra-item__cuerpo">
            <span class="compra-item__nombre">${esc(p.nombre)}</span>
            ${
              p.marca || p.formato
                ? `<span class="compra-item__marca">${esc(
                    [p.marca, p.formato].filter(Boolean).join(' · ')
                  )}</span>`
                : ''
            }
            <div class="compra-item__campos">
              <label class="mini-campo">
                <span>Cantidad</span>
                <input type="number" inputmode="decimal" step="0.5" min="0"
                       data-campo="cantidad" value="${item.cantidad}">
                <span class="mini-campo__sufijo">${esc(p.unidad)}</span>
              </label>
              <label class="mini-campo">
                <span>Precio real</span>
                <input type="number" inputmode="decimal" step="0.01" min="0"
                       data-campo="precio" placeholder="—" value="${item.precio ?? ''}">
                <span class="mini-campo__sufijo">€</span>
              </label>
              <span class="compra-item__subtotal">${subtotal != null ? euros(subtotal) : '—'}</span>
            </div>
          </div>
        </article>`;
    }

    function pintarCompra(compra) {
      const items = compra.items;
      const comprados = items.filter((i) => i.comprado);
      const totalMarcado = comprados.reduce(
        (s, i) => s + (i.precio != null ? i.precio * i.cantidad : 0),
        0
      );
      const pct = items.length ? (comprados.length / items.length) * 100 : 0;

      // Agrupar por súper; dentro, lo pendiente primero.
      const grupos = new Map();
      for (const item of items) {
        const key = item.supermercadoId || '__sin__';
        if (!grupos.has(key)) grupos.set(key, { supermercadoId: item.supermercadoId, items: [] });
        grupos.get(key).items.push(item);
      }

      $raiz.innerHTML = `
        <div class="progreso-card">
          <div class="progreso-card__fila">
            <span class="progreso-card__cuenta">${comprados.length} de ${items.length}</span>
            <span class="progreso-card__total">${euros(totalMarcado)}</span>
          </div>
          <div class="barra barra--gruesa"><span class="barra__relleno" style="width:${pct}%"></span></div>
        </div>

        ${[...grupos.values()]
          .map((g) => {
            const sup = g.supermercadoId ? store.supermercado(g.supermercadoId) : null;
            const pendientes = g.items.filter((i) => !i.comprado);
            const hechos = g.items.filter((i) => i.comprado);
            const totalGrupo = g.items
              .filter((i) => i.comprado && i.precio != null)
              .reduce((s, i) => s + i.precio * i.cantidad, 0);
            return `
              <section class="grupo grupo--super" style="--super:${esc(sup?.color || '#8E8E93')}">
                <h2 class="grupo__titulo">
                  <span><span class="punto" style="--punto:${esc(sup?.color || '#8E8E93')}"></span>
                    ${esc(sup?.nombre || 'Sin supermercado')}</span>
                  <span class="grupo__total">${euros(totalGrupo)}</span>
                </h2>
                <p class="grupo__sub">${pendientes.length} por coger · ${hechos.length} en el carro</p>
                ${[...pendientes, ...hechos].map(filaCompra).join('')}
              </section>`;
          })
          .join('')}

        <div class="hoja__acciones hoja__acciones--pila">
          <button class="btn btn--primario btn--bloque" data-accion="finalizar">
            Finalizar y sumar al inventario
          </button>
          <button class="btn btn--ghost btn--bloque" data-accion="cancelar">Cancelar compra</button>
        </div>
        <p class="campo__ayuda campo__ayuda--centro">
          Sólo lo marcado suma al inventario. Lo que no compres se queda en la lista.
        </p>`;
    }

    function pintar() {
      if (escribiendo()) return;
      const compra = store.compraActiva();
      if (!compra) pintarSinCompra();
      else pintarCompra(compra);
    }

    // ── Cierre de la compra ─────────────────────────────────────────────────
    async function finalizar() {
      const compra = store.compraActiva();
      const marcados = compra.items.filter((i) => i.comprado);

      if (marcados.length === 0) {
        toast('No has marcado nada como comprado', { tipo: 'aviso' });
        return;
      }

      const sinMarcar = compra.items.length - marcados.length;
      const ok = await confirmar({
        titulo: 'Finalizar compra',
        mensaje: `${marcados.length} ${
          marcados.length === 1 ? 'producto se suma' : 'productos se suman'
        } al inventario.${sinMarcar ? ` Los ${sinMarcar} sin marcar se quedan en la lista.` : ''}`,
        confirmar: 'Finalizar',
        peligro: false,
      });
      if (!ok) return;

      const resumen = store.finalizarCompra();
      vibrar(14);

      hoja({
        titulo: 'Compra guardada',
        render: () => `
          <div class="resumen-final">
            <div class="resumen-final__fila">
              <span>Productos añadidos</span><strong>${resumen.comprados}</strong>
            </div>
            <div class="resumen-final__fila">
              <span>Unidades</span><strong>${cantidad(resumen.unidades)}</strong>
            </div>
            <div class="resumen-final__fila resumen-final__fila--destacada">
              <span>Total gastado</span><strong>${euros(resumen.total)}</strong>
            </div>
            ${
              resumen.pendientes
                ? `<div class="resumen-final__fila">
                     <span>Se quedan en la lista</span><strong>${resumen.pendientes}</strong>
                   </div>`
                : ''
            }
          </div>
          <div class="hoja__acciones">
            <button class="btn btn--primario btn--bloque" data-accion="ok">Hecho</button>
          </div>`,
        onMount: (rootHoja, cerrar) => {
          rootHoja.querySelector('[data-accion="ok"]').addEventListener('click', () => {
            cerrar();
            navegar('inventario');
          });
        },
      });
    }

    // ── Eventos ─────────────────────────────────────────────────────────────
    $raiz.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-accion]');
      if (!btn) return;

      switch (btn.dataset.accion) {
        case 'iniciar':
          store.iniciarCompra();
          break;
        case 'ir-lista':
          navegar('lista');
          break;
        case 'toggle': {
          const id = btn.closest('[data-id]')?.dataset.id;
          if (id) {
            store.toggleComprado(id);
            vibrar(8);
          }
          break;
        }
        case 'finalizar':
          finalizar();
          break;
        case 'cancelar': {
          const ok = await confirmar({
            titulo: 'Cancelar compra',
            mensaje: 'Se descartan las marcas de esta compra. La lista se queda tal cual estaba.',
            confirmar: 'Cancelar compra',
          });
          if (ok) {
            store.cancelarCompra();
            toast('Compra cancelada');
          }
          break;
        }
      }
    });

    $raiz.addEventListener('change', (e) => {
      const input = e.target.closest('[data-campo]');
      if (!input) return;
      const id = input.closest('[data-id]')?.dataset.id;
      if (!id) return;

      if (input.dataset.campo === 'cantidad') {
        store.setCantidadCompra(id, Number(input.value) || 0);
      } else if (input.dataset.campo === 'precio') {
        store.setPrecioCompra(id, input.value);
      }
      pintar();
    });

    pintar();
    const desuscribir = store.subscribe(pintar);
    return () => desuscribir();
  },
};
