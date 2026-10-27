# ASSET BIBLE · Soft Isometric Game Art

Fuente de verdad visual de Cozy Room. La referencia canónica es [la imagen aportada por el usuario](reference-oak-cozy.png). Los sprites de Oak Cozy constituyen el conjunto de control antes de ampliar el catálogo.

## Cámara y escala

Vista ortográfica elevada de tres cuartos, verticales verticales, caras frontal y derecha visibles, luz arriba a la izquierda. No utilizar perspectiva convergente. La cámara se conserva al cambiar de colección. La referencia es una lámina de mobiliario; la arquitectura de la habitación se ha creado a partir de sus materiales y luz.

El motor conserva su proyección estable: `screenX = 700 + x - y`, `screenY = 480 + (x+y)*0.36 - z`, lienzo lógico 1400 × 900. Cada celda tiene 88 unidades de mundo; su rombo proyectado mide 176 × 63.36. El ángulo de las aristas del suelo es ±19.8°. La ilustración tiene el mismo carácter ortográfico, con volúmenes ligeramente exagerados. No se recalculan colisiones a partir del dibujo.

Huellas: silla 1×1, escritorio 2×1, armario 2×1, estantería 2×1, cama 3×2, cajonera 1×1, alfombra 2×2. Los objetos pueden sobresalir de su huella: los contornos y las patas deben revisarse dentro de la escena. El escritorio ancho conserva su huella 3×1.

## Escala visible de control

| Pieza | Anchura visible en unidades de mundo |
|---|---:|
| Escritorio | 260 |
| Silla | 125 |
| Armario / estantería | 200 |
| Cama | 365 |
| Cajonera | 158 |
| Lámpara de pie | 86 |
| Alfombra | 320 |
| Taza | 30 |
| Flexo | 52 |
| Planta de sobremesa | 60 |
| Libros | 47 |
| Vela | 25 |
| Portátil | 87 |

Las colecciones utilizan los mismos tamaños de control. El manifiesto guarda el tamaño del lienzo completo: el importador calcula la anchura visible con alfa >40 para no contar ruido casi transparente. Los pivotes requieren inspección final, no una fórmula automática.

## Canvas y pivot

Maestros PNG RGBA de resolución alta (normalmente 1254 × 1254). Entrega WebP de hasta 768 px, calidad 88, alfa conservado. Las habitaciones usan su propio lienzo 14:9 y WebP a calidad 90.

Cada entrada de `assets/sprites.mjs` contiene `src`, `master`, `width`, `aspect`, `pivot`, `pixels`, `bytes` y una máscara alfa 32×32. `pivot` es una coordenada normalizada del lienzo, elegida en el centro lógico del contacto con el suelo o con la superficie. No siempre coincide con el píxel opaco inferior.

El renderer coloca ese pivot en el ancla del motor dentro del marco 420×400, ancla 210,330. La misma función y archivo se usan en habitación y ghost; las miniaturas encajan el archivo en una caja sin alterar sus proporciones. La selección con ratón comprueba la máscara alfa para que los márgenes transparentes no tapen otros objetos.

## Iluminación y materiales

Luz principal suave desde arriba a la izquierda, sombra de contacto hacia abajo a la derecha. Contorno marrón oscuro cálido equivalente a 1–2 px a escala de juego, nunca negro puro. Entre 3 y 5 niveles legibles de luz y sombra, detalle medio y pincelada contenida. Volúmenes algo gruesos, aristas suavizadas; no estética infantil ni realismo fotográfico.

- Madera: veta contenida, canto iluminado, sombra bajo tablero y juntas.
- Metal: reflejos cortos, arista nítida y sombras más profundas.
- Tela: tejido sugerido, pliegues grandes y costuras legibles.
- Cerámica: masa redondeada, esmalte suave, pequeñas irregularidades.
- Cristal: transparencia y reflejo controlados, sin fondos incorporados.
- Papel: cantos crema, leve desgaste, sin texto generado ilegible.
- Plantas: hojas agrupadas con luz/sombra, verde natural.
- Plástico: mate y redondeado; no brillo fotográfico.
- Cuero: costura, pliegues suaves y variación tonal.
- Luz: halo pequeño y suave, nunca quemar el objeto.

## Colecciones

| ID | Paleta y materiales |
|---|---|
| oak-cozy | Roble cálido, crema, salvia, musgo, terracota, lino y cerámica |
| gamer | Nogal, carbón, acentos teal y violeta discretos |
| futuristic | Marfil mate, grafito, gris frío, menta y cian contenidos |
| industrial | Madera cruda, hierro oscuro, cuero cognac, oliva, hormigón y ámbar |

Cambian materiales y lenguaje de las piezas; cámara, iluminación, escala y nivel de acabado permanecen comunes. Ninguna colección requiere reglas de placement propias. Los compañeros son pequeños animales tranquilos, con estados idle/sleep/sit, sin necesidades ni obligaciones.

## Atomicidad y superficies

Un escritorio es solo un escritorio. Un estante llega vacío. Portátil, monitor, PC, taza, libros, lámpara y plantas son instancias independientes, combinables entre colecciones. Rechazar cualquier generación que incorpore el mueble anfitrión a un accesorio.

Los slots viven en el catálogo: coordenadas x/y locales en celdas y z opcional en unidades de mundo. El escritorio ofrece tres apoyos, la cajonera dos; los estantes tienen alturas diferentes. Se persisten `parentSurfaceId` y `surfaceSlot`. Mover el anfitrión mueve sus accesorios; guardar o vender el anfitrión devuelve los accesorios al inventario. La propiedad se conserva.

## Orientaciones y estados

La entrega inicial utiliza una orientación canónica (clave 0). No hay rotación CSS, espejo ni cuatro dibujos falsificados. Para ampliar a NE/NW/SE/SW, añadir sprites separados en `orientations` con claves 0/90/180/270 y sus propios pivotes. El motor ya intercambia huellas y transforma slots; la UI solo ofrece vistas publicadas.

Los objetos de antiguas partidas con una vista retirada se adaptan si caben. Si la nueva huella choca, el objeto y sus accesorios vuelven al inventario sin perder monedas, tareas o libros.

Las ilustraciones murales se generan de frente y se proyectan sobre el plano de la pared; esto no es una rotación de mobiliario.

## Exportación y organización

`assets/masters/<collection>/<id>.png` conserva el maestro.
`assets/items/<collection>/<furniture|accessories|wall|companions>/<id>.webp` es producción.
`<id>-sleep.webp` y `<id>-sit.webp` son variantes de estado.
Nombres estables en minúsculas y guiones; conservar los IDs de partidas antiguas.
`assets/sprites.mjs` es el manifiesto de arte. `logic/catalog.mjs` y `logic/collections.mjs` contienen datos de juego. Cambiar un sprite no modifica las reglas del motor.

Solo objetos aislados sobre transparencia real. Sin suelo, pared, UI, rótulos, tarjetas o fondos en sprites de objetos. No usar grandes hojas como archivo de producción. El catálogo carga imágenes de forma diferida y las piezas colocadas se solicitan inmediatamente; nunca descargar los maestros en la aplicación.

## Flujo de producción y revisión

1. Usar la referencia canónica y una pieza ya aprobada con el prompt de este directorio.
2. Generar un archivo por objeto. Inspeccionar su atomicidad y transparencia.
3. Importar con `python cozy/tools/import-sprite.py SOURCE ID --collection COLLECTION --category CATEGORY --width WIDTH --pivot-y Y`.
4. Ajustar pivot y escala en el manifiesto; comprobar el apoyo con grid visible.
5. Ver el conjunto completo dentro de la habitación y en `tools/preview.html`.
6. Comparar silueta, cámara, luz, materiales, escala y acabado con la referencia.
7. Validar ghost idéntico, colisiones, selección por alfa, superficies y persistencia.
8. Revisar escritorio, móvil 360 px, teclado y movimiento reducido.

Los antiguos generadores SVG solo documentan el prototipo. No constituyen una fuente de arte de producción.
