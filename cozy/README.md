# Cozy Room · constructor isométrico ilustrado

Aplicación estática aislada en `/cozy/`: HTML, CSS y JavaScript sin frameworks, compilación, backend, fuentes remotas ni CDN. Empiezas con una habitación vacía y 450 monedas. Tareas, concentración y lectura financian los muebles; no hay rachas, castigos ni compras reales.

## Ejecutar

Desde la raíz del repositorio:

```sh
python -m http.server 4173 --bind 127.0.0.1
```

Abrir `http://127.0.0.1:4173/cozy/`. Los módulos ES necesitan HTTP. `?debug=true` usa un guardado separado y ofrece monedas, objetos, compañeros, tamaños, grid y reinicio del comienzo.

## Arte y motor

- [Asset Bible](docs/ASSET_BIBLE.md): cámara, pivotes, materiales, escala, exportación y reglas de producción.
- [Plantilla de prompts](docs/ASSET_PROMPT_TEMPLATE.md): referencia y prompts para mantener el estilo.
- `assets/masters/`: maestros PNG con alfa.
- `assets/items/`: WebP independientes por colección y tipo.
- `assets/sprites.mjs`: rutas, pivotes, escala, vistas, estados y máscara alfa.
- `assets/room/illustrated-*.webp`: las tres habitaciones vacías.
- `logic/catalog.mjs` y `logic/collections.mjs`: precios, huellas, superficies, colecciones y desbloqueos.
- `logic/grid.mjs`: proyección, colisiones, superficies y profundidad.
- `logic/engine.mjs`: transacciones, economía y productividad.
- `logic/storage.mjs`: validación, migración y único acceso a localStorage.
- `ui/edit.mjs`: Pointer Events, ghost, teclado y selección por alfa.
- `ui/helpers.mjs`: renderer común a habitación, ghost, tienda e inventario.
- `tools/preview.html`: revisión de cada colección, posturas y escala real.
- `tools/import-sprite.py`: importación y optimización; no dibuja mobiliario.

Las ilustraciones son archivos externos. Cambiar un WebP no cambia placement. Los antiguos generadores SVG se conservan como referencia del prototipo y no se usan para producir nuevos muebles.

## Construir

Arrastrar desde la bandeja con ratón o toque. El ghost utiliza el mismo sprite, pivot y escala que el objeto colocado. Verde suave si cabe; coral si no. Soltar solo modifica el guardado si la posición es válida. Esc cancela sin modificarlo.

Alternativa de teclado: seleccionar una pieza, mover con flechas, colocar con Enter o el botón Colocar. Enter sobre una pieza colocada abre Mover, Guardar y Vender. Clic secundario y pulsación larga ofrecen los mismos controles. Comprar ofrece Colocar ahora.

La primera entrega ilustrada tiene una orientación canónica por pieza. El motor admite cuatro orientaciones y la UI ofrecerá Girar cuando existan vistas ilustradas adicionales; nunca gira un PNG con CSS.

## Colocación

Coordenadas lógicas gx/gy, celdas de 88 unidades y escena 1400×900. Proyección `[700+x-y,480+(x+y)*0.36-z]`.

Suelo: ocupación por huella. Alfombras: capa separada que admite muebles encima. Pared: cuatro huecos por lado. Superficie: un accesorio por slot local, con padre persistido. Los escritorios principales tienen tres apoyos; las cajoneras dos; los estantes admiten diferentes alturas. Mover el anfitrión mueve sus accesorios. Guardarlo o venderlo devuelve estos al inventario.

Las colecciones Oak Cozy, Gamer, Futuristic e Industrial se combinan libremente. La tienda filtra por colección y por Muebles, Accesorios, Pared y Compañeros. Los animales permiten descansar, dormir o sentarse; no necesitan cuidados.

## Persistencia

Se conserva la clave v2 y todo el progreso existente. Los accesorios antiguos se vinculan a su anfitrión. Las vistas retiradas se adaptan si caben; cuando chocan, el mueble y sus accesorios regresan al inventario. No se pierden monedas, tareas, libros ni unidades compradas.

Los datos se guardan solo en este navegador. Si un guardado no es válido se mantiene una copia de recuperación. No hay sincronización de cuenta ni servidor.

## Validación

Desde la raíz:

```sh
node --test cozy/tests/engine.test.mjs
node --test cozy/tests/assets.test.mjs
node cozy/tests/browser.cjs
node cozy/tests/builder.cjs
```

Las dos últimas pruebas requieren Playwright solo en desarrollo. Se puede indicar su ruta mediante `PLAYWRIGHT_MODULE` y el navegador mediante `PLAYWRIGHT_CHANNEL=msedge`.

`node cozy/tools/capture-art.cjs` captura el Golden Set en una sesión de pruebas separada. Usa `COZY_URL` para cambiar la URL local. `--guides` captura la geometría de referencia del grid.

`node cozy/tools/review-art.cjs` revisa las cuatro colecciones, una escena mezclada, compañeros, móvil y solicitudes de imágenes. Capturas y resultados en [docs/qa](docs/qa/). Hay 88 objetos, seis variantes de postura y tres habitaciones ilustradas; los maestros no se descargan durante el juego.

## Hosting

Todas las rutas se resuelven respecto al documento o a import.meta.url. Funciona en localhost, `revikoo.com/cozy/` y `/revikoo-web/cozy/`. No se modifican la homepage, identidad, logos, CNAME ni otras aplicaciones del repositorio.
