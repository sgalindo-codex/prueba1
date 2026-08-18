/** Utilidades compartidas por las vistas: formato, escapado, toasts y hojas modales. */

export const euros = (n) =>
  n == null || Number.isNaN(n)
    ? '—'
    : new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

/** Cantidades: enteras sin decimales, fraccionarias con los justos. */
export const cantidad = (n) =>
  Number.isInteger(n) ? String(n) : String(Number(n.toFixed(3)));

export const fecha = (iso) => {
  if (!iso) return '';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a.slice(2)}`;
};

/** Escapa texto que va a interpolarse en HTML. */
export const esc = (str) =>
  String(str ?? '').replace(/[&<>"']/g, (ch) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])
  );

/** Normaliza para buscar sin tildes ni mayúsculas. */
export const normalizar = (str) =>
  String(str ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export function vibrar(ms = 8) {
  if ('vibrate' in navigator) navigator.vibrate(ms);
}

// ── Toast ────────────────────────────────────────────────────────────────────

let toastTimer = null;

export function toast(mensaje, { tipo = 'info', duracion = 2600, accion } = {}) {
  const host = document.getElementById('toast-host');
  host.innerHTML = '';

  const el = document.createElement('div');
  el.className = `toast toast--${tipo}`;
  el.innerHTML = `<span class="toast__texto">${esc(mensaje)}</span>`;

  if (accion) {
    const btn = document.createElement('button');
    btn.className = 'toast__accion';
    btn.textContent = accion.texto;
    btn.addEventListener('click', () => {
      accion.onClick();
      cerrar();
    });
    el.appendChild(btn);
  }

  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('is-visible'));

  const cerrar = () => {
    el.classList.remove('is-visible');
    setTimeout(() => el.remove(), 250);
  };

  clearTimeout(toastTimer);
  toastTimer = setTimeout(cerrar, duracion);
  return cerrar;
}

// ── Hoja modal ───────────────────────────────────────────────────────────────

let cerrarHojaActual = null;

/**
 * Abre una hoja deslizante desde abajo.
 * `render(cerrar)` devuelve el HTML del cuerpo; `onMount(root, cerrar)` engancha eventos.
 */
export function hoja({ titulo, render, onMount, onClose }) {
  cerrarHojaActual?.();

  const backdrop = document.createElement('div');
  backdrop.className = 'hoja-backdrop';
  backdrop.innerHTML = `
    <div class="hoja" role="dialog" aria-modal="true" aria-label="${esc(titulo)}">
      <div class="hoja__grip"></div>
      <header class="hoja__head">
        <h2>${esc(titulo)}</h2>
        <button class="hoja__cerrar" aria-label="Cerrar">✕</button>
      </header>
      <div class="hoja__cuerpo"></div>
    </div>`;

  const cerrar = () => {
    backdrop.classList.remove('is-visible');
    document.body.classList.remove('sin-scroll');
    setTimeout(() => backdrop.remove(), 260);
    cerrarHojaActual = null;
    onClose?.();
  };
  cerrarHojaActual = cerrar;

  backdrop.querySelector('.hoja__cuerpo').innerHTML = render(cerrar);
  backdrop.querySelector('.hoja__cerrar').addEventListener('click', cerrar);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) cerrar();
  });

  document.body.appendChild(backdrop);
  document.body.classList.add('sin-scroll');
  requestAnimationFrame(() => backdrop.classList.add('is-visible'));

  onMount?.(backdrop.querySelector('.hoja'), cerrar);
  return cerrar;
}

/** Confirmación con botón destructivo. Devuelve una promesa que resuelve a boolean. */
export function confirmar({ titulo, mensaje, confirmar: textoOk = 'Confirmar', peligro = true }) {
  return new Promise((resolve) => {
    let decidido = false;
    hoja({
      titulo,
      render: () => `
        <p class="hoja__texto">${esc(mensaje)}</p>
        <div class="hoja__acciones">
          <button class="btn btn--ghost" data-accion="cancelar">Cancelar</button>
          <button class="btn ${peligro ? 'btn--peligro' : 'btn--primario'}" data-accion="ok">${esc(textoOk)}</button>
        </div>`,
      onMount: (root, cerrar) => {
        root.querySelector('[data-accion="cancelar"]').addEventListener('click', cerrar);
        root.querySelector('[data-accion="ok"]').addEventListener('click', () => {
          decidido = true;
          resolve(true);
          cerrar();
        });
      },
      onClose: () => {
        if (!decidido) resolve(false);
      },
    });
  });
}

/** Estado vacío reutilizable. */
export const vacio = (icono, titulo, texto = '') => `
  <div class="vacio">
    <div class="vacio__icono">${icono}</div>
    <p class="vacio__titulo">${esc(titulo)}</p>
    ${texto ? `<p class="vacio__texto">${esc(texto)}</p>` : ''}
  </div>`;

/** Punto de color de un supermercado. */
export const puntoSuper = (sup) =>
  `<span class="punto" style="--punto:${esc(sup?.color || '#8E8E93')}"></span>`;
