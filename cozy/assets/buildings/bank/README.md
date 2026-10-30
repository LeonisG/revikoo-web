# Cozy Bank — modelo procedural v1

Edificio real realizado en Blender 5.2 mediante MCP a partir de la referencia aportada «Banco acogedor con tejados verdes». No utiliza la imagen como textura ni consume generaciones de Higgsfield.

## Archivos

- `cozy_bank_master.blend`: maestro editable por colecciones. Escena de trabajo `COZY_BANK`; escena `Scene` inicial conservada. La escena `COZY_BANK_EXPORT` contiene las mallas simplificadas. Las luces y el fondo de presentación no se exportan al GLB.
- `cozy_bank.glb`: versión de distribución, 44.171 triángulos, 3.497.548 bytes, 89 primitivas, 20 materiales. No requiere texturas externas ni Draco.
- `cozy_bank_isometric.png`, `cozy_bank_front.png`, `cozy_bank_side.png`, `cozy_bank_back.png`, `cozy_bank_doors_open.png`: vistas del maestro a 1200 × 1100.
- `cozy_bank_glb_roundtrip.png`: render del GLB reimportado, para comparar la simplificación.
- `validation.json`: métricas, importación, UV y comprobación numérica de los seis canales de rotación.
- Imágenes numeradas: revisiones intermedias; 04 contiene el artefacto del arco detectado y corregido en 05.

## Escala e integración futura

Blender: X ancho, Y profundidad, Z vertical; fachada hacia -Y; origen de COZY_BANK en (0,0,0). Cuerpo aproximado de 10 × 7 metros, altura del remate cercana a 9 m. Pavimento y accesorios amplían la huella. glTF exporta Y vertical según su estándar. El estudio existente usa Z vertical y aplica una rotación X de +π/2 a los GLB; su escala de habitación es equivalente a centímetros, por lo que una futura integración deberá normalizar dimensiones o multiplicar por 100. No se ha modificado el catálogo, el estudio, ni los guardados.

La cámara `COZY_MASTER_ISOMETRIC_CAMERA` es ortográfica, escala 17, posición (-15,-23,14.8), objetivo (0,0,4). Es una cámara de revisión del edificio: respeta la proyección ortográfica y el eje vertical de Cozy, pero no es la calibración de sprites de habitaciones (24,105°). La vista frontal-lateral izquierda responde al encargo específico de este edificio. Cámaras adicionales permiten revisar otras fachadas.

## Animación

Cada hoja tiene un empty pivote junto a su bisagra exterior y geometría hija. Tres tracks NLA por puerta: DOORS_CLOSED, DOORS_OPENING y DOORS_CLOSING. El GLB combina los tracks homónimos en tres clips con ambas puertas. 30 fps, frames 1–25, 0,8 s, giro ±85° con interpolación Bezier en el maestro y muestreo en GLB. Los tracks del maestro están silenciados para permitir edición manual; activar solo el track deseado en ambas puertas para previsualizar. En Three.js se pueden reproducir los clips con AnimationMixer, LoopOnce y clampWhenFinished. La escena no incorpora lógica de aplicación.

## Construcción y reproducción

Ejecutar `build_bank.py` en Blender desde una sesión nueva. Crea una escena independiente y conserva las existentes. Produce blockout, arquitectura, detalles y llama a `finalize_bank.py` para refinar y exportar. El script mantiene su contexto en `bpy.app.driver_namespace['bank_builder']`. Ejecutar después `verify_bank.py` en la misma sesión para la reimportación y verificación de animaciones. No ejecutar repetidamente sobre el mismo maestro sin revisar las escenas resultantes: Blender añadirá sufijos a nombres duplicados.

Cubierta curva con tejas individuales; aperturas booleanas en muros; anillos de arco construidos con quads; piedra con variantes de color; medallón y texto con relieve. Vegetación geométrica. Materiales Principled compatibles con glTF, emisión cálida, metal y roughness. El maestro tiene alrededor de 184.000 triángulos evaluados; la versión web agrupa superficies por material y simplifica conservando más geometría en hojas y flores. Las UV de distribución son proyecciones por cara; sirven como base de edición, no como atlas único para hornear lightmaps.

## Evaluación y límites

Se han inspeccionado renders por fases y corregido normales de recortes, orientación de marcos laterales, triangulación de molduras y pérdida excesiva de vegetación durante la simplificación. Se prueba la importación del GLB en una escena aislada y se leen los quaterniones y tiempos directamente del archivo para verificar apertura, cierre y reposo.

Esta versión interpreta la referencia con un acabado más geométrico y limpio. No alcanza todavía su densidad ornamental, su cubierta abuhardillada con múltiples secciones ni la riqueza artesanal de piedra y follaje. El vidrio utiliza color y emisión cálida; no reproduce el interior detallado visible en la referencia. El interior es un espacio sencillo con suelo y mostrador. Las fachadas ocultas se resuelven de forma más sobria.

89 primitivas siguen siendo un coste relevante si hay muchos edificios simultáneos. Se ha validado el presupuesto geométrico y la reimportación, no FPS en móvil ni una ciudad completa. Antes de fijarlo como estándar artístico definitivo: revisar la fidelidad visual con el usuario, perfeccionar cubierta y plantas, preparar atlas/LOD si lo exige la escena y medir en el navegador objetivo. No se ha publicado ni integrado en producción.
