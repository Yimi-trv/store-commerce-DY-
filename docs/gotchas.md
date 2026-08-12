# 09 — Gotchas: los errores que ya pagamos por vos

Cada uno de estos costó horas o días reales. Leelos ANTES de escribir código.

## CRT / Channel DB

**1. `OBJECT_ID('ax.*')` es NULL durante el deploy de SQL.**
Las extensiones no ven los schemas de plataforma mientras corren sus scripts. Un fallback
"si no existe ax.X creo un stub" se auto-sabotea SIEMPRE. Creá vistas contra `ax.*` directo
(deferred name resolution) y listo.

**2. Los scripts SQL corren UNA vez por NOMBRE (`RETAILUPGRADEHISTORY`).**
Cambiar el contenido o subir nueva versión del paquete NO los re-ejecuta. Lógica nueva =
archivo nuevo.

**3. `SqlPagedQuery` con `Paging.Top` exige `OrderBy`.**
Error runtime: "OrderBy has to be defined for paged query". `SingleRecord` no lo necesita.

**4. Funciones OData: todos los parámetros en la URL.**
`Run(mode='X')` con un parámetro faltante = 400. Los no usados van vacíos: `receiptId=''`.

**5. N+1 mata las consultas masivas.**
Un `DatabaseContext` por fila para "enriquecer" = timeouts. JOIN en el `From`, o patrón
listado/detalle (`detail=0/1`).

**6. Response de plataforma puede exigir `Collection<T>`, no `List<T>`.**
Firmas exactas: dejá que el compilador te corrija; no asumas `IEnumerable`.

**7. `GetExtensionPackageDefinitions` es AGREGACIÓN, no cadena.** ⭐ el caro
Cada extensión CRT auto-reporta SUS paquetes POS y la plataforma **suma** las
contribuciones de todos los handlers. Corolarios: (a) si tu CRT no reporta tu paquete POS,
el POS jamás lo descarga; (b) si reportás el paquete de OTRO (fallback "por las dudas"),
lo DUPLICÁS → el POS puede cargarlo dos veces → triggers registrados 2 veces → efectos
dobles (nuestro TXT descargado duplicado) y sus operaciones fallan al re-registrarse
(Error visible en Paquetes de extensión). Reportá SOLO lo tuyo.

## POS

**8. Triggers idempotentes, siempre.**
Un `PostEndTransactionTrigger` puede ejecutarse más de una vez por venta (doble carga del
paquete, plataforma). Si tu trigger tiene efectos externos (descargas, llamadas), protegelo
con un guard por id de transacción **en `window`** (no a nivel de módulo: si el bundle se
carga dos veces, cada copia tiene su propio estado de módulo; `window` es compartido).

**9. Controles que leen una vez = datos viejos en pantalla.**
Si tu control lee el customer/cart solo en `onReady`, cualquier update de otro módulo no se
refleja "hasta cerrar y reabrir". Implementá `customerUpdatedHandler` (o el hook de tu
vista). `IToggle.checked` es settable: refrescá sin recrear.

**10. `ExtensionProperties`: consistencia de tipo de valor.**
Escribí y leé el MISMO campo (`IntegerValue` recomendado para flags — es lo que persiste y
se lee al reabrir). Mezclar `BooleanValue` al escribir con `IntegerValue` al leer = datos
"que no se guardan" (se guardan, se leen mal).

**11. `Blob` + `createObjectURL` sin `revokeObjectURL` = fuga.**
En cajas que corren 12 horas, acumula. Liberá el URL y sacá el `<a>` del DOM tras descargar.

**12. TS estricto rompe el paquete completo.**
`noUnusedLocals` + `noEmitOnError`: un import sin usar o un método privado muerto frena el
ZIP. Código muerto: exclusión explícita en `tsconfig` (documentada), no comentarios.

**13. Caché de extensiones en la caja.**
Tras deploy: cerrar la app POR COMPLETO. Si el manifest de un paquete no bumpea `version`,
la caja puede servir el bundle viejo — bump del campo `version` invalida.

## Plataforma / Operación

**14. Clientes async: ventana pre-sync.**
Cliente creado en POS: hasta que el P-job sube y el 1010 baja, las direcciones no se ven ni
se editan al reabrirlo, y el Customer Account es un GUID. No es bug tuyo.

**15. Config de identidad: 1110 → restart, en ese orden.**
Server Resource ID = `api://{clientId}` sin scope. Tras cambiarlo: job 1110 y DESPUÉS
restart del CSU. Restart prematuro = config vieja y 401 fantasma.

**16. Direcciones D365 validan contra maestros por CÓDIGO.**
`State`/`County` llevan el ID del maestro (`02`, `01`), no el nombre; la convención de
`City` depende de cómo cargaron los maestros en TU entorno (puede ser código ubigeo).
Resolvé nombres→códigos contra `ax.LOGISTICSADDRESS*` en runtime; si algo no resuelve,
NO agregues la dirección: **una dirección inválida en un cliente nuevo bloquea el alta sin
salida** (el POS no permite quitarla).

**17. Normalización de acentos al matchear maestros.**
Fuentes externas mandan "JUNIN"; el maestro guarda "Junín" (collation accent-sensitive).
Compará en C# normalizando: `FormD` + filtrar `NonSpacingMark` + upper.

**18. Verificá el ZIP, no el build verde.**
El build puede pasar y el paquete estar incompleto (targets custom, condiciones). Antes de
subir: mirar adentro del staging (DLLs, config de composición, JS del POS, SQL).

**19. Windows puede OCULTAR bugs de descarga.**
WebView2 sobrescribe archivos duplicados en silencio; Chromium/Linux les pone `(1)`. Si un
kiosko Linux "muestra un bug nuevo", puede que siempre estuvo — otra plataforma solo lo
reveló.

**20. Diagnóstico primero, teoría después.**
Cada hipótesis de esta lista se confirmó o refutó con una prueba barata (endpoint de
diagnóstico, log con firma discriminante, probe por API). Cuando no sepas la causa, hacé
que el sistema TE LO DIGA: log que distinga los mecanismos posibles (ej. id de instancia +
firma de datos en un guard) vale más que tres teorías.
