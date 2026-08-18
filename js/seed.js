/**
 * Catálogo inicial de CASA J.
 *
 * Generado a partir de "Lista_LIDL_MERCADONA_ALDI.xlsx": comparativa de
 * productos por momento del día entre Lidl, Mercadona y Aldi, con la cadena
 * recomendada de cada uno.
 *
 * Cada producto trae el precio de su cadena recomendada. Cuando anotes el
 * precio del mismo producto en otro súper, el comparador y el botón
 * "Súper más barato" empiezan a funcionar solos.
 */

const CATEGORIAS = [
  { id: "cat_desayuno", nombre: "Desayuno", icono: "🥐" },
  { id: "cat_comida", nombre: "Comida", icono: "🍽️" },
  { id: "cat_merienda", nombre: "Merienda", icono: "🍎" },
  { id: "cat_cena", nombre: "Cena", icono: "🌙" },
];

const SUPERMERCADOS = [
  { id: "sup_lidl", nombre: "Lidl", color: "#0050AA" },
  { id: "sup_mercadona", nombre: "Mercadona", color: "#00A65A" },
  { id: "sup_aldi", nombre: "Aldi", color: "#009FE3" },
];

/**
 * [nombre, categoría, unidad, marca, formato, supermercado, precio]
 *
 * El stock arranca en 2 con mínimo 1: se asume un par de cada cosa para que la
 * despensa no aparezca entera en rojo el primer día. Ajústalo desde Inventario
 * y el semáforo se calibra solo.
 */
const PRODUCTOS_BASE = [
  ["Leche Semi 1L", "desayuno", "ud", "Hacendado", "Brick 1L", "mercadona", 0.95],
  ["Café molido mezcla 250g", "desayuno", "ud", "Bellarom", "Paquete 250g", "lidl", 1.79],
  ["Cacao soluble 800g-1kg", "desayuno", "ud", "Milsani", "Bote 800g", "aldi", 3.2],
  ["Cereales corn flakes 500g", "desayuno", "ud", "Sondey / Harvest", "Caja 500g", "aldi", 0.85],
  ["Pan de molde 460g", "desayuno", "ud", "Hacendado", "Bolsa 460g", "mercadona", 1.15],
  ["Galletas María 800g", "desayuno", "ud", "Sondey", "Paquete 800g", "lidl", 1.2],
  ["Mermelada de fresa 340g", "desayuno", "ud", "Fior di Frutta", "Tarro 340g", "aldi", 1.1],
  ["Mantequilla 250g", "desayuno", "ud", "Milbona", "Pastilla 250g", "lidl", 1.75],
  ["Zumo de naranja 1L", "desayuno", "ud", "Solevita", "Brick 1L", "lidl", 1.2],
  ["Yogur natural pack 4", "desayuno", "pack", "Hacendado", "Pack 4 x 125g", "mercadona", 1.15],
  ["Magdalenas 350g", "desayuno", "ud", "Sondey", "Bolsa 12 uds", "aldi", 1.3],
  ["Aceite oliva virgen extra 1L", "desayuno", "ud", "Hacendado", "Botella 1L", "mercadona", 7.5],
  ["Tomate triturado 400g", "desayuno", "ud", "Freshona", "Lata 400g", "lidl", 0.55],
  ["Copos de avena 500g", "desayuno", "ud", "Harvest Morn", "Paquete 500g", "aldi", 0.85],

  ["Arroz redondo 1kg", "comida", "ud", "Hacendado", "Paquete 1kg", "mercadona", 1.05],
  ["Espaguetis 500g", "comida", "ud", "Combino", "Paquete 500g", "lidl", 0.75],
  ["Tomate frito 780g", "comida", "ud", "Hacendado", "Bote 780g", "mercadona", 1.2],
  ["Atún claro aceite girasol pack 3", "comida", "pack", "Hacendado", "3 x 80g", "mercadona", 2.1],
  ["Garbanzos cocidos bote 570g", "comida", "ud", "El Cocinero / Delikato", "Bote 570g", "aldi", 0.65],
  ["Lentejas cocidas bote 570g", "comida", "ud", "Freshona", "Bote 570g", "lidl", 0.65],
  ["Pechuga de pollo bandeja", "comida", "kg", "Hacendado", "Bandeja (EUR/kg)", "mercadona", 5.5],
  ["Carne picada mixta 500g", "comida", "ud", null, "Bandeja 500g", "lidl", 3.2],
  ["Pizza refrigerada", "comida", "ud", "Hacendado", "Unidad ~400g", "mercadona", 2.5],
  ["Patatas 5kg", "comida", "ud", null, "Malla 5kg", "aldi", 3.5],
  ["Menestra verduras congeladas 1kg", "comida", "ud", "Freshona", "Bolsa 1kg", "lidl", 1.6],
  ["Caldo de pollo 1L", "comida", "ud", "Cucina", "Brick 1L", "aldi", 1.05],
  ["Sal fina 1kg", "comida", "ud", null, "Paquete 1kg", "lidl", 0.35],
  ["Macarrones 500g", "comida", "ud", "Cucina", "Paquete 500g", "aldi", 0.75],

  ["Plátanos", "merienda", "kg", null, "EUR/kg", "aldi", 1.45],
  ["Manzanas", "merienda", "kg", null, "EUR/kg", "aldi", 1.6],
  ["Mezcla frutos secos 200g", "merienda", "ud", "Hacendado", "Bolsa 200g", "mercadona", 2.2],
  ["Barritas de cereales", "merienda", "ud", "Sondey", "Caja 6 uds", "aldi", 1.3],
  ["Chocolate con leche tableta", "merienda", "ud", "Hacendado", "Tableta 125g", "mercadona", 0.95],
  ["Galletas con chocolate", "merienda", "ud", "Sondey", "Paquete", "lidl", 1.2],
  ["Batido de chocolate pack", "merienda", "pack", "Hacendado", "Pack 3 x 200ml", "mercadona", 1.3],
  ["Tortitas de maíz", "merienda", "ud", null, "Paquete", "lidl", 0.85],
  ["Queso en lonchas 200g", "merienda", "ud", "El Mercado", "Sobre 200g", "aldi", 1.4],
  ["Yogur bebible pack", "merienda", "pack", "Milbona", "Pack 4", "lidl", 1.2],
  ["Palitos / regañas", "merienda", "ud", "Hacendado", "Bolsa", "mercadona", 1.1],
  ["Pasas / fruta desecada 200g", "merienda", "ud", null, "Bolsa 200g", "aldi", 1.3],

  ["Huevos M docena", "cena", "ud", null, "Docena", "lidl", 2.2],
  ["Jamón cocido lonchas", "cena", "ud", "El Mercado", "Sobre 200g", "aldi", 1.6],
  ["Pavo lonchas", "cena", "ud", null, "Sobre 200g", "lidl", 1.55],
  ["Ensalada bolsa 4 estaciones", "cena", "ud", "Hacendado", "Bolsa", "mercadona", 1.1],
  ["Crema de verduras 1L", "cena", "ud", "Hacendado", "Brick 1L", "mercadona", 1.6],
  ["Merluza filetes congelada", "cena", "ud", "Almare", "Caja ~400g", "aldi", 4.5],
  ["Hummus", "cena", "ud", "Vemondo", "Tarrina 200g", "lidl", 1.3],
  ["Tortilla de patata refrigerada", "cena", "ud", "Hacendado", "Unidad", "mercadona", 2.4],
  ["Queso semicurado cuña", "cena", "ud", "El Mercado", "Cuña ~250g", "aldi", 3.2],
  ["Palitos de mar (surimi)", "cena", "ud", "Ocean Sea", "Paquete", "lidl", 1.3],
  ["Pan chapata / rústico", "cena", "ud", "Baker's", "Unidad", "lidl", 0.85],
  ["Sopa juliana congelada 1kg", "cena", "ud", null, "Bolsa 1kg", "aldi", 1.5],
];

const STOCK_INICIAL = 2;
const MINIMO_INICIAL = 1;

const hoy = new Date().toISOString().slice(0, 10);

const PRODUCTOS = PRODUCTOS_BASE.map(
  ([nombre, cat, unidad, marca, formato, sup, precio], i) => ({
    id: `prod_seed${i}`,
    nombre,
    categoriaId: `cat_${cat}`,
    unidad,
    marca,
    formato,
    stock: STOCK_INICIAL,
    stockMinimo: MINIMO_INICIAL,
    precios: { [`sup_${sup}`]: [{ precio, fecha: hoy }] },
  })
);

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
