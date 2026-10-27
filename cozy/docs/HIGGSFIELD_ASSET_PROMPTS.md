# Plantillas de producción Cozy

No ejecutar hasta presupuesto autorizado. Sustituir cada variable y adjuntar referencias reales; ningún Golden APPROVED existe aún. Durante el piloto indicar **candidate identity reference** explícitamente. Las restricciones de cámara se validan después: un prompt no es una matriz de render. Usar solo parámetros que la ficha del modelo admite.

## Contrato común

Variables obligatorias: `{ID}`, `{COLLECTION}`, `{REFERENCE_IDS_AND_HASHES}`, `{IDENTITY_FEATURES}`, `{FOOTPRINT}`, `{PHYSICAL_BASE}`, `{TARGET_DISPLAY_SIZE}`, `{APPROVED_CAMERA_VERSION}`, `{LIGHT_RIG_VERSION}`, `{OUTPUT_KIND}`. Si falta una aprobación requerida, producir candidato, no promover. Referencias aisladas para image-to-3D; atlas completo solo para estilo de imagen cuando corresponda. Referencia de room es contexto, no parte del objeto.

```text
COZY — PREMIUM ILLUSTRATED DIORAMA. Follow the supplied identity references
{REFERENCE_IDS_AND_HASHES}. Preserve {IDENTITY_FEATURES}. Collection {COLLECTION}.
Warm handcrafted miniature, softly rounded chunky forms, restrained illustrated
material detail, clear silhouette at {TARGET_DISPLAY_SIZE}. Use the supplied
camera guide {APPROVED_CAMERA_VERSION} and light reference {LIGHT_RIG_VERSION}.
Keep the object independent. No extra props, text, labels, watermark, scenery,
photorealistic finish, generic faceted low-poly or CSS/vector-looking geometry.
Footprint {FOOTPRINT}; physical ground contacts {PHYSICAL_BASE}.
Output {OUTPUT_KIND}. Do not bake a large external cast shadow into colour.
```

## 1. NEW FURNITURE CONCEPT

```text
Create one {ID}: {FUNCTION_AND_CONSTRUCTION}. Match the reference's exact wood
tone, edge softness and illustrated grain scale. Preserve usable empty surfaces.
Show {FRONT_AND_SIDE_FEATURES}; keep {LEG_CLEARANCES_AND_DRAWER_COUNT} legible.
Apply the common contract. Single isolated object with clean alpha for a sprite
candidate; no room, floor platform, tools or bundled accessories. Supply a
concept for review, not a collage of multiple orientations.
```

Revisar silueta y construcción antes de pasar a 3D. `background: transparent` solo si el modelo admite ese valor (confirmado GPT Image 2.5).

## 2. EXISTING ASSET IMPROVEMENT

```text
Edit the supplied {ID} only. Preserve silhouette, component count, drawer/door
layout, handle positions, palette and material identity: {IDENTITY_FEATURES}.
Correct only {OBSERVED_DEFECTS_WITH_IMAGE_LOCATIONS}. Match the attached approved
reference for edge treatment and light. Keep footprint and physical base.
Do not redesign the furniture or add decor. If changing the viewpoint reveals
hidden faces, reconstruct those faces consistently; do not shear the whole image.
Apply the common contract and return one independent candidate with alpha.
```

Guardar original y diff visual. No pedir correcciones vagas como «más premium».

## 3. ROOM RECONSTRUCTION

```text
Design the Cozy room kit matching the supplied dark green plaster, warm wood,
window, moulding and miniature base references. Camera guide {CAMERA_GUIDE}.
Design {KIT_COMPONENT}: floor tile / wall panel / corner / skirting / window /
front trim. Dimensions {WORLD_UNITS}, seamless joints {EDGE_CONSTRAINTS}.
Empty architecture only: no furniture or props. Keep floor and walls separately
authorable. No baked furniture shadows or permanent sunlight patch. Retain the
same material scale for 4x4, 5x5 and 6x6 layouts. This is a component concept,
not a new independently projected room image for each size.
```

En producción la geometría/cámara del kit resuelve dimensiones, no el prompt. Validar esquinas interiores y expansión.

## 4. IMAGE TO 3D

```text
Reconstruct the single furniture reference {ID}. Preserve {IDENTITY_FEATURES},
the exact number of drawers, handles, legs and shelf openings. Complete the back,
sides and underside coherently. No fused props or floating fragments. Separate
{INTERACTIVE_PARTS} where actual movement is required. Grounded base, clean UVs,
outward normals, restrained illustrated texture with no external cast shadow.
Model axes/scale/pivot will be normalized against {GEOMETRY_CONTRACT} after import.
```

Esta plantilla define objetivo y QA; Tripo H3.1 consultado recibe referencia y opciones, **no expone este prompt como control de geometría**. No enviar campos inventados. Meshy texture_prompt guía textura, no garantiza partes. Revisar la reconstrucción real antes de aprobar.

## 5. MATERIAL / TEXTURE GENERATION

```text
Create or refine {MATERIAL} for the supplied UV layout {UV_REFERENCE}, matching
{APPROVED_MATERIAL_REFERENCE}. Preserve seam positions and texel density.
Subtle broad grain / matte weave / restrained metal highlight as specified in
{MATERIAL_SPEC}. No perspective illustration, directional cast shadow, ambient
scene background or painted hardware replacing actual geometry. Deliver only
{VERIFIED_SUPPORTED_MAPS}; mark invented/unsupported maps as unavailable.
```

Modelo de imagen no produce automáticamente PBR físicamente consistente. Consultar `meshy_v5_retexture` si se decide esa ruta; presupuesto separado. No fabricar normal/roughness por simple cambio de nombre de archivo.

## 6. ACCESSORY GENERATION

```text
One isolated {ID} in {COLLECTION}, intended to sit on {HOST_SURFACE_REFERENCE}.
Keep physical size {SIZE_RELATIVE_TO_DESK} and a readable contact base
{PHYSICAL_BASE}. Match camera and soft light of the host without including the
host in the output. No bundled books/plants/mug unless those parts define this
single item. Preserve alpha holes, handles and silhouette. Common contract.
```

Validar en superficie a altura real y entre colecciones, no solo miniatura de tienda.

## 7. STYLE CONSISTENCY

```text
Compare target {ID} with approved set {REFERENCE_IDS_AND_HASHES}. Keep target
geometry and identity. Correct only these measured style mismatches:
{WOOD_VALUE_OR_HUE}, {OUTLINE_WEIGHT}, {TEXTURE_FREQUENCY}, {LIGHT_MISMATCH}.
Do not copy props or change object proportions. Collection-specific colours
remain {COLLECTION_PALETTE}. Return one corrected independent candidate.
Camera mismatch requires a new proper view or model render, not image shear.
```

Toda entrega se registra como DRAFT, con parámetros, hash, job y coste. Revisión de estilo, geometría y navegador separadas; promoción explícita después de las tres.
