# Cozy City — banco interactivo

Ruta independiente `/cozy/city/`, enlazada desde Ajustes de Cozy Room y la cabecera de Oak Studio. HTML/CSS/JavaScript sin build; reutiliza Three.js y GLTFLoader locales. El juego principal no descarga el modelo ni Three.js.

Controles: arrastrar para orbitar, rueda para zoom, botones equivalentes, flechas y +/− con foco en la vista, Inicio para restaurar. En móvil, un dedo orbita y dos amplían. Elevación limitada para evitar pasar bajo el suelo; zoom entre 55% y 350%. Cámara ortográfica con Z vertical y conversión estándar del GLB.

El botón de puertas reproduce los clips originales del GLB (apertura/cierre, 0,8 segundos); se bloquea durante la transición y conserva la pose final. Respeta movimiento reducido. Render bajo demanda, salvo durante la animación. DPR máximo 1,75 y mapa de sombras de 2048. Imagen alternativa cuando no hay WebGL o falla la carga. No modifica localStorage ni el progreso.

Prueba reproducible: `node cozy/tools/qa-city.cjs`, con PLAYWRIGHT_MODULE si Playwright no está instalado en el proyecto; COZY_URL permite probar localhost o producción. Cubre carga, rueda, arrastre, reset, teclado, poses de puertas, ancho de 360 px y enlace desde Ajustes. Evidencias en `docs/qa/city/`. También pasan las 32 pruebas de `node --test cozy/tests/*.test.mjs`.

El modelo contiene 44.171 triángulos; el renderer cuenta 88.344 al incluir el pase de sombras y el suelo, con 179 llamadas en la vista probada. No se han medido FPS en teléfono físico.

Solo se publican el GLB y el PNG necesarios para la experiencia. El maestro .blend, scripts de autoría, vistas de revisión y copias de seguridad permanecen en la carpeta local del asset.
