# Cozy Room · V0.1

Una habitación ilustrada que crece con las cosas que haces. Aplicación funcional, estática y completamente aislada dentro de `/cozy/`.

## Ejecutar

Desde la raíz del repositorio:

```sh
python -m http.server 4173 --bind 127.0.0.1
```

Abrir `http://127.0.0.1:4173/cozy/`. Los módulos ES necesitan HTTP; no abrir `index.html` mediante `file://`.

No hay instalación de dependencias, compilación, backend, fuentes remotas ni CDN. JavaScript, CSS, ilustraciones y audio funcionan localmente después de cargar la página. No se incluye un service worker ni se promete disponibilidad sin conexión.

## Auditoría y publicación

El repositorio existente contiene páginas HTML, CSS y JavaScript estáticos, `CNAME` con `revikoo.com` y `.nojekyll`. No hay `package.json`, configuración de build ni workflows de GitHub Actions en el checkout. Existen otros micrositios aislados y pruebas de Node para `parking-pass/`.

Esta implementación añade exclusivamente `cozy/`: no modifica la homepage, estilos, scripts, logos, navegación, README global, `CNAME`, `.nojekyll` ni otras aplicaciones. No reutiliza el branding comercial de Revikoo para esta experiencia independiente.

Para publicar, incluir la carpeta `cozy/` en la misma rama y raíz que ya utiliza GitHub Pages. La URL resultante será `https://revikoo.com/cozy/`. No se necesitan redirects, fallback de SPA, cambio de dominio ni configuración adicional. Todas las referencias son relativas al documento o a `import.meta.url`: también funciona bajo `/revikoo-web/cozy/` en un dominio de proyecto.

**Estado y alcance de la verificación (27 de octubre de 2026):** la V0.1 está guardada en el commit `037dec6` y publicada en `https://revikoo.com/cozy/`. Se han comprobado respuestas HTTP 200 para la aplicación, su módulo principal, estilos e ilustración, y se ha abierto el escritorio y el cuaderno en producción sin errores de ejecución ni recursos fallidos. La homepage de Revikoo también responde correctamente. El recorrido completo se ha probado localmente tanto en `/cozy/` como bajo `/revikoo-web/cozy/`, con 16 pruebas de lógica aprobadas entre Cozy Room y el micrositio existente. El endpoint público de configuración de Pages devolvió 404 durante la auditoría inicial; la rama fuente no se ha confirmado mediante esa API. Esta revisión no cambia la configuración de publicación ni realiza un nuevo despliegue.

## Estructura

```text
cozy/
  index.html                 Escena semántica, hotspots y diálogos accesibles
  app.mjs                    Coordinación, navegación y reloj
  styles/cozy.css            Estilos de esta aplicación, por capas CSS
  assets/
    manifest.mjs             Referencias de ilustraciones y sustituciones
    room.svg                 Arquitectura, ventana y paisaje diurno
    furniture.svg            Escritorio, biblioteca y gato
    foreground.svg           Silla y planta de primer plano
    rug.svg                  Alfombra inicial separada del mobiliario
    objects.svg              16 ilustraciones de catálogo en símbolos SVG
    favicon.svg
  logic/
    config.mjs               Recompensas, precios, slots y configuración
    engine.mjs               Transacciones y reglas del juego
    storage.mjs              Único acceso a localStorage, versión y validación
    events.mjs               Eventos internos y trackEvent sin red
    audio.mjs                Ambiente e interacciones Web Audio
  ui/
    room.mjs                 Capas, iluminación, decoración y parallax
    panels.mjs               Cuaderno, biblioteca, catálogo, ajustes y debug
    helpers.mjs              Escape de texto, assets y aspecto de los libros
  tests/
    engine.test.mjs          Pruebas de economía, estado y persistencia
    browser.cjs              Recorrido de navegador y capturas de QA
```

## Cómo se usa

- Acercarse al escritorio y abrir el cuaderno, el reloj o el portátil. Los accesos inferiores permiten llegar a las mismas herramientas con teclado o desde móvil.
- Las tareas se pueden añadir, editar, completar y eliminar. Una tarea cerrada no se edita ni genera otra recompensa.
- Focus ofrece 25, 45, 60 y 90 minutos. Durante la sesión se ocultan las distracciones. Cancelar pide confirmación y no da recompensa.
- La biblioteca genera lomos consistentes a partir del título. Se puede guardar la página, marcar un libro terminado y retirarlo. Volver a una página anterior no permite cobrar otra vez.
- El catálogo tiene 16 objetos y una sección «Mi colección». Comprar no coloca el objeto automáticamente: hay que elegir un rincón. Mover un objeto lo retira de su posición anterior. Reemplazar otro lo devuelve a la colección.
- La ventana y los ajustes permiten escoger mañana, día, atardecer o noche, y lluvia o cielo despejado. «Según la hora» usa la hora local del navegador y se actualiza cada minuto.
- La lámpara se enciende o apaga al pulsarla. El gato solo reacciona con un pequeño gesto.
- El reinicio borra todos los datos de la habitación actual después de una confirmación explícita.

## Estado y persistencia

La clave normal es `cozy-room:v1`. El estado contiene `version`, `revision`, `profile`, `coins`, `tasks`, `books`, `focusHistory`, `activeFocus`, `inventory`, `room`, `preferences` y `ledger`.

Cada operación valida las reglas, clona el estado, intenta guardarlo y solo entonces lo publica a la UI. Si el guardado falla, la transacción se revierte y se informa del problema. Si el navegador bloquea la lectura de localStorage, se permite una sesión en memoria con un aviso visible de que no persistirá.

Un JSON corrupto o un esquema no válido intenta conservarse en `cozy-room:v1:recovery:<timestamp>` antes de iniciar un estado limpio. Una versión futura queda protegida contra sobrescritura. Para una futura migración, ampliar la validación y migrar explícitamente en `storage.mjs`, conservando una copia del estado anterior.

`rewardClaimed` y el registro `ledger` impiden volver a cobrar la misma tarea, sesión o libro. Las compras se rechazan si falta saldo o ya existe el objeto. Los eventos `storage` sincronizan pestañas y la revisión detecta cambios de una pestaña que aún no ha actualizado su copia. Esto es una protección básica, no un bloqueo transaccional entre procesos ni un sistema antifraude: localStorage y el reloj del cliente se pueden modificar deliberadamente.

Focus almacena una fecha límite absoluta, no cuenta ticks. Al volver de otra pestaña, recargar o abrir de nuevo el navegador, se calcula el tiempo restante. Si ya acabó, se concede la recompensa una vez. No hay notificaciones ni procesos ejecutándose con el navegador cerrado.

Toda la productividad permanece en este navegador y origen. No existe sincronización entre dispositivos. Borrar los datos del sitio elimina el progreso. `localhost`, un dominio de GitHub Pages y `revikoo.com` tienen almacenamientos distintos.

Para añadir persistencia remota, sustituir el adaptador `load/save` de `storage.mjs` y adaptar el coordinador de transacciones para operaciones asíncronas. Las reglas de tareas, focus, inventario y recompensas quedan separadas de la UI y del proveedor de almacenamiento.

## Economía y nuevos objetos

Editar `GAME_CONFIG` en `logic/config.mjs` para cambiar recompensas, monedas iniciales, duraciones y preferencias de animación. Los precios viven en `CATALOG`, en el mismo archivo.

Valores iniciales:

| Acción | ✦ |
| --- | ---: |
| Tarea pequeña / mediana / grande | 2 / 5 / 10 |
| Focus 25 / 45 / 60 / 90 min | 5 / 10 / 15 / 25 |
| Terminar un libro | 25 |
| Bienvenida | 20 |

Para añadir un objeto:

1. Crear un símbolo con `id` único en `assets/objects.svg`, preferiblemente en un `viewBox` de `0 0 160 180` (alfombras: `0 0 300 120`).
2. Añadir un registro a `CATALOG` con `id`, `name`, `category`, `price`, `asset` y `compatibleSlots`.
3. Usar slots existentes de `SLOTS` o añadir uno con coordenadas porcentuales relativas a la escena 1400 × 900. Cada slot admite un objeto.
4. Probar compra, colocación, sustitución, devolución a inventario y recarga.

`owned` y `equipped` se derivan del inventario y los slots, evitando mantener varias copias contradictorias. Todos los objetos de V0.1 son únicos; `repeatable` queda como metadato a futuro y no habilita compras múltiples todavía.

## Sustituir ilustraciones

Las referencias de capas están centralizadas en `assets/manifest.mjs`. Para cambiar una capa completa, sustituir su URL conservando el lienzo 1400 × 900 y los puntos de apoyo de los objetos.

Para cambiar un objeto SVG por una ilustración WebP/AVIF, añadir una entrada a `ITEM_ASSETS` en ese manifiesto:

```js
export const ITEM_ASSETS = {
  mushroom: {
    type: 'image',
    src: new URL('mushroom-lamp.webp', root).href,
  },
};
```

No cambia la lógica de compras ni de colocación. Mantener un fondo transparente, encuadre y proporción similares. Las ilustraciones secundarias raster usan `loading="lazy"`. El atlas SVG actual es pequeño, local y compartido entre todos los objetos. La ventana nocturna usa geometría SVG recortada a los cuatro cristales; no se oscurecen los marcos.

## Audio, movimiento y accesibilidad

Web Audio sintetiza ruido filtrado para el ambiente y la lluvia, un tono suave durante focus y pequeños sonidos de interacción. No hay archivos de música ni descargas externas. La preferencia de sonido se guarda, pero el contexto de audio solo se crea o reanuda después de una interacción válida. Al ocultar la página se silencia el ambiente. Se puede desactivar el sonido y ajustar su volumen.

El movimiento usa transformaciones CSS, opacidad y una actualización de parallax por frame solicitado. Respeta `prefers-reduced-motion` y el ajuste manual. No utiliza GSAP, WebGL ni motores 3D. Los diálogos nativos contienen el foco y se cierran con Escape; el reinicio mantiene el botón de cancelar como foco inicial. Los datos del usuario se escapan antes de representarlos en HTML.

La vista principal se adapta desde 360 px. En móvil se priorizan la habitación, los accesos inferiores y formularios legibles; no requiere apuntar a objetos diminutos para completar el recorrido.

## Debug

Abrir `http://127.0.0.1:4173/cozy/?debug=true`.

El modo está explícitamente identificado y usa **otra clave**, `cozy-room:debug:v1`. La habitación normal no muestra sus controles ni recibe sus recompensas.

- Una sesión de 25 minutos dura 25 segundos; las demás mantienen la misma equivalencia.
- La etiqueta inferior «Debug» abre la mesa de pruebas, incluso con focus activo.
- Permite añadir 100 monedas, ponerlas a cero, desbloquear toda la colección, finalizar el focus activo, cambiar luz/clima y reiniciar el guardado de pruebas con confirmación.
- `trackEvent` escribe eventos locales en consola únicamente en debug. No se envían a ningún servicio.

Recorrido recomendado: tarea mediana → completar (+5) → focus 25 segundos (+5) → comprar Monstera (−15) → colocar en suelo derecho → cerrar panel → recargar. Saldo final: 15 ✦, planta colocada y tarea/sesión conservadas.

## Verificación

Pruebas de lógica, sin dependencias:

```sh
node --test cozy/tests/engine.test.mjs
node --test parking-pass/tests/*.test.cjs
```

QA de navegador opcional, con Playwright disponible en el entorno:

```sh
node cozy/tests/browser.cjs
```

Si se usa una instalación externa, establecer `PLAYWRIGHT_MODULE` con la ruta absoluta de su módulo. `PLAYWRIGHT_CHANNEL=msedge` o `chrome` permite probar el navegador ya instalado. La prueba inicia y detiene su propio servidor local; guarda capturas en el directorio temporal del sistema, dentro de `cozy-qa/`.

Se verifica el recorrido productivo, edición, recompensas únicas, persistencia, focus tras recarga, cancelación, inventario, iluminación, lluvia, ajustes, confirmaciones de reinicio, Escape, foco de teclado, texto no ejecutable, ausencia de solicitudes externas y rutas bajo subdirectorio. Se revisan tamaños 1440×900, 1920×1080, 1366×768, 768×1024, 390×844 y 360×740. La homepage Revikoo se sirve desde el mismo servidor y sus pruebas existentes siguen pasando.

No hay build ni linter configurado en este repositorio. La compatibilidad con hosting estático se comprueba sirviendo los archivos finales directamente. Esta V0.1 no incluye autenticación, pagos, sincronización, notificaciones en segundo plano, colocación libre, exportación de datos ni música.
