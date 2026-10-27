# Proyección de Cozy — evidencia y contrato de producción

## Estado real

`logic/grid.mjs` proyecta mundo Z-arriba sobre pantalla Y-abajo:

```text
[sx]   [1  -1   0] [x]   [origin.x]
[sy] = [t   t  -1] [y] + [origin.y]
                    [z]
```

Celda = 88 unidades, lienzo = 1400×900. Las coordenadas guardadas son celdas; no píxeles. `cellAt` invierte el plano Z=0. `surfacePosition` aplica el giro del padre antes de proyectar la altura del accesorio. Footprints y colisiones pertenecen al motor lógico, no al sprite. El orden de pintado maneja padres/hijos, suelo y profundidad; no equivale a un depth buffer 3D.

| Tamaño | t | Origen | Ángulo proyectado simétrico |
|---|---:|---|---:|
| small 4×4 | 0,46075 | 700 / 451,18 | 24,738° |
| medium 5×5 | 0,44742 | 700 / 447,57 | 24,105° |
| large 6×6 | 0,43746 | 700,42 / 421,70 | 23,627° |

Fuente exacta y fit de cada shell: `logic/room-camera.mjs`. Estos son ajustes raster heredados. No cambiar `t` solo para satisfacer un prompt: desalinearía los suelos existentes. Son una excepción temporal documentada, no el estándar nuevo.

## Propuesta canónica V1, pendiente del piloto visual

Usar **t=0,44742**, la habitación mediana, para todos los nuevos recursos; mantener origen como parámetro de encuadre y zoom uniforme. Ejes de pantalla ±24,105°, verticales 90°. Es una decisión de mínima migración del suelo, no una media supuestamente correcta de muebles incompatibles. Los originales de escritorio/biblioteca son aproximadamente −33°/+20°; no justifican la hipótesis −32°/+25°. No existe todavía un Golden Set geométricamente aprobado.

La matriz anterior es el contrato 2.5D. No aplicar matriz affine a la imagen para fingir esta cámara. Escala uniforme y traslación al pivot sí son presentación; shear y escalas distintas X/Y no son corrección de cámara. El plano de una lámina frontal de pared es una excepción de mapeado de superficie, explícita y no válida para convertir muebles volumétricos a otra orientación.

## Derivación de una cámara ortográfica candidata

No hay cámara 3D actual. La siguiente es una **configuración de exportación propuesta**, no una cámara medida a partir del PNG. Mundo Z-arriba, azimut simétrico 45°. Para conseguir `sy/sx=t` en los dos ejes del suelo, elevación `e=asin(t)≈26,58°` (no `atan(t)`). Base de cámara:

```text
right = (1/√2, -1/√2, 0)
up    = (-sin(e)/√2, -sin(e)/√2, cos(e))
eye   = target + d * (cos(e)/√2, cos(e)/√2, sin(e))
```

Con zoom de √2 píxeles por unidad, el suelo proyecta exactamente `(x-y, t(x+y))`, y la altura proyecta `-√2*cos(e)*z≈-1,2648*z`. El grid heredado usa `-z`. Por tanto, para renderizar un modelo contra ese grid, una unidad de altura heredada corresponde a `1/(√2*cos(e))≈0,79065` unidades verticales de exportación. Esta conversión es un contrato explícito de unidades, no deformación post-render. Al migrar a una escala física uniforme, convertir también alturas `top` y `surfaces.z`, nunca solo el mueble. El piloto debe comparar ambos para decidir si la convención heredada conserva proporciones aceptables.

Para stage 1400×900: altura ortográfica `900/√2≈636,40` unidades de exportación, ancho `1400/√2≈989,95`; distancia d arbitraria que contenga modelo y clipping (propuesta d=1800). Target de captura del objeto = centro del footprint, Z=0; colocar ese punto en el pivot exportado. En escena room, desplazar el viewport para situar target en el origen deseado. Guardar valores completos, no solo Euler. Cuatro orientaciones de modelo: 0/90/180/270 alrededor de Z; cámara y luz no giran con el modelo. No prometer NE/NW/SE/SW hasta verificar correspondencia visual y nombrarla.

## Medición y tolerancias propuestas

1. Anotar dos aristas estructurales por eje en maestros originales, excluyendo sombras, contornos redondeados, hojas, cojines y biseles. Guardar endpoints y resolución. La medición de silueta es solo screening; la silla necesita brazos/asiento/base marcados manualmente.
2. Ajustar rectas robustas, informar puntos descartados y residuales; comparar también frontales, no solo coronación. Un objeto dibujado con perspectiva variable no tiene una única cámara recuperable.
3. En room anotar las cuatro esquinas **interiores transitables**, excluyendo espesor/base. Validar grid en las cuatro esquinas y centro, no solo contra una arista de color.
4. Aprobación candidata: desviación ≤1° en aristas rectas, ≤2 px de contacto a escala de captura 1400×900; ningún pie fuera de base física prevista. Son objetivos de QA, no mediciones ya superadas.
5. Overlay independiente: ejes, celdas, footprint, pivot, bounds de imagen, bounds sólidos y emisor de luz. Capturas día/clima despejado/movimiento desactivado y misma dimensión de viewport.

## Expansión de rooms

Producir kit común: baldosa/parquet repetible sin sombra solar pintada, dos paneles de pared, esquina, zócalo, moldura, ventana y base. Geometría cuadrada NxN mantiene la matriz; crecen tramos y encuadre, no cambian ángulos. Para B, renderizar automáticamente la room por tamaño desde ese kit, con capas separadas floor/back-walls/front-trim/AO/window-light; para C, conservar mallas modulares. Evitar costuras con continuidad UV y variantes de tabla deterministas. Mantener las tres ilustraciones actuales como fallback hasta validar juntas 4×4/5×5/6×6.
