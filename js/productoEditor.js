/** Hoja para crear o editar un producto: datos, precios por súper e historial. */

import * as store from './store.js';
import { hoja, confirmar, toast, esc, euros, fecha, vibrar } from './ui.js';

const UNIDADES = ['ud', 'pack', 'kg', 'g', 'L', 'ml'];

/**
 * @param {object|null} prod  producto a editar, o null para crear uno nuevo
 * @param {object} opts       { onGuardar, categoriaPorDefecto }
 */
export function abrirEditorProducto(prod = null, { onGuardar, categoriaPorDefecto } = {}) {
  const esNuevo = !prod;
  const cats = store.categorias();
  const sups = store.supermercados();

  const historial = prod ? store.historialPrecios(prod) : [];

  hoja({
    titulo: esNuevo ? 'Nuevo producto' : 'Editar producto',
    render: () => `
      <form class="form" id="form-producto" novalidate>
        <label class="campo">
          <span class="campo__label">Nombre</span>
          <input class="campo__input" name="nombre" type="text" required
                 placeholder="Leche entera 1L" value="${esc(prod?.nombre || '')}">
        </label>

        <div class="campo-fila">
          <label class="campo">
            <span class="campo__label">Categoría</span>
            <select class="campo__input" name="categoriaId">
              <option value="">Sin categoría</option>
              ${cats
                .map((c) => {
                  const sel = (prod?.categoriaId || categoriaPorDefecto) === c.id ? 'selected' : '';
                  return `<option value="${esc(c.id)}" ${sel}>${esc(c.icono)} ${esc(c.nombre)}</option>`;
                })
                .join('')}
            </select>
          </label>
          <label class="campo campo--estrecho">
            <span class="campo__label">Unidad</span>
            <select class="campo__input" name="unidad">
              ${UNIDADES.map(
                (u) => `<option value="${u}" ${prod?.unidad === u ? 'selected' : ''}>${u}</option>`
              ).join('')}
            </select>
          </label>
        </div>

        <div class="campo-fila">
          <label class="campo">
            <span class="campo__label">Tengo ahora</span>
            <input class="campo__input" name="stock" type="number" inputmode="decimal"
                   step="0.01" min="0" value="${prod?.stock ?? 0}">
          </label>
          <label class="campo">
            <span class="campo__label">Mínimo en casa</span>
            <input class="campo__input" name="stockMinimo" type="number" inputmode="decimal"
                   step="0.01" min="0" value="${prod?.stockMinimo ?? 1}">
          </label>
        </div>
        <p class="campo__ayuda">Cuando el stock baje del mínimo, el producto entra solo en la lista de la compra.</p>

        <div class="bloque">
          <h3 class="bloque__titulo">Precio por supermercado</h3>
          ${
            sups.length === 0
              ? '<p class="campo__ayuda">Todavía no hay supermercados. Añádelos desde Catálogo.</p>'
              : sups
                  .map((s) => {
                    const valor = prod ? store.precioActual(prod, s.id) : null;
                    return `
                <label class="precio-fila">
                  <span class="precio-fila__super">
                    <span class="punto" style="--punto:${esc(s.color)}"></span>${esc(s.nombre)}
                  </span>
                  <span class="precio-fila__input">
                    <input class="campo__input" type="number" inputmode="decimal" step="0.01" min="0"
                           name="precio:${esc(s.id)}" placeholder="—" value="${valor ?? ''}">
                    <span class="precio-fila__moneda">€</span>
                  </span>
                </label>`;
                  })
                  .join('')
          }
        </div>

        ${
          historial.length > 1
            ? `<details class="bloque">
                 <summary class="bloque__titulo bloque__titulo--desplegable">
                   Historial de precios (${historial.length})
                 </summary>
                 <ul class="historial">
                   ${historial
                     .map((h) => {
                       const sup = store.supermercado(h.supermercadoId);
                       const sig =
                         h.variacion == null
                           ? ''
                           : h.variacion > 0
                           ? `<span class="variacion variacion--sube">▲ ${euros(Math.abs(h.variacion))}</span>`
                           : `<span class="variacion variacion--baja">▼ ${euros(Math.abs(h.variacion))}</span>`;
                       return `<li class="historial__fila">
                         <span class="punto" style="--punto:${esc(sup?.color || '#8E8E93')}"></span>
                         <span class="historial__super">${esc(sup?.nombre || 'Eliminado')}</span>
                         <span class="historial__fecha">${fecha(h.fecha)}</span>
                         <span class="historial__precio">${euros(h.precio)} ${sig}</span>
                       </li>`;
                     })
                     .join('')}
                 </ul>
               </details>`
            : ''
        }

        <div class="hoja__acciones">
          ${
            esNuevo
              ? ''
              : '<button type="button" class="btn btn--peligro-suave" data-accion="borrar">Borrar</button>'
          }
          <button type="submit" class="btn btn--primario">${esNuevo ? 'Crear producto' : 'Guardar'}</button>
        </div>
      </form>`,

    onMount: (root, cerrar) => {
      const form = root.querySelector('#form-producto');
      form.querySelector('[name="nombre"]').focus();

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const datos = new FormData(form);
        const nombre = String(datos.get('nombre') || '').trim();
        if (!nombre) {
          toast('Ponle un nombre al producto', { tipo: 'error' });
          form.querySelector('[name="nombre"]').focus();
          return;
        }

        const campos = {
          nombre,
          categoriaId: datos.get('categoriaId') || null,
          unidad: datos.get('unidad') || 'ud',
          stock: Number(datos.get('stock')) || 0,
          stockMinimo: Number(datos.get('stockMinimo')) || 0,
        };

        const precios = {};
        for (const s of sups) {
          precios[s.id] = datos.get(`precio:${s.id}`);
        }

        if (esNuevo) {
          const creado = store.addProducto({ ...campos, precios });
          toast(`"${creado.nombre}" añadido`, { tipo: 'ok' });
        } else {
          store.updateProducto(prod.id, campos);
          for (const [supId, valor] of Object.entries(precios)) {
            store.setPrecio(prod.id, supId, valor === '' ? null : valor);
          }
          toast('Producto guardado', { tipo: 'ok' });
        }

        vibrar();
        onGuardar?.();
        cerrar();
      });

      root.querySelector('[data-accion="borrar"]')?.addEventListener('click', async () => {
        const ok = await confirmar({
          titulo: 'Borrar producto',
          mensaje: `Se elimina "${prod.nombre}" del inventario, de la lista y su historial de precios. No se puede deshacer.`,
          confirmar: 'Borrar',
        });
        if (!ok) return;
        store.deleteProducto(prod.id);
        toast('Producto borrado');
        onGuardar?.();
        cerrar();
      });
    },
  });
}
