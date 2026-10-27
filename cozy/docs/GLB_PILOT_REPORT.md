# Piloto real: Oak Desk → Tripo GLB → cuatro vistas → Cozy

## Resultado

**Pipeline técnico demostrado; arte DRAFT, no promovido a producción.** El escritorio se ha generado una sola vez, descargado, validado, renderizado desde cuatro orientaciones y colocado en la aplicación. Puede girar con una taza vinculada a su superficie. Se conservan el escritorio original, sus precios, inventario y guardados.

Abrir con servidor local:

- `cozy/?art-debug=true&pilot=tripo-desk`: candidato dentro del juego, Golden conjunto y prueba de escritorio+taza.
- `cozy/tools/model-review.html`: GLB real, giro, geometría neutra, textura, luz y pase de sombra. Sin coste por abrirlo.
- [GLB original](../assets/candidates/tripo-desk/desk.glb), [procedencia y job](../assets/candidates/tripo-desk/provenance.json), [métricas del render](../assets/candidates/tripo-desk/render-metrics.json), [validación glTF](../assets/candidates/tripo-desk/validation.json).

El usuario autorizó **hasta 9 créditos para una generación**. Se reconfirmó una cotización de 9 y se envió una solicitud. Job `df3e1594-4357-4ef4-a64f-accd526fef70`, modelo `tripo_h3_1_image_to_3d`, estado `completed` comprobado con `jobs_wait`. No se reenviaron solicitudes ni se generaron imágenes adicionales. El endpoint no entrega un cargo final desglosado; registrar cotización y ejecución, no inventar un comprobante de facturación.

## Revisión de cambios concurrentes

Al retomar, HEAD pasó de `7b801a3` a `ca1ca5b`. Ese commit contiene auditoría, inspector y trabajo previo. Además existen cambios locales de ángulos: un único tilt de 0,44742, stretch de las rooms, affine en sprites, inversa de hit-test, nuevas herramientas de ángulos y cambios en documentos. Se preservaron al integrar este piloto. El `baseline.json` también había cambiado fuera de esta continuación: no tratarlo como una instantánea inmutable del primer commit.

El piloto **no usa axisFix ni deformación CSS**. Proyecta geometría real con cámara común. Los cambios externos de affine del arte heredado no quedan certificados por la prueba GLB: alinear dos aristas en un plano no recupera caras ocultas ni demuestra una cámara equivalente para un volumen completo. Sigue existiendo una diferencia entre ese puente heredado y la restricción de no fingir cámara mediante CSS del encargo. Las capturas anteriores de `qa/art-audit/` corresponden a otro estado; las actuales de este piloto están en `qa/tripo-pilot/`.

## Evidencia técnica

| Control | Resultado real |
|---|---|
| Archivo | 848.004 bytes; SHA-256 en `technical-summary.json` |
| Geometría | 10.320 triángulos, 6.734 vértices en accessor de posición |
| Estructura | 1 nodo, 1 malla, 1 material; sin partes articuladas ni animaciones |
| Material | Metallic 0, roughness 0,9; textura baseColor JPEG integrada 2048×2048 |
| Datos | Normales y UV presentes; ningún buffer/imagen externos; sin extensiones obligatorias |
| Validador Khronos | 0 errores, 0 warnings, 4 hints por `bufferView.target` omitido |
| Normalización | Y-up glTF → Z-up, escala uniforme 176; dimensiones 176×86,299×89,929 |
| Pivot | Centro de bounds X/Y y base Z=0, independiente del encuadre del PNG |
| Cámara | Elevación derivada 26,578°, ejes visibles ±24,105°; mundo 3D `(X,Y,Z)=(x,-y,z)` |
| Vistas | 0/90/180/270 lógicas; giros reales de malla, no imágenes espejadas |
| Entrega | 4 WebP 768×768, 45.980 bytes de color en total; alpha y máscaras de selección |
| Sombras | Cuatro pases separados desde la malla, plano receptor y key fija; no pintadas en color |
| Render de producción | Sigue siendo 2.5D. Three/GLB solo en visor de autoría, cargados bajo demanda |

El objetivo de triángulos se cumple. La textura supera el objetivo inicial de 1024; debe evaluarse reducción antes de aprobar un modelo de runtime. No se ha medido GPU en un móvil físico ni se certifica rendimiento de un juego 3D completo. Los WebP del piloto sí se han probado a viewport de 360 px.

## Geometría y estilo observados

Las cuatro patas, el hueco para piernas, el bloque lateral y **dos cajones con tiradores** sobreviven a la conversión. El modo neutro muestra relieve de tiradores/frentes; no son únicamente líneas de textura. La parte trasera y el reverso del bloque tienen geometría, y la revisión inferior no muestra un frontal vacío. Es una comprobación visual, no una certificación de malla manifold o modelo fabricable.

Las patas y biseles son más suaves y algo irregulares que el maestro. La parte oculta es reconstrucción inferida de una sola imagen, no identidad verificada. Todos los elementos están fusionados en una malla: no sirve todavía para abrir cajones de manera independiente.

El principal bloqueo artístico es **pérdida de contraste, veta y contorno ilustrado**. Albedo se ve plano junto a los muebles pintados; el modo iluminado añade volumen pero no recupera por sí solo el acabado del maestro. No se aprueba por tener cuatro vistas coherentes. Haría falta ajuste de material/contornos y revisión de silueta antes de ampliar a la silla, biblioteca o armario.

## Corrección de la superficie y sombras

Con la escala uniforme que encaja en el footprint 2×1, el tablero mide 113,739 unidades verticales proyectadas. El escritorio heredado declara 132; reutilizar ese número hacía flotar la taza. Se añadió `logic/geometry-profile.mjs`: solo en el piloto toma la altura medida de `geometry.mjs`. El motor sigue usando los mismos IDs, slots y reglas de colisión. No se estiró el modelo para esconder la discrepancia. La altura de producción continúa en 132.

`surfacePosition` aplica esa geometría y el giro del padre; la taza ocupa cuatro posiciones distintas y mantiene el vínculo. Captura anterior: [antes de calibrar](qa/tripo-pilot/surface-before-calibration.png). Captura actual: [superficie a 0°](qa/tripo-pilot/surface-0.png).

El exportador genera un pase de sombra por vista: key fija, ShadowMaterial, mapa 1024 y opacidad 0,25. Se integra bajo el color del escritorio, sustituyendo el perfil genérico solo para este candidato. La luz no gira con el modelo. Esta entrega conserva las limitaciones de sprites: no recibe sombras dinámicas de otros muebles ni resuelve oclusión entre habitaciones; no equivale a iluminación 3D en tiempo real. Día neutro es la condición de comparación.

## QA y reproducción

Herramientas de autoría: Node, Python/Pillow, Playwright, Three 0.186.1 vendorizado solo para el visor y `gltf-validator@2.0.0-dev.3.10`. Instalar dependencias fuera de producción; no hace falta build de la aplicación.

```text
node cozy/tools/serve-review.cjs
# COZY_URL=http://127.0.0.1:8767/cozy/ (variable de entorno)
# PLAYWRIGHT_MODULE y PLAYWRIGHT_CHANNEL según instalación local
node cozy/tools/export-pilot.cjs
python cozy/tools/encode-pilot.py
# GLTF_VALIDATOR_MODULE apunta al módulo instalado
node cozy/tools/validate-pilot.cjs
node cozy/tools/qa-pilot.cjs
node --test cozy/tests/*.test.mjs
```

`qa-pilot.cjs` comprueba cuatro entregas reales, ausencia de affine en el candidato, sombra por vista, cambio de posición de la taza, altura calibrada, independencia del guardado normal, exclusión del candidato cuando falta `art-debug=true`, ausencia de cargas GLB/Three en producción y errores de consola/red. Resultados detallados: [JSON](qa/tripo-pilot/results.json). Los 29 tests de lógica/assets pasan. La suite de builder comprueba ratón/táctil, colisiones, giro disponible, mover padre/hijos, guardar, vender, teclado, tamaños y móvil. El antiguo assert «ningún sprite tiene transform» de `qa-art.cjs` no describe los cambios externos que reintrodujeron axisFix; no presentarlo como aprobado en el estado actual.

Fuentes técnicas: [glTF-Validator de Khronos](https://github.com/KhronosGroup/glTF-Validator), paquete oficial Three.js 0.186.1 (licencia conservada en `tools/vendor/three/`). La aprobación visual procede de las capturas locales, no de esos validadores.

## Decisión después de la prueba

**Mantener la recomendación B: modelo como fuente de sprites**, con trabajo de acabado antes de escalar. La cámara, orientaciones y superficie son reproducibles; la identidad geométrica es una base útil. La calidad ilustrada todavía no llega al Golden Set. Conservar el candidato DRAFT y el arte original en producción; no gastar en un lote completo ni migrar toda la aplicación a 3D a partir de esta única muestra.

Siguiente etapa sin generar más: ajustar materiales y contorno sobre este mismo GLB, revisar el apoyo y decidir si se puede alcanzar la referencia. Cualquier segunda generación o prueba Meshy necesita un presupuesto nuevo. No se ha aprobado ni ejecutado.
