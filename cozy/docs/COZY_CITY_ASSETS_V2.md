# Cozy City — pase de assets V2

## Auditoría y alcance

Partimos de la isla V1 publicada en el commit b539b4f: 17 módulos, 275 colocaciones, materiales PBR sin texturas externas, instancias Three.js, cámara ortográfica y animación ambiental. Se revisaron los nueve PNG del ZIP cozy_city_assets_cozygame_v2.zip y los scripts de autoría, carga y animación.

Antes de editar se guardaron modelos, fuente Blender, integración y capturas en cozy/local-backups/island-before-v2/. La escena V1 sigue en source/cozy_city_island_master.blend; la V2 está en source/cozy_city_island_v2.blend. Los maestros y las referencias se entregan localmente, fuera del sitio publicado.

El cambio conserva el layout, las tres parcelas, la arquitectura del banco, sus materiales y sus tres clips. El SHA-256 del banco continúa siendo 7e37897593a84b9e97bdd60b72e829ffc5d09dca9529b2572b455f74c11e908d. La integración usa el mismo motor vanilla y los mismos controles.

## Ocho familias

| Familia | Cambio de forma y uso |
|---|---|
| Caminos | Ocho trazados Bézier con uniones antes del adoquinado, piedras biseladas y bordes suaves. PATH_CURVE y PATH_FORK exportados como módulos adicionales. Se conservan plaza, escaleras y accesos. |
| Bancos | Listones de madera miel, apoyos curvos de hierro, brazos en espiral y tornillería sencilla. |
| Fuente | Cuenco y pedestal torneados, piedra clara, cuatro caídas, nenúfares, espuma y ondas instanciadas. |
| Farolas | Base de piedra, poste oscuro con collares de latón, farol hexagonal cálido e hiedra discreta. |
| Vallas y portones | Postes con apoyo, travesaños arqueados y dos nuevos portones con tablas, bisagras y tirador. |
| Arbustos y flores | Tres variantes de arbusto; grupos blancos, rosas, amarillos y lavanda con pétalos volumétricos. |
| Árboles | Troncos curvos y tres copas: frondosa verde, ornamental rosa y conífera escalonada. Agrupaciones amplias y hojas grandes. |
| Río y cascadas | Anchura variable sobre el eje existente, cauce ajustado, orillas enmarcadas y cortinas de agua con espuma y líneas animadas. |

No son copias literales de los renders de referencia. Las proporciones, paleta y construcción se adaptan a la escala y geometría del mapa existente. Son mallas 3D, visibles desde cualquier ángulo.

## Modelos e integración

- 21 módulos de entorno y 290 colocaciones, más dos módulos de camino en path-kit.glb.
- environment-kit.glb: 1.406.156 bytes, 33.322 triángulos de biblioteca, 48 mallas y 17 materiales.
- terrain.glb: 2.962.760 bytes, 59.516 triángulos.
- bank-island.glb: 3.764.436 bytes, 53.083 triángulos, sin modificaciones.
- Total cargado por el visor: 8.133.352 bytes. path-kit.glb (442.984 bytes) se entrega para reutilización y no se descarga en la escena.
- El manifiesto conserva hashes, estadísticas y los clips.

Las variantes de madera, piedra, hojas y flores usan colores por vértice y paletas compartidas. Esto reduce la biblioteca de 81 a 48 mallas y las llamadas de dibujo de la primera iteración V2 de 396 a 330 con sombras; 172 sin sombras. El incremento respecto a V1 (291 / 149) corresponde a la nueva geometría y variantes. La escena ligera tiene unos 346.000 triángulos; las estadísticas con sombras cuentan también su pasada.

El agua mantiene ondulación sutil; las cascadas reciben líneas de flujo, la fuente gotas alineadas con sus cuatro caídas y ocho ondas comparten una malla instanciada. Se conservan pausa, movimiento reducido, pausa de pestaña oculta y ajustes de calidad. El planificador de frames usa plazos acumulados para evitar que el objetivo de 45 FPS caiga a 40 por la frecuencia de pantalla.

## Autoría reproducible

El script source/upgrade_assets_v2.py importa únicamente las funciones auxiliares de build_island.py y trabaja sobre el maestro V1 abierto. Usa source/placements-v1.json como base estable, reconstruye las familias, los caminos y el agua, instala los cambios y exporta los tres entregables nuevos. No vuelve a exportar el banco.

Para reconstruir, abrir el maestro V1 en Blender y ejecutar el archivo upgrade_assets_v2.py con su ruta real como __file__. Requiere la carpeta source completa y el JSON V1 a su lado. El maestro V2 ya contiene el resultado editable y la biblioteca.

Para iterar una familia en una sesión de autoría, se puede invocar build_family(nombre), después preview(asset) y preview(asset, iso=False); install() y export_v2() actualizan el mapa y los GLB. install() toma siempre las colocaciones V1 y no acumula duplicados. Conservar una copia del maestro antes de otra revisión.

## Validación y entrega visual

[Galería antes/después y modelos aislados](qa/island-v2/index.html). Cada familia tiene cámara emparejada V1/V2 dentro del mapa y vistas frontal e isométrica de sus modelos. Incluye vista general, escenas de día/tarde/noche y vídeo real del canvas.

- node cozy/tools/validate-island.cjs: estructura GLB, buffers, colocaciones, colores por vértice, presupuesto de mallas y hash/animaciones del banco.
- node --test cozy/tests/*.test.mjs: 32 pruebas existentes aprobadas.
- node cozy/tools/qa-island.cjs: carga, zoom con rueda y pellizco, órbita, desplazamiento con teclado, puertas, iluminación, pausa, movimiento reducido y diseño a 360 px.
- node cozy/tools/qa-island-v2-visual.cjs: nueve encuadres idénticos contra el respaldo V1; la instrumentación de cámara se inyecta únicamente en el navegador de prueba.

Las mediciones se realizan en Microsoft Edge sin interfaz, a 1440 × 1000, tras estabilizar cada perfil durante ocho segundos. No constituyen una medición en un teléfono físico. Datos completos y fecha en [results.json](qa/island-v2/results.json). Las vistas aisladas proceden de Blender Cycles; las comparaciones, del visor web.
