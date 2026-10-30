# Isla de los comienzos — autoría e integración

## Auditoría y alcance

El punto de partida era `/cozy/city/`: visor ortográfico Z-up con controles propios, Three.js 0.186.1 local, GLTFLoader, banco GLB de 44.171 triángulos y tres clips de puertas. La web usa HTML/CSS/JavaScript vanilla, sin compilación ni servidor. Se conserva el motor, la cámara y la navegación existentes. GitHub Pages publica `main`.

La isla incorpora terreno irregular, estratos de roca, terraza natural elevada, fuente central, caminos de piedra, dos puentes, arroyo, dos cascadas y tres parcelas. Hay 275 colocaciones de 17 assets reutilizables. No se ha implementado construcción libre, personajes ni gestión financiera.

## Archivos y coordenadas

Contenido en `cozy/assets/world/island-001/`:

| Recurso | Función | Tamaño |
|---|---|---:|
| `terrain.glb` | Terreno, pavimento, agua y parcelas agrupados por material | 1.996.108 bytes |
| `environment-kit.glb` | Biblioteca de naturaleza y mobiliario | 486.140 bytes |
| `bank-island.glb` | Banco original mejorado con sus tres animaciones | 3.764.436 bytes |
| `layout.json` | Coordenadas del banco y parcelas | — |
| `placements.json` | Instancias, escala, rotación y zona | — |
| `manifest.json` | SHA-256, triángulos, materiales y clips | — |

Los GLB suman 6,25 MB decimales, sin texturas externas. Los materiales son PBR con colores y geometría real. Banco mejorado: 53.083 triángulos; terreno: 39.248; biblioteca fuente: 13.459 antes de instanciar.

Autoría en metros, Z vertical, fachada del banco hacia −Y. GLB exporta Y-up; `world.mjs` lo convierte una sola vez a Z-up. Isla aproximadamente 78 × 52 m, suelo Z=1,8, terraza elevada Z=5,25 y agua inferior Z=−4,85. Banco en `[18, 2, 1.92]`, fuente en `[1, -4, 1.92]`.

| Parcela | Centro XYZ | Superficie útil XY |
|---|---|---|
| `town-hall` | `[-24, -4, 1.85]` | 11 × 9 m |
| `studio` | `[21, -15, 1.85]` | 11 × 8 m |
| `library-garden` | `[20, 14, 1.85]` | 11 × 8 m |

Entradas, orientación y disponibilidad en `layout.json`. Son reservas de composición, no un sistema de navegación o colisiones para personajes.

## Blender y biblioteca

Maestro editable local: `source/cozy_city_island_master.blend`. Copia anterior: `source/bank_before_island.blend`. El banco original en `assets/buildings/bank/` permanece intacto. El maestro contiene `COZY_CITY_ISLAND_001`, `COZY_CITY_ASSET_LIBRARY` y las escenas conservadas del banco.

Colecciones: WORLD, PATHS, BUILDINGS, VEGETATION, DECORATION, FUTURE_PLOTS, CAMERAS y LIGHTING. Las instancias comparten datos; los pivotes del mobiliario están en suelo. La biblioteca exporta `extras.asset` para agrupar las instancias del navegador.

Assets: TREE_01, TREE_02, TREE_03, BUSH, FLOWER_WHITE, FLOWER_PINK, FLOWER_YELLOW, GRASS, ROCK, BENCH, LAMP, FENCE, POT, BRIDGE_STONE, BRIDGE_WOOD, FOUNTAIN y SIGN. Hiedra y ornamentación del banco se agrupan por material dentro del edificio.

`source/build_island.py` reproduce el contenido con semilla 147. Ejecutarlo desde Blender 5.2 con `--python` y el repositorio completo disponible. `rebuild_and_connect.py` reconstruye las escenas de isla del maestro y activa MCP; guardar una copia de cualquier edición manual antes de regenerar. Se importa el banco GLB existente, no se reconstruye. Los PNG de etapas y referencias originales se conservan localmente.

El banco añade contraventanas, flores, hiedra, remates de cubierta, ribete del medallón y ajustes de materiales. Mantiene dimensiones, orientación y pivotes. `DOORS_CLOSED`, `DOORS_OPENING` y `DOORS_CLOSING` duran 0,8 s; ambas hojas abren 85°. Los sufijos añadidos por Blender no afectan al enlace de las pistas GLB.

## Runtime y animación

`world.mjs` carga los tres GLB y dos JSON; convierte la biblioteca en `InstancedMesh`. Terreno y ornamentación adicional se agrupan por material al exportar. Se exporta únicamente la escena activa para evitar duplicar los bancos históricos.

`ambient.mjs` contiene `AmbientAnimationManager`, separado de carga y controles:

- Viento en shaders de hojas, pétalos y hierba, con fase por posición y peso por altura. Troncos estables.
- Hojas ocasionales: ciclo determinista de 23 s, caída de 7 s, giro y desaparición progresiva. Máximo 24/12/5 según calidad.
- Agua con ondas y brillos en shader. Fuente con 24 gotas en arcos; el resto de partículas acompaña las cascadas.
- Emisión de farolas y ventanas, con manchas cálidas sobre el suelo.
- Día, atardecer y noche, interpolados durante 1,6 s.

| Luz | Hemisférica | Principal | Relleno | Emisión farolas | Ventanas |
|---|---:|---:|---:|---:|---:|
| Día | 2,3 | 3,2 | 1,3 | 0,08 | 0,4 |
| Atardecer | 1,3 | 3 | 0,8 | 1,8 | 1,4 |
| Noche | 0,8 | 0,5 | 0,7 | 4 | 2,7 |

Un único bucle RAF, delta limitado a 75 ms, render bajo demanda al pausar. Se cancela RAF al ocultar la pestaña y se reinicia la referencia temporal al volver. `prefers-reduced-motion` congela el ambiente y aplica inmediatamente puertas y luz. Sin timers por objeto ni simulación física de fluidos. Los renders Blender no se usan como prueba de animación web.

## Cámara y rendimiento

Cámara ortográfica existente: zoom 0,65–8, elevación 0,22–1,25 radianes, objetivo X ±25/Y ±18. «Ver el banco» centra el detalle. Los recursos se cargan solo al entrar en City.

| Calidad | DPR máximo | Sombras | Límite de render |
|---|---:|---:|---:|
| Alta | 1,75 | 2048 | 60 FPS |
| Media | 1,25 | 1024 | 45 FPS |
| Ligera | 1 | Desactivadas | 30 FPS |

Medición local en Edge headless, 1440 × 1000: aproximadamente 60/40/27 FPS. La cadencia depende de RAF y la GPU. Se contaron 291 llamadas con sombras y 149 sin ellas; los triángulos del renderer incluyen el pase de sombras. Resultados exactos en `qa/island/results.json`. No son mediciones en teléfono físico.

La calidad ligera reduce píxeles, sombras y partículas, conservando la geometría. Aún no hay LOD geométrico ni streaming por zonas. La noche usa emisión y manchas de luz, no una luz dinámica por farola. Es una primera isla jugable y ampliable con materiales estilizados; no una reproducción literal de las referencias conceptuales.

## Ampliación y comprobación

Para añadir un edificio, usar el identificador y superficie de una parcela, preparar origen en suelo, escala métrica y fachada −Y, y cargar su GLB desde el módulo de mundo. Adaptar los adoquines interiores a la nueva entrada. Mantener despejados caminos, plaza y acceso al banco. Añadir decoraciones mediante `placements.json` e identificador de biblioteca.

`validate-island.cjs` comprueba estructura binaria, buffers, escena única, assets, colocaciones y clips. `qa-island.cjs` prueba cámara, puertas, luz, pausa, movimiento reducido, visibilidad, móvil y consola. Graba el canvas real mediante MediaRecorder y mide los tres perfiles. La visibilidad se simula explícitamente en headless. Cozy conserva sus 32 pruebas de regresión.

Evidencias en `qa/island/`: día, atardecer, noche, banco abierto/cerrado, otra perspectiva, móvil y `ambient-web.webm`. Maestro y referencias se entregan localmente; se publican los recursos web y documentación seleccionada.
