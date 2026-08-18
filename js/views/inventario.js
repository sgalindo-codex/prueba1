/** Inventario: qué hay en casa, semáforo de stock y gasto rápido con − / +. */

import * as store from '../store.js';
import { abrirEditorProducto } from '../productoEditor.js';
import { esc, euros, cantidad, normalizar, vacio, toast, vibrar } from '../ui.js';

const ETIQUETA_ESTADO = { ok: 'OK', bajo: 'Queda poco', agotado: 'Agotado' };

/** Cuánto suma o resta cada pulsación según la unidad del producto. */
const paso = (prod) => (['kg', 'L'].includes(prod.unidad) ? 0.5 : 1);

const filtros = { texto: '', estado: 'todos', categoriaId: null, supermercadoId: null };

export default {
  id: 'inventario',
  titulo: 'Inventario',
  icono: '🏠',

  montar(root) {
    root.innerHTML = `
      <div class="barra-busqueda">
        <input id="inv-buscar" class="buscador" type="search" placeholder="Buscar producto"
               autocomplete="off" value="${esc(filtros.texto)}">
      </div>
      <div id="inv-chips-estado" class="chips"></div>
      <div id="inv-chips-cat" class="chips chips--scroll"></div>
      <div id="inv-resumen" class="resumen"></div>
      <div id="inv-lista" class="lista-productos"></div>
      <button id="inv-nuevo" class="fab" aria-label="Añadir producto">+</button>`;

    const $lista = root.querySelector('#inv-lista');
    const $resumen = root.querySelector('#inv-resumen');
    const $chipsEstado = root.querySelector('#inv-chips-estado');
    const $chipsCat = root.querySelector('#inv-chips-cat');
    const $buscar = root.querySelector('#inv-buscar');

    // ── Filtrado ────────────────────────────────────────────────────────────
    function visibles() {
      const q = normalizar(filtros.texto);
      return store.productos().filter((p) => {
        if (q && !normalizar(p.nombre).includes(q)) return false;
        if (filtros.categoriaId && p.categoriaId !== filtros.categoriaId) return false;
        if (filtros.supermercadoId && store.precioActual(p, filtros.supermercadoId) == null) return false;
        const estado = store.estadoStock(p);
        if (filtros.estado === 'bajo' && estado === 'ok') return false;
        if (filtros.estado === 'agotado' && estado !== 'agotado') return false;
        return true;
      });
    }

    // ── Pintado ─────────────────────────────────────────────────────────────
    function pintarChips() {
      const todos = store.productos();
      const cuenta = { agotado: 0, bajo: 0, ok: 0 };
      for (const p of todos) cuenta[store.estadoStock(p)]++;

      $chipsEstado.innerHTML = [
        { id: 'todos', texto: `Todos ${todos.length}` },
        { id: 'bajo', texto: `Por reponer ${cuenta.bajo + cuenta.agotado}` },
        { id: 'agotado', texto: `Agotados ${cuenta.agotado}` },
      ]
        .map(
          (c) =>
            `<button class="chip ${filtros.estado === c.id ? 'is-activo' : ''}" data-estado="${c.id}">${esc(
              c.texto
            )}</button>`
        )
        .join('');

      $chipsCat.innerHTML =
        `<button class="chip ${!filtros.categoriaId ? 'is-activo' : ''}" data-cat="">Todas</button>` +
        store
          .categorias()
          .map(
            (c) =>
              `<button class="chip ${filtros.categoriaId === c.id ? 'is-activo' : ''}" data-cat="${esc(
                c.id
              )}">${esc(c.icono)} ${esc(c.nombre)}</button>`
          )
          .join('');
    }

    function pintarResumen() {
      const todos = store.productos();
      const cuenta = { agotado: 0, bajo: 0, ok: 0 };
      for (const p of todos) cuenta[store.estadoStock(p)]++;
      const enLista = store.lista().length;

      $resumen.innerHTML = `
        <div class="resumen__tarjeta resumen__tarjeta--ok">
          <span class="resumen__num">${cuenta.ok}</span><span class="resumen__label">En casa</span>
        </div>
        <div class="resumen__tarjeta resumen__tarjeta--bajo">
          <span class="resumen__num">${cuenta.bajo}</span><span class="resumen__label">Queda poco</span>
        </div>
        <div class="resumen__tarjeta resumen__tarjeta--agotado">
          <span class="resumen__num">${cuenta.agotado}</span><span class="resumen__label">Agotados</span>
        </div>
        <div class="resumen__tarjeta">
          <span class="resumen__num">${enLista}</span><span class="resumen__label">En la lista</span>
        </div>`;
    }

    function tarjetaProducto(p) {
      const estado = store.estadoStock(p);
      const mejor = store.mejorPrecio(p);
      const sup = mejor ? store.supermercado(mejor.supermercadoId) : null;
      const ahorro = store.ahorroMaximo(p);
      const enLista = store.itemLista(p.id);
      const pct = p.stockMinimo > 0 ? Math.min(100, (p.stock / (p.stockMinimo * 2)) * 100) : p.stock > 0 ? 100 : 0;

      return `
        <article class="producto producto--${estado}" data-id="${esc(p.id)}">
          <button class="producto__info" data-accion="detalle">
            <div class="producto__cabecera">
              <span class="producto__nombre">${esc(p.nombre)}</span>
              ${enLista ? '<span class="badge badge--lista">En la lista</span>' : ''}
            </div>
            ${
              p.marca || p.formato
                ? `<span class="producto__marca">${esc(
                    [p.marca, p.formato].filter(Boolean).join(' · ')
                  )}</span>`
                : ''
            }
            <div class="producto__meta">
              <span class="producto__stock">${cantidad(p.stock)} ${esc(p.unidad)}</span>
              <span class="producto__sep">·</span>
              <span class="producto__estado">${ETIQUETA_ESTADO[estado]}</span>
              ${
                mejor
                  ? `<span class="producto__sep">·</span>
                     <span class="producto__precio">
                       <span class="punto" style="--punto:${esc(sup?.color || '#8E8E93')}"></span>
                       ${euros(mejor.precio)}
                     </span>`
                  : ''
              }
              ${ahorro > 0 ? `<span class="badge badge--ahorro">−${euros(ahorro)}</span>` : ''}
            </div>
            <div class="barra"><span class="barra__relleno" style="width:${pct}%"></span></div>
          </button>
          <div class="producto__acciones">
            <button class="paso paso--menos" data-accion="menos" aria-label="Gastar uno">−</button>
            <button class="paso paso--mas" data-accion="mas" aria-label="Añadir uno">+</button>
          </div>
        </article>`;
    }

    function pintarLista() {
      const items = visibles();

      if (items.length === 0) {
        $lista.innerHTML =
          store.productos().length === 0
            ? vacio('📦', 'Tu inventario está vacío', 'Añade productos con el botón + o importa tu Excel desde Ajustes.')
            : vacio('🔍', 'Nada coincide con el filtro', 'Prueba a cambiar la búsqueda o la categoría.');
        return;
      }

      // Agrupado por categoría, y dentro por estado (lo más urgente arriba).
      const orden = { agotado: 0, bajo: 1, ok: 2 };
      const grupos = new Map();
      for (const p of items) {
        const key = p.categoriaId || '__sin__';
        if (!grupos.has(key)) grupos.set(key, []);
        grupos.get(key).push(p);
      }

      // Se respeta el orden en que están definidas las categorías: para
      // momentos del día (desayuno, comida, merienda, cena) el alfabético
      // no significa nada.
      const ordenCategorias = store.categorias().map((c) => c.id);
      $lista.innerHTML = [...grupos.entries()]
        .sort(([a], [b]) => {
          const ia = ordenCategorias.indexOf(a);
          const ib = ordenCategorias.indexOf(b);
          return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
        })
        .map(([catId, prods]) => {
          const cat = store.categoria(catId);
          prods.sort(
            (x, y) =>
              orden[store.estadoStock(x)] - orden[store.estadoStock(y)] ||
              x.nombre.localeCompare(y.nombre)
          );
          return `
            <section class="grupo">
              <h2 class="grupo__titulo">
                <span>${esc(cat?.icono || '📦')} ${esc(cat?.nombre || 'Sin categoría')}</span>
                <span class="grupo__cuenta">${prods.length}</span>
              </h2>
              ${prods.map(tarjetaProducto).join('')}
            </section>`;
        })
        .join('');
    }

    function pintar() {
      pintarChips();
      pintarResumen();
      pintarLista();
    }

    // ── Eventos ─────────────────────────────────────────────────────────────
    let debounce = null;
    $buscar.addEventListener('input', (e) => {
      filtros.texto = e.target.value;
      clearTimeout(debounce);
      debounce = setTimeout(pintarLista, 120);
    });

    $chipsEstado.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-estado]');
      if (!btn) return;
      filtros.estado = btn.dataset.estado;
      pintar();
    });

    $chipsCat.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-cat]');
      if (!btn) return;
      filtros.categoriaId = btn.dataset.cat || null;
      pintar();
    });

    $lista.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-accion]');
      if (!btn) return;
      const id = btn.closest('[data-id]')?.dataset.id;
      const prod = store.producto(id);
      if (!prod) return;

      const accion = btn.dataset.accion;
      if (accion === 'detalle') {
        abrirEditorProducto(prod, { onGuardar: pintar });
        return;
      }

      const delta = accion === 'mas' ? paso(prod) : -paso(prod);
      if (delta < 0 && prod.stock <= 0) {
        toast(`No queda ${prod.nombre}`, { tipo: 'aviso' });
        return;
      }
      store.ajustarStock(prod.id, delta);
      vibrar(6);

      const despues = store.producto(id);
      if (delta < 0 && store.estadoStock(despues) !== 'ok' && store.itemLista(id)) {
        toast(`${despues.nombre} añadido a la lista`, { tipo: 'aviso' });
      }
    });

    root.querySelector('#inv-nuevo').addEventListener('click', () => {
      abrirEditorProducto(null, {
        onGuardar: pintar,
        categoriaPorDefecto: filtros.categoriaId,
      });
    });

    pintar();
    const desuscribir = store.subscribe(pintar);
    return () => desuscribir();
  },
};
