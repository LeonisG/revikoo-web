# Higgsfield — pipeline comprobado y piloto ejecutado

Consultado mediante la integración MCP el 27-10-2026. [Especificaciones y cotizaciones recibidas](audit/higgsfield-catalog.json). **Estado al 27-10-2026: 1 job 3D enviado (piloto autorizado, 9 créditos), resultado NO verificado — ver «Estado del piloto» al final.** Ninguna otra generación enviada. Los costes son cotizaciones, no cargos ni garantías para parámetros diferentes. La sección 5 del encargo exige autorización antes de gastar créditos.

## Capacidades disponibles

| Etapa | Modelo/herramienta realmente descubierto | Uso y límites |
|---|---|---|
| Concepto / edición con referencia | `gpt_image_2_5`, `generate_image` | Variantes flare/sunburst, calidad low…max, 1k/2k/4k, `background: transparent`, referencias de imagen. Conservación de identidad y cámara requieren QA, no están garantizadas. |
| Referencias alternativas | `flux_3_image`, `flux_kontext` | Modelos de imagen presentes en recomendaciones. FLUX 3 admite referencias; no se ha verificado un parámetro alpha equivalente. No seleccionar por popularidad antes de comparar con Golden. |
| GLB piloto | `tripo_h3_1_image_to_3d`, `generate_3d` | Imagen→GLB. `face_limit` 1000…2000000, texture/PBR, geometría y textura standard/detailed, orientación default/align_image, auto_size, alineación textura original_image/geometry. No controla cámara ortográfica del render final ni garantiza partes articuladas. |
| GLB alternativo | `meshy_v7_image_to_3d` | Standard/lowpoly, triangle/quad, target_polycount 100…300000, remesh, textura, PBR opcional, symmetry, texture_prompt ≤600 caracteres. Rigging y animación disponibles pero innecesarios para este escritorio. |
| GLB optimizado a investigar | `tripo_p2_image_to_3d` | GLB/FBX, face_limit 48…50000, delight, auto_size, export_uv, export_orientation. Especificación consultada; coste y calidad NO probados. `delight` no implica recuperación perfecta de albedo. |
| Otras rutas 3D | Meshy image/multiview, Tripo H3.1 multiview, Hunyuan3D, SAM 3D; Meshy remesh/retexture | Presentes en catálogo de 18 entradas (incluye alias). No se presupone que todas sean equivalentes ni se han generado muestras. |
| Fondo | `image_background_remover` | Modelo de procesamiento descubierto mediante catálogo. No certifica bordes sin halos ni separa automáticamente accesorios pegados a muebles. |
| Escalado | `bytedance_image_upscale` | 2k/4k y remove_bg en parámetros de catálogo. Aumentar resolución no corrige geometría ni cámara. |
| Optimización web | Herramientas locales existentes y validadores | WebP, alpha, hit masks y metadatos locales. No requieren generación. Para GLB: evaluar después de disponer de un archivo real. |

Los nombres de procesamiento anteriores son **modelos**; no se encontró una herramienta autónoma `remove_background` o `upscale_image` en esta sesión. No inventar llamadas. Para modelos nuevos ejecutar `models_get` antes de enviar parámetros. Los contadores gratuitos recibidos pertenecen a otras categorías: no implican GLB gratis.

## A / B / C: decisión técnica

| Criterio | A: sprites 2.5D | B: GLB→sprites / híbrido en vivo | C: todo 3D estilizado |
|---|---|---|---|
| Calidad | Ilustración muy controlable; problemas al combinar generadores | Render común elimina desacuerdo geométrico; materiales pintados necesitan trabajo | Coherencia espacial fuerte; estilo ilustrado no sale automáticamente |
| Cámara / luz | 4 vistas y pases manuales o renderizados; relighting limitado | Fuente 3D controla cámara; sprites siguen con luz horneada. Híbrido vivo añade relighting pero mezcla profundidades | Cámara y sombras comunes, oclusión real |
| Coste de creación | Menor primera vista; crece por orientación/estado | Mayor QA inicial de malla; amortizable al sacar vistas | QA de toda la habitación, materiales, modelos y dispositivos |
| Esfuerzo técnico | Bajo, compatible ahora | Export offline: medio. GLB sobre room raster: alto por depth/máscaras | Alto; renderizador, cámara, raycast, lifecycle, contexto perdido |
| Rendimiento | DOM e imágenes, coste de memoria/layers | Export offline conserva coste A; vivo necesita GPU y carga selectiva | Presupuestos de triángulos, texturas, luces y draw calls |
| Web actual | Directa | Offline mantiene HTML/CSS/JS y hosting actual | Posible en estático, pero requiere módulo 3D adicional y fallback |
| Mantenimiento | Muchos archivos por vista | Un modelo maestro + capturas reproducibles | Modelo único, más infraestructura compartida |
| Cientos de muebles | Arte/vistas crecen linealmente | Buen equilibrio con export automatizado y versiones | Viable con LOD/materiales compartidos; móvil por demostrar |
| Nuevas rooms | Mala si cada tamaño es imagen generada | Kit modular renderizado a tamaños/capas | Kit modular en tiempo real, crecimiento flexible |

**Recomendación provisional: B con exportación a sprites**, mantener A hasta aprobar reemplazo. No incorporar Three.js a producción por anticipado. B en vivo no es una opción «gratis»: requiere la misma cámara que el fondo, plano receptor y datos de oclusión de paredes. C se reevalúa si abrir puertas/cajones, cambiar cámara o iluminar dinámicamente aporta valor real y el piloto conserva el acabado.

## Piloto concreto — presupuesto autorizado y ejecutado

Referencia: `assets/masters/oak-cozy/desk.png`, escritorio vacío actual. Usarlo como candidato de identidad, **no llamarlo Golden aprobado**. Referencia secundaria de estilo: `docs/reference-oak-cozy.png`; no enviarla como imagen de un solo objeto a image-to-3D porque contiene un catálogo completo. Revisar la identidad del escritorio: tablero, cuatro apoyos/cuerpo de cajones según la imagen, número de cajones/tiradores, laterales y espacio para piernas; no aceptar accesorios incrustados.

**Lote 1: exactamente un GLB Tripo H3.1, cotizado a 9 créditos.** Sin regeneración automática ni gasto adicional en imagen. La llamada de consulta usó `get_cost:true`, no subió referencias ni envió un job:

```json
{
  "model": "tripo_h3_1_image_to_3d",
  "get_cost": true,
  "count": 1,
  "face_limit": 12000,
  "texture": true,
  "pbr": false,
  "geometry_quality": "standard",
  "texture_quality": "standard",
  "quad": false,
  "auto_size": false,
  "texture_alignment": "original_image",
  "orientation": "default"
}
```

`face_limit` es objetivo, no prueba del recuento final. El método image-to-3D no expone control de geometría por prompt libre en esa ficha: no añadir parámetros inventados. El texto de la plantilla guía la revisión y modelos que sí admitan instrucciones; no garantiza cajones separados en Tripo.

Alternativa comparativa, solo si se autoriza después: Meshy 7, 12000 triángulos objetivo, standard, remesh/textura sí, PBR/rig/animation/ultra no: **38 créditos** cotizados. Comparar ambos sumaría **47**. Concepto independiente GPT Image 2.5 flare high 1k transparente, 1:1, count1: **1,5 créditos** cotizados; no incluido ni necesario para el primer escritorio. El único presupuesto autorizado fue una generación Tripo hasta 9 créditos. No hay presupuesto aprobado para producir Golden Set completo.

Tras autorización: revisar coste con mismos parámetros; si sube, parar. Consultar preferencias de la integración; subir solo PNG seleccionado mediante flujo de media verificado; guardar hash y referencia. Enviar UNA solicitud. Conservar ID de job. Si hay respuesta ambigua, consultar historial/estado antes de reintentar; nunca duplicar un cargo por timeout. Descargar resultado a `assets/candidates/` sin sustituir producción. Registrar proveedor, modelo, opciones, job, coste cotizado, fecha y hashes. No publicar ni promover por el mero estado completed.

## Puertas de calidad

1. **Reference/Concept:** identidad, silueta, familia y atomicidad. DRAFT hasta aprobación en escena. No convertir una habitación entera en mueble.
2. **Geometry:** mirar frontal/lateral/posterior/inferior; agujeros, caras invertidas, partes flotantes, patas fusionadas, cajones y tiradores. Verificar geometría real cuando una pieza deba abrirse, no líneas pintadas en una caja. Anotar manualmente trasera inventada cuando la imagen no la muestra.
3. **GLB técnico:** parseo y glTF validator, normales, UV, textura integrada, ausencia de URLs externas inesperadas, estructura/nodos, transforms aplicadas, bounds, pivot de base, unidades y eje vertical. Medir triángulos y materiales reales. «Válido» no equivale a bonito.
4. **Material:** baseColor sin cast shadow pegada; sin doble key. Comparar unlit y luz neutra; si textura ya hornea iluminación fuerte, corregirla o rechazar ruta PBR. Evaluar estilizado PBR de roughness alta primero; toon solo si conserva madera/tejido. No lanzar retexture extra sin coste autorizado.
5. **Cámara/export:** aplicar `PROJECTION_SPEC.md`, cuatro vistas, same light, pivot por vista y footprint 2×1 o 1×2. Capturar color/alpha y contacto/cast por separado. No construir NE/NW a partir de espejar una vista.
6. **Browser:** cargar el archivo real en visor de QA local, inspeccionar 360°, consola y memoria. Componer capturas en `?art-debug=true` con tamaños reales. Este control ya se ejecutó sobre el escritorio: ver GLB_PILOT_REPORT. Para las demás piezas sigue pendiente.
7. **Performance:** objetivo inicial escritorio ≤12000 triángulos, textura 1024, ≤4 materiales, GLB ≤3 MB; límites de proyecto propuestos, no promesas del proveedor. WebP ≤350 KB por vista. Si optamos por vivo, medir al menos 30 objetos en móvil real, frame time p95 y memoria antes de fijar presupuesto total.
8. **Approval:** evidencia comparativa, revisión de contacto/escala/materiales y cero errores técnicos. Promoción por cambio de manifiesto, conservar versión anterior. Solo entonces APPROVED y siguiente pieza del Golden Set.

## Golden y habitación

Orden: desk → chair → bookshelf → wardrobe-oak → floor-lamp → room vacía. Los seis deben compartir cámara, escala, contorno y luces. Probar también taza Industrial sobre escritorio Oak, monitor Gamer y lámpara Future; no acoplar colecciones a geometría. La habitación nueva usa kit modular (suelo, paredes, ventana, zócalos, molduras, base), manteniendo verde oscuro y madera. Su reconstrucción queda detrás del piloto: no regenerar tres fondos mientras la cámara siga sin validar.

## Estado del piloto (verificado el 27-10-2026)

El escritorio Tripo **se envió**; contradice la nota `jobsSubmitted: 0` de `audit/higgsfield-catalog.json`, que es anterior al envío. Registro real en `assets/candidates/tripo-desk/provenance.json`.

| Dato | Valor |
|---|---|
| Job | `df3e1594-4357-4ef4-a64f-accd526fef70`, modelo `tripo_h3_1_image_to_3d` |
| Media de referencia | `ce1e0c9b-b489-4600-8646-d18a7938c7b1` (desde `assets/masters/oak-cozy/desk.png`) |
| Presupuesto autorizado | 9 créditos, 1 generación |
| Estado registrado | `pending` |
| Saldo leído hoy | 201 créditos, plan `starter` |

**El resultado no se puede confirmar.** `show_generations` responde correctamente para `image` y `video` (0 elementos) pero **falla con `type=3d` en los cuatro intentos** (request ids `29e46973`, `9a29658d`, `daace771`, `e513b03d`, `4e464dae`), también después de seleccionar el workspace `c7737909-d103-4684-82ac-e5b2a63459e3`, que estaba sin seleccionar. Que solo falle la categoría 3D sugiere un registro 3D existente que el conector no serializa, pero eso es una inferencia, no una lectura.

Por tanto, **no está confirmado ni que el GLB exista ni que se hayan consumido los 9 créditos**. Las puertas 2–8 (geometría, GLB técnico, material, cámara/export, navegador, rendimiento, aprobación) siguen **pendientes**, no fallidas: necesitan el archivo real.

**No reenviar el job.** Esta sesión además no dispone de herramientas de generación (solo catálogo, saldo, workspaces e historial), así que un reenvío exigiría otra vía y arriesgaría un cargo duplicado por timeout, exactamente lo que prohíbe el protocolo de arriba.

Vías para desbloquear, por orden de menor riesgo:

1. Reintentar `show_generations type=3d` más adelante; puede ser un fallo transitorio del conector.
2. Consultar el historial 3D en la interfaz de Higgsfield con la cuenta del usuario y descargar el GLB a `assets/candidates/tripo-desk/`.
3. Solo si se confirma que el job no existe y no se cobró: volver a cotizar con los mismos parámetros y, si el coste no sube, reenviar una única vez con autorización nueva.
