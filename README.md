# CASA J

Inventario de comida y lista de la compra para casa. Aplicación web instalable
en el iPhone: sabes qué te queda, qué hay que reponer, en qué supermercado sale
más barato y cuánto te vas a gastar antes de salir de casa.

Arranca con **52 productos repartidos en desayuno, comida, merienda y cena**,
con su marca, formato y precio en Lidl, Mercadona o Aldi, importados de
`datos/catalogo-casa-j.csv`.

## Qué hace

| Sección | Para qué sirve |
|---|---|
| **Inventario** | Todo lo que hay en casa con semáforo verde / ámbar / rojo. Un toque en − para gastar una unidad. |
| **Lista** | La lista de la compra, agrupada por supermercado y con el total estimado. Se va llenando durante la semana. |
| **Comprar** | Pantalla para usar dentro del súper. Marcas lo que metes al carro; sólo eso suma al inventario. |
| **Catálogo** | Alta y edición manual de productos, supermercados y categorías, más el comparador de precios. |
| **Ajustes** | Importar tu Excel, copias de seguridad e historial de compras. |

### Reposición automática

Cada producto tiene un **mínimo en casa**. Cuando el stock baja de ahí, el producto
entra solo en la lista marcado como `automático`. Si lo sacas a mano, no vuelve a
entrar hasta que repongas y se gaste otra vez — la app no discute contigo.

### La compra no se da por hecha

Empezar una compra hace una foto de la lista. Dentro del súper marcas lo que
realmente coges. Al finalizar:

- lo marcado **suma al inventario** y sale de la lista
- lo que no compraste **se queda en la lista** para la próxima
- el precio que hayas corregido **actualiza el historial** de ese supermercado

### Precios

Cada producto guarda un precio por supermercado, con historial. De ahí salen el
badge de ahorro, el botón «Súper más barato» de la lista y el comparador del
catálogo.

## Instalar en el iPhone

1. Abre la web en **Safari**.
2. Botón de compartir → **Añadir a pantalla de inicio**.
3. Se instala con su icono y se abre a pantalla completa, sin barra del navegador.

Funciona sin conexión, así que sigue yendo dentro del súper aunque no haya cobertura.

## Importar tu Excel

En **Ajustes → Importar catálogo**, subiendo un CSV (`Archivo → Guardar como → CSV`
en Excel) o pegando las celdas directamente.

Las columnas se detectan por su nombre, en cualquier orden. **No hace falta que
el nombre sea exacto**: basta con que empiece por uno de estos términos, así que
`Precio aprox (EUR)` o `Cadena recomendada` se reconocen solos.

| Columna | Alternativas aceptadas | Obligatoria |
|---|---|---|
| `Producto` | Nombre, Artículo, Descripción | Sí |
| `Categoria` | Sección, Familia, Momento, Tipo | No |
| `Marca` | Fabricante | No |
| `Formato` | Envase, Presentación, Tamaño | No |
| `Unidad` | Medida, Uds | No |
| `Stock` | Cantidad, Tengo, Existencias | No |
| `Minimo` | Stock mínimo, Umbral | No |
| `Supermercado` | Cadena, Súper, Tienda | No |
| `Precio` | Coste, Importe, PVP | No |

**La cabecera tampoco tiene que estar en la primera fila.** Se busca entre las
primeras quince, saltando títulos y notas — que es justo como venía el Excel
original de CASA J, con la tabla empezando en la fila 4.

Un producto puede ocupar **varias filas, una por supermercado**: se funden en un
único producto con varios precios.

```csv
Producto;Categoria;Marca;Formato;Unidad;Stock;Minimo;Supermercado;Precio
Leche Semi 1L;Desayuno;Hacendado;Brick 1L;ud;2;1;Mercadona;0,95
Leche Semi 1L;Desayuno;Milbona;Brick 1L;ud;2;1;Lidl;0,89
Café molido mezcla 250g;Desayuno;Bellarom;Paquete 250g;ud;2;1;Lidl;1,79
```

Los supermercados y categorías que no existan se crean solos. Al importar puedes
elegir entre **añadir** a lo que ya tienes (actualiza por nombre) o **reemplazar**
el catálogo entero.

### Si el archivo no trae columna de stock

Los productos nuevos entran con **2 unidades y mínimo 1**. Así la despensa
arranca en verde y el semáforo pasa por ámbar en cuanto gastas la primera
unidad, en vez de marcar el catálogo entero como agotado el primer día.

Al reimportar, los productos que ya existían **conservan la cuenta que llevabas**:
un archivo sin stock nunca pisa lo que tú has contado a mano.

## Dónde viven los datos

En el navegador del dispositivo (`localStorage`). No hay servidor, ni cuenta, ni
nube: nada sale del móvil.

Como contrapartida, cada dispositivo tiene su propia copia. Para eso está
**Ajustes → Copia de seguridad**, que descarga un JSON con todo y lo restaura donde
quieras.

### Sincronizar entre varios móviles más adelante

La persistencia está aislada detrás de un adaptador en `js/store.js`:

```js
const localAdapter = {
  name: 'local',
  async load() { /* ... */ },
  async save(state) { /* ... */ },
};

const ADAPTER = localAdapter;
```

Añadir sincronización es escribir otro adaptador con esas dos funciones contra
Supabase o similar y cambiar `ADAPTER`. Ninguna vista se entera.

## Estructura

```
index.html              Estructura y barra de pestañas
manifest.json           Metadatos de instalación
sw.js                   Service worker (funciona sin conexión)
css/estilos.css         Todo el diseño
icons/                  Iconos de la app
datos/
  catalogo-casa-j.csv   Catálogo inicial, reimportable desde Ajustes
js/
  app.js                Arranque y navegación entre vistas
  store.js              Estado, reglas de negocio y persistencia
  seed.js               Catálogo inicial (generado desde el Excel)
  ui.js                 Formato, toasts y hojas modales
  productoEditor.js     Alta y edición de productos
  importarCSV.js        Lectura y escritura de CSV
  views/
    inventario.js
    lista.js
    compra.js
    catalogo.js
    ajustes.js
```

Sin dependencias ni paso de compilación: son módulos ES que el navegador carga
directamente.

## Probar en local

```bash
python3 -m http.server 8000
```

Y abrir `http://localhost:8000`. Desde el móvil, la IP del ordenador en la misma
red WiFi.

## Publicar en GitHub Pages

**Settings → Pages → Deploy from a branch**, eligiendo la rama y la carpeta `/ (root)`.
La app queda en `https://<usuario>.github.io/<repositorio>/`.
