# Proyección de Cozy — evidencia y contrato de producción

## Estado real

`logic/grid.mjs` proyecta mundo Z-arriba sobre pantalla Y-abajo:

```text
[sx]   [1  -1   0] [x]   [origin.x]
[sy] = [t   t  -1] [y] + [origin.y]
                    [z]
```

Celda = 88 unidades, lienzo = 1400×900. Las coordenadas guardadas son celdas; no píxeles. `cellAt` invierte el plano Z=0. `surfacePosition` aplica el giro del padre antes de proyectar la altura del accesorio. Footprints y colisiones pertenecen al motor lógico, no al sprite. El orden de pintado maneja padres/hijos, suelo y profundidad; no equivale a un depth buffer 3D.

**Las tres habitaciones comparten ya un único ángulo: t = 0,44742 (24,105°).**

| Tamaño | t | Origen | Dibujada a | `stretch` aplicado |
|---|---:|---|---:|---:|
| small 4×4 | 0,44742 | 700 / 451,15 | 24,738° | 0,97108 |
| medium 5×5 | 0,44742 | 700 / 447,57 | 24,105° | 1,0 |
| large 6×6 | 0,44742 | 700,42 / 421,05 | 23,627° | 1,02277 |

Cada maestro se dibujó a una elevación distinta, así que un mueble asentado en una habitación quedaba torcido en las otras. `tools/measure-room.py` escala ahora cada lámina verticalmente por `stretch = canónico / medido`, que es el único eje que toca un cambio de elevación. La mediana gana por tener el menor residual de ajuste (0,91 px) y por quedar entre las otras dos: ninguna se mueve más de un 3%, por debajo de lo que se lee como deformación. `authoredDegrees` conserva lo que tenía el arte.

Cambiar este valor vuelve a asentar todos los recursos: hay que reejecutar `tools/measure-axes.py` y `tools/verify-angles.py`.

## Propuesta canónica V1, pendiente del piloto visual

Usar **t=0,44742**, la habitación mediana, para todos los nuevos recursos; mantener origen como parámetro de encuadre y zoom uniforme. Ejes de pantalla ±24,105°, verticales 90°. Es una decisión de mínima migración del suelo, no una media supuestamente correcta de muebles incompatibles. Los originales de escritorio/biblioteca son aproximadamente −33°/+20°; no justifican la hipótesis −32°/+25°. No existe todavía un Golden Set geométricamente aprobado.

La matriz anterior es el contrato 2.5D.

### Corrección de cámara por recurso (`axisFix`)

Una versión anterior de este documento afirmaba que «shear y escalas distintas X/Y no son corrección de cámara». **Es falso para el plano del suelo, y el código ya no lo cumple.** La derivación:

Sea un recurso cuyas dos direcciones de suelo se dibujaron con pendientes `−l` y `+r`, con verticales verticales. Se busca `M` que las lleve a `−t` y `+t` sin tocar las verticales. Con `M = [[w, 0], [s, 1]]` se cumple `M·(0,1) = (0,1)` —las alturas quedan intactas— y quedan dos incógnitas para dos condiciones:

```text
M·(1,−l) ∝ (1,−t)  →  s − l = −t·w
M·(1, r) ∝ (1, t)  →  s + r =  t·w
                   →  w = (l + r) / 2t ,  s = (l − r) / 2
```

Eso es exactamente la diferencia entre dos cámaras ortográficas sobre el plano del suelo, no un maquillaje. Un paralelogramo va a un paralelogramo, y por eso **no sirve para las alfombras**: sus bordes superior e inferior discrepan hasta 7°, así que su forma no es un paralelogramo y ninguna afín puede cuadrarla. Siguen marcadas CRITICAL y necesitan redibujarse.

Reglas que sí se mantienen:

1. Se **mide**, nunca se ajusta a ojo. `tools/measure-axes.py` se abstiene cuando la silueta no da lectura honesta (49 recursos) en lugar de inventar un valor.
2. No se corrige lo que ya está dentro de 2,5° del suelo: con dos mediciones en desacuerdo, el arte no se toca.
3. El resultado se vuelve a medir con un estimador escrito aparte, `tools/verify-angles.py --strict`, para que un fallo del medidor no se dé la razón a sí mismo.
4. Ensanchar viene forzado por la geometría, así que el render maqueta `1/widen` más estrecho y la transformación devuelve el ancho: la base corregida ocupa su footprint exacto.
5. Esto es un puente sobre arte heredado, no una licencia. El arte nuevo se autoriza a 24,105° desde el principio, y entonces `axisFix` desaparece solo.

El plano de una lámina frontal de pared es una excepción de mapeado de superficie, explícita y no válida para convertir muebles volumétricos a otra orientación.

## Derivación de una cámara ortográfica candidata

No hay cámara 3D actual. La siguiente es una **configuración de exportación propuesta**, no una cámara medida a partir del PNG. Mundo Z-arriba, azimut simétrico 45°. Para conseguir `sy/sx=t` en los dos ejes del suelo, elevación `e=asin(t)≈26,58°` (no `atan(t)`). Base de cámara:

```text
logical grid -> right-handed 3D: (X,Y,Z) = (x,-y,z)
right = (1/√2, 1/√2, 0)
up    = (-sin(e)/√2, sin(e)/√2, cos(e))
eye   = target + d * (cos(e)/√2, -cos(e)/√2, sin(e))
```

Con zoom de √2 píxeles por unidad, el suelo proyecta exactamente `(x-y, t(x+y))`, y la altura proyecta `-√2*cos(e)*z≈-1,2648*z`. El grid heredado usa `-z`. Por tanto, para renderizar un modelo contra ese grid, una unidad de altura heredada corresponde a `1/(√2*cos(e))≈0,79065` unidades verticales de exportación. Esta conversión es un contrato explícito de unidades, no deformación post-render. Al migrar a una escala física uniforme, convertir también alturas `top` y `surfaces.z`, nunca solo el mueble. El piloto debe comparar ambos para decidir si la convención heredada conserva proporciones aceptables.

Para stage 1400×900: altura ortográfica `900/√2≈636,40` unidades de exportación, ancho `1400/√2≈989,95`; distancia d arbitraria que contenga modelo y clipping (propuesta d=1800). Target de captura del objeto = centro del footprint, Z=0; colocar ese punto en el pivot exportado. En escena room, desplazar el viewport para situar target en el origen deseado. Guardar valores completos, no solo Euler. Cuatro orientaciones lógicas: 0/90/180/270; en el mundo 3D se aplican 0/−90/−180/−270 alrededor de Z por la conversión de ejes; cámara y luz no giran con el modelo. No prometer NE/NW/SE/SW hasta verificar correspondencia visual y nombrarla.

## Medición y tolerancias propuestas

1. Anotar dos aristas estructurales por eje en maestros originales, excluyendo sombras, contornos redondeados, hojas, cojines y biseles. Guardar endpoints y resolución. La medición de silueta es solo screening; la silla necesita brazos/asiento/base marcados manualmente.
2. Ajustar rectas robustas, informar puntos descartados y residuales; comparar también frontales, no solo coronación. Un objeto dibujado con perspectiva variable no tiene una única cámara recuperable.
3. En room anotar las cuatro esquinas **interiores transitables**, excluyendo espesor/base. Validar grid en las cuatro esquinas y centro, no solo contra una arista de color.
4. Aprobación candidata: desviación ≤1° en aristas rectas, ≤2 px de contacto a escala de captura 1400×900; ningún pie fuera de base física prevista. Son objetivos de QA, no mediciones ya superadas.
5. Overlay independiente: ejes, celdas, footprint, pivot, bounds de imagen, bounds sólidos y emisor de luz. Capturas día/clima despejado/movimiento desactivado y misma dimensión de viewport.

## Expansión de rooms

Producir kit común: baldosa/parquet repetible sin sombra solar pintada, dos paneles de pared, esquina, zócalo, moldura, ventana y base. Geometría cuadrada NxN mantiene la matriz; crecen tramos y encuadre, no cambian ángulos. Para B, renderizar automáticamente la room por tamaño desde ese kit, con capas separadas floor/back-walls/front-trim/AO/window-light; para C, conservar mallas modulares. Evitar costuras con continuidad UV y variantes de tabla deterministas. Mantener las tres ilustraciones actuales como fallback hasta validar juntas 4×4/5×5/6×6.
