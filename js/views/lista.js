/**
 * Lista de la compra: se va llenando durante la semana, a mano o sola cuando
 * algo baja del mínimo. Va agrupada por supermercado con subtotales.
 */

import * as store from '../store.js';
import { abrirEditorProducto } from '../productoEditor.js';
import { esc, euros, cantidad, normalizar, vacio, hoja, confirmar, toast, vibrar } from '../ui.js';

const navegar = (id) => document.dispatchEvent(new CustomEvent('casaj:navegar', { detail: { id } }));

export default {
  id: 'lista',
  titulo: 'Lista',
  icono: '📝',

  montar(root) {
    root.innerHTML = `
      <div id="lista-cabecera"></div>
      <div id="lista-grupos" class="grupos"></div>
      <button id="lista-add" class="fab" aria-label="Añadir a la lista">+</button>`;

    const $cabecera = root.querySelector('#lista-cabecera');
    const $grupos = root.querySelector('#lista-grupos');

    // ── Pintado ─────────────────────────────────────────────────────────────
    function pintarCabecera() {
      const items = store.lista();
      const total = store.totalEstimadoLista();
      const sinPrecio = items.filter((i) => {
        const p = store.producto(i.productoId);
        return p && (i.supermercadoId ? store.precioActual(p, i.supermercadoId) : store.mejorPrecio(p)) == null;
      }).length;

      if (items.length === 0) {
        $cabecera.innerHTML = '';
        return;
      }

      $cabecera.innerHTML = `
        <div class="total-card">
          <div class="total-card__cifra">
            <span class="total-card__label">Total estimado</span>
            <span class="total-card__valor">${euros(total)}</span>
            ${sinPrecio ? `<span class="total-card__nota">${sinPrecio} sin precio guardado</span>` : ''}
          </div>
          <div class="total-card__acciones">
            <button class="btn btn--ghost btn--sm" data-accion="optimizar">Súper más barato</button>
            <button class="btn btn--ghost btn--sm" data-accion="vaciar">Vaciar</button>
          </div>
        </div>
        <button class="btn btn--primario btn--bloque" data-accion="comprar">
          Empezar compra · ${items.length} ${items.length === 1 ? 'producto' : 'productos'}
        </button>`;
    }

    function filaItem(item) {
      const p = item.producto;
      const sup = item.supermercadoId ? store.supermercado(item.supermercadoId) : null;
      const subtotal = item.precio != null ? item.precio * item.cantidad : null;

      return `
        <article class="item" data-id="${esc(p.id)}">
          <div class="item__principal">
            <div class="item__texto">
              <span class="item__nombre">${esc(p.nombre)}</span>
              ${item.auto ? '<span class="badge badge--auto">automático</span>' : ''}
              <span class="item__meta">
                ${item.precio != null ? `${euros(item.precio)} / ${esc(p.unidad)}` : 'Sin precio'}
                ${subtotal != null ? `<span class="item__subtotal">${euros(subtotal)}</span>` : ''}
              </span>
            </div>
            <div class="cantidad-ctrl">
              <button class="paso" data-accion="menos" aria-label="Quitar uno">−</button>
              <span class="cantidad-ctrl__valor">${cantidad(item.cantidad)}</span>
              <button class="paso" data-accion="mas" aria-label="Añadir uno">+</button>
            </div>
          </div>
          <div class="item__pie">
            <select class="mini-select" data-accion="super" aria-label="Supermercado">
              <option value="">Sin asignar</option>
              ${store
                .supermercados()
                .map((s) => {
                  const precio = store.precioActual(p, s.id);
                  const etiqueta = precio != null ? `${s.nombre} · ${euros(precio)}` : `${s.nombre} · —`;
                  return `<option value="${esc(s.id)}" ${
                    item.supermercadoId === s.id ? 'selected' : ''
                  }>${esc(etiqueta)}</option>`;
                })
                .join('')}
            </select>
            <button class="icon-btn" data-accion="borrar" aria-label="Quitar de la lista">✕</button>
          </div>
        </article>`;
    }

    function pintarGrupos() {
      const grupos = store.listaPorSupermercado();

      if (grupos.length === 0) {
        $grupos.innerHTML = vacio(
          '🛒',
          'La lista está vacía',
          'Añade productos con el botón +. Lo que baje del mínimo entrará aquí solo.'
        );
        return;
      }

      $grupos.innerHTML = grupos
        .map((g) => {
          const sup = g.supermercadoId ? store.supermercado(g.supermercadoId) : null;
          const unidades = g.items.reduce((n, i) => n + i.cantidad, 0);
          return `
            <section class="grupo grupo--super" style="--super:${esc(sup?.color || '#8E8E93')}">
              <h2 class="grupo__titulo">
                <span><span class="punto" style="--punto:${esc(sup?.color || '#8E8E93')}"></span>
                  ${esc(sup?.nombre || 'Sin supermercado')}</span>
                <span class="grupo__total">${euros(g.total)}</span>
              </h2>
              <p class="grupo__sub">${g.items.length} ${
            g.items.length === 1 ? 'producto' : 'productos'
          } · ${cantidad(unidades)} uds</p>
              ${g.items.map(filaItem).join('')}
            </section>`;
        })
        .join('');
    }

    function pintar() {
      pintarCabecera();
      pintarGrupos();
    }

    // ── Añadir productos ────────────────────────────────────────────────────
    function abrirBuscador() {
      hoja({
        titulo: 'Añadir a la lista',
        render: () => `
          <input id="add-buscar" class="buscador" type="search" placeholder="Buscar en el catálogo" autocomplete="off">
          <div id="add-resultados" class="add-resultados"></div>
          <button class="btn btn--ghost btn--bloque" data-accion="nuevo">Crear producto nuevo</button>`,
        onMount: (rootHoja, cerrar) => {
          const $q = rootHoja.querySelector('#add-buscar');
          const $res = rootHoja.querySelector('#add-resultados');

          const pintarResultados = () => {
            const q = normalizar($q.value);
            const encontrados = store
              .productos()
              .filter((p) => !q || normalizar(p.nombre).includes(q))
              .sort((a, b) => a.nombre.localeCompare(b.nombre))
              .slice(0, 60);

            if (encontrados.length === 0) {
              $res.innerHTML = '<p class="campo__ayuda">Ningún producto coincide.</p>';
              return;
            }

            $res.innerHTML = encontrados
              .map((p) => {
                const yaEsta = store.itemLista(p.id);
                const mejor = store.mejorPrecio(p);
                const sup = mejor ? store.supermercado(mejor.supermercadoId) : null;
                return `
                  <button class="add-fila ${yaEsta ? 'is-dentro' : ''}" data-id="${esc(p.id)}">
                    <span class="add-fila__nombre">${esc(p.nombre)}</span>
                    <span class="add-fila__meta">
                      ${
                        mejor
                          ? `<span class="punto" style="--punto:${esc(sup?.color || '#8E8E93')}"></span>${euros(
                              mejor.precio
                            )}`
                          : 'Sin precio'
                      }
                    </span>
                    <span class="add-fila__accion">${yaEsta ? `×${cantidad(yaEsta.cantidad)}` : '+'}</span>
                  </button>`;
              })
              .join('');
          };

          let t = null;
          $q.addEventListener('input', () => {
            clearTimeout(t);
            t = setTimeout(pintarResultados, 100);
          });

          $res.addEventListener('click', (e) => {
            const fila = e.target.closest('[data-id]');
            if (!fila) return;
            store.addALista(fila.dataset.id, 1);
            vibrar(6);
            pintarResultados();
            pintar();
          });

          rootHoja.querySelector('[data-accion="nuevo"]').addEventListener('click', () => {
            cerrar();
            abrirEditorProducto(null, {
              onGuardar: () => {
                const ultimos = store.productos();
                const creado = ultimos[ultimos.length - 1];
                if (creado) store.addALista(creado.id, 1);
                pintar();
              },
            });
          });

          $q.focus();
          pintarResultados();
        },
      });
    }

    // ── Eventos ─────────────────────────────────────────────────────────────
    $cabecera.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-accion]');
      if (!btn) return;

      if (btn.dataset.accion === 'comprar') {
        if (store.lista().length === 0) return;
        if (!store.compraActiva()) store.iniciarCompra();
        navegar('compra');
        return;
      }

      if (btn.dataset.accion === 'optimizar') {
        let cambios = 0;
        for (const item of [...store.lista()]) {
          const p = store.producto(item.productoId);
          const mejor = p && store.mejorPrecio(p);
          if (mejor && item.supermercadoId !== mejor.supermercadoId) {
            store.setSupermercadoLista(item.productoId, mejor.supermercadoId);
            cambios++;
          }
        }
        toast(
          cambios ? `${cambios} ${cambios === 1 ? 'producto movido' : 'productos movidos'} al súper más barato` : 'Ya estaba todo en el más barato',
          { tipo: 'ok' }
        );
        return;
      }

      if (btn.dataset.accion === 'vaciar') {
        const ok = await confirmar({
          titulo: 'Vaciar la lista',
          mensaje: 'Se quitan todos los productos de la lista. El inventario no cambia.',
          confirmar: 'Vaciar',
        });
        if (ok) {
          store.vaciarLista();
          toast('Lista vaciada');
        }
      }
    });

    $grupos.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-accion]');
      if (!btn || btn.tagName === 'SELECT') return;
      const id = btn.closest('[data-id]')?.dataset.id;
      if (!id) return;
      const item = store.itemLista(id);
      if (!item) return;

      switch (btn.dataset.accion) {
        case 'mas':
          store.setCantidadLista(id, item.cantidad + 1);
          vibrar(6);
          break;
        case 'menos':
          store.setCantidadLista(id, item.cantidad - 1);
          vibrar(6);
          break;
        case 'borrar':
          store.removeDeLista(id);
          break;
      }
    });

    $grupos.addEventListener('change', (e) => {
      const sel = e.target.closest('[data-accion="super"]');
      if (!sel) return;
      const id = sel.closest('[data-id]')?.dataset.id;
      if (id) store.setSupermercadoLista(id, sel.value || null);
    });

    root.querySelector('#lista-add').addEventListener('click', abrirBuscador);

    pintar();
    const desuscribir = store.subscribe(pintar);
    return () => desuscribir();
  },
};
