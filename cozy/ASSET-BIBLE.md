
# ASSET BIBLE

## SOFT ISOMETRIC PIXEL DIORAMA

Una colección propia: objetos compactos, siluetas reconocibles, madera cálida,
verdes apagados, crema y detalles de cerámica. Inspiración en la claridad espacial
de los juegos de habitaciones y en las referencias ilustradas aportadas. Sin copiar
sus muebles, personajes, interfaces ni texturas. Esta entrega utiliza ilustraciones
SVG originales y sustituibles; no pretende convertir los atlas de referencia en
sprites recortados.

## Cámara, escala y lienzo

- Proyección ortográfica elevada de tres cuartos, compartida por suelo y objetos.
- Una celda mide **88 × 88 unidades de mundo**; su rombo ocupa **176 × 63,36**
  unidades de pantalla (relación 2,78:1). Se conserva esta inclinación para que los
  objetos nuevos encajen con la habitación existente. No mezclar assets 2:1 sin
  reproyectarlos.
- Fórmula global: `screenX = 700 + x − y`,
  `screenY = 480 + (x + y) × 0.36 − z`.
- Escena: 1400 × 900. Cada símbolo: **420 × 400**, fondo transparente.
- Pivote: **(210, 330)**, centro de su huella en el plano de apoyo.
- El contenedor ocupa 30 % del ancho de la escena; nunca escalar cada objeto para
  llenar su thumbnail. Un cuaderno debe seguir siendo pequeño junto a una cama.
- Cama: 3×2; escritorio: 2×1; escritorio largo: 3×1; armario/biblioteca: 2×1;
  silla: 1×1; alfombras actuales: 2×2. La metadata admite otros tamaños.
- El lienzo puede desbordar al renderizar SVG. En una exportación raster de una
  pieza grande ampliar el margen transparente y declarar el pivote equivalente;
  nunca recortar patas o sombras para encajar el dibujo.

## Luz, contorno y materiales

Luz principal arriba-izquierda en pantalla; sombra proyectada abajo-derecha.
La luz se mantiene fija cuando gira el mueble. Las caras superiores son claras;
las laterales usan tonos distintos. El ambiente de la habitación puede aplicar un
grado de color, pero no cambia el dibujo base de la tienda.

Contorno marrón carbón `#493D32`, de 1,25–1,4 unidades a escala nativa; opacidad
moderada en aristas interiores. Evitar negro puro. Patas, tiradores y hojas deben
leerse a escala móvil. Sombras pintadas suaves, sin textura fotográfica ni ruido.
Tres tonos por material, con un cuarto acento solo cuando aporta volumen.

La paleta está centralizada en `tools/lib.mjs` (`MAT`). Orden: luz, base, sombra.

| Familia | Luz | Base | Sombra |
|---|---|---|---|
| Madera clara / pine | #DFB785 | #C29765 | #A97B4F |
| Roble / oak | #D5A16C | #B47E50 | #92613E |
| Nogal / walnut | #8F6244 | #573A28 | #714C34 |
| Crema | #E8DCC0 | #BDB094 | #D0C3A6 |
| Salvia | #A8B28A | #7A8660 | #626E4C |
| Musgo | #87945C | #626F41 | #485534 |
| Coral | #D68965 | #AA5C47 | #BC7052 |
| Mostaza / brass | #D8AE63 | #A07C3C | #BD934D |
| Azul apagado / teal | #6F9EA0 | #4D7A7E | #3C6165 |
| Burdeos | #AA7971 | #805650 | #67443E |
| Carbón | #69695E | #4D4C43 | #383A33 |

**Biblioteca material:** madera usa oak/pine/walnut, metal usa brass/charcoal,
tela usa cream/sage/coral, cerámica usa cream/coral, papel usa white/cream,
plantas usan sage/moss con acento claro, vidrio usa teal/white con transparencia.
No añadir una paleta independiente por objeto. El arte decorativo previo conserva
algunos acentos compatibles; su contorno se aplica desde el mismo generador.

## Familias y catálogo

`logic/catalog.mjs` define precio, categoría, huella, tipo de colocación, superficies,
familia y sprites. `family` es independiente de `set`: las colecciones y sus premios
anteriores siguen funcionando.

- **Oak Study**: escritorios, estantes, cajonera, armarios y accesorios de madera.
- **Green Retro**: silla salvia y luces de lectura.
- **Soft Cream**: cama de lino y alfombra de avena.

Categorías de producto escalables: desks, chairs, beds, wardrobes, bookshelves,
drawers, tables, lamps, rugs, plants, wall art, decor, tech, pets. Las pestañas de la
tienda agrupan estas familias en categorías comprensibles en español.

Ejemplo equivalente a una definición del catálogo:

```js
{
  id: 'desk', family: 'oak-study', w: 2, h: 1,
  footprint: { width: 2, depth: 1 },
  placement: 'floor', rotatable: true,
  sprites: { 0: 'desk--0', 90: 'desk--90', 180: 'desk--180', 270: 'desk--270' },
  surface: true, top: 142,
  surfaces: [{ x: .5, y: .5 }, { x: 1.5, y: .5 }]
}
```

## Orientaciones y pipeline

Los muebles rotables tienen cuatro dibujos. Se gira la geometría local ANTES de
proyectar. Nunca se gira ni se refleja la imagen final por CSS. `tools/furniture.mjs`
construye formas simples, elimina caras ocultas y ordena los polígonos mediante
partición espacial; así una biblioteca vista desde atrás oculta sus libros.
Este proceso solo se ejecuta al generar assets: el navegador recibe SVG estático,
sin motor 3D, WebGL ni dependencia de compilación.

Nomenclatura: `familia-tipo-variante` para nuevas definiciones; mantener los IDs
existentes para conservar partidas. Sufijo `--0/--90/--180/--270` para orientaciones.
Convención: 0 conserva los ejes locales; 90 transforma `(x,y)` a `(-y,x)` alrededor
del centro; 180 invierte ambos; 270 aplica `(y,-x)`.

Desde la raíz del repositorio:

```sh
node cozy/tools/draw-objects.mjs
```

Abrir `/cozy/tools/preview.html` por HTTP. El selector permite comprobar las cuatro
orientaciones, siempre a escala real y sobre la huella. Revisar siluetas, patas,
caras traseras, transparencias, consistencia de luz y tamaño relativo.

`assets/manifest.mjs` resuelve el mismo asset para tienda, inventario, ghost y
habitación. Para sustituir arte sin cambiar el builder, usar `ITEM_ASSETS[id]` con
`type: 'image', src`, o `sprites[rotation]` para cuatro PNG/WebP transparentes.
Mantener lienzo, escala y pivote. No usar miniaturas ilustradas distintas.

## Paredes, superficies, capas

- FLOOR guarda celdas enteras. La huella se intercambia al girar 90/270 grados.
- WALL guarda pared y gancho lógico (cuatro por pared en esta versión). La lámina
  plana se adapta al plano de esa pared; no se gira como un mueble de suelo.
- SURFACE guarda `parentSurfaceId` y `surfaceSlot`. Sus coordenadas de mundo se
  derivan del anfitrión y de su orientación. Un escritorio tiene dos puntos de
  apoyo, el largo tres. Ampliables mediante metadata, sin tocar la interfaz.
- Pared detrás, alfombra debajo, muebles por extremo frontal de la huella; los
  accesorios se dibujan inmediatamente sobre el anfitrión. Una pieza alta puede
  ocultar otra: la colisión impide compartir suelo, no la ocultación en cámara.
- Al guardar o vender un anfitrión, sus accesorios vuelven al inventario. Al
  moverlo o girarlo, conservan su slot local. Nunca se venden automáticamente.

## Compañeros y animación

Gato, perro y conejo tienen símbolos independientes y el mismo contorno/paleta.
El catálogo declara `animationStates`: idle y sleep usan por ahora la pose de
reposo; sit queda reservado (`null`). No afirmar que existen tres poses dibujadas.
El manifiesto admite `states` como sustituciones futuras. No hay necesidades ni
movimiento libre. Luz/ambiente y el pequeño asentamiento al colocar son las
animaciones actuales; nuevas secuencias pueden usar 2–4 cuadros con el mismo
lienzo y pivote. Respetar siempre `prefers-reduced-motion` y la preferencia interna.

## Contrato del builder y persistencia

`room.placed` se indexa por ID único de instancia (UUID). Los nombres actuales
corresponden a: clave = itemInstanceId, `item` = itemDefinitionId, `gx/gy` = gridX/Y,
`rotation` = orientación; placementType se obtiene de la definición inmutable.
Las superficies añaden parentSurfaceId/surfaceSlot; paredes usan wall/index.
Ningún píxel, porcentaje, escala visual o ghost se guarda.

`inventory[id]` contiene unidades STORED. OWNED es almacenadas + PLACED. AVAILABLE
significa que el objeto se ofrece en el catálogo, aunque falten monedas. LOCKED es
un estado de acceso preparado en metadata, separado del precio; no se bloquean
arbitrariamente los objetos actuales. Varias unidades comparten definición pero
cada colocación tiene una identidad diferente.

Se conserva el formato y las claves v2. Los campos de parentesco son una extensión
compatible: las partidas v2 antiguas infieren anfitrión/slot al cargarse y lo guardan
en su siguiente transacción. Monedas, tareas, libros, foco y distribución permanecen.
Un accesorio antiguo que hubiera quedado sin mueble vuelve al inventario.
V1 conserva su migración anterior. Cancelar un gesto o soltar en un sitio inválido
no escribe en almacenamiento ni cambia inventario, monedas o revisión.

## Comprobación antes de incorporar arte

Verificar las cuatro orientaciones y que las sombras conservan dirección. Arrastrar
el objeto a cada borde y sobre otro mueble; girarlo allí; cancelar; guardar y volver
a colocar. Comprobar accesorios durante movimiento, giro, venta y recarga. Revisar
360 px, teclado, toque y movimiento reducido. Pruebas reproducibles:

```sh
node --test cozy/tests/engine.test.mjs
node cozy/tests/browser.cjs
node cozy/tests/builder.cjs
```

Las dos últimas usan Playwright solo como herramienta de QA; `PLAYWRIGHT_MODULE`
y `PLAYWRIGHT_CHANNEL` permiten utilizar una instalación local y Edge/Chrome.
