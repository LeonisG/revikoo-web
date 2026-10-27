# Asset prompt template

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
