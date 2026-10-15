# Vale con restricción: no paga bebidas alcohólicas

Esta regla cruza **dos sistemas**, y por eso vive documentada aquí: el vale lo emite el
*Sistema de Vales* (`C:\vales-trujillo`) y la restricción la aplica Store Commerce. Ninguno
de los dos repos cuenta la historia completa por su cuenta.

## Qué cambia para el negocio

Los vales de consumo son tarjetas regalo de D365: el código impreso en el barcode **es** el
`CARDNUMBER`. Desde octubre de 2026 un lote se puede emitir **restringido**, y entonces sus
códigos llevan una letra extra después de la `T`:

| Código | Qué es | En la caja |
|---|---|---|
| `T173AGO26001` | el de siempre | compra de todo |
| `TA174AGO26001` | restringido | **no paga bebidas alcohólicas** |

> **No es lo mismo que «al portador».** Son dos cosas independientes. *Al portador* cambia lo
> que se **imprime** (dice `AL PORTADOR` en lugar del nombre y el DNI) y la caja ni lo mira.
> La restricción cambia lo que la caja **permite**. Un vale nominal, con nombre y DNI, también
> puede estar restringido, y entonces su código empieza con `TA` igual.

## Cómo se decide, de punta a punta

```
Sistema de Vales                  papel impreso            Store Commerce (caja)
┌────────────────────┐          ┌──────────────┐         ┌──────────────────────┐
│ lote restringido   │          │ TA174AGO26001│   lee   │ ValeRestringidoRule  │
│   → prefijo TA     │ ───────▶ │ + leyenda al │ ──────▶ │   4 triggers         │
│   → leyenda al pie │          │   pie        │         │   1 sola regla       │
└────────────────────┘          └──────────────┘         └──────────┬───────────┘
                                                                    │ ¿qué es alcohol?
                                                         ┌──────────▼───────────┐
                                                         │ CSU: TRU_ValesItems  │
                                                         │   channel DB         │
                                                         └──────────────────────┘
```

**La caja no pregunta de qué tipo es el vale.** Lo lee del código. Esa es la decisión
central del diseño, y tiene dos consecuencias que valen más que cualquier otra cosa:

1. **La regla funciona sin red.** Si el enlace se cae, la caja sigue aplicando la restricción
   correctamente. Nada de "no puedo cobrar porque no responde el servidor de vales".
2. **El papel nunca puede mentir.** La restricción está impresa en el mismo código que el
   cliente tiene en la mano. No existe forma de que un cambio en otro sistema haga que el
   vale diga una cosa y la caja haga otra.

El primer diseño preguntaba el tipo por HTTP al sistema de vales. Se descartó por esas dos
razones; queda en la rama `vale-al-portador-consulta-http` por si hiciera falta mirarlo.

**Compatibilidad hacia atrás:** todos los códigos emitidos hasta hoy no llevan letra, así que
no están restringidos y se comportan exactamente como antes. Una tarjeta regalo que no sea de
esta nomenclatura tampoco.

## La nomenclatura

```
T [letra?] [lote 1-4 díg] [MES 3 letras] [año 2 díg] [correlativo 3 díg]
│     │
│     └── restricción: "A" = sin alcohol. Vacío = sin restricción.
└──────── siempre T
```

La expresión regular es **la misma en los dos proyectos**, carácter por carácter:

```
^T([A-Z]?)(\d{1,4})([A-ZÑ]{3})(\d{2})(\d{3})$
```

| Dónde | Archivo |
|---|---|
| Sistema de Vales | `backend/Vales.Api/Dominio/CodigoVale.cs` → `RegexCodigo()` |
| Store Commerce | `src/PosExtension/Services/ValeRestringidoRule.ts` → `NOMENCLATURA` |

Si allá se agrega una letra nueva, **acá hay que decidir qué hace la caja con ella** antes de
emitir el primer lote. Mientras tanto, un código con una letra desconocida se bloquea y el
mensaje le dice al cajero que la extensión del POS está desactualizada: el vale lleva impresa
una restricción que esta versión no sabe aplicar, y tratarla como "sin restricción" sería
desobedecer al papel.

## Qué cuenta como alcohol

Los artículos de la categoría `BEBIDAS ALCOHOLICAS` y de **todas sus descendientes**, a
cualquier profundidad. Al 2026-10-09 en producción son 23 categorías y **734 artículos**
(cervezas, vinos, piscos, rones, whiskies, vodkas…).

Lo resuelve el propio Commerce Runtime, con sus peticiones soportadas:

| Petición | Para qué |
|---|---|
| `GetChannelCategoriesDataRequest(canal, …)` | el árbol de categorías **de este canal** |
| `SearchProductsRequest(criterio, …)` | los productos de una categoría |

> **Aquí hubo un error que costó un despliegue.** La primera versión lo resolvía con un
> `SELECT` a mano sobre `ECORESPRODUCTCATEGORY`, `ECORESCATEGORY` e `INVENTTABLE` del channel
> DB. En la caja no devolvió nada: esas tablas no están en el channel DB con ese nombre, así
> que la consulta ni llegaba a correr y el cajero veía un bloqueo sin nombre de producto.
> El esquema del channel DB es asunto de la plataforma: sus peticiones saben dónde vive el
> dato en cada versión, un SELECT escrito a mano solo sabe lo que supuso quien lo escribió —
> y se entera en producción.

La consulta va **categoría por categoría** y no todas juntas, a propósito: así se sabe cuál
hizo entrar a cada artículo, y ese nombre es el que termina viendo el cajero en el aviso.

> Cuelgan de esa raíz `LICOR-JARABES DE GOMA` (12 artículos) y `LICOR-OTROS COMPLEMENTOS DE
> BEBIDAS` (36), que **no llevan alcohol**. Quedan bloqueados porque la regla acordada fue el
> subárbol completo. Para excluirlos: `CategoriasExcluidas` en `ItemsRestringidosService.cs`.

La categoría se busca **por nombre y no por RecId**: los RecId de UAT y de producción no
coinciden, y un id a mano haría que la regla se aplicara en un entorno y en el otro no.

El POS se baja la lista entera **una vez por sesión** y la consulta en memoria. Una ida y
vuelta al CSU por producto escaneado se nota en la caja, con un cliente delante; son unos
6 KB.

## Los cuatro puntos de control

La lógica vive en **un solo sitio** (`ValeRestringidoRule`) y los triggers solo la llaman.
Duplicarla es el error que ya divergió tres veces en este proyecto.

| Trigger | Cuándo | Para qué |
|---|---|---|
| `PostGetGiftCardNumber` | al pasar el vale | **donde el cajero se entera**, antes de cobrar |
| `PreAddTenderLine` | antes de que entre la línea de pago | tarjetas que no entran por el lector (venta suspendida, otra operación) |
| `PreProductSale` | al agregar un artículo | el orden inverso: vale aplicado y recién entonces la cerveza |
| `PreEndTransaction` | antes de cerrar | último neto; una vez cerrada, deshacerlo cuesta una devolución |

Cuando se pasa un vale restringido y la venta **no** tiene alcohol, no se bloquea pero **se
avisa**. No es ruido: el cliente todavía puede agregar una cerveza al final, y entonces el
cajero ya sabe por qué el POS se la va a rechazar.

## Qué pasa cuando algo falla

Decidido a propósito, no heredado:

| Situación | Qué hace la caja | Por qué |
|---|---|---|
| El vale no está restringido | nada, ni consulta | es casi toda la venta; no debe costar un viaje al servidor |
| Restringido, pero no se puede resolver qué es alcohol | **bloquea ese vale** | afecta solo a los vales restringidos y es el lado seguro |
| El CSU devuelve una lista vacía | **bloquea ese vale** | una lista vacía casi siempre es "la categoría se llama distinto" o "los productos no bajaron al canal", no "no hay licores" |
| Letra de restricción desconocida | **bloquea ese vale** | el papel exige algo que esta versión no sabe aplicar |

La diferencia entre "lista vacía" y "no pude" viaja explícita: el CSU manda un `ItemId`
centinela `*NO-RESUELTO*` (`ValesItemsController.Centinela`), que el POS reconoce. Leer lo
segundo como lo primero dejaría pasar justo lo que hay que frenar.

## Probarlo

### Sin caja, en el escritorio

```bash
node _probar_vale_restringido.js
```

Ejercita el **`.js` compilado** —el mismo que se despliega— simulando el cargador
`System.register` del POS y maquetando lo único que la regla necesita de fuera: el diálogo y
la consulta de artículos. Son 32 comprobaciones en tres bloques: qué dice el código de barras,
qué vale hay pagando la venta y la decisión completa en caja (incluidos el CSU caído, el
centinela y la letra desconocida).

Corre en segundos y no necesita Store Commerce ni red. Conviene pasarlo antes de empaquetar:
si falla el caso «vale normal + cerveza → deja pasar», la regla está mirando algo que no es la
letra del código.

### En la caja

1. Desplegar el paquete y **cerrar Store Commerce por completo y reabrir** (descarga la
   extensión nueva). La marca `RegenerateFE 1.6.0 activo | … vale-restringido-sin-alcohol`
   en el log dice que está corriendo la versión correcta.
2. Emitir desde el sistema de vales un lote **con restricción** y otro **sin**.
3. Venta con una cerveza → pasar el vale `TA…` → **debe bloquear nombrando el producto**.
4. Venta sin alcohol → pasar el vale `TA…` → **debe avisar y dejar continuar**.
5. Pasar el vale `TA…` primero y **después** agregar la cerveza → debe bloquear al agregarla.
6. Repetir 3 con un vale `T…` normal → **no debe pasar nada**.

Si el paso 6 bloquea, la regla está mirando algo que no es la letra del código.
