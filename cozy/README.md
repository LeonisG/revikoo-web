# Cozy Room · constructor isométrico con arrastre

Empiezas con una habitación vacía y un presupuesto. Lo que haces en tu día —tareas,
sesiones de concentración, lectura— te da monedas, y con ellas amueblas y reorganizas
tu espacio sobre una rejilla. La habitación es el producto; la productividad es lo que
la hace crecer.

Aplicación estática, sin dependencias, sin compilación y completamente aislada dentro
de `/cozy/`.

## Ejecutar

Desde la raíz del repositorio:

```sh
python -m http.server 4173 --bind 127.0.0.1
```

Abrir `http://127.0.0.1:4173/cozy/`. Los módulos ES necesitan HTTP; no abrir
`index.html` mediante `file://`. Añadir `?debug=true` para la mesa de pruebas, que usa
su propio almacenamiento y no toca el progreso normal.

No hay instalación de dependencias, compilación, backend, fuentes remotas ni CDN.

## El bucle

1. Eliges el tamaño de la habitación y gastas el presupuesto inicial en lo básico.
2. Arrastras lo que has comprado desde la bandeja a la rejilla, en modo **Editar**.
3. Haces cosas reales: tareas, foco, lectura. Eso da monedas.
4. Compras, colocas, recolocas, vendes lo que no encaja.
5. La habitación sube de nivel, se completan colecciones y aparecen compañeros.

Las monedas solo se ganan haciendo. No hay rachas, ni castigos, ni nada que caduque:
una propuesta que hoy no te apetece sigue ahí mañana.

## Estructura

```text
cozy/
  index.html                 Escena, modo edición, flujo inicial y diálogos
  app.mjs                    Coordinación, reloj y pistas contextuales
  styles/cozy.css            Estilos por capas: reset, world, objects, paper,
                             instruments, builder, responsive
  assets/
    manifest.mjs             Rutas de las capas por tamaño de habitación
    room/shell-*.svg         Habitación vacía: paredes, suelo, zócalo
    room/window-*.svg        Ventana por tamaño y por estado del cielo
    room/light-*.svg         Luz de la ventana proyectada en el suelo
    room/mask-*.svg          Silueta plana: recorta las pasadas de iluminación
    objects.svg              Un símbolo por objeto del catálogo
  logic/
    grid.mjs                 Proyección, huellas, colisiones y orden de pintado
    catalog.mjs              Definición de cada objeto que se puede poseer
    config.mjs               Economía, tamaños, niveles, propuestas y logros
    engine.mjs               Transacciones y reglas del juego
    storage.mjs              Único acceso a localStorage, versión y migración
    events.mjs               Eventos internos, sin red
    audio.mjs                Ambiente e interacciones Web Audio
  ui/
    room.mjs                 Pintado de la habitación, iluminación y parallax
    edit.mjs                 Modo edición: rejilla, previsualización, girar, guardar
    setup.mjs                Construye tu primera habitación
    panels.mjs               Cuaderno, foco, biblioteca, tienda, progreso, ajustes
    helpers.mjs              Iconos, escape de HTML y arte de objetos
  tools/
    lib.mjs                  Primitivas de dibujo compartidas
    draw-room.mjs            Genera la habitación vacía, por tamaño
    draw-objects.mjs         Genera objects.svg
    preview.html             Hoja de contacto de todos los objetos
```

## La rejilla

Todo lo espacial vive en `logic/grid.mjs`, que no toca el DOM ni el almacenamiento.
Hay tres sistemas de coordenadas y conviene no mezclarlos:

| | |
|---|---|
| celda `(gx, gy)` | índices enteros de la rejilla |
| mundo `(x, y, z)` | unidades del diorama; `x` e `y` recorren el suelo, `z` es altura |
| escena `(%, %)` | posición dentro del lienzo 1400 × 900 |

La proyección es ortográfica: `pantalla = [700 + x - y, 480 + (x + y) · 0,36 - z]`.
`gx` crece hacia abajo-derecha y `gy` hacia abajo-izquierda, así que la profundidad de
una celda es simplemente `gx + gy`: cuanto mayor, más cerca del espectador. Esa suma es
la que ordena el pintado.

`tools/draw-room.mjs` y `tools/draw-objects.mjs` usan exactamente la misma proyección
(`tools/lib.mjs` importa las constantes de `grid.mjs`). La geometría se define
una sola vez en `logic/grid.mjs`.

### Reglas de colocación

- **suelo**: ocupa sus celdas; nadie más puede ocuparlas.
- **superficie**: necesita apoyarse en un mueble con `surface: true`; cada slot local
  admite un accesorio. Se guardan `parentSurfaceId` y `surfaceSlot`. La habitación lo eleva hasta la cara superior de su anfitrión
  (`top`), así que un flexo sobre un escritorio se dibuja sobre el escritorio.
- **pared**: cuelga en uno de los cuatro huecos de cada pared. No choca con el suelo.
- **alfombras** (`flat: true`) se tumban bajo todo lo demás y comparten sus celdas.

Girar intercambia la huella y selecciona un sprite propio: un escritorio de 2×1
girado es de 1×2. Mover o girar un mueble lleva consigo sus accesorios. Guardarlo o
venderlo devuelve los accesorios al inventario. Alfombras separadas pueden coexistir;
dos alfombras no pueden compartir celdas.

## Construir

Arrastra desde la bandeja con ratón o toque. El objeto aparece translúcido sobre su
huella; verde suave si cabe y coral si no. Soltar confirma solo si es válido.
También puedes elegir un objeto, moverlo con flechas, girarlo con R y colocarlo con
Enter o el botón Colocar. Esc/Cancelar conserva exactamente el estado previo.

Un clic, pulsación larga, clic secundario o Enter sobre un objeto abre Mover,
Girar, Guardar y Vender. Comprar ofrece **Colocar ahora**. El presupuesto inicial
es 450: en la habitación pequeña permite escritorio, silla, estante bajo, vela y
planta (426 en total). Las partidas existentes conservan sus monedas.

El controlador usa Pointer Events, captura del puntero y un umbral de movimiento.
No escribe durante el drag. La misma validación de `grid.mjs` alimenta el ghost y
la transacción final. El desplazamiento libre en píxeles nunca se persiste.

## Añadir un objeto

1. Dibujarlo en `tools/draw-objects.mjs` con `draw(id, w, h, ...)`, usando la
   proyección de su propia huella. El arte se dibuja a tamaño real dentro de una caja
   común, que es lo que hace que una silla sea del tamaño de una silla al lado de un
   escritorio.
2. `node tools/draw-objects.mjs` para regenerar `assets/objects.svg`.
3. Añadir su definición a `logic/catalog.mjs`: huella, precio, categoría, tipo de
   colocación, si gira, si es superficie, su `glow` si da luz, y su colección.
4. Abrir `tools/preview.html` para verlo a escala sobre su huella.

No hace falta tocar colocación, pintado, tienda ni economía: todo sale de la definición.

La [ASSET BIBLE](./ASSET-BIBLE.md) fija cámara, materiales, paleta, tamaños, pivotes,
familias y exportación. Los muebles rotables se generan desde `tools/furniture.mjs`;
los accesorios desde `tools/draw-objects.mjs`. La hoja de contacto incluye un
selector de orientación. Son SVG originales preparados para sustitución por arte
final, usando el mismo manifiesto para habitación, tienda, inventario y ghost.

## Iluminación

Son tres pasadas superpuestas y el orden importa:

1. un grado de color sobre `.room-camera` — el color de la hora;
2. `.scene-shade` y `.scene-light` en `multiply` — la sombra;
3. `.glow-layer` en `screen` por encima — las luces.

Una luz colocada por debajo de la pasada de sombra se apaga justo cuando debería
sostener la habitación. Las tres se recortan con `mask-*.svg`, la silueta plana de la
habitación: un polígono no basta, porque una capa `multiply` sobre un fondo transparente
pinta su propio color y aparece como un bloque pálido.

La luz la dan los objetos que hayas colocado. Una habitación sin lámparas de noche está
oscura de verdad, y por eso merece la pena comprar una.

## Persistencia

`logic/storage.mjs` es el único módulo que toca `localStorage`. El estado se valida al
cargar; si no es válido se guarda una copia de recuperación y se empieza de cero.

Una partida de la V0.1 se migra automáticamente: se conservan monedas, tareas, libros,
historial de foco y preferencias, y los objetos que ya estaban comprados vuelven como
unidades guardadas. La distribución en los diez huecos fijos de la V0.1 no sobrevive a
la rejilla, así que la habitación se vuelve a montar desde cero.

Las partidas de la V0.2 conservan su distribución. Al cargar se vinculan los
accesorios antiguos a su anfitrión sin reiniciar monedas ni productividad; estos
campos adicionales se persisten con la siguiente acción. Se mantiene la clave v2.

## Pruebas

```sh
node --test tests/engine.test.mjs     # reglas, rejilla, economía, migración
node tests/browser.cjs                # QA de navegador, necesita Playwright
node tests/builder.cjs                # drag real, touch, cancel, superficies, compra
```

Las pruebas de navegador son opcionales y no son dependencia de producción. Usar
`PLAYWRIGHT_MODULE` si Playwright no está en el entorno.

## Aislamiento

Todo vive bajo `/cozy/`. No se modifican la homepage, los estilos, los logos, la
navegación, el `CNAME`, el `.nojekyll` ni las demás aplicaciones del repositorio. Todas
las rutas son relativas al documento o a `import.meta.url`, así que funciona igual en
`localhost`, en `revikoo.com/cozy/` y bajo `/revikoo-web/cozy/`.
