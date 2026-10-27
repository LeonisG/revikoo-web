# Oak: publicación y siguiente lote

## Decisión de entrega — 28 octubre 2026

Publicar el escritorio ya generado con cuatro giros reales, sombra por orientación y altura de superficie medida. Conservar su GLB como fuente y los maestros originales. La petición de producción autoriza esta promoción funcional; no equivale a certificar la colección completa ni a eliminar las limitaciones de textura documentadas en GLB_PILOT_REPORT.md.

Para la experiencia final recomendamos 3D directo: cámara ortográfica, colocación continua con ajuste opcional, rotación independiente de cámara y muebles, raycasting y superficies de apoyo. Los WebP de cuatro vistas mantienen el juego actual mientras se convierte el catálogo. No cargar Three en la ruta normal.

La ficha oficial de [My Dream Setup](https://store.steampowered.com/app/2200780/) describe colocación sin cuadrícula, colores por objeto y Blueprint para paredes, ventanas y puertas. Es referencia de interacción; no copiar recursos ni su interfaz. El motor actual exige coordenadas enteras y giros de 90°: la colocación libre necesita un formato separado antes de migrar partidas.

## Lote Oak 01 autorizado y ejecutado

Referencias individuales revisadas, transparentes y sin accesorios incorporados:

| ID | Fuente existente | Control particular |
|---|---|---|
| chair | assets/masters/oak-cozy/chair.png | Cuatro patas de madera, tapizado verde; sin ruedas |
| bookshelf | assets/masters/oak-cozy/bookshelf.png | Estantes vacíos, trasera y huecos transitables visualmente |
| wardrobe-oak | assets/masters/oak-cozy/wardrobe-oak.png | Dos puertas crema, tiradores y cajón inferior |
| floor-lamp | assets/masters/oak-cozy/floor-lamp.png | Pie continuo, pantalla abierta y cadena; no luz pintada sobre suelo |

Modelo consultado en Higgsfield: `tripo_h3_1_image_to_3d`. Una generación por referencia, 12.000 caras objetivo, textura y geometría standard, PBR false, quad false, auto_size false, texture_alignment original_image, orientation default. Cotización consultada el 28-10-2026: **9 créditos por modelo, máximo 36 para cuatro**. Sin reintentos de pago, retexturizados ni ampliación automática. El presupuesto anterior de 9 correspondía exclusivamente al escritorio ya terminado.

Secuencia: generar silla, inspeccionar; continuar con las otras tres solo si la primera conserva estructura y material. Cada GLB requiere validación, normalización uniforme, superficie medida, cuatro vistas, prueba junto al escritorio y registro de job/coste. No sustituir una pieza fallida. Las rooms no forman parte de este gasto.

El usuario autorizó expresamente **hasta 36 créditos para las cuatro piezas**. Se generó y revisó la silla antes de enviar las otras tres. Los cuatro jobs terminaron; cada GLB tiene 0 errores y 0 warnings de Khronos. Se ejecutó una generación por pieza, sin reintentos, sin generar imágenes adicionales. Cotización total del lote: 36 créditos; el endpoint no proporciona factura ni débito desglosado. No queda saldo autorizado para nuevas generaciones de este lote.

| Pieza | Job | Triángulos | Bytes GLB |
|---|---|---:|---:|
| Silla | fe3a7cd2-e5ad-4646-bbb7-eaa6f397db06 | 10.576 | 1.067.092 |
| Biblioteca | 35dcf3e4-9a18-4f51-9695-fd673bf4e77c | 10.024 | 792.896 |
| Armario | 8cdfe437-df7b-48c9-a57c-8d3e13632541 | 9.890 | 864.012 |
| Lámpara | dfd8e419-0629-4e16-9b8d-0a3d5de18f4d | 11.718 | 948.812 |

Revisión: silla con cuatro apoyos y brazos continuos; biblioteca con huecos y trasera; armario con dos frentes crema, tiradores y cajón; lámpara con pantalla abierta y cadena reconstruida. Mallas fusionadas, sin articulaciones. La veta/contorno es más suave que en los maestros; esta publicación establece una base 3D coherente, no un acabado ilustrado final. Los originales permanecen conservados.

## Implementación publicada

- `assets/released.mjs` enumera cinco piezas: escritorio existente más estas cuatro. Cada una entrega cuatro WebP reales, máscara de selección y pase de sombra; ninguna aplica `axisFix`. Los GLB quedan en `assets/models/oak/` y la procedencia en cada carpeta.
- El juego principal mantiene IDs, inventario, precios, tareas y guardados. Giro de 90° con el botón Girar o R; cancelación y colisión mantienen sus reglas. La biblioteca utiliza seis alturas medidas mediante raycast sobre la malla y conserva sus seis índices de superficie.
- `studio/` utiliza directamente los cinco GLB en WebGL. Arrastre por raycasting, rotación de 15°/90°, teclado, colisiones entre rectángulos orientados, selección, deshacer, cámara orbital y zoom. Ajuste opcional de 22 unidades, límite de 30 instancias, render bajo demanda y DPR máximo 1,75. No hay React ni build ni CDN.
- El estudio guarda un boceto continuo en `cozy-oak-studio:v1`; no representa el inventario del juego. Todavía no migra tareas/monedas, accesorios sobre superficies ni los otros 33 IDs Oak. Acceso desde Ajustes → Oak Studio o `cozy/studio/`.
- `studio/room-kit.mjs` construye base, tablones, paneles, molduras, puerta y hueco real de ventana. Ancho y fondo independientes (4/5/6), pared coloreable y ventana desplazable en Studio. Los cuartos del juego principal son renders del mismo kit, con tres tamaños y seis estados de luz/clima: 18 WebP de 24–55 KB cada uno. Las habitaciones no han consumido créditos.
- La cámara está definida en `logic/room-camera.mjs`; la calibración antigua queda en `docs/audit/room-camera-before-oak.mjs`. No ejecutar `measure-room.py` para estas nuevas rooms: `export-rooms.cjs` y `encode-rooms.py` reproducen su entrega geométrica.

Limitaciones: la ruta principal mantiene una cámara fija y el resto del catálogo ilustrado anterior. Sus sombras son pases recortados al suelo, sin oclusión dinámica entre sprites. Studio sí resuelve profundidad y sombras 3D, pero aún es una vista previa con guardado independiente, no la sustitución completa del motor de juego. No se ha medido GPU en teléfono físico.

## Verificación

30 pruebas de Node: economía, guardado, superficies, colisiones, assets y layout continuo. Suites de navegador `browser.cjs` y `builder.cjs`: colocación, ratón/touch, rotación, compras, productividad, recarga, móvil y subruta. `qa-pilot.cjs`: escritorio/taza en cuatro giros, ausencia de Three/GLB en la ruta normal, guardado aislado y ausencia de errores de red/consola. `qa-studio.cjs`: cinco modelos, giro, colisión, arrastre/cancelación, tamaño/luz, deshacer, recarga y viewport de 360 px. Capturas y resultados en `docs/qa/oak-release/` y `docs/qa/tripo-pilot/`.

## Rooms y extensión del catálogo

Construir las tres dimensiones con un kit 3D común: base, tablones, paneles, molduras, pared con hueco real, ventana y puerta. Una sola cámara y luz, sin estirar renders de habitaciones. Primera sala interactiva de evaluación en `studio/`, con guardado propio: permite probar el escritorio GLB y modularidad sin modificar el inventario ni las tareas.

Después del conjunto Golden: cama, cajonera, escritorio ancho, mesa auxiliar y estantería pequeña; luego accesorios y plantas. Alfombras/cuadros requieren geometría plana y materiales, no necesariamente generación de un volumen; mascotas necesitan poses/rig, no tratar una sola malla como animación. Cotizar cada lote tras validar el anterior.
