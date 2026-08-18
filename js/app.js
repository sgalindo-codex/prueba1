/** Arranque de CASA J: inicializa el estado, monta la vista activa y la barra de pestañas. */

import * as store from './store.js';
import { toast } from './ui.js';

import inventario from './views/inventario.js';
import lista from './views/lista.js';
import compra from './views/compra.js';
import catalogo from './views/catalogo.js';
import ajustes from './views/ajustes.js';

const VISTAS = [inventario, lista, compra, catalogo, ajustes];
const POR_DEFECTO = 'inventario';

const $main = document.getElementById('vista');
const $tabbar = document.getElementById('tabbar');
const $titulo = document.getElementById('titulo');

let activa = null;
let desmontar = null;

/** El id de vista sale del hash, para que recargar o volver atrás no pierda el sitio. */
const vistaDelHash = () => {
  const id = location.hash.replace('#', '');
  return VISTAS.some((v) => v.id === id) ? id : POR_DEFECTO;
};

function pintarTabbar() {
  const enLista = store.lista().length;
  const compraAbierta = !!store.compraActiva();

  $tabbar.innerHTML = VISTAS.map((v) => {
    let insignia = '';
    if (v.id === 'lista' && enLista) insignia = `<span class="tab__badge">${enLista}</span>`;
    if (v.id === 'compra' && compraAbierta) insignia = '<span class="tab__punto"></span>';
    return `
      <button class="tab ${activa === v.id ? 'is-activa' : ''}" data-vista="${v.id}"
              aria-current="${activa === v.id ? 'page' : 'false'}">
        <span class="tab__icono">${v.icono}${insignia}</span>
        <span class="tab__texto">${v.titulo}</span>
      </button>`;
  }).join('');
}

function montar(id) {
  const vista = VISTAS.find((v) => v.id === id) || VISTAS[0];
  if (activa === vista.id) return;

  desmontar?.();
  desmontar = null;

  activa = vista.id;
  $titulo.textContent = vista.titulo;
  $main.innerHTML = '';
  $main.scrollTop = 0;

  desmontar = vista.montar($main) || null;
  pintarTabbar();
}

function navegar(id) {
  if (location.hash === `#${id}`) montar(id);
  else location.hash = id;
}

// ── Eventos globales ─────────────────────────────────────────────────────────

$tabbar.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-vista]');
  if (btn) navegar(btn.dataset.vista);
});

window.addEventListener('hashchange', () => montar(vistaDelHash()));

document.addEventListener('casaj:navegar', (e) => navegar(e.detail.id));

// La barra de pestañas refleja el estado (contador de lista, compra abierta).
store.subscribe(pintarTabbar);

// ── Arranque ─────────────────────────────────────────────────────────────────

(async function arrancar() {
  try {
    await store.init();
  } catch (err) {
    console.error(err);
    toast('No he podido cargar los datos guardados', { tipo: 'error', duracion: 6000 });
    store.resetear();
  }

  montar(vistaDelHash());
  document.body.classList.remove('cargando');

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
