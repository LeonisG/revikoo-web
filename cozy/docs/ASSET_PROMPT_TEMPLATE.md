# Asset prompt template

## Cláusula obligatoria de cámara canónica

Esta cláusula va en **todos** los prompts de assets, sin excepción. La referencia
no es abstracta: es `docs/canonical-room.png`, la habitación vacía real contra la
que se mide todo. Sus valores están medidos, no estimados
(`python tools/measure-room.py`):

| | |
|---|---|
| eje del suelo | **24.10°** (pendiente 0.4474) |
| celda lógica | 88 unidades de mundo → 176 × 79 px en pantalla |
| cámara | ortográfica, tres cuartos elevada, verticales verticales |
| luz | arriba-izquierda; sombra proyectada abajo-derecha |

```text
Use the attached empty room (docs/canonical-room.png) as the canonical camera reference.
Match exactly its isometric projection, camera elevation, floor-axis angles and lighting
direction. Its floor axes run at 24.1 degrees from horizontal; the object's own floor-plane
edges must be parallel to them. The object's footprint must align perfectly with the room's
floor tiles. The object must look physically grounded in that room. Do not use a generic
isometric camera. Do not create a 3/4 perspective approximation. The object should be
insertable into the attached room without rotation, skew or perspective correction.
```

Después de generar, **comprobar antes de aceptar**:

```sh
python tools/check-assets.py          # AXIS / GROUND / SCALE
```

y mirarlo en la habitación real con la rejilla y las huellas visibles:

```text
/cozy/?asset-test=true
```

Si las patas caen fuera de su huella, el sprite o su pivot están mal. Los pivots
se miden, nunca se escriben a mano: `python tools/measure-pivots.py`.

Usar ImageGen con `transparent_background: true`. Una llamada por asset. Referencia 1: `docs/reference-oak-cozy.png`. Referencia 2: `assets/masters/oak-cozy/desk.png`, o una pieza equivalente ya aprobada de la colección. Para accesorios, preferir un accesorio aprobado como segunda referencia para evitar que el generador añada el escritorio.

## Prompt base exacto del Golden Set

```text
Use case: stylized-concept. ONE independent production sprite for Oak Cozy. Reference 1 is the canonical illustrated collection. Reference 2 is our approved empty desk, match its camera, warm painted materials, dark warm outline, light direction, detail and finish. SOFT ISOMETRIC GAME ART: professional hand-painted illustrated game sprite with restrained soft pixel-art influence, warm chunky silhouettes, medium detail, beautiful edge highlights, 3–5 shading levels, not flat vector or low-poly, not photoreal. Orthographic elevated three-quarter camera with verticals vertical, front and right faces visible, exactly matching the desk. Upper-left light, lower-right soft contact shadow. Warm oak, cream, sage, moss, terracotta. Entire single object isolated on genuinely transparent background, centered with transparent margin, all feet visible. NO room/floor/background, captions/UI/logos/text, no accessories baked into furniture. Square high resolution master. Subject: {SUBJECT}
```

## Adaptación por colección

Reemplazar `for Oak Cozy` por el nombre de la colección. Sustituir la frase de paleta por los materiales definidos en ASSET_BIBLE.md. Mantener cámara, luz, contornos y acabado. Añadir una descripción precisa del objeto, su función y ausencia de accesorios incorporados.

Para un accesorio, terminar con: `ONLY the named accessory. No host desk, table, shelf, floor, platform or other objects. All outside pixels fully transparent.`

Para arte mural, sustituir las instrucciones de cámara por: `Perfectly STRAIGHT-ON FRONTAL ORTHOGRAPHIC ELEVATION. Upright rectangle, horizontal top/bottom edges, vertical sides. NO isometric view. NO easel, kickstand, feet, base, desk, side face, leaning or perspective convergence. Hangs flat against a wall but DO NOT DRAW ANY WALL. The engine maps the frontal sprite onto the wall plane.`

Para una postura de compañero, usar como referencia principal su maestro idle ya aprobado y pedir conservar exactamente identidad, proporciones, pelaje, cámara, luz y escala. Cambiar solo la postura.

## Ejemplo atómico

```text
One empty warm oak study desk with a thick softly rounded top, three drawers on the right, simple rounded legs. No laptop, monitor, lamp, plant, mug, books, cables or other decoration. Entire desk visible including every foot. Transparent background.
```

Los prompts efectivos y sus archivos de salida se guardan en `generation-prompts.json`. El texto base orienta el proceso; cada resultado se revisa visualmente y se regenera si incumple la atomicidad, la cámara o el acabado.
