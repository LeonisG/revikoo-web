# VELVET ROSE — prototipo

Propuesta de identidad digital. Proyecto **independiente**: no comparte
estilos, scripts, assets ni tipografías con el sitio que lo aloja.

Alojado temporalmente en `https://revikoo.com/velvet-rose-nightclub/`
únicamente como entorno de presentación. Lleva `noindex,nofollow,noarchive`
en el `<head>`; no se ha tocado el `robots.txt` de la raíz.

## Estructura

```
velvet-rose-nightclub/
├── index.html
├── styles.css
├── script.js
└── assets/
    ├── images/   posters y salas (SVG placeholder, sustituibles)
    ├── icons/    favicon
    ├── video/    (vacío — para loops de sala)
    └── fonts/    (vacío — si se autoalojan las tipografías)
```

Todas las rutas son **relativas** (`./…`), así que funciona igual en
subcarpeta, en la raíz de un dominio o abriendo `index.html` directamente.

## Contenido de muestra

Todo lo sustituible está marcado en el HTML con `data-demo`. Para verlo:

```bash
grep -n "data-demo" index.html
```

Pendiente de datos reales: sesión y fecha de esta noche, agenda, line-up,
aforos, sets, dirección, teléfono, email y las URLs de entradas, reservas
(WhatsApp), Instagram y mapa.

## Tipografías

Bodoni Moda (display) + JetBrains Mono (funcional), vía Google Fonts.
Para autoalojarlas, colocar los `.woff2` en `assets/fonts/`, declarar
`@font-face` en `styles.css` y eliminar el `<link>` de Google del `<head>`.
