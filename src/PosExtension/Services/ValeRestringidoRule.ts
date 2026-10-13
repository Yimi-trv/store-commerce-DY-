import { ShowMessageDialogClientRequest, ShowMessageDialogClientResponse } from "PosApi/Consume/Dialogs";
import {
    ItemRestringidoEntity,
    ItemsRestringidosRequest,
    ItemsRestringidosResponse
} from "../DataService/ItemsRestringidosRequest";

/**
 * VALE CON RESTRICCIÓN: NO PAGA BEBIDAS ALCOHÓLICAS
 * ==================================================
 *
 * Los vales de consumo de Trujillo Market son tarjetas regalo de D365 (el código del barcode
 * ES el CARDNUMBER). Desde octubre de 2026 un lote se puede emitir restringido, y entonces
 * sus códigos llevan una letra extra después de la T:
 *
 *     T173AGO26001     vale normal, compra de todo
 *     TA174AGO26001    vale restringido, NO paga bebidas alcohólicas
 *
 * LA RESTRICCIÓN VIAJA DENTRO DEL CÓDIGO, NO SE CONSULTA
 * Esto no es un detalle de implementación, es la decisión central. Si el tipo se preguntara
 * a otro sistema, pasarían dos cosas malas: la caja necesitaría estar en línea para cobrar
 * un vale, y un cambio en ese otro sistema podría hacer que el papel que el cliente tiene en
 * la mano dijera una cosa y la caja hiciera otra. Leyéndolo del código impreso, lo que dice
 * el papel es lo que hace la caja, siempre, también sin red.
 *
 * NO CONFUNDIR CON "AL PORTADOR". Son dos cosas independientes: "al portador" cambia lo que
 * se IMPRIME (dice AL PORTADOR en vez del nombre) y la caja ni lo mira; la restricción cambia
 * lo que la caja PERMITE. Un vale nominal, con nombre y DNI, también puede estar restringido,
 * y entonces su código empieza con TA igual. Por eso aquí no se nombra al portador en ningún
 * mensaje: se habla de lo que el vale cubre.
 *
 * COMPATIBILIDAD HACIA ATRÁS: todo código emitido hasta hoy no lleva letra, así que no está
 * restringido y se comporta exactamente como antes. Un código que no sea de la nomenclatura
 * —otra tarjeta regalo, otro sistema— tampoco está restringido.
 *
 * CUATRO PUNTOS DE CONTROL, UNA SOLA REGLA
 * Igual que con la regla de comprobantes (DocumentTypeRule), la lógica vive en UN sitio y los
 * triggers solo la llaman. Duplicarla es el error que ya divergió tres veces en este proyecto.
 *
 *   PostGetGiftCardNumber  al pasar el vale  → es donde sale la alerta al cajero
 *   PreAddTenderLine       red de seguridad del pago
 *   PreProductSale         el orden inverso: vale aplicado y después se agrega una cerveza
 *   PreEndTransaction      último neto antes de cerrar
 *
 * QUÉ PASA SI ALGO NO RESPONDE (decidido, no heredado)
 *   · El vale no está restringido → no se consulta nada ni se bloquea nada. Es el caso de
 *     casi todas las ventas y no le cuesta un solo viaje al servidor.
 *   · Está restringido pero no se sabe qué es alcohol → se bloquea ESE vale. Afecta solo a
 *     los vales restringidos y es el lado seguro del error.
 *
 * CACHÉ EN `window` Y NO A NIVEL DE MÓDULO
 * El bundle del POS se puede cargar dos veces, y entonces cada copia tendría su propia lista
 * de artículos y su propio juego de consultas (gotcha 8 de docs/gotchas.md). En `window` el
 * estado es uno solo. Se pierde al reiniciar la caja, que es lo correcto.
 */

/** ItemId imposible que el CRT manda cuando NO pudo resolver la lista. Debe coincidir con ValesItemsController.Centinela. */
const CENTINELA_NO_RESUELTO: string = "*NO-RESUELTO*";

const CLAVE_ESTADO: string = "__truValeRestringido";

/**
 * La nomenclatura de los vales, la misma que compone el sistema que los emite:
 *
 *     T [letra?] [lote 1-4] [MES 3 letras] [año 2] [correlativo 3]
 *
 * La letra opcional es la restricción. HOY SOLO EXISTE "A" = sin alcohol; el grupo se captura
 * suelto para poder reconocer una letra futura y no tratarla como "sin restricción".
 *
 * Debe seguir coincidiendo con RegexCodigo() del sistema de vales (CodigoVale.cs). Si allá se
 * agrega una letra, acá hay que decidir qué hace la caja con ella.
 */
const NOMENCLATURA: RegExp = /^T([A-Z]?)(\d{1,4})([A-ZÑ]{3})(\d{2})(\d{3})$/;

/** Letra que significa "no paga bebidas alcohólicas". */
const LETRA_SIN_ALCOHOL: string = "A";

interface IRestriccion {
    /** El vale no puede pagar bebidas alcohólicas. */
    sinAlcohol: boolean;
    /** El código trae una letra de restricción que esta versión del POS no conoce. */
    desconocida: boolean;
    /** La letra leída, para el log. */
    letra: string;
}

const SIN_RESTRICCION: IRestriccion = { sinAlcohol: false, desconocida: false, letra: "" };

interface IEstadoCompartido {
    /** ItemIds restringidos, en minúsculas; null mientras no se haya resuelto. */
    items: { [itemId: string]: string } | null;
    itemsResueltos: boolean;
    /** Consulta en vuelo, para no pedir la lista N veces mientras llega la primera. */
    itemsEnVuelo: Promise<void> | null;
    /**
     * Hasta cuándo no vale la pena reintentar la lista. Sin esto, con el CSU respondiendo mal
     * se dispararía una consulta por cada artículo escaneado.
     */
    itemsReintentarDesde: number;
}

/** Espera tras un fallo al traer la lista. Corta para que un corte breve se recupere solo. */
const ESPERA_REINTENTO_MS: number = 60000;

function estado(): IEstadoCompartido {
    const w: any = window as any;
    if (!w[CLAVE_ESTADO]) {
        w[CLAVE_ESTADO] = { items: null, itemsResueltos: false, itemsEnVuelo: null, itemsReintentarDesde: 0 };
    }
    return w[CLAVE_ESTADO] as IEstadoCompartido;
}

export class ValeRestringidoRule {

    /* ------------------------------------------------------------------ API */

    /**
     * Qué restricción trae un código, leída del código mismo. Pública porque es la pregunta
     * central de toda la regla y conviene poder hacerla desde fuera (y probarla) sin red.
     */
    public static restriccionDe(codigo: string): IRestriccion {
        const limpio: string = (codigo || "").trim().toUpperCase();
        const partes: RegExpExecArray = NOMENCLATURA.exec(limpio);

        // No es un vale de esta nomenclatura: otra tarjeta regalo, otro sistema. Sin restricción,
        // igual que antes de que los vales restringidos existieran.
        if (!partes) {
            return SIN_RESTRICCION;
        }

        const letra: string = partes[1] || "";
        if (!letra) {
            return SIN_RESTRICCION;
        }
        if (letra === LETRA_SIN_ALCOHOL) {
            return { sinAlcohol: true, desconocida: false, letra: letra };
        }

        // Una letra que esta versión no conoce: el vale lleva impresa una restricción que esta
        // caja no sabe aplicar. No se puede tratar como "sin restricción" —el papel dice otra
        // cosa— así que se bloquea y se pide actualizar la extensión.
        return { sinAlcohol: false, desconocida: true, letra: letra };
    }

    /**
     * Al pasar un vale por caja. Devuelve el motivo del bloqueo, o cadena vacía si se puede
     * seguir. Cuando el vale está restringido y la venta NO tiene alcohol, no bloquea pero sí
     * avisa: el cajero tiene que saber con qué está cobrando antes de que el cliente agregue
     * una cerveza al final.
     */
    public static evaluarVale(context: any, codigo: string, cart: any): Promise<string> {
        const restriccion: IRestriccion = ValeRestringidoRule.restriccionDe(codigo);

        if (restriccion.desconocida) {
            context.logger.logError(
                "ValeRestringidoRule: el vale " + codigo + " lleva la letra de restricción '"
                + restriccion.letra + "', que esta versión del POS no conoce. La extensión está "
                + "desactualizada frente al sistema de vales.");
            return Promise.resolve(ValeRestringidoRule._motivoDesconocida());
        }
        if (!restriccion.sinAlcohol) {
            return Promise.resolve("");
        }

        return ValeRestringidoRule._alcoholEnCarrito(context, cart)
            .then((hallazgo: { resuelto: boolean; lineas: string[] }): Promise<string> => {
                if (!hallazgo.resuelto) {
                    return Promise.resolve(
                        "Este vale no cubre bebidas alcohólicas.\n\n"
                        + "No se pudo revisar qué tiene la venta, así que no se puede cobrar con "
                        + "este vale. Use otro medio de pago.");
                }

                if (hallazgo.lineas.length > 0) {
                    return Promise.resolve(ValeRestringidoRule._motivo(hallazgo.lineas));
                }

                // Sin alcohol en la venta: se informa y se sigue.
                return ValeRestringidoRule.mostrarAviso(
                    context,
                    "Vale con restricción",
                    "Este vale no puede pagar bebidas alcohólicas.\n\n"
                    + "La venta actual no tiene ninguna, así que puede continuar.")
                    .then((): string => "");
            })
            .catch((razon: any): string => {
                ValeRestringidoRule._log(context, "evaluarVale", razon);
                return "";
            });
    }

    /**
     * Al agregar un artículo a la venta. Solo mira si YA hay un vale restringido aplicado:
     * sin él no hay nada que restringir y la caja no debe pagar ningún costo.
     */
    public static evaluarProductos(context: any, cart: any, itemIds: string[]): Promise<string> {
        const candidatos: string[] = (itemIds || []).filter((x: string): boolean => !!x);
        if (candidatos.length === 0) {
            return Promise.resolve("");
        }

        if (!ValeRestringidoRule._hayValeRestringido(cart)) {
            return Promise.resolve("");
        }

        return ValeRestringidoRule._items(context)
            .then((lista: { resuelto: boolean; items: { [itemId: string]: string } }): string => {
                if (!lista.resuelto) {
                    return "Esta venta se está pagando con un vale que no cubre bebidas alcohólicas.\n\n"
                        + "No se pudo revisar si este producto es una, así que no se puede cobrar "
                        + "con este vale. Quite el vale y use otro medio de pago.";
                }

                const bloqueados: string[] = [];
                for (let i: number = 0; i < candidatos.length; i++) {
                    const categoria: string = lista.items[candidatos[i].toLowerCase()];
                    if (categoria) {
                        bloqueados.push(candidatos[i] + " (" + categoria + ")");
                    }
                }

                return bloqueados.length > 0
                    ? "Esta venta se está pagando con un vale que no cubre bebidas alcohólicas:\n\n"
                      + bloqueados.join("\n")
                      + "\n\nQuite el vale del pago, o venda el licor en otra transacción."
                    : "";
            })
            .catch((razon: any): string => {
                ValeRestringidoRule._log(context, "evaluarProductos", razon);
                return "";
            });
    }

    /**
     * Red de seguridad sobre la venta entera: ¿hay un vale restringido pagando una venta con
     * alcohol? La usan PreAddTenderLine y PreEndTransaction.
     */
    public static evaluarCarrito(context: any, cart: any): Promise<string> {
        if (!ValeRestringidoRule._hayValeRestringido(cart)) {
            return Promise.resolve("");
        }

        return ValeRestringidoRule._alcoholEnCarrito(context, cart)
            .then((hallazgo: { resuelto: boolean; lineas: string[] }): string => {
                if (!hallazgo.resuelto) {
                    return "Esta venta se está pagando con un vale que no cubre bebidas alcohólicas.\n\n"
                        + "No se pudo revisar qué tiene la venta, así que no se puede cerrar con "
                        + "este vale. Quite el vale y use otro medio de pago.";
                }
                return hallazgo.lineas.length > 0 ? ValeRestringidoRule._motivo(hallazgo.lineas) : "";
            })
            .catch((razon: any): string => {
                ValeRestringidoRule._log(context, "evaluarCarrito", razon);
                return "";
            });
    }

    /* ------------------------------------------------------------- Diálogos */

    /** Aviso que bloquea la operación. */
    public static mostrarBloqueo(context: any, motivo: string): Promise<void> {
        return ValeRestringidoRule._dialogo(context, "Vale con restricción", motivo);
    }

    /** Aviso informativo: el cajero puede continuar. */
    public static mostrarAviso(context: any, titulo: string, mensaje: string): Promise<void> {
        return ValeRestringidoRule._dialogo(context, titulo, mensaje);
    }

    private static _dialogo(context: any, titulo: string, mensaje: string): Promise<void> {
        const options: any = {
            title: titulo,
            message: mensaje,
            showCloseX: false,
            button1: { id: "understood", label: "Entendido", isPrimary: true, result: "ok" }
        };

        return context.runtime
            .executeAsync(new ShowMessageDialogClientRequest<ShowMessageDialogClientResponse>(
                options, context.logger.getNewCorrelationId()))
            .then((): void => { return; })
            .catch((): void => {
                // Que no se pueda mostrar el aviso no cambia la decisión ya tomada.
                context.logger.logError("ValeRestringidoRule: no se pudo mostrar el aviso.");
            });
    }

    /* --------------------------------------------------------------- Interno */

    private static _motivo(lineas: string[]): string {
        return "Este vale no cubre bebidas alcohólicas.\n\n"
            + "La venta tiene:\n" + lineas.join("\n")
            + "\n\nRetire esos productos, o cóbrelos con otro medio de pago.";
    }

    /**
     * El detalle técnico —qué letra es y que la extensión está desactualizada— va al log, no
     * al diálogo: a quien está cobrando le sirve saber qué hacer con la venta, no por qué.
     */
    private static _motivoDesconocida(): string {
        return "Este vale tiene una restricción que esta caja no reconoce.\n\n"
            + "No se puede cobrar con él: use otro medio de pago.";
    }

    /** ¿Alguna línea de pago del carrito es un vale restringido? Se lee del código, sin red. */
    private static _hayValeRestringido(cart: any): boolean {
        const codigos: string[] = ValeRestringidoRule._codigosDeValesEnCarrito(cart);

        for (let i: number = 0; i < codigos.length; i++) {
            const restriccion: IRestriccion = ValeRestringidoRule.restriccionDe(codigos[i]);
            if (restriccion.sinAlcohol) {
                return true;
            }
        }

        return false;
    }

    /**
     * Las tarjetas regalo ya aplicadas a la venta. Las anuladas se saltan: un vale que el
     * cajero ya quitó no puede seguir restringiendo la venta.
     */
    private static _codigosDeValesEnCarrito(cart: any): string[] {
        const lineas: any[] = (cart && cart.TenderLines) || [];
        const codigos: string[] = [];

        for (let i: number = 0; i < lineas.length; i++) {
            const linea: any = lineas[i];
            if (!linea || !linea.GiftCardId) { continue; }
            // TenderLineVoidStatus: 0 None, 1 NormalVoid, 2 ForceVoided, 3 ForceVoidReconciled.
            // Cualquier cosa distinta de 0 es un pago que ya no está: no debe seguir restringiendo.
            if (linea.VoidStatusValue) { continue; }

            const codigo: string = String(linea.GiftCardId).trim().toUpperCase();
            if (codigo && codigos.indexOf(codigo) < 0) {
                codigos.push(codigo);
            }
        }

        return codigos;
    }

    /** Líneas del carrito que son bebida alcohólica, ya formateadas para el cajero. */
    private static _alcoholEnCarrito(context: any, cart: any): Promise<{ resuelto: boolean; lineas: string[] }> {
        return ValeRestringidoRule._items(context)
            .then((lista: { resuelto: boolean; items: { [itemId: string]: string } }) => {
                if (!lista.resuelto) {
                    return { resuelto: false, lineas: [] as string[] };
                }

                const lineasCarrito: any[] = (cart && cart.CartLines) || [];
                const encontradas: string[] = [];

                for (let i: number = 0; i < lineasCarrito.length; i++) {
                    const linea: any = lineasCarrito[i];
                    if (!linea || linea.IsVoided) { continue; }

                    const itemId: string = (linea.ItemId || "").toString().trim();
                    if (!itemId) { continue; }

                    const categoria: string = lista.items[itemId.toLowerCase()];
                    if (categoria) {
                        const descripcion: string = linea.Description || linea.ProductName || itemId;
                        encontradas.push("· " + descripcion + " [" + itemId + "]");
                    }
                }

                return { resuelto: true, lineas: encontradas };
            });
    }

    /**
     * Lista de artículos restringidos. Se baja UNA vez por sesión del POS: la comprobación
     * corre al agregar cada artículo y una ida y vuelta al CSU por producto escaneado se nota
     * en la caja.
     */
    private static _items(context: any): Promise<{ resuelto: boolean; items: { [itemId: string]: string } }> {
        const st: IEstadoCompartido = estado();

        if (st.items !== null) {
            return Promise.resolve({ resuelto: st.itemsResueltos, items: st.items });
        }

        if (!st.itemsEnVuelo && Date.now() < st.itemsReintentarDesde) {
            // Falló hace poco: se responde "no resuelto" sin volver a molestar al CSU.
            return Promise.resolve({ resuelto: false, items: {} });
        }

        if (!st.itemsEnVuelo) {
            st.itemsEnVuelo = context.runtime
                .executeAsync(new ItemsRestringidosRequest<ItemsRestringidosResponse>())
                .then((respuesta: any): void => {
                    const filas: ItemRestringidoEntity[] =
                        (respuesta && respuesta.data && respuesta.data.result) || [];

                    const centinela: boolean = filas.length === 1
                        && filas[0] && filas[0].ItemId === CENTINELA_NO_RESUELTO;

                    if (centinela) {
                        // El CSU no pudo armar la lista. Una lista vacía NO es "no hay alcohol".
                        context.logger.logError(
                            "ValeRestringidoRule: el CSU no pudo resolver los artículos restringidos: "
                            + (filas[0].Categoria || ""));
                        estado().items = {};
                        estado().itemsResueltos = false;
                        return;
                    }

                    const mapa: { [itemId: string]: string } = {};
                    for (let i: number = 0; i < filas.length; i++) {
                        if (filas[i] && filas[i].ItemId) {
                            mapa[filas[i].ItemId.toLowerCase()] = filas[i].Categoria || "bebida alcohólica";
                        }
                    }

                    context.logger.logInformational(
                        "ValeRestringidoRule: " + filas.length + " artículos restringidos en caché.");

                    estado().items = mapa;
                    estado().itemsResueltos = filas.length > 0;
                })
                .catch((razon: any): void => {
                    ValeRestringidoRule._log(context, "_items", razon);
                    estado().items = {};
                    estado().itemsResueltos = false;
                })
                .then((): void => {
                    // Se libera la consulta en vuelo. Si falló, se deja null para que se vuelva
                    // a pedir, pero no antes de la espera: con el CSU caído, cada artículo
                    // escaneado dispararía una consulta.
                    const actual: IEstadoCompartido = estado();
                    actual.itemsEnVuelo = null;
                    if (!actual.itemsResueltos) {
                        actual.items = null;
                        actual.itemsReintentarDesde = Date.now() + ESPERA_REINTENTO_MS;
                    }
                });
        }

        return st.itemsEnVuelo.then((): { resuelto: boolean; items: { [itemId: string]: string } } => {
            const actual: IEstadoCompartido = estado();
            return { resuelto: actual.itemsResueltos, items: actual.items || {} };
        });
    }

    private static _log(context: any, donde: string, razon: any): void {
        let detalle: string = "";
        try { detalle = JSON.stringify(razon); } catch (error) { detalle = String(razon); }
        context.logger.logError("ValeRestringidoRule." + donde + ": " + detalle);
    }
}

export default ValeRestringidoRule;
