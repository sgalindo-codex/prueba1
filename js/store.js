/**
 * CASA J — Capa de estado y persistencia
 *
 * Toda la app lee y escribe a través de este módulo. La persistencia está
 * detrás de un adaptador asíncrono, así que añadir sincronización en la nube
 * más adelante sólo requiere escribir un adaptador nuevo y cambiar ADAPTER.
 */

import { SEED } from './seed.js';

const STORAGE_KEY = 'casaj.state.v1';
const SCHEMA_VERSION = 1;

// ── Adaptadores de persistencia ──────────────────────────────────────────────

const localAdapter = {
  name: 'local',
  async load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  async save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },
};

// Para sincronizar entre móviles en el futuro basta con implementar
// { name, load(), save(state) } contra Supabase/Firebase y asignarlo aquí.
const ADAPTER = localAdapter;

// ── Estado ───────────────────────────────────────────────────────────────────

/**
 * Forma del estado:
 * {
 *   version, supermercados[], categorias[], productos[],
 *   lista[]          — lista de la compra que se va llenando durante la semana
 *   ignorarAuto[]    — productos que el usuario sacó a mano de la lista automática
 *   compra           — compra en curso (null si no hay ninguna abierta)
 *   compras[]        — historial de compras cerradas
 * }
 */
let state = null;

const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  for (const fn of listeners) fn(state);
}

let saveTimer = null;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => ADAPTER.save(state), 150);
}

/** Aplica un cambio al estado, guarda y notifica a las vistas. */
function commit(mutator) {
  mutator(state);
  persist();
  emit();
}

export function getState() {
  return state;
}

export async function init() {
  const saved = await ADAPTER.load();
  state = saved && saved.version === SCHEMA_VERSION ? saved : structuredClone(SEED);
  sincronizarAutoLista({ silencioso: true });
  persist();
  emit();
  return state;
}

// ── Utilidades ───────────────────────────────────────────────────────────────

const uid = (prefijo) =>
  `${prefijo}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const hoy = () => new Date().toISOString().slice(0, 10);

// ── Consultas: supermercados y categorías ────────────────────────────────────

export const supermercados = () => state.supermercados;
export const categorias = () => state.categorias;

export const supermercado = (id) => state.supermercados.find((s) => s.id === id) || null;
export const categoria = (id) => state.categorias.find((c) => c.id === id) || null;

export function addSupermercado({ nombre, color }) {
  const s = { id: uid('sup'), nombre: nombre.trim(), color: color || '#8E8E93' };
  commit((st) => st.supermercados.push(s));
  return s;
}

export function updateSupermercado(id, cambios) {
  commit((st) => {
    const s = st.supermercados.find((x) => x.id === id);
    if (s) Object.assign(s, cambios);
  });
}

/** Borra un supermercado y sus precios asociados. Devuelve cuántos precios se perdieron. */
export function deleteSupermercado(id) {
  let preciosBorrados = 0;
  commit((st) => {
    st.supermercados = st.supermercados.filter((s) => s.id !== id);
    for (const p of st.productos) {
      if (p.precios[id]) {
        preciosBorrados += p.precios[id].length;
        delete p.precios[id];
      }
    }
    for (const item of st.lista) {
      if (item.supermercadoId === id) item.supermercadoId = null;
    }
  });
  return preciosBorrados;
}

export function addCategoria({ nombre, icono }) {
  const c = { id: uid('cat'), nombre: nombre.trim(), icono: icono || '🛒' };
  commit((st) => st.categorias.push(c));
  return c;
}

export function updateCategoria(id, cambios) {
  commit((st) => {
    const c = st.categorias.find((x) => x.id === id);
    if (c) Object.assign(c, cambios);
  });
}

/** Borra una categoría. Los productos que la usaban quedan sin categoría. */
export function deleteCategoria(id) {
  commit((st) => {
    st.categorias = st.categorias.filter((c) => c.id !== id);
    for (const p of st.productos) {
      if (p.categoriaId === id) p.categoriaId = null;
    }
  });
}

// ── Consultas: productos ─────────────────────────────────────────────────────

export const productos = () => state.productos;
export const producto = (id) => state.productos.find((p) => p.id === id) || null;

/** Precio vigente de un producto en un supermercado (el más reciente), o null. */
export function precioActual(prod, supermercadoId) {
  const historial = prod.precios?.[supermercadoId];
  if (!historial || historial.length === 0) return null;
  return historial[historial.length - 1].precio;
}

/** Supermercado más barato para un producto: { supermercadoId, precio } o null. */
export function mejorPrecio(prod) {
  let mejor = null;
  for (const supermercadoId of Object.keys(prod.precios || {})) {
    const precio = precioActual(prod, supermercadoId);
    if (precio == null) continue;
    if (!mejor || precio < mejor.precio) mejor = { supermercadoId, precio };
  }
  return mejor;
}

/** Todos los precios vigentes de un producto, del más barato al más caro. */
export function preciosVigentes(prod) {
  return Object.keys(prod.precios || {})
    .map((supermercadoId) => ({ supermercadoId, precio: precioActual(prod, supermercadoId) }))
    .filter((x) => x.precio != null)
    .sort((a, b) => a.precio - b.precio);
}

/** Cuánto se ahorra comprando en el súper más barato en vez del más caro. */
export function ahorroMaximo(prod) {
  const precios = preciosVigentes(prod);
  if (precios.length < 2) return 0;
  return precios[precios.length - 1].precio - precios[0].precio;
}

/** Estado del semáforo: 'agotado' | 'bajo' | 'ok'. */
export function estadoStock(prod) {
  if (prod.stock <= 0) return 'agotado';
  if (prod.stock <= prod.stockMinimo) return 'bajo';
  return 'ok';
}

export function addProducto({
  nombre,
  categoriaId,
  unidad,
  stock,
  stockMinimo,
  precios,
  marca,
  formato,
}) {
  const p = {
    id: uid('prod'),
    nombre: nombre.trim(),
    categoriaId: categoriaId || null,
    unidad: unidad || 'ud',
    stock: Number(stock) || 0,
    stockMinimo: Number(stockMinimo) || 0,
    marca: marca?.trim() || null,
    formato: formato?.trim() || null,
    precios: {},
  };
  // precios llega como { supermercadoId: precio }
  for (const [supermercadoId, precio] of Object.entries(precios || {})) {
    if (precio == null || precio === '') continue;
    p.precios[supermercadoId] = [{ precio: Number(precio), fecha: hoy() }];
  }
  commit((st) => st.productos.push(p));
  sincronizarAutoLista();
  return p;
}

/** Actualiza campos básicos. Los precios se cambian con setPrecio(). */
export function updateProducto(id, cambios) {
  commit((st) => {
    const p = st.productos.find((x) => x.id === id);
    if (!p) return;
    const { precios, ...resto } = cambios;
    Object.assign(p, resto);
  });
  sincronizarAutoLista();
}

export function deleteProducto(id) {
  commit((st) => {
    st.productos = st.productos.filter((p) => p.id !== id);
    st.lista = st.lista.filter((i) => i.productoId !== id);
    st.ignorarAuto = st.ignorarAuto.filter((pid) => pid !== id);
    if (st.compra) st.compra.items = st.compra.items.filter((i) => i.productoId !== id);
  });
}

/**
 * Fija el precio de un producto en un súper. Sólo añade al historial si el
 * precio cambió respecto al último, para no llenarlo de entradas repetidas.
 */
export function setPrecio(productoId, supermercadoId, precio) {
  commit((st) => {
    const p = st.productos.find((x) => x.id === productoId);
    if (!p) return;
    if (precio == null || precio === '') {
      delete p.precios[supermercadoId];
      return;
    }
    const valor = Number(precio);
    if (!p.precios[supermercadoId]) p.precios[supermercadoId] = [];
    const historial = p.precios[supermercadoId];
    const ultimo = historial[historial.length - 1];
    if (ultimo && ultimo.precio === valor) return;
    historial.push({ precio: valor, fecha: hoy() });
  });
}

/** Historial completo de precios de un producto, aplanado y ordenado por fecha. */
export function historialPrecios(prod) {
  const filas = [];
  for (const [supermercadoId, historial] of Object.entries(prod.precios || {})) {
    historial.forEach((entrada, i) => {
      const anterior = historial[i - 1];
      filas.push({
        supermercadoId,
        precio: entrada.precio,
        fecha: entrada.fecha,
        variacion: anterior ? entrada.precio - anterior.precio : null,
      });
    });
  }
  return filas.sort((a, b) => b.fecha.localeCompare(a.fecha));
}

// ── Inventario ───────────────────────────────────────────────────────────────

/** Suma (o resta) unidades al stock. Nunca baja de 0. */
export function ajustarStock(productoId, delta) {
  commit((st) => {
    const p = st.productos.find((x) => x.id === productoId);
    if (!p) return;
    p.stock = Math.max(0, Number((p.stock + delta).toFixed(3)));
    // Si vuelve a estar por encima del mínimo, se olvida que lo habíamos sacado
    // de la lista automática: la próxima vez que baje, vuelve a entrar solo.
    if (p.stock > p.stockMinimo) {
      st.ignorarAuto = st.ignorarAuto.filter((pid) => pid !== productoId);
    }
  });
  sincronizarAutoLista();
}

export function setStock(productoId, valor) {
  commit((st) => {
    const p = st.productos.find((x) => x.id === productoId);
    if (p) p.stock = Math.max(0, Number(valor) || 0);
  });
  sincronizarAutoLista();
}

// ── Lista de la compra ───────────────────────────────────────────────────────

export const lista = () => state.lista;

/** Producto en la lista, o null. */
export const itemLista = (productoId) =>
  state.lista.find((i) => i.productoId === productoId) || null;

/**
 * Añade un producto a la lista. Si ya está, suma cantidad.
 * `auto` marca los que entraron solos por stock mínimo.
 */
export function addALista(productoId, cantidad = 1, { auto = false, supermercadoId } = {}) {
  commit((st) => {
    const existente = st.lista.find((i) => i.productoId === productoId);
    if (existente) {
      existente.cantidad += cantidad;
      if (!auto) existente.auto = false;
      return;
    }
    const prod = st.productos.find((p) => p.id === productoId);
    const sugerido = supermercadoId ?? (prod ? mejorPrecio(prod)?.supermercadoId : null) ?? null;
    st.lista.push({
      productoId,
      cantidad,
      supermercadoId: sugerido,
      auto,
      añadido: hoy(),
    });
    if (!auto) st.ignorarAuto = st.ignorarAuto.filter((pid) => pid !== productoId);
  });
}

export function setCantidadLista(productoId, cantidad) {
  if (cantidad <= 0) return removeDeLista(productoId);
  commit((st) => {
    const item = st.lista.find((i) => i.productoId === productoId);
    if (item) {
      item.cantidad = cantidad;
      item.auto = false;
    }
  });
}

export function setSupermercadoLista(productoId, supermercadoId) {
  commit((st) => {
    const item = st.lista.find((i) => i.productoId === productoId);
    if (item) item.supermercadoId = supermercadoId;
  });
}

/**
 * Quita un producto de la lista. Si había entrado automáticamente, se recuerda
 * para no volver a meterlo mientras siga bajo mínimo.
 */
export function removeDeLista(productoId) {
  commit((st) => {
    const item = st.lista.find((i) => i.productoId === productoId);
    st.lista = st.lista.filter((i) => i.productoId !== productoId);
    if (item?.auto && !st.ignorarAuto.includes(productoId)) {
      st.ignorarAuto.push(productoId);
    }
  });
}

export function vaciarLista() {
  commit((st) => {
    st.lista = [];
  });
}

/**
 * Mete en la lista todo lo que esté bajo mínimo y no esté ya dentro,
 * respetando lo que el usuario haya sacado a mano.
 */
export function sincronizarAutoLista({ silencioso = false } = {}) {
  const añadidos = [];
  const mutar = (st) => {
    for (const p of st.productos) {
      if (p.stock > p.stockMinimo) continue;
      if (st.lista.some((i) => i.productoId === p.id)) continue;
      if (st.ignorarAuto.includes(p.id)) continue;
      const faltan = Math.max(1, Math.ceil(p.stockMinimo - p.stock) || 1);
      st.lista.push({
        productoId: p.id,
        cantidad: faltan,
        supermercadoId: mejorPrecio(p)?.supermercadoId ?? null,
        auto: true,
        añadido: hoy(),
      });
      añadidos.push(p.id);
    }
  };
  if (silencioso) mutar(state);
  else if (state) commit(mutar);
  return añadidos;
}

/** La lista agrupada por supermercado, con subtotales. */
export function listaPorSupermercado() {
  const grupos = new Map();
  for (const item of state.lista) {
    const prod = producto(item.productoId);
    if (!prod) continue;
    const supId = item.supermercadoId ?? '__sin__';
    if (!grupos.has(supId)) grupos.set(supId, { supermercadoId: item.supermercadoId, items: [], total: 0 });
    const grupo = grupos.get(supId);
    const precio = item.supermercadoId ? precioActual(prod, item.supermercadoId) : mejorPrecio(prod)?.precio;
    grupo.items.push({ ...item, producto: prod, precio: precio ?? null });
    if (precio != null) grupo.total += precio * item.cantidad;
  }
  return [...grupos.values()].sort((a, b) => {
    if (!a.supermercadoId) return 1;
    if (!b.supermercadoId) return -1;
    return (supermercado(a.supermercadoId)?.nombre || '').localeCompare(
      supermercado(b.supermercadoId)?.nombre || ''
    );
  });
}

export function totalEstimadoLista() {
  return listaPorSupermercado().reduce((suma, g) => suma + g.total, 0);
}

// ── Modo compra ──────────────────────────────────────────────────────────────

export const compraActiva = () => state.compra;

/** Abre una compra a partir de la lista actual. Nada suma al inventario todavía. */
export function iniciarCompra() {
  commit((st) => {
    st.compra = {
      id: uid('compra'),
      iniciada: new Date().toISOString(),
      items: st.lista.map((item) => {
        const prod = st.productos.find((p) => p.id === item.productoId);
        const precio = item.supermercadoId ? precioActual(prod, item.supermercadoId) : mejorPrecio(prod)?.precio;
        return {
          productoId: item.productoId,
          cantidad: item.cantidad,
          supermercadoId: item.supermercadoId,
          precio: precio ?? null,
          comprado: false,
        };
      }),
    };
  });
  return state.compra;
}

export function toggleComprado(productoId) {
  commit((st) => {
    const item = st.compra?.items.find((i) => i.productoId === productoId);
    if (item) item.comprado = !item.comprado;
  });
}

export function setCantidadCompra(productoId, cantidad) {
  commit((st) => {
    const item = st.compra?.items.find((i) => i.productoId === productoId);
    if (item) item.cantidad = Math.max(0, cantidad);
  });
}

/** Precio real pagado, por si en el súper no coincide con el guardado. */
export function setPrecioCompra(productoId, precio) {
  commit((st) => {
    const item = st.compra?.items.find((i) => i.productoId === productoId);
    if (item) item.precio = precio === '' || precio == null ? null : Number(precio);
  });
}

export function cancelarCompra() {
  commit((st) => {
    st.compra = null;
  });
}

/**
 * Cierra la compra:
 *   - lo marcado como comprado suma al inventario y sale de la lista
 *   - lo no comprado se queda en la lista para la próxima
 *   - los precios pagados actualizan el historial
 */
export function finalizarCompra() {
  const resumen = { comprados: 0, unidades: 0, total: 0, pendientes: 0 };
  commit((st) => {
    if (!st.compra) return;
    const comprados = st.compra.items.filter((i) => i.comprado && i.cantidad > 0);
    const pendientes = st.compra.items.filter((i) => !i.comprado || i.cantidad <= 0);

    for (const item of comprados) {
      const prod = st.productos.find((p) => p.id === item.productoId);
      if (!prod) continue;
      prod.stock = Number((prod.stock + item.cantidad).toFixed(3));
      st.ignorarAuto = st.ignorarAuto.filter((pid) => pid !== item.productoId);

      if (item.precio != null && item.supermercadoId) {
        if (!prod.precios[item.supermercadoId]) prod.precios[item.supermercadoId] = [];
        const historial = prod.precios[item.supermercadoId];
        const ultimo = historial[historial.length - 1];
        if (!ultimo || ultimo.precio !== item.precio) {
          historial.push({ precio: item.precio, fecha: hoy() });
        }
      }
      resumen.comprados++;
      resumen.unidades += item.cantidad;
      if (item.precio != null) resumen.total += item.precio * item.cantidad;
    }

    st.compras.push({
      id: st.compra.id,
      fecha: hoy(),
      cerrada: new Date().toISOString(),
      items: comprados.map(({ productoId, cantidad, supermercadoId, precio }) => ({
        productoId,
        cantidad,
        supermercadoId,
        precio,
      })),
      total: resumen.total,
    });

    // Sólo sobrevive en la lista lo que no se compró.
    const idsComprados = new Set(comprados.map((i) => i.productoId));
    st.lista = st.lista.filter((i) => !idsComprados.has(i.productoId));
    resumen.pendientes = pendientes.length;
    st.compra = null;
  });
  return resumen;
}

export const historialCompras = () => [...state.compras].reverse();

// ── Backup ───────────────────────────────────────────────────────────────────

export function exportar() {
  return JSON.stringify({ ...state, exportado: new Date().toISOString() }, null, 2);
}

/** Reemplaza todo el estado por el de un backup. Lanza si el JSON no es válido. */
export function importar(json) {
  const datos = typeof json === 'string' ? JSON.parse(json) : json;
  if (!datos || !Array.isArray(datos.productos) || !Array.isArray(datos.supermercados)) {
    throw new Error('El archivo no tiene el formato de un backup de CASA J.');
  }
  commit(() => {
    state = {
      version: SCHEMA_VERSION,
      supermercados: datos.supermercados,
      categorias: datos.categorias || [],
      productos: datos.productos,
      lista: datos.lista || [],
      ignorarAuto: datos.ignorarAuto || [],
      compra: datos.compra || null,
      compras: datos.compras || [],
    };
  });
  sincronizarAutoLista();
}

export function resetear() {
  commit(() => {
    state = structuredClone(SEED);
  });
}

export function vaciarTodo() {
  commit((st) => {
    st.productos = [];
    st.lista = [];
    st.ignorarAuto = [];
    st.compra = null;
    st.compras = [];
  });
}
