# Cozy City — Isla 001

La ruta `/cozy/city/` muestra ahora la isla completa. Conserva el banco y sus puertas, incorpora el entorno modular y mantiene los enlaces desde Ajustes y Oak Studio. HTML, CSS y JavaScript sin build; Three.js y GLTFLoader locales. No modifica el progreso ni los datos de Cozy Room.

La versión actual mejora ocho familias del entorno: [autoría y validación V2](COZY_CITY_ASSETS_V2.md), [galería antes/después](qa/island-v2/index.html). La arquitectura y coordenadas iniciales están documentadas en [COZY_CITY_ISLAND.md](COZY_CITY_ISLAND.md). Las carpetas `qa/island` y `qa/city` conservan las revisiones históricas.

Arrastra para orbitar, usa la rueda o pellizco para zoom, Mayús + arrastre o «Desplazar» para mover el encuadre. Flechas, +/− e Inicio funcionan con foco en el visor. «Ver el banco» acerca la cámara; sus puertas se abren con el botón o al pulsar sobre el edificio.

Validación: `node cozy/tools/validate-island.cjs`, `node cozy/tools/qa-island.cjs` y `node --test cozy/tests/*.test.mjs`. El script de navegador admite `PLAYWRIGHT_MODULE`, `COZY_URL`, `ISLAND_QA_DIR` y `SKIP_VIDEO`. No añade dependencias al sitio publicado.
