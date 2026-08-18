/**
 * Catálogo: el "modo desarrollador" para mantener los datos a mano —
 * productos, comparador de precios, supermercados y categorías.
 */

import * as store from '../store.js';
import { abrirEditorProducto } from '../productoEditor.js';
import { esc, euros, cantidad, normalizar, vacio, hoja, confirmar, toast } from '../ui.js';

const PALETA = [
  '#00A65A', '#0050AA', '#004E9F', '#D52B1E', '#E30613',
  '#FF9F0A', '#8E44AD', '#16A085', '#E67E22', '#8E8E93',
];

const ICONOS = ['🥬', '🍗', '🥛', '🍝', '🧊', '🥤', '🧽', '🧴', '🍞', '🍫', '🐟', '🧀', '🥫', '🧻', '🐾'];

let pestaña = 'productos';
let busqueda = '';

export default {
  id: 'catalogo',
  titulo: 'Catálogo',
  icono: '📚',

  montar(root) {
    root.innerHTML = `
      <div id="cat-tabs" class="chips"></div>
      <div id="cat-cuerpo"></div>
      <button id="cat-nuevo" class="fab" aria-label="Añadir">+</button>`;

    const $tabs = root.querySelector('#cat-tabs');
    const $cuerpo = root.querySelector('#cat-cuerpo');

    const PESTAÑAS = [
      { id: 'productos', texto: 'Productos' },
      { id: 'precios', texto: 'Precios' },
      { id: 'supers', texto: 'Súpers' },
      { id: 'categorias', texto: 'Categorías' },
    ];

    // ── Productos ───────────────────────────────────────────────────────────
    function pintarProductos() {
      $cuerpo.innerHTML = `
        <div class="barra-busqueda">
          <input id="cat-buscar" class="buscador" type="search" placeholder="Buscar producto"
                 autocomplete="off" value="${esc(busqueda)}">
        </div>
        <div id="cat-lista-prod"></div>`;

      const $buscar = $cuerpo.querySelector('#cat-buscar');
      let t = null;
      $buscar.addEventListener('input', (e) => {
        busqueda = e.target.value;
        clearTimeout(t);
        t = setTimeout(pintarListaProductos, 120);
      });

      pintarListaProductos();
    }

    /** Sólo el listado, para que el buscador no pierda el foco al filtrar. */
    function pintarListaProductos() {
      const destino = $cuerpo.querySelector('#cat-lista-prod');
      if (!destino) return;

      const q = normalizar(busqueda);
      const items = store
        .productos()
        .filter((p) => !q || normalizar(p.nombre).includes(q))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));

      destino.innerHTML =
        items.length === 0
          ? vacio('📦', 'Sin productos', 'Créalos con + o importa tu Excel desde Ajustes.')
          : `<p class="grupo__sub grupo__sub--suelto">${items.length} ${
              items.length === 1 ? 'producto' : 'productos'
            }</p>
             <div class="filas">${items.map(filaProducto).join('')}</div>`;
    }

    function filaProducto(p) {
      const cat = store.categoria(p.categoriaId);
      const precios = store.preciosVigentes(p);
      return `
        <button class="fila" data-tipo="producto" data-id="${esc(p.id)}">
          <span class="fila__icono">${esc(cat?.icono || '📦')}</span>
          <span class="fila__cuerpo">
            <span class="fila__titulo">${esc(p.nombre)}</span>
            <span class="fila__sub">
              ${cantidad(p.stock)} ${esc(p.unidad)} · mín. ${cantidad(p.stockMinimo)} ·
              ${precios.length ? `${precios.length} ${precios.length === 1 ? 'precio' : 'precios'}` : 'sin precio'}
            </span>
          </span>
          <span class="fila__flecha">›</span>
        </button>`;
    }

    // ── Comparador de precios ───────────────────────────────────────────────
    function pintarPrecios() {
      const conVarios = store
        .productos()
        .map((p) => ({ p, precios: store.preciosVigentes(p), ahorro: store.ahorroMaximo(p) }))
        .filter((x) => x.precios.length > 1)
        .sort((a, b) => b.ahorro - a.ahorro);

      const sinPrecio = store.productos().filter((p) => store.preciosVigentes(p).length === 0);

      if (conVarios.length === 0) {
        $cuerpo.innerHTML = vacio(
          '💶',
          'Nada que comparar todavía',
          'Guarda el precio de un mismo producto en dos supermercados y aquí verás dónde sale más barato.'
        );
        return;
      }

      $cuerpo.innerHTML = `
        <p class="grupo__sub grupo__sub--suelto">
          ${conVarios.length} ${conVarios.length === 1 ? 'producto comparable' : 'productos comparables'}${
        sinPrecio.length ? ` · ${sinPrecio.length} sin ningún precio` : ''
      }
        </p>
        <div class="filas">
          ${conVarios
            .map(({ p, precios, ahorro }) => {
              const barato = store.supermercado(precios[0].supermercadoId);
              const caro = store.supermercado(precios[precios.length - 1].supermercadoId);
              return `
                <button class="fila fila--precio" data-tipo="producto" data-id="${esc(p.id)}">
                  <span class="fila__cuerpo">
                    <span class="fila__titulo">${esc(p.nombre)}</span>
                    <span class="fila__sub">
                      <span class="fila__par">
                        <span class="punto" style="--punto:${esc(barato?.color || '#8E8E93')}"></span>
                        ${esc(barato?.nombre || '—')} ${euros(precios[0].precio)}
                      </span>
                      <span class="fila__vs">vs</span>
                      <span class="fila__par">
                        <span class="punto" style="--punto:${esc(caro?.color || '#8E8E93')}"></span>
                        ${esc(caro?.nombre || '—')} ${euros(precios[precios.length - 1].precio)}
                      </span>
                    </span>
                  </span>
                  ${ahorro > 0 ? `<span class="badge badge--ahorro">−${euros(ahorro)}</span>` : ''}
                </button>`;
            })
            .join('')}
        </div>`;
    }

    // ── Supermercados ───────────────────────────────────────────────────────
    function pintarSupers() {
      const sups = store.supermercados();
      $cuerpo.innerHTML =
        sups.length === 0
          ? vacio('🏪', 'Sin supermercados', 'Añade uno con el botón +.')
          : `<div class="filas">
              ${sups
                .map((s) => {
                  const cuantos = store.productos().filter((p) => store.precioActual(p, s.id) != null).length;
                  return `
                    <button class="fila" data-tipo="super" data-id="${esc(s.id)}">
                      <span class="punto punto--grande" style="--punto:${esc(s.color)}"></span>
                      <span class="fila__cuerpo">
                        <span class="fila__titulo">${esc(s.nombre)}</span>
                        <span class="fila__sub">${cuantos} ${
                    cuantos === 1 ? 'producto con precio' : 'productos con precio'
                  }</span>
                      </span>
                      <span class="fila__flecha">›</span>
                    </button>`;
                })
                .join('')}
             </div>`;
    }

    function editarSuper(sup = null) {
      const esNuevo = !sup;
      hoja({
        titulo: esNuevo ? 'Nuevo supermercado' : 'Editar supermercado',
        render: () => `
          <form class="form" id="form-super">
            <label class="campo">
              <span class="campo__label">Nombre</span>
              <input class="campo__input" name="nombre" type="text" required
                     placeholder="Mercadona" value="${esc(sup?.nombre || '')}">
            </label>
            <div class="campo">
              <span class="campo__label">Color</span>
              <div class="paleta">
                ${PALETA.map(
                  (c) =>
                    `<button type="button" class="paleta__color ${
                      (sup?.color || PALETA[0]) === c ? 'is-activo' : ''
                    }" style="--c:${c}" data-color="${c}" aria-label="Color ${c}"></button>`
                ).join('')}
              </div>
              <input type="hidden" name="color" value="${esc(sup?.color || PALETA[0])}">
            </div>
            <div class="hoja__acciones">
              ${esNuevo ? '' : '<button type="button" class="btn btn--peligro-suave" data-accion="borrar">Borrar</button>'}
              <button type="submit" class="btn btn--primario">${esNuevo ? 'Crear' : 'Guardar'}</button>
            </div>
          </form>`,
        onMount: (rootHoja, cerrar) => {
          const form = rootHoja.querySelector('#form-super');
          const $color = form.querySelector('[name="color"]');

          form.querySelector('.paleta').addEventListener('click', (e) => {
            const btn = e.target.closest('[data-color]');
            if (!btn) return;
            $color.value = btn.dataset.color;
            form.querySelectorAll('.paleta__color').forEach((el) => el.classList.remove('is-activo'));
            btn.classList.add('is-activo');
          });

          form.addEventListener('submit', (e) => {
            e.preventDefault();
            const datos = new FormData(form);
            const nombre = String(datos.get('nombre') || '').trim();
            if (!nombre) return toast('Ponle un nombre', { tipo: 'error' });
            if (esNuevo) store.addSupermercado({ nombre, color: datos.get('color') });
            else store.updateSupermercado(sup.id, { nombre, color: datos.get('color') });
            toast(esNuevo ? 'Supermercado creado' : 'Supermercado guardado', { tipo: 'ok' });
            cerrar();
          });

          rootHoja.querySelector('[data-accion="borrar"]')?.addEventListener('click', async () => {
            const afectados = store.productos().filter((p) => store.precioActual(p, sup.id) != null).length;
            const ok = await confirmar({
              titulo: 'Borrar supermercado',
              mensaje: afectados
                ? `Se borra "${sup.nombre}" y los precios de ${afectados} ${
                    afectados === 1 ? 'producto' : 'productos'
                  }. Los productos se mantienen.`
                : `Se borra "${sup.nombre}".`,
              confirmar: 'Borrar',
            });
            if (!ok) return;
            store.deleteSupermercado(sup.id);
            toast('Supermercado borrado');
            cerrar();
          });
        },
      });
    }

    // ── Categorías ──────────────────────────────────────────────────────────
    function pintarCategorias() {
      const cats = store.categorias();
      $cuerpo.innerHTML =
        cats.length === 0
          ? vacio('🏷️', 'Sin categorías', 'Añade una con el botón +.')
          : `<div class="filas">
              ${cats
                .map((c) => {
                  const cuantos = store.productos().filter((p) => p.categoriaId === c.id).length;
                  return `
                    <button class="fila" data-tipo="categoria" data-id="${esc(c.id)}">
                      <span class="fila__icono">${esc(c.icono)}</span>
                      <span class="fila__cuerpo">
                        <span class="fila__titulo">${esc(c.nombre)}</span>
                        <span class="fila__sub">${cuantos} ${cuantos === 1 ? 'producto' : 'productos'}</span>
                      </span>
                      <span class="fila__flecha">›</span>
                    </button>`;
                })
                .join('')}
             </div>`;
    }

    function editarCategoria(cat = null) {
      const esNuevo = !cat;
      hoja({
        titulo: esNuevo ? 'Nueva categoría' : 'Editar categoría',
        render: () => `
          <form class="form" id="form-cat">
            <label class="campo">
              <span class="campo__label">Nombre</span>
              <input class="campo__input" name="nombre" type="text" required
                     placeholder="Lácteos" value="${esc(cat?.nombre || '')}">
            </label>
            <div class="campo">
              <span class="campo__label">Icono</span>
              <div class="paleta paleta--iconos">
                ${ICONOS.map(
                  (i) =>
                    `<button type="button" class="paleta__icono ${
                      (cat?.icono || ICONOS[0]) === i ? 'is-activo' : ''
                    }" data-icono="${i}">${i}</button>`
                ).join('')}
              </div>
              <input type="hidden" name="icono" value="${esc(cat?.icono || ICONOS[0])}">
            </div>
            <div class="hoja__acciones">
              ${esNuevo ? '' : '<button type="button" class="btn btn--peligro-suave" data-accion="borrar">Borrar</button>'}
              <button type="submit" class="btn btn--primario">${esNuevo ? 'Crear' : 'Guardar'}</button>
            </div>
          </form>`,
        onMount: (rootHoja, cerrar) => {
          const form = rootHoja.querySelector('#form-cat');
          const $icono = form.querySelector('[name="icono"]');

          form.querySelector('.paleta').addEventListener('click', (e) => {
            const btn = e.target.closest('[data-icono]');
            if (!btn) return;
            $icono.value = btn.dataset.icono;
            form.querySelectorAll('.paleta__icono').forEach((el) => el.classList.remove('is-activo'));
            btn.classList.add('is-activo');
          });

          form.addEventListener('submit', (e) => {
            e.preventDefault();
            const datos = new FormData(form);
            const nombre = String(datos.get('nombre') || '').trim();
            if (!nombre) return toast('Ponle un nombre', { tipo: 'error' });
            if (esNuevo) store.addCategoria({ nombre, icono: datos.get('icono') });
            else store.updateCategoria(cat.id, { nombre, icono: datos.get('icono') });
            toast(esNuevo ? 'Categoría creada' : 'Categoría guardada', { tipo: 'ok' });
            cerrar();
          });

          rootHoja.querySelector('[data-accion="borrar"]')?.addEventListener('click', async () => {
            const afectados = store.productos().filter((p) => p.categoriaId === cat.id).length;
            const ok = await confirmar({
              titulo: 'Borrar categoría',
              mensaje: afectados
                ? `${afectados} ${afectados === 1 ? 'producto se queda' : 'productos se quedan'} sin categoría.`
                : `Se borra "${cat.nombre}".`,
              confirmar: 'Borrar',
            });
            if (!ok) return;
            store.deleteCategoria(cat.id);
            toast('Categoría borrada');
            cerrar();
          });
        },
      });
    }

    // ── Router interno ──────────────────────────────────────────────────────
    /** No repintamos mientras se escribe en el buscador: perdería el foco. */
    const escribiendo = () => {
      const a = document.activeElement;
      return a && root.contains(a) && a.tagName === 'INPUT';
    };

    function pintar({ forzar = false } = {}) {
      if (!forzar && escribiendo()) return;

      $tabs.innerHTML = PESTAÑAS.map(
        (t) =>
          `<button class="chip ${pestaña === t.id ? 'is-activo' : ''}" data-tab="${t.id}">${esc(
            t.texto
          )}</button>`
      ).join('');

      if (pestaña === 'productos') pintarProductos();
      else if (pestaña === 'precios') pintarPrecios();
      else if (pestaña === 'supers') pintarSupers();
      else pintarCategorias();

      root.querySelector('#cat-nuevo').hidden = pestaña === 'precios';
    }

    // ── Eventos ─────────────────────────────────────────────────────────────
    $tabs.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-tab]');
      if (!btn) return;
      pestaña = btn.dataset.tab;
      pintar();
    });

    $cuerpo.addEventListener('click', (e) => {
      const fila = e.target.closest('[data-tipo]');
      if (!fila) return;
      const { tipo, id } = fila.dataset;
      if (tipo === 'producto') abrirEditorProducto(store.producto(id));
      else if (tipo === 'super') editarSuper(store.supermercado(id));
      else if (tipo === 'categoria') editarCategoria(store.categoria(id));
    });

    root.querySelector('#cat-nuevo').addEventListener('click', () => {
      if (pestaña === 'productos') abrirEditorProducto(null);
      else if (pestaña === 'supers') editarSuper(null);
      else if (pestaña === 'categorias') editarCategoria(null);
    });

    pintar();
    const desuscribir = store.subscribe(pintar);
    return () => desuscribir();
  },
};
