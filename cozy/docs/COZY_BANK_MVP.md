# Cozy Bank MVP 1.0

Fecha de verificación: 1 de noviembre de 2026. Ruta: <https://revikoo.com/cozy/city/>.

## Estado real

Backend aplicado y conectado. Operaciones financieras y aislamiento probados contra las APIs reales de Supabase con dos identidades temporales. Integración del despacho comprobada en Edge, escritorio y emulación móvil de 360 px.

Publicado en GitHub Pages con el commit `0aa0032`. La comprobación sobre el dominio de producción confirmó carga sin errores, login real, consulta persistente en el despacho, logout y regreso a la ciudad. [Resultado de producción](qa/bank-mvp/production-results.json).

SMTP de Gmail operativo tras introducir una contraseña de aplicación válida. Registro real enviado, recibido y confirmado por el propietario; confirmación e inicio de sesión verificados después en Supabase. Recuperación recibida y completada por el propietario; la contraseña anterior del usuario QA fue rechazada después del cambio. La confirmación de correo permanece obligatoria.

## Proyecto

- Organización autorizada: CozyCity.
- Nombre: cozy-bank.
- Project Ref: `xnpavjonigaocypgrpoh`.
- API: <https://xnpavjonigaocypgrpoh.supabase.co>.
- Región: `eu-west-3`, París.
- Plan: Free. Creación autorizada expresamente después de comprobar que no existía ningún proyecto; presupuesto cotizado por Supabase: 0 al mes.
- La auditoría inicial encontró `public` vacío y sin migraciones. No se alteraron aplicaciones previas.

## Qué se ha configurado automáticamente en Supabase

1. Creado el proyecto autorizado y comprobado su estado `ACTIVE_HEALTHY`.
2. Inspeccionados esquemas, tablas, políticas, funciones, índices e historial inicial.
3. Aplicadas mediante `apply_migration` las migraciones `20261101193413_cozy_bank_core.sql` y `20261101193427_cozy_bank_operations.sql`. Los nombres locales corresponden a las versiones asignadas por el historial remoto.
4. Verificadas seis tablas, 44 restricciones, 22 índices, RLS en las seis tablas y cuatro políticas por tabla (24 en total).
5. Publicadas tres funciones RPC con `search_path` vacío y ejecución restringida. Los roles anónimos no pueden leer ni escribir finanzas. Los autenticados no pueden escribir directamente en las tablas.
6. Obtenidas URL y clave publicable mediante el conector. Configurado un único cliente con el SDK oficial `@supabase/supabase-js` 2.118.0, distribuido localmente con su licencia MIT.
7. Comprobado mediante `/auth/v1/settings` que email está habilitado, el registro está permitido y `mailer_autoconfirm=false`.
8. Configurada y verificada tras recargar la URL principal `https://revikoo.com/cozy/city/` y las redirecciones exactas de esa URL y `http://127.0.0.1:8773/cozy/city/`. El servidor local real se inició en ese puerto. La configuración inicial del nuevo proyecto apuntaba a `localhost:3000` y no tenía redirecciones adicionales.
9. Preparado SMTP `smtp.gmail.com:587`, remitente Cozy Bank y la cuenta de Gmail indicada por el propietario. El propietario introdujo y guardó la contraseña en el panel; no se incluyó en el repositorio ni en la configuración pública. La API Management no estaba disponible; estos ajustes se realizaron en el panel autenticado por el usuario.
10. Ejecutadas pruebas reales de Auth, PostgREST, RLS, concurrencia y persistencia. Consultados los asesores de seguridad y rendimiento.

## Arquitectura

HTML, CSS y módulos JavaScript, sin framework ni compilación. `city.mjs` solo coordina la apertura/cierre del panel y los eventos de Nilo. Los modelos, cámaras, puertas, transición y un único renderer permanecen intactos.

Los módulos de `cozy/city/finance/` separan cliente, autenticación, persistencia, estado, cálculo exacto e interfaces. El SDK se carga al entrar al banco, o al volver de un enlace Auth. Los formularios, gráficos e historial son HTML superpuesto, con desplazamiento propio y botón para descubrir a Nilo.

El cliente mantiene la sesión; las finanzas se consultan siempre en Supabase. No hay una base financiera paralela en localStorage ni datos de ejemplo en cuentas reales. El cierre de sesión limpia inmediatamente los datos y también elimina el almacenamiento local cuando falla la petición de logout. Los resultados de lecturas/escrituras de una identidad anterior se descartan mediante una generación de estado.

## Modelo contable

| Tabla | Función |
| --- | --- |
| `finance_accounts` | EUR, tipo, saldo inicial, cuenta predeterminada y fechas |
| `finance_categories` | 10 categorías de gasto y 4 de ingreso por usuario, sin duplicados |
| `finance_transactions` | Ingresos, gastos y transferencias confirmadas, una fila por movimiento |
| `finance_recurring_rules` | Plantillas mensuales, sin efecto contable por sí mismas |
| `finance_recurring_occurrences` | Decisión persistente de cada regla/mes: confirmar, posponer u omitir |
| `finance_requests` | Recibos de idempotencia que sobreviven al borrado de un movimiento |

Los importes persistidos son BIGINT en céntimos; el límite de entrada de la RPC es de 18 dígitos. El navegador valida decimales como texto y utiliza BigInt; los importes cruzan JSON como cadenas para evitar redondeos de Number. El saldo es el saldo inicial más ingresos/transferencias entrantes menos gastos/transferencias salientes. No existe saldo mutable duplicado. Los agregados mensuales excluyen transferencias.

Las claves foráneas compuestas incluyen al propietario. El tipo de categoría se deriva de la operación y forma parte de la referencia. Una transferencia necesita dos cuentas diferentes del mismo usuario y ninguna categoría.

## Seguridad y funciones

- `finance_snapshot(date)` y `finance_history(date,uuid)` son SECURITY INVOKER y se someten a RLS. El historial usa paginación por fecha/UUID, 50 registros por página.
- `finance_mutate(text,jsonb,uuid)` es SECURITY DEFINER de forma intencional: las tablas y recibos no conceden escrituras directas al navegador. Así el usuario tampoco puede borrar el recibo de idempotencia ni deshacer una decisión mensual mediante PostgREST para volver a contabilizarla.
- Esta función rechaza sesión nula y cualquier `user_id` en el payload, obtiene la identidad exclusivamente de `auth.uid()`, usa SQL estático y filtra por propietario todas las actualizaciones, borrados y recursos consultados. Las claves compuestas y restricciones añaden otra barrera.
- Un bloqueo transaccional por usuario serializa los cambios y las primeras cuentas. Una petición repetida devuelve el recibo original; reutilizar su UUID con otro contenido falla. Una escritura y su recibo se confirman en la misma transacción.
- El recibo conserva la solicitud original para detectar reintentos. Borrar un movimiento no elimina su recibo. Eliminar un movimiento recurrente conserva el periodo como confirmado para no recrearlo accidentalmente.
- En el navegador, los UUID de petición se reutilizan ante errores ambiguos mediante una huella SHA-256, sessionStorage y un respaldo en memoria. Los importes y conceptos no se guardan en ese almacenamiento de reintentos.
- Contenido del usuario escapado antes de insertarse en HTML. No se publica ninguna clave service-role, credencial PostgreSQL, contraseña ni token administrativo.

La revisión final del asesor de seguridad emite un aviso para la RPC SECURITY DEFINER ejecutable por autenticados. Es la API de escritura prevista y se ha revisado y probado, no una exposición involuntaria. [Explicación del aviso](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). La revisión final de rendimiento no devuelve avisos. No se desactivó RLS ni se retiraron protecciones para pasar pruebas.

## Auth y correo

Registro, login, cierre de sesión, solicitud de recuperación y formulario de contraseña integrados. Los retornos Auth abren el banco; el SDK consume los parámetros de sesión. Confirmación de correo obligatoria.

El callback real de recuperación se probó con un enlace de un solo uso generado mediante Auth Admin para una identidad QA. El formulario apareció en el despacho, el SDK retiró los tokens de la URL y la actualización por API invalidó la contraseña anterior. Además, el propietario recibió posteriormente el correo real por Gmail, completó su recuperación y se verificó que la contraseña anterior de esa identidad ya no permite entrar.

Los primeros intentos fueron rechazados por Gmail con 535; se resolvió al generar y guardar una contraseña de aplicación válida. Después, el envío de registro llegó al buzón del propietario, este confirmó el enlace y la API verificó `email_confirmed_at` e inicio de sesión válido. La recuperación también llegó al buzón y se completó en el formulario; se verificó el rechazo de la contraseña anterior. El aviso de Supabase sobre proveedor de correo personal trata de entrega y límites; es distinto del fallo de autenticación ya resuelto. [SMTP de Supabase](https://supabase.com/docs/guides/auth/auth-smtp), [contraseñas de aplicación de Google](https://support.google.com/accounts/answer/185833?hl=es).

No se desactivó la confirmación ni se inventó SMTP alternativo. No hay bloqueos de permisos pendientes. La contraseña SMTP se guardó en Supabase y no se incorporó al código ni al repositorio.

El mínimo de contraseña está configurado en ocho caracteres tanto en la interfaz como en Auth; la API rechazó una contraseña de siete con `weak_password`. La comprobación de contraseñas filtradas permanece desactivada: Supabase la ofrece en planes Pro y superiores y no se autorizó contratar recursos de pago. [Disponibilidad de esta protección](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Recurrencias y Nilo

Las previsiones se calculan al abrir el banco, incluyendo periodos vencidos. Días 29–31 se ajustan al último día de meses cortos. Se utiliza calendario de Europe/Madrid. Posponer guarda siete días; omitir guarda una decisión final; confirmar permite ajustar el importe y crea un único movimiento atómico.

Registrar una nómina ofrece convertirla en plantilla desde el mes siguiente. Se pueden editar, pausar y reactivar las reglas. No hay cron.

Nilo saluda al entrar, escribe mientras espera una escritura y sella solo tras una respuesta satisfactoria de la RPC. Los fallos vuelven a IDLE. Se retiró el sellado ambiental automático para que no pueda confundirse con una confirmación. Las animaciones no deciden el resultado de las operaciones y respetan movimiento reducido.

## Pruebas y evidencias

- `node --test cozy/tests/*.test.mjs`: 35 pruebas aprobadas, incluidas las existentes de Cozy Room.
- `supabase/tests/local-integrity.mjs`: migraciones ejecutadas en PostgreSQL/PGlite, restricciones, RLS, cálculo y recibos. Es una prueba local con identidad Auth de fixture, no una sustitución de Supabase real.
- `supabase/tests/remote-api.mjs`: Auth real de dos identidades y llamadas autenticadas directas a las APIs. [Resultados](../../supabase/tests/remote-results.json).
- Caso contable verificado: 1000 → gasto 100 → 900 → ingreso 200 → 1100; ahorro 500 y transferencia 300 → 800/800, total 1600. Transferencia excluida del resumen.
- En ambas direcciones: denegados lectura ajena, UPDATE/DELETE directo, corrección/borrado por RPC, categoría ajena, transferencia a cuenta ajena y payload con `user_id`.
- Rechazados cero, negativos, fracciones de céntimo, cuenta inexistente, categoría del tipo incorrecto y transferencia a la misma cuenta. API anónima denegada y token inválido rechazado.
- Confirmaciones concurrentes y reintentos simultáneos producen un movimiento. Correcciones/borrados actualizan saldos; un reintento posterior al borrado no lo recrea.
- Logout y login nuevo conservan los datos remotos. Posponer/omitir persiste sin contabilizar importes.
- `qa-bank-finance.cjs`: login, onboarding, gasto, escritura/sello, retorno, recarga, error decimal, pérdida deliberada de una respuesta ya confirmada y reintento sin duplicado, corrección/borrado y cambio de identidad.
- `qa-bank-finance-flows.cjs`: ingreso, oferta de nómina, plantilla, confirmación con importe editado, transferencia, navegación mensual, historial y pausa/reanudación. Logout sin red no resucita la sesión tras recargar.
- `qa-bank-auth.cjs`: callback real de recuperación, retirada de tokens de la URL y cambio de contraseña por API de un usuario temporal.
- Regresión `qa-bank-visit.cjs`: diez visitas, memoria estable (219 geometrías y 5 texturas), cámara/puertas/ambiente conservados, móvil 360 px, movimiento reducido y recuperación de carga fallida. Sin errores, avisos ni rutas fallidas en el recorrido normal.
- Capturas y resultados en [galería QA](qa/bank-mvp/index.html). Sus importes pertenecen únicamente a identidades de prueba; no son datos precargados del producto.

Los módulos de pruebas reciben por variables de entorno rutas a dependencias y a un archivo de credenciales QA **fuera del repositorio**. No incluyen usuarios utilizables ni contraseñas públicas.

Al terminar se eliminaron mediante Auth Admin exclusivamente las tres identidades temporales de esta ejecución, incluida la del correo de prueba. Se verificaron cero filas restantes para esos propietarios en Auth y en las seis tablas financieras. La función temporal `cozy-bank-qa-fixture` se sustituyó por una respuesta constante 404, sin código ni capacidades administrativas; se verificó el 404 incluso presentando la antigua autorización de QA. Las capturas conservan los resultados históricos de la prueba, no cuentas activas.

## Límites

- Gmail es un proveedor de correo personal con límites de entrega; para un volumen público mayor convendrá un proveedor transaccional. No se ha contratado ningún servicio de pago.
- Rendimiento comprobado en navegador de escritorio y móvil emulado, no en un teléfono físico ni bajo carga masiva de usuarios.
- La instantánea agrega saldos en servidor y pagina el historial; carga las reglas y decisiones del usuario completas. Una evolución con años de recurrencias requerirá limitar esa consulta por periodos.
- Las cuentas admiten corrección de nombre/tipo/saldo inicial; el archivado queda preparado en el esquema, sin interfaz en este MVP.
- Sin Open Banking, pagos reales, CSV, IA ni cambios en otros edificios.
