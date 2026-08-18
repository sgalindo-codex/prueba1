/**
 * Datos iniciales de CASA J.
 *
 * Es sólo un punto de partida para que la app no arranque vacía: en cuanto
 * importes tu Excel, este catálogo se sustituye por el tuyo.
 */

const s = (id) => `sup_${id}`;
const c = (id) => `cat_${id}`;

const SUPERMERCADOS = [
  { id: s('mercadona'), nombre: 'Mercadona', color: '#00A65A' },
  { id: s('lidl'), nombre: 'Lidl', color: '#0050AA' },
  { id: s('carrefour'), nombre: 'Carrefour', color: '#004E9F' },
  { id: s('dia'), nombre: 'Dia', color: '#D52B1E' },
  { id: s('alcampo'), nombre: 'Alcampo', color: '#E30613' },
];

const CATEGORIAS = [
  { id: c('frescos'), nombre: 'Frutas y verduras', icono: '🥬' },
  { id: c('carne'), nombre: 'Carne y pescado', icono: '🍗' },
  { id: c('lacteos'), nombre: 'Lácteos y huevos', icono: '🥛' },
  { id: c('despensa'), nombre: 'Despensa', icono: '🍝' },
  { id: c('congelados'), nombre: 'Congelados', icono: '🧊' },
  { id: c('bebidas'), nombre: 'Bebidas', icono: '🥤' },
  { id: c('limpieza'), nombre: 'Limpieza', icono: '🧽' },
  { id: c('higiene'), nombre: 'Higiene', icono: '🧴' },
];

/**
 * [nombre, categoría, unidad, stock, mínimo, { supermercado: precio }]
 *
 * La despensa arranca casi llena a propósito: sólo una decena de productos
 * están bajo mínimo, para que la lista automática se entienda de un vistazo
 * en lugar de aparecer con cincuenta cosas.
 */
const PRODUCTOS_BASE = [
  ['Leche entera 1L', 'lacteos', 'ud', 6, 4, { mercadona: 0.89, lidl: 0.85, dia: 0.92 }],
  ['Huevos docena', 'lacteos', 'ud', 2, 1, { mercadona: 2.35, carrefour: 2.49, lidl: 2.19 }],
  ['Yogur natural pack 4', 'lacteos', 'pack', 3, 2, { mercadona: 1.45, dia: 1.55 }],
  ['Queso rallado 200g', 'lacteos', 'ud', 0, 1, { mercadona: 1.75, lidl: 1.59 }],
  ['Mantequilla 250g', 'lacteos', 'ud', 2, 1, { mercadona: 2.1, carrefour: 2.25 }],

  ['Pechuga de pollo', 'carne', 'kg', 1.5, 1, { mercadona: 6.5, carrefour: 6.95, alcampo: 6.2 }],
  ['Carne picada mixta', 'carne', 'kg', 0, 0.5, { mercadona: 7.2, lidl: 6.9 }],
  ['Salmón fresco', 'carne', 'kg', 1, 0.5, { carrefour: 12.9, alcampo: 11.5 }],
  ['Jamón serrano lonchas', 'carne', 'ud', 3, 1, { mercadona: 2.85, dia: 2.99 }],

  ['Tomates', 'frescos', 'kg', 1.5, 1, { mercadona: 1.99, alcampo: 1.75, dia: 2.1 }],
  ['Cebollas', 'frescos', 'kg', 2, 1, { mercadona: 1.35, lidl: 1.25 }],
  ['Patatas', 'frescos', 'kg', 4, 2, { mercadona: 1.29, alcampo: 1.15 }],
  ['Plátanos', 'frescos', 'kg', 0.5, 1, { mercadona: 1.85, carrefour: 1.95 }],
  ['Manzanas', 'frescos', 'kg', 2, 1, { mercadona: 2.15, dia: 2.29 }],
  ['Lechuga', 'frescos', 'ud', 0, 1, { mercadona: 1.1, lidl: 0.99 }],
  ['Ajos', 'frescos', 'ud', 3, 1, { mercadona: 0.95 }],

  ['Pasta espaguetis 500g', 'despensa', 'ud', 4, 2, { mercadona: 0.89, lidl: 0.79, dia: 0.95 }],
  ['Arroz redondo 1kg', 'despensa', 'ud', 3, 1, { mercadona: 1.25, carrefour: 1.39 }],
  ['Aceite de oliva virgen extra 1L', 'despensa', 'ud', 2, 1, { mercadona: 8.5, alcampo: 8.15, lidl: 8.35 }],
  ['Tomate frito 400g', 'despensa', 'ud', 5, 3, { mercadona: 0.75, dia: 0.82 }],
  ['Atún en aceite pack 3', 'despensa', 'pack', 4, 2, { mercadona: 2.4, lidl: 2.25 }],
  ['Pan de molde', 'despensa', 'ud', 1, 1, { mercadona: 1.35, carrefour: 1.45 }],
  ['Café molido 250g', 'despensa', 'ud', 2, 1, { mercadona: 2.95, dia: 3.15 }],
  ['Azúcar 1kg', 'despensa', 'ud', 2, 1, { mercadona: 1.15, alcampo: 1.05 }],
  ['Sal 1kg', 'despensa', 'ud', 2, 1, { mercadona: 0.45 }],
  ['Harina 1kg', 'despensa', 'ud', 2, 1, { mercadona: 0.65, lidl: 0.59 }],
  ['Legumbres cocidas bote', 'despensa', 'ud', 5, 2, { mercadona: 0.85, dia: 0.89 }],
  ['Cereales desayuno', 'despensa', 'ud', 0, 1, { mercadona: 2.65, carrefour: 2.8 }],
  ['Galletas', 'despensa', 'ud', 3, 1, { mercadona: 1.55, lidl: 1.35 }],

  ['Guisantes congelados 1kg', 'congelados', 'ud', 2, 1, { mercadona: 1.85, lidl: 1.69 }],
  ['Pizza congelada', 'congelados', 'ud', 3, 1, { mercadona: 2.5, carrefour: 2.75 }],
  ['Verdura para wok congelada', 'congelados', 'ud', 0, 1, { lidl: 1.95, alcampo: 2.05 }],

  ['Agua mineral pack 6', 'bebidas', 'pack', 4, 2, { mercadona: 1.8, dia: 1.95, alcampo: 1.65 }],
  ['Refresco cola 2L', 'bebidas', 'ud', 1, 2, { mercadona: 1.45, carrefour: 1.55 }],
  ['Zumo naranja 1L', 'bebidas', 'ud', 3, 1, { mercadona: 1.25, lidl: 1.15 }],
  ['Cerveza pack 6', 'bebidas', 'pack', 2, 1, { mercadona: 2.85, dia: 3.05 }],

  ['Detergente lavadora', 'limpieza', 'ud', 2, 1, { mercadona: 4.5, alcampo: 4.25, carrefour: 4.75 }],
  ['Suavizante', 'limpieza', 'ud', 0, 1, { mercadona: 2.35, dia: 2.5 }],
  ['Lavavajillas a mano', 'limpieza', 'ud', 3, 1, { mercadona: 1.65, lidl: 1.45 }],
  ['Pastillas lavavajillas', 'limpieza', 'ud', 2, 1, { mercadona: 5.5, carrefour: 5.95 }],
  ['Papel de cocina', 'limpieza', 'pack', 1, 2, { mercadona: 2.15, alcampo: 1.99 }],
  ['Bolsas de basura', 'limpieza', 'ud', 3, 1, { mercadona: 1.35, dia: 1.45 }],
  ['Limpiacristales', 'limpieza', 'ud', 2, 1, { mercadona: 1.55 }],
  ['Lejía', 'limpieza', 'ud', 2, 1, { mercadona: 1.05, lidl: 0.95 }],

  ['Papel higiénico pack 12', 'higiene', 'pack', 1, 2, { mercadona: 4.95, lidl: 4.5, alcampo: 4.75 }],
  ['Gel de ducha', 'higiene', 'ud', 3, 1, { mercadona: 1.85, dia: 1.99 }],
  ['Champú', 'higiene', 'ud', 2, 1, { mercadona: 2.25, carrefour: 2.45 }],
  ['Pasta de dientes', 'higiene', 'ud', 0, 1, { mercadona: 1.75, lidl: 1.55 }],
  ['Desodorante', 'higiene', 'ud', 2, 1, { mercadona: 2.15 }],
];

const hoy = new Date().toISOString().slice(0, 10);

const PRODUCTOS = PRODUCTOS_BASE.map(([nombre, cat, unidad, stock, minimo, precios], i) => ({
  id: `prod_seed${i}`,
  nombre,
  categoriaId: c(cat),
  unidad,
  stock,
  stockMinimo: minimo,
  precios: Object.fromEntries(
    Object.entries(precios).map(([sup, precio]) => [s(sup), [{ precio, fecha: hoy }]])
  ),
}));

export const SEED = {
  version: 1,
  supermercados: SUPERMERCADOS,
  categorias: CATEGORIAS,
  productos: PRODUCTOS,
  lista: [],
  ignorarAuto: [],
  compra: null,
  compras: [],
};
