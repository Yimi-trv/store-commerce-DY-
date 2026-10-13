# Vale AL PORTADOR: no paga bebidas alcohólicas

Esta regla cruza **dos sistemas**, y por eso vive documentada aquí: el tipo de vale lo decide
el *Sistema de Vales* (`C:\vales-trujillo`) y la restricción la aplica Store Commerce. Ninguno
de los dos repos cuenta la historia completa por su cuenta.

## Qué cambia para el negocio

Los vales de consumo son tarjetas regalo de D365: el código impreso en el barcode **es** el
`CARDNUMBER`. Desde octubre de 2026 hay dos tipos, elegidos por lote:

| Tipo | Se imprime | En la caja |
|---|---|---|
| **Nominal** (el de siempre) | nombre y DNI del beneficiario | compra de todo |
| **AlPortador** | `AL PORTADOR`, sin DNI, y una leyenda al pie | **no paga bebidas alcohólicas** |

## Cómo se decide, de punta a punta

```
Sistema de Vales (PostgreSQL)              CSU / Commerce Runtime            Store Commerce (caja)
┌───────────────────────────┐             ┌────────────────────────┐        ┌────────────────────┐
│ Lote.TipoVale             │  HTTP +     │ ValeRestriccionService │  OData │ ValePortadorRule   │
│   Nominal | AlPortador    │ X-Canje-Key │   · tipo del vale  ────┼───────▶│   4 triggers       │
│                           │◀────────────│   · qué es alcohol     │        │   1 sola regla     │
│ GET /api/canje/vales/{cod}│             │     (channel DB)       │        └────────────────────┘
└───────────────────────────┘             └────────────────────────┘
```

**El tipo no está en D365.** La tarjeta regalo de D365 no tiene dónde guardarlo, así que la
fuente de verdad es el sistema de vales y el CSU se lo pregunta por HTTP. Ventaja práctica:
cambiar un lote de nominal a al portador (o al revés) desde el historial del sistema de vales
cambia de inmediato lo que la caja permite, sin desplegar nada.

**Qué cuenta como alcohol.** Los artículos de la categoría `BEBIDAS ALCOHOLICAS` y de todas
sus hijas, resueltos contra el channel DB. Al 2026-10-09 en producción son 23 categorías y
**734 artículos** (cervezas, vinos, piscos, rones, whiskies, vodkas…).

> Cuelgan de esa raíz `LICOR-JARABES DE GOMA` (12 artículos) y `LICOR-OTROS COMPLEMENTOS DE
> BEBIDAS` (36), que **no llevan alcohol**. Quedan bloqueados porque la regla acordada fue el
> subárbol completo. Para excluirlos: `CategoriasExcluidas` en `ValeRestriccionService.cs`.

La categoría se busca **por nombre y no por RecId**: los RecId de UAT y producción no coinciden
y un id a mano haría que la regla se aplicara en un entorno y en el otro no.

## Los cuatro puntos de control

Una sola regla (`Services/ValePortadorRule.ts`), cuatro triggers que la llaman — el mismo
patrón que la regla de comprobantes, por el mismo motivo: duplicar la lógica es el error que
ya divergió tres veces en este proyecto.

| Trigger | Cuándo | Qué hace |
|---|---|---|
| `PostGetGiftCardNumber` | al pasar el vale | **la alerta al cajero**. Con alcohol en la venta, cancela y dice qué sacar; sin alcohol, avisa y sigue |
| `PreAddTenderLine` | antes de aplicar el pago | red de seguridad: tarjetas que no entran por el lector (venta suspendida, otra operación) |
| `PreProductSale` | al agregar un artículo | el orden inverso: vale ya aplicado y recién entonces aparece la cerveza |
| `PreEndTransaction` | al cerrar | último neto, antes de que deshacerlo cueste una devolución |

**Costo en caja:** la lista de artículos se baja **una vez por sesión** y queda en memoria; el
chequeo por artículo escaneado es una búsqueda en un diccionario. La consulta del tipo de vale
se cachea por código. En una venta sin vales al portador —casi todas— la regla corta en la
primera comprobación, sin tocar el servidor.

## Qué pasa si algo no responde

Decidido a propósito, no heredado de un `try/catch`:

| Situación | Qué hace la caja | Por qué |
|---|---|---|
| No se sabe el tipo del vale | **deja cobrar** | bloquear todas las tarjetas regalo porque un servicio auxiliar está caído pararía la caja, y casi todos los vales son nominales |
| Es AL PORTADOR pero no se sabe qué es alcohol | **bloquea ese vale** | afecta solo a los vales restringidos, que son pocos, y es el lado seguro del error |
| El código no existe en el sistema de vales | deja cobrar | hay tarjetas regalo legítimas cargadas a mano en D365 |
| Sin `ValesBaseUrl`/`ValesApiKey` configurados | deja cobrar, y el CSU no sale a internet | así este paquete se puede desplegar **antes** de publicar el sistema de vales, sin cambiar nada |

Una lista de artículos vacía **no** se lee como "no hay alcohol en el catálogo": el CRT manda
un ItemId centinela (`*NO-RESUELTO*`) para distinguir "no hay nada" de "falló la consulta".

## Puesta en marcha

### 1. Sistema de vales

Definir la variable de entorno **`CANJE_API_KEY`** (cualquier frase larga y secreta). Sin ella,
`GET /api/canje/vales/{codigo}` devuelve 404 y la restricción simplemente no se aplica.

```bash
curl -H "X-Canje-Key: LA-CLAVE" https://vales.ejemplo.pe/api/canje/vales/T201OCT26001
```

Debe responder `{"codigo":"T201OCT26001","existe":true,"tipoVale":"AlPortador","permiteAlcohol":false,…}`.
El CSU tiene que poder alcanzar esa URL por internet.

### 2. Store Commerce

En `src/CommerceRuntime/Services/ValeRestriccionService.cs`, completar las dos constantes:

```csharp
private const string ValesBaseUrl = "https://vales.ejemplo.pe";   // sin barra final
private const string ValesApiKey  = "LA-CLAVE";                   // la misma CANJE_API_KEY
```

Luego el build de siempre (ver [`empaquetado-deploy.md`](empaquetado-deploy.md)), con el bump de
`PackageVersion` ya hecho (2.10.0.0).

### 3. Antes de desplegar: confirmar las tablas del channel DB

La consulta de artículos usa `ax.ECORESPRODUCTCATEGORY`, `ax.ECORESCATEGORY` y `ax.INVENTTABLE`.
La **lógica** está validada contra los datos reales de producción, pero que esas tablas estén
sincronizadas al channel DB de este canal se comprueba sin desplegar nada:

```
GET {rs}/Commerce/TRU_Diagnostics/Run(mode='Columns',receiptId='ECORES')
```

Si no aparecen, el servicio lo dirá igual después del deploy —devuelve la lista como *no
resuelta* con el motivo— pero es más barato saberlo antes.

### 4. Prueba en caja

1. Emitir un lote **al portador** de prueba en el sistema de vales y cargarlo a D365.
2. Venta con una cerveza → pasar el vale → debe salir el bloqueo nombrando el producto.
3. Quitar la cerveza → pasar el vale → debe salir el aviso informativo y dejar cobrar.
4. Con el vale ya aplicado, agregar una cerveza → debe rechazarla.
5. Un vale **nominal** en la misma venta con cerveza → debe pasar sin decir nada.

La caja anuncia en consola `RegenerateFE 1.6.0 activo | reglas: … vale-al-portador-sin-alcohol`.
Si dice otra versión, está corriendo un paquete anterior (cerrar Store Commerce por completo
y reabrir).
