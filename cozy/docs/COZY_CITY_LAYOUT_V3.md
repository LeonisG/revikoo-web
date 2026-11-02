# Cozy City · Layout V3

Implementado el 2 de noviembre de 2026 sobre `04fae4f`. Reorganización de la isla existente; no se generaron assets nuevos ni se modificó Cozy Finance o Supabase.

## Resultado

- 225 colocaciones con ID estable, frente funcional, zona y papel espacial; antes había 290 sin identificadores.
- Pradera continua en el antiguo relieve elevado: máximo muestreado 2,116 m, sin la terraza interior de 5,25 m, piscina elevada ni escalera artificial.
- Río continuo de borde a borde, con pendiente de 1,56 a 1,32 m y anchura variable. Una sola cascada cae 6,14 m al nivel inferior. El contorno de salida del cauce es también el labio de la cascada.
- Dos puentes conservados, alineados con la normal del cauce y conectados a recorridos útiles. Sus aproximaciones alcanzan el mismo nivel de los extremos del tablero.
- Una red peatonal conectada: plaza, Banco, jardín, pradera y las tres parcelas. Pavimento resuelto por unión booleana, sustracción de puentes y recorte de adoquines; área de solape entre adoquines: 0 m².
- Cuatro bancos miran a la fuente y otro a la pradera. Frente real comprobado: −Y local; los puentes cruzan por +X local. Los espacios de uso de los asientos quedan libres.
- Se conservan las rocas costeras como incrustaciones intencionadas en el acantilado, por debajo de la superficie transitable. No se evalúan como muebles enterrados.

## Auditoría y respaldo

Git estaba limpio. Copia previa completa de `island-001` y `city` en `cozy/local-backups/island-before-v3/`, excluida localmente de Git. Los maestros V1 y V2 originales siguen conservados. Blender MCP conectó con Blender 5.2.3, inspeccionó el maestro V2, extrajo las dimensiones de las 21 familias y construyó la escena V3. No se ejecutó el generador V1 ni la reconstrucción de familias V2.

La fuente de la versión anterior era mixta: `build_island.py` construía terreno/plaza/terraza; `upgrade_assets_v2.py` sustituía familias y su `install()` leía `placements-v1.json`. `layout.json` solo contenía Banco y parcelas. El runtime consume `terrain.glb`, `environment-kit.glb`, `bank-island.glb`, layout y placements; `path-kit.glb` es una biblioteca de revisión, no un recurso cargado por la ciudad.

La auditoría inicial clasifica 381 incidencias con las reglas documentadas: 185 intersecciones de volúmenes simplificados, 90 apoyos enterrados, 17 flotantes, 35 interferencias con pavimento, 16 huellas fuera de terreno, 4 sin apoyo y otros conflictos de acceso/orientación/parcelas. Son incidencias geométricas conservadoras, no 381 objetos distintos ni 381 defectos confirmados por píxel. Se excluyen solapes intencionados entre plantaciones bajas, vegetación bajo copas caducifolias sin invadir el tronco y afloramientos costeros. El informe final registra **0 incidencias** con las reglas V3.

Cada registro incluye transformación, dimensiones medidas en Blender, caja XYZ, huella orientada, superficie y altura de apoyo comprobada mediante raycast sobre la malla real, zona, distancias al pavimento y al objeto más próximo, frente y conflictos. La visibilidad se estima mediante proyección de cajas desde tres cámaras: indica posibles oclusores, no promete visibilidad de píxel. Las nueve vistas de navegador son la comprobación visual complementaria.

### Incidencias representativas

| Identificador | Problema original | Corrección | Validación |
|---|---|---|---|
| `bench-001`…`bench-005` | Cinco orientaciones discordantes con el centro de la plaza | Sustitución de posiciones por `plaza-bench-01`…`04` y `meadow-bench`; orientación calculada desde −Y | Producto escalar frente/objetivo = 1; accesos libres |
| `bench-002`, `bench-004` | Vegetación en el espacio de asiento/acceso | Reservas orientadas delante de cada banco y recolocación de bordes vegetales | Sin invasiones |
| `HighlandMeadow`, `HighlandRock`, `HighlandStair`, `SpringPool` | Plataforma artificial, escalera y alimentación elevada del río | No se instancian en la escena V3; superficie nueva con ondulación suave | Altura máxima de pradera < 2,2 m |
| `bridge-stone`, `bridge-wood` | Cruces heredados de la fórmula del río antiguo | Normal de la curva y nodos de aproximación derivados del mismo recorrido | Ambos conectados, luz libre > 1,2 m, sin escalón calculado |
| `rock-053`, `rock-076` | Desajuste entre altura analítica y triángulos del cauce | Ajuste final mediante raycast de Blender | Apoyo dentro de la incrustación prevista |
| `rock-005`, `rock-013`, `rock-025` | Afloramientos que invadían vegetación transitable | Cota máxima costera limitada a 30 cm bajo el suelo base | Sin intersección vertical con la vegetación |
| `GATE` / vallas de parcelas | Cerramientos heredados sin paso útil | Retirados; dos tramos de valla delimitan un jardín sin cortar recorridos | Grafo y superficie transitable conectados |
| Fuente/cascadas en `ambient.mjs` | Emisores fijados al río anterior | Anclajes semánticos y labio muestreado en layout | Espuma, gotas y ondas coinciden con la nueva caída |

El inventario completo anterior está en `assets/world/island-001/source/spatial-audit-v2.json`; el final, en `assets/world/island-001/spatial-audit.json`. `composition-decisions-v3.json` registra el filtrado inicial de candidatos; algunas rocas costeras se recuperaron después como afloramientos. El inventario final prevalece sobre ese historial intermedio.

[Tabla completa de cambios por ID](./qa/layout-v3/changes.csv): 420 filas entre objetos anteriores y nuevos, con posición anterior/final, incidencias, retirada o conservación y resultado final.

## Fuente de verdad y reconstrucción

Edición espacial exclusivamente en:

1. `assets/world/island-001/source/layout-v3.json`: silueta, alturas, curva del río, plaza, zonas, reservas, Banco, parcelas, nodos y aristas.
2. `assets/world/island-001/source/placement-design-v3.json`: decisiones de composición con IDs estables, XY, escala, función y objetivo de orientación. Las alturas se resuelven automáticamente. Los afloramientos costeros declaran su soporte especial.

`asset-metrics-v3.json` contiene las medidas extraídas de los modelos V2, sin reinterpretar sus pivotes. Los GLB del Banco y la biblioteca V2 son entradas inmutables. `layout.json` y `placements.json` son salidas compiladas, no se deben editar a mano. `geometry-v3.json` es un intermedio local generado y no se versiona.

Pipeline única:

```powershell
python -m pip install -r cozy/assets/world/island-001/source/requirements-v3.txt
python cozy/assets/world/island-001/source/rebuild_layout_v3.py `
  --blender "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" `
  --verify-repeat
python cozy/assets/world/island-001/source/test_layout_v3.py
node --test cozy/tests/*.test.mjs
```

La preparación usa Shapely 2.1.2 para unir superficies y triangulación restringida. Catmull–Rom se muestrea en el autorado; no se calcula por fotograma. Blender reutiliza los materiales/meshes V2, construye solo `COZY_CITY_ISLAND_003`, recalcula apoyos, exporta terreno y guarda `cozy_city_island_v3.blend`. Una segunda ejecución elimina únicamente los objetos propiedad de V3 antes de reconstruirlos; no duplica el Banco ni las instancias. No importa `build_island.py`, `upgrade_assets_v2.py` ni `placements-v1.json`.

La prueba final de dos ejecuciones produjo exactamente los mismos bytes para terreno, placements, layout y manifiesto, y 225 instancias en ambos casos. Evidencia: `assets/world/island-001/regeneration-check.json`.

## Integración y conservación

- `world.mjs` conserva `InstancedMesh`, añade la correspondencia `instanceId → placementId` y verifica IDs únicos y anclajes antes de cargar. Recursos versionados para evitar mezclar JSON nuevos con GLB en caché.
- `ambient.mjs` obtiene fuente, cascada, espuma y ondas del layout. Hojas y luces siguen las colocaciones de árboles y farolas. Se mantienen los límites existentes de partículas y calidad.
- `city.mjs` obtiene la posición del enfoque del Banco del layout. El diagnóstico solo se importa en localhost con `?layoutQA`; no añade controles a la interfaz pública.
- SHA-256 del Banco conservado: `7e37897593a84b9e97bdd60b72e829ffc5d09dca9529b2572b455f74c11e908d`. Los clips `DOORS_OPENING`, `DOORS_CLOSING` y `DOORS_CLOSED` siguen durando 0,8 s.
- `environment-kit.glb` y `path-kit.glb` conservan también sus hashes; ningún cambio en Auth, datos, servicios de finanzas, Nilo ni despacho.

## Validación

Once pruebas nuevas comprueban el resultado y casos adversos: pérdida de conectividad al retirar un puente, bancos cruzados con distintos centros, maceta en zona de piernas, árbol en parcela, plantación bajo copa frente a invasión del tronco, continuidad y pendiente del río, apoyos reales, IDs y solapes. Las 38 pruebas existentes siguen pasando: **49 pruebas en total**.

Capturas reales del navegador integrado, a 1280 × 900 y con las mismas cámaras antes/después: isla, plaza cenital, plaza isométrica, caminos, antigua terraza, río, cascada, Banco y ángulo alternativo. El visor de diagnóstico añade huellas azules, zonas verdes, reservas naranjas, recorridos blancos y cauce cian; los conflictos se mostrarían en rojo.

Comparación medida en la vista `island`, luz de día, calidad media, ambiente activo, 180 fotogramas de muestra:

| Métrica | V2 | V3 |
|---|---:|---:|
| FPS observados | 44,95 | 45,04 |
| Draw calls | 330 | 308 |
| Triángulos enviados por fotograma | 687.670 | 503.646 |
| Geometrías residentes (`renderer.info.memory`) | 165 | 154 |
| Texturas residentes | 3 | 3 |

El límite de calidad media es 45 FPS: **no se afirma una mejora de FPS**. Sí se midió una reducción del 26,8 % de triángulos enviados y del 6,7 % de draw calls. Los contadores de memoria son recursos residentes de Three.js, no bytes de VRAM. No se realizó un benchmark de GPU ni una prueba en teléfono físico. El diagnóstico añade geometrías de líneas y estaba desactivado/no creado durante esta medición.

[Galería antes/después](./qa/layout-v3/index.html). Los JSON de rendimiento se guardan junto a las capturas. El respaldo previo permanece local y la historia Git conserva la versión publicada anterior.

Regresión de navegador completada: rueda del ratón de 100 % a 135 %, control de giro por teclado, apertura/cierre de puertas, transición a Nilo, apertura del dashboard con la sesión existente, regreso al despacho y ciudad. No se crearon ni editaron movimientos. En viewport móvil 360 × 800: un canvas, calidad ligera, Banco cargado, ancho de documento 360 px y consola sin errores/avisos. La prueba móvil es emulada; no sustituye una medición en dispositivo físico.
