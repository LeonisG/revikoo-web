# Cozy Bank V1.1 · Cozy Glass

Verificado el 1 de noviembre de 2026 (Europe/Madrid). Aplicación: https://revikoo.com/cozy/city/.

## Resultado

Tres modos sobre la aplicación existente: despacho despejado, acceso fullscreen y aplicación financiera fullscreen. Vanilla JavaScript y CSS, sin compilación ni dependencias nuevas. Los datos vienen de Supabase; no se precargan cifras ficticias en el frontend. [Capturas y evidencias](qa/bank-glass-v1-1/index.html).

## Auditoría y alcance

La estructura indicada seguía vigente. La restricción estaba en `.bank-panel`, de 420 px/39%, dentro del `main` recortado. Se sustituyó esa arquitectura por una sección hermana de `main` anclada al viewport. Se conservaron `finance-service.mjs`, `auth-service.mjs`, `finance-calculations.mjs`, el SDK y los contratos RPC. No se aplicaron migraciones ni cambios de Auth, SMTP, permisos o RLS.

Archivos modificados: `cozy/city/index.html`, `cozy/city/city.mjs` y los módulos `finance-app`, `finance-auth`, `finance-dashboard`, `finance-accounts`, `finance-transactions` y `finance.css` dentro de `cozy/city/finance/`. Se añadieron pruebas de presentación en `cozy/tests/bank-glass.test.mjs` y herramientas administrativas genéricas en `supabase/fixtures/`.

El GLB de la isla no cambió. SHA-256: `7E37897593A84B9E97BDD60B72E829FFC5D09DCA9529B2572B455F74C11E908D`.

## Navegación y capas

- Al entrar se muestra el despacho con un menú de bienvenida. Una sesión restaurada no tapa automáticamente a Nilo.
- Login, registro y recuperación usan una capa de viewport con tarjeta centrada. El login correcto abre la aplicación financiera; los retornos Auth conservan los servicios existentes.
- El dashboard usa cabecera, navegación lateral y contenido desplazable. En móvil la navegación se sitúa abajo y el historial se convierte en tarjetas.
- `#bank-finance` está fuera de `main`, con `position:fixed; inset:0; z-index:40`. El dashboard cubre exactamente 1440×900 y 360×800 en las pruebas. El footer y los controles del mundo no aparecen encima.
- Abrir el overlay guarda y bloquea el scroll del documento, pone el entorno en `inert` y mueve el foco al encabezado. Tab permanece dentro. Cerrar restaura el estado previo y el foco del botón de apertura.
- Escape cierra finanzas y vuelve al despacho. Dentro de una confirmación solo cancela la operación. Las confirmaciones se implementan con `dialog` accesible; el diálogo nativo anterior bloqueaba la automatización del navegador integrado.
- La sesión y los datos en memoria se conservan al volver a Nilo. Logout borra los datos visibles, el caché mensual y los recibos locales, y deja únicamente las opciones de acceso.

## Diseño

Forest Green, crema, salvia y oro apagado. Superficies de datos opacas sobre fondo translúcido, bordes claros, tipografía editorial y contraste cálido. El fallback sin `backdrop-filter` usa una superficie sólida. El blur se reduce en móvil. Animaciones de 280 ms, desactivadas con `prefers-reduced-motion`.

Cuatro indicadores, evolución de siete meses, dona por categoría con desglose textual, tarjetas de cuenta, acciones rápidas y tabla de movimientos. Los gráficos usan HTML/CSS y SVG. Incluyen leyenda, etiquetas accesibles, tooltips mediante foco y tabla alternativa de importes. Los meses vacíos muestran cero, sin inventar barras positivas. Las cifras conservan céntimos exactos y el formato español.

La evolución utiliza la RPC existente `finance_snapshot` con hasta tres lecturas simultáneas. El caché de sesión conserva hasta 24 meses y se invalida tras guardados y actualización explícita. Navegar por cuentas o habituales no solicita de nuevo esos datos. El historial mantiene paginación de 50 filas.

## Escena 3D

Se mantiene el mismo renderer, canvas, modelos y controlador de Nilo. El overlay hace inertes las interacciones ocultas. El bucle limita el renderizado del fondo a 8 FPS; al cerrar restaura el ritmo definido por la calidad existente. Nilo sigue recibiendo `saving`, `success` y `error` de la operación real, sin confirmar por anticipado. El registro y la corrección se comprobaron contra PostgreSQL después del guardado.

## Lote administrativo

Se localizó una única identidad Auth para la cuenta de pruebas autorizada y se utilizó exclusivamente su UUID. El correo y el UUID no se publican en scripts ni en el frontend. Antes del lote había una cuenta, 14 categorías y ningún movimiento o regla. Se conservó esa cuenta, su saldo inicial y su condición de predeterminada, sin actualizarla.

Lote: `cozy-glass-v1.1-2026-11-01`. Semilla fija: `11012026`. Corte temporal inmutable: 2026-11-01. Seis meses completos: mayo–octubre; noviembre solo hasta el día 1.

| Registros | Creados | Total de la cuenta tras QA |
|---|---:|---:|
| Cuentas | 3 Demo | 4 |
| Movimientos del generador | 170 | 170 |
| Movimiento adicional de validación UI | 1 | 171 |
| Categorías | 0 | 14 |
| Reglas recurrentes | 5 | 5 |
| Manifiesto del lote | 1 | 1 |

Las cuentas nuevas terminan en «· Demo». Los conceptos y plantillas también. El indicador «Datos de demostración» se obtiene de un recibo del propietario protegido por RLS, no de una lista de correos privilegiados. No otorga permisos.

Los identificadores del generador son UUID deterministas. Una transacción administrativa toma un bloqueo por propietario y guarda el manifiesto en `finance_requests` con la acción `fixture.cozy-glass-v1.1`. Si existe ese manifiesto, devuelve el resultado sin insertar ni sobrescribir. Se ejecutó de nuevo antes y después de QA: sin duplicados y conservando la corrección del gasto de validación.

El manifiesto contiene los UUID exactos de las tres cuentas, las cinco reglas y los 171 movimientos. El gasto creado desde la interfaz se añadió explícitamente a ese manifiesto. No hay endpoint público ni función de siembra. El generador solo produce SQL para la conexión administrativa; no lleva claves ni identidades incorporadas.

## Contabilidad verificada en PostgreSQL

| Mes | Movimientos | Ingresos | Gastos | Transferencias internas |
|---|---:|---:|---:|---:|
| Mayo 2026 | 28 | 1.988,73 € | 1.366,98 € | 240,00 € |
| Junio 2026 | 28 | 2.137,28 € | 1.327,78 € | 240,00 € |
| Julio 2026 | 28 | 2.040,00 € | 1.312,85 € | 240,00 € |
| Agosto 2026 | 28 | 1.972,71 € | 1.392,31 € | 240,00 € |
| Septiembre 2026 | 28 | 2.134,12 € | 1.401,83 € | 240,00 € |
| Octubre 2026 | 28 | 2.014,25 € | 1.310,43 € | 240,00 € |
| Noviembre, hasta el día 1 | 3 | 0,00 € | 66,05 € | 0,00 € |

El movimiento adicional de QA se creó por 3,25 € y se corrigió a 3,50 € desde la interfaz autenticada. Persiste tras recargar y no se ha eliminado.

Saldos finales del lote Demo: principal 4.063,56 €, ahorro 4.400,00 €, efectivo 185,30 €; total Demo 8.648,86 €. La cuenta anterior permanece intacta. Incluyéndola, la comprobación agregada es:

`19.540,00 € iniciales + 12.287,09 € ingresos − 8.178,23 € gastos = 23.648,86 €`.

Las 12 transferencias internas suman 1.440,00 € entre cuentas y tienen efecto agregado cero. El dashboard de octubre mostró 2.014,25 € de ingresos, 1.310,43 € de gastos y 703,82 € de balance, idénticos a PostgreSQL. No hay movimientos confirmados futuros. Las cinco reglas empiezan en noviembre y no duplican operaciones históricas. El alquiler del día 1 queda pendiente; no afecta al saldo mientras no se confirme.

## Retirada selectiva, no ejecutada

`supabase/fixtures/cleanup_cozy_glass_v1_1.sql` documenta el procedimiento. Un administrador debe volver a verificar el UUID, abrir una transacción y establecer `cozy.fixture_owner` en esa misma sesión. El bloque localiza el manifiesto exacto y solo elimina sus UUID.

Antes de borrar, rechaza nuevas operaciones o reglas ajenas al manifiesto que utilicen las cuentas Demo, y cualquier decisión de recurrencia relacionada. En ese caso no retira nada: hay que revisar dependencias y obtener una decisión específica. Las claves foráneas aportan otra barrera. No se buscan registros por nombres ni sufijos. Se conservan los recibos de operaciones como protección frente a reintentos; no afectan a saldos. No se toca Auth ni las categorías reutilizadas. **La retirada no se ejecutó durante esta entrega.**

## Pruebas

- 38 pruebas Node aprobadas, incluidas las 35 existentes. Las nuevas cubren escape de contenido no confiable, cifras superiores a la precisión de Number y meses sin ingresos.
- Integridad PostgreSQL/PGlite: restricciones, saldos, transferencias, corrección/borrado, idempotencia, recurrencias y aislamiento entre dos identidades locales. Estas identidades locales no son usuarios nuevos de Supabase.
- Supabase real: identidad existente, comprobación de políticas, inserción administrativa, segunda ejecución sin duplicados, cuentas y agregados mensuales. Ningún movimiento de otro usuario se alteró. La cuenta previa conserva su saldo y timestamp original.
- Una consulta remota con rol `authenticated` y un UUID distinto devolvió cero cuentas, movimientos, reglas y manifiestos; INSERT directo sigue sin permiso. No se crearon otras identidades reales para esta iteración.
- Login real realizado por el propietario en el navegador integrado. Dashboard con datos remotos, creación de gasto, corrección, recarga y consulta mensual verificadas. No se conoce ni se guarda su contraseña.
- Desktop 1440×900: fullscreen, sidebar, indicadores, gráficos, cuentas, historial y retorno al despacho.
- Móvil emulado 360×800: fullscreen, navegación inferior, formularios, tarjetas de historial y ausencia de scroll horizontal tanto en documento como en contenido.
- Historial: de 50 a 100 filas, con 100 UUID distintos. Sesión conservada tras recargar. Logout retira indicadores y movimientos del DOM.
- Foco y Escape: retorno al abridor, restauración del scroll y cancelación del diálogo sin salir del despacho.
- Login, registro y recuperación capturados en la nueva capa. La entrega SMTP ya estaba verificada en V1.0; esta iteración no cambió ni volvió a configurar el proveedor.
- Consola del recorrido final consultada sin errores ni avisos. Un solo canvas durante los cambios de vista.

## Seguridad y límites

Las seis tablas mantienen RLS. Los servicios, SQL financiero, claves públicas y configuración de Auth se conservan. No hay secretos nuevos en el bundle. El asesor de rendimiento no devuelve avisos. El asesor de seguridad conserva el aviso de la [RPC SECURITY DEFINER de escritura](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), cuyo diseño y verificaciones se documentaron en V1.0, y el de [contraseñas filtradas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), protección no habilitada en el plan gratuito. No se debilitaron políticas para eliminarlos.

La prueba móvil es emulación de viewport; no equivale a probar un teclado virtual o safe areas en un teléfono físico. El límite de 8 FPS se establece en el bucle existente; no se presenta como un benchmark de CPU/GPU de dispositivos reales. Los gráficos necesitan hasta siete consultas agregadas al abrir un periodo no cacheado; se puede añadir una RPC agregada de serie temporal si el volumen futuro lo justifica. Las capturas del navegador integrado tienen compresión propia del proveedor.
