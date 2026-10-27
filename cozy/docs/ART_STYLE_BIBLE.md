# COZY — PREMIUM ILLUSTRATED DIORAMA

Versión candidata 1, 27-10-2026. Dirección artística para producir y revisar, no certificación de los 88 assets heredados.

## Visión y referencias

Una casa de maqueta artesanal interactiva: proporciones ligeramente chunky, materiales táctiles, siluetas limpias y calor doméstico. El mundo es protagonista; tareas y hábitos permiten cuidarlo. Referencia visual de identidad: [atlas Oak del usuario](reference-oak-cozy.png). Referencia de entorno actual: [room mediana](canonical-room.png). Ambas sirven para color y carácter; no imponer sus cámaras incompatibles como si fueran una sola.

Golden candidato: desk, chair, bookshelf, wardrobe-oak, floor-lamp y room vacía. Estado DRAFT hasta prueba conjunta. Estilo aprobado, geometría aprobada y entrega aprobada son tres revisiones diferentes; no etiquetar «aprobado» por un PNG atractivo.

## Forma, proporción y detalle

Silueta reconocible a tamaño real de juego. Patas, brazos, zócalos y tiradores ligeramente gruesos, esquinas redondeadas sin borrar función. Conservar huecos entre patas y debajo del tablero. Ningún escritorio lleva portátil, libros, taza o planta integrados. Biblioteca vacía salvo partes estructurales; accesorios se colocan aparte.

Escala lógica actual: celda 88, escritorio 2×1, silla 1×1, biblioteca/armario 2×1, cama 3×2. Eso es espacio de colocación, no ancho de la silueta. No escalar una copa de planta para llenar una celda ni una taza hasta el tamaño de silla. Las alturas/superficies actuales son unidades de proyección; comprobarlas con el contrato de exportación antes de tratarlas como metros. Definir base física y puntos de apoyo separados del footprint reservado.

Detalle en tres niveles: forma y grandes materiales primero; costuras, juntas y tiradores después; veta fina al final. A 360 px de viewport deben seguir leyéndose función y colección. Si la textura parece ruido al reducir, reducir contraste y frecuencia, no afilarla.

## Paleta y familias

Valores de dirección, no muestreo exacto de cada bitmap: madera miel `#BA8355`, sombra madera `#674732`, verde pared `#235E4E`, fondo `#17221F`, salvia `#89966B`, crema `#EFE4C9`, terracota `#B86F50`. Luz ámbar `#EFBD75`. El negro de contorno debe ser marrón/verde profundo, sin borde negro uniforme dominante.

| Familia | Material dominante | Acentos | Límite |
|---|---|---|---|
| Oak Cozy | Madera cálida, tela mate, cerámica | Musgo, crema, terracota | No todo naranja ni vetas fotográficas |
| Gamer | Nogal oscuro y grafito | Turquesa/morado pequeños | No neón en cada contorno; conservar hogar |
| Futuristic | Blanco mate y grafito | Cian contenido | No plástico brillante fotoreal; blanco distinto de lino crema |
| Industrial | Madera, acero negro, cuero | Oliva y ámbar | No herrumbre sucia ni metal espejo |

Cámara, escala, luz y grosor de borde no cambian al cambiar de familia.

## Materiales y acabados

- **Wood:** veta amplia sutil, bisel claro, cara lateral más oscura sin saturación naranja excesiva. Las tablas conservan dirección de veta en caras contiguas.
- **Fabric:** mate, volumen blando, costuras legibles; trama casi imperceptible a tamaño de juego. No cuero plástico para lino.
- **Metal:** reflejos pequeños y controlados; bronce envejecido Oak o acero oscuro Industrial. Tornillos y herrajes acordes al tamaño.
- **Ceramic:** superficie suave, highlight ancho y tenue; borde de taza con grosor. No brillo blanco quemado.
- **Glass:** transparencia sutil sin esconder silueta; separar vidrio de líquido si existe. No fondo opaco detrás de recipientes transparentes.
- **Plants:** hojas con planos de volumen y verdes naturales, maceta independiente de follaje para medir apoyo; nunca usar ancho de copa como diámetro de sombra.

Contornos ilustrados variables, más oscuros en oclusión y cara sin luz. Objetivo de revisión: borde visible de aproximadamente 1–2 px en muebles principales a captura 1400×900; no contorno SVG uniforme. Mantener resolución suficiente sin que la miniatura parezca recorte fotográfico.

## Cámara y luz maestra

Contrato y derivación: [PROJECTION_SPEC](PROJECTION_SPEC.md). No convertir ángulos visibles en Euler. La luz está en mundo; no rota con el objeto. Propuesta piloto, no luz recuperada de PNG: key grande desde arriba/frente-izquierda de pantalla, fill débil desde lado opuesto, ambiente suave. En base de cámara del spec, posición orientativa de key respecto al target = `-300*right + 200*viewHorizontal + (0,0,600)`. Registrar coordenadas finales después de QA, exposición y color idénticos en todas las capturas. Intensidades relativas de partida ambient 0,55, key 1, fill 0,2, a calibrar sin clipping; no son ajustes ya implementados en un motor 3D.

**Ambient** levanta sombras sin borrar volumen. **Key** define caras y biseles. **Fill** conserva legibilidad. **Contact** nace en patas/base, no en bbox de toda la imagen. **Cast** sale en dirección opuesta a key y respeta receptores. **AO** es corto en juntas/esquinas, no una mancha negra exterior. No hornear cast grande en baseColor y volver a dibujarla en CSS. En 2.5D separar pases y documentar las limitaciones de oclusión; una elipse es un apoyo aproximado, no sombra geométrica.

Perfiles: escritorio con apoyos separados; silla Oak con cuatro patas y sillas giratorias con base radial; armario con base ancha; lámpara con disco estrecho; maceta con contacto pequeño; alfombra sin mancha adicional. Pivots por vista/pose, contrastados en escena. El glow representa emisor, no sustituye la iluminación ni debe partir de los pies de una lámpara.

Noche necesita legibilidad y ambiente, pero no sol pintado en ventana. Mantener modo de día neutro como referencia; día/noche son variantes de iluminación comunes, no nuevos estilos por objeto.

## UI y movimiento

Conservar papel, verde, coral, iconos lineales comunes y tipografía local existente. Etiquetas técnicas y mediciones solo en art-debug. Catálogo muestra la misma representación que se coloca. Animación suave y reducida según preferencia; mediciones congelan parallax y mascotas. No construir un dashboard alrededor de la room ni ocultarla bajo tarjetas permanentes.

## Puerta de aprobación

Un asset puede ascender DRAFT → REVIEW → APPROVED solo con: identidad y atomicidad correctas; aristas comunes; tamaño y contacto comprobados; sombras sin halo ni doble oscuridad; alpha limpio sobre fondo claro/oscuro; materiales coherentes a escala de juego; cuatro vistas auténticas si se ofrece giro; accesorios sobre superficies; consola limpia y presupuesto de archivo cumplido. Un GLB también necesita reverso, normales, UV, estructura y render real en navegador. Registrar revisor, evidencia y versión; nunca aprobar automáticamente por bytes o residual.

Ejemplos positivos actuales de intención: escritorio Oak vacío con madera cálida; silla de tapizado verde; colección Industrial con marcos metálicos; room con zócalo/ventana/base. **Ninguno prueba aún el conjunto completo.** Negativos verificables: `future-rug` a +38,6° contra suelo +24,1°; `chair` deformada a partir de silueta de respaldo; lámpara con sombra del mismo tamaño que silla; noche que conserva luz solar pintada; muebles CSS planos, pixel art rígido o mallas facetadas genéricas como reemplazo del acabado ilustrado.
