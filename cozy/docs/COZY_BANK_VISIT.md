# Nilo y el despacho del Banco

## Resultado y alcance

Al pulsar el Banco se inicia una visita 3D dentro de la misma página: aproximación, apertura de sus puertas originales, desvanecimiento crema, despacho POV y saludo de Nilo. El botón «Entrar al banco» ofrece la misma experiencia mediante teclado. «Volver a la ciudad» o Escape restauran el encuadre y el estado anterior de las puertas.

La implementación es visual. No incorpora operaciones financieras, autenticación, backend, chat ni personajes adicionales.

## Auditoría y conservación

Punto de partida: Cozy City V2, commit 0d073f3, HTML/CSS/JS modular, Three.js local, cámara ortográfica Z-up, tres clips del Banco y animación ambiental bajo un único RAF. No había cambios rastreados pendientes. Los archivos locales anteriores se conservaron. Respaldo del visor y de la sesión Blender en cozy/local-backups/before-nilo/.

Se comprobó la conexión Blender MCP, versión 5.2.3 LTS. El trabajo comenzó en escenas nuevas y los scripts reproducibles también se ejecutaron en Blender en segundo plano para exportar y renderizar sin alterar la escena de la isla. No se ha modificado el GLB exterior del Banco: conserva el SHA-256 7e37897593a84b9e97bdd60b72e829ffc5d09dca9529b2572b455f74c11e908d.

## Nilo

Modelo independiente en assets/characters/nilo/nilo.glb; maestro editable en assets/characters/nilo/source/nilo_master.blend. La referencia se interpreta como criatura de porcelana, con silueta ovalada, monóculo, chaleco verde, mejillas, medallón de brote y manos simplificadas. No usa imágenes orientadas a cámara.

19.366 triángulos, 22 mallas y 7 materiales compartidos. El GLB incluye los seis materiales solicitados y un material adicional para el cuello y los reflejos de los ojos. Sin texturas externas. Personaje y despacho suman 4,49 MB, cargados al comenzar la visita.

El rig es una jerarquía de transformaciones: cuerpo, parte superior, brazos, manos, antebrazos y controles de parpadeo. Los antebrazos siguen la mano para mantener continuidad al saludar. El origen está entre los apoyos inferiores; la silla está exclusivamente en el modelo del despacho.

| Clip | Duración | Comportamiento |
|---|---:|---|
| NILO_IDLE | 5 s | Respiración suave, giro leve, manos y dos parpadeos |
| NILO_GREET | 1,5 s | Mano con pluma levantada, pequeña inclinación y sonrisa |
| NILO_WRITE | 3 s | Mirada al libro y trazos breves con la pluma |
| NILO_STAMP | 2 s | Elevación del sello, apoyo sobre el documento y regreso |

Las acciones se exportan como pistas NLA agrupadas por nombre. Los clips se verifican en el GLB y en AnimationMixer. En el maestro, las pistas están silenciadas para conservar la pose de referencia; activar la pista deseada en los controles correspondientes o usar el script para revisar una pose. Las vistas frontal, lateral, trasera, tres cuartos, saludo y sentado están en previews/.

## Despacho y cámara

Recurso independiente en assets/interiors/bank-office/bank-office.glb; maestro en source/bank_office_master.blend. Tiene 84.804 triángulos, 32 mallas agrupadas y 16 materiales. Incluye suelo, alfombra, techo, paredes, ventana lateral con arco, librería, lámparas, escritorio, silla, papelería y caja fuerte. VaultDoor, NiloChair, DeskLamp, Ledger y DocumentTray conservan nodos independientes.

Nilo se coloca en [0, 1.04, 1.01] en coordenadas de autoría. Cámara de perspectiva, eje Z vertical:

| Encuadre | Posición | Objetivo | FOV vertical |
|---|---|---|---:|
| Horizontal | [0, -3.25, 2.40] | [0, 1.04, 2.12] | 46° |
| Vertical | [0, -4.10, 2.48] | [0, 1.04, 2.15] | 48° |

El cambio de encuadre ocurre por debajo de una relación de aspecto de 0,8. Nilo y sus manos quedan visibles, con el escritorio abajo. La cámara permanece fija: no añade movimiento de puntero que dificulte la lectura.

La iluminación web usa una luz hemisférica, una direccional principal con sombras, una direccional de relleno y un punto sin sombras bajo la lámpara. El perfil ligero desactiva las sombras. Los apliques usan emisión; no son luces dinámicas adicionales. Los renders Cycles son evidencia de autoría; las capturas web son la referencia de aceptación en la aplicación.

## Arquitectura y ciclo de vida

- city.mjs conserva el renderer, cámara de ciudad, controles y mixer de puertas; dirige el único bucle RAF hacia la escena activa.
- bank-transition.mjs contiene la máquina de estados y la interpolación de target, zoom, azimuth y elevation. El giro usa el arco más corto.
- bank-office.mjs carga y compone ambos GLB, configura cámara y luz, precalienta shaders y libera recursos.
- nilo-controller.mjs controla saludo, idle, trabajo, sello, mezcla de acciones, pausa y limpieza.

Estados: CITY_IDLE → BANK_APPROACHING → BANK_DOORS_OPENING → FADING_TO_OFFICE → OFFICE_LOADING → OFFICE_IDLE → RETURNING_TO_CITY → CITY_IDLE.

La aproximación dura 1,05 s; se reutiliza el clip de puertas de 0,8 s; los desvanecimientos duran 0,32 y 0,40 s. Las puertas ya abiertas no se vuelven a abrir. La carga empieza durante la aproximación y el desvanecimiento no se retira hasta disponer de ambos modelos y sus shaders. Un fallo vuelve a la ciudad y permite reintentar. El límite de red es 20 s.

El estado permite una sola transición. Arrastrar sobre el Banco no entra; tocarlo sí. Los controles incompatibles quedan temporalmente inactivos y se mueve el foco de forma explícita. La entrada funciona aunque el ambiente esté pausado. Movimiento reducido omite los desplazamientos y deja a Nilo en reposo. Se respeta la visibilidad de la pestaña.

Cada GLB convierte de Y-up a Z-up una sola vez en la raíz. Los clips permanecen en sus coordenadas locales. El despacho se conserva en memoria tras la primera visita para no recargarlo; la ciudad deja de actualizar su ambiente mientras está oculto. Al abandonar la página se liberan mixers, geometrías, materiales, mapas de sombras, listeners y renderer.

## Reproducción y verificación

Reconstrucción con Blender: --background --factory-startup --python cozy/tools/build-bank-visit.py. La opción --no-previews omite los renders; --nilo-only --all-nilo-previews reconstruye solo el personaje y sus vistas. Los scripts fuente usan rutas relativas al proyecto y no requieren APIs de generación.

- node cozy/tools/validate-bank-visit.cjs: integridad GLB, presupuesto geométrico, materiales, clips, nodos independientes y conservación del Banco.
- node --test cozy/tests/*.test.mjs: 32 pruebas del proyecto.
- node cozy/tools/qa-bank-visit.cjs: recorrido web completo y situaciones de error.
- node cozy/tools/qa-island.cjs: regresión de isla, puertas, luces, controles y ambiente.

Las pruebas de visita incluyen clic real sobre el edificio, arrastre descartado, doble entrada rechazada, cámara progresiva, saludo/idle, escritura/sello, pausa, diez ciclos, cámara rotada/desplazada, puertas abiertas, noche, preferencias, móvil táctil, movimiento reducido y recuperación tras fallo de carga.

La [validación adicional de repetición](qa/bank-office/repeat-validation.json) ejecuta diez visitas con las transiciones animadas y comprueba por separado movimiento reducido. También confirma que solo existe un canvas y captura el saludo a mitad de su gesto.

Medición local final: aproximadamente 41 FPS en alto, 45 en medio y 30 en ligero. El perfil alto usa sombras de 2048 px y mayor resolución; el medio es el predeterminado de escritorio. Son 108 llamadas de dibujo con sombras y 54 sin ellas. Tras diez visitas, el renderer conserva 219 geometrías y 5 texturas, sin crecimiento en esos contadores. No hubo errores ni avisos de consola en el recorrido normal; el fallo de red se probó de manera intencionada en una sesión separada.

[Galería y grabación](qa/bank-office/index.html), [modelos y hashes](qa/bank-office/models.json), [resultados de navegador y rendimiento](qa/bank-office/results.json). Las mediciones proceden de Edge sin interfaz en este equipo y de emulación táctil a 360 × 800; no equivalen a una prueba en un móvil físico.
