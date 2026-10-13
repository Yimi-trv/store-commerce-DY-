import { ShowMessageDialogClientRequest, ShowMessageDialogClientResponse } from "PosApi/Consume/Dialogs";
import {
    ConsultarRestriccionValeRequest,
    ConsultarRestriccionValeResponse,
    ItemRestringidoEntity,
    ItemsRestringidosRequest,
    ItemsRestringidosResponse,
    ValeRestriccionEntity
} from "../DataService/ValeRestriccionRequest";

/**
 * VALE AL PORTADOR: NO PAGA BEBIDAS ALCOHÓLICAS
 * ==============================================
 *
 * Los vales de consumo de Trujillo Market son tarjetas regalo de D365 (el código del barcode
 * ES el CARDNUMBER). Desde octubre de 2026 hay dos tipos:
 *
 *   Nominal     — el de siempre, a nombre de una persona. Compra de todo.
 *   AlPortador  — transferible, impreso sin nombre ni DNI. NO compra alcohol.
 *
 * El tipo NO está en D365: vive en el sistema de vales y lo resuelve el CSU
 * (ValeRestriccionService). Aquí solo se pregunta y se decide.
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
 *   · No se sabe el tipo del vale → se deja cobrar. Bloquear todas las tarjetas regalo porque
 *     un servicio auxiliar está caído pararía la caja, y casi todos los vales son nominales.
 *   · Es AL PORTADOR pero no se sabe qué es alcohol → se bloquea ESE vale. Afecta solo a los
 *     vales restringidos y es el lado seguro del error.
 *
 * CACHÉS EN `window` Y NO A NIVEL DE MÓDULO
 * El bundle del POS se puede cargar dos veces, y entonces cada copia tendría su propio estado
 * de módulo: dos listas de artículos, dos juegos de consultas (gotcha 8 de docs/gotchas.md).
 * En `window` el estado es uno solo. Se pierde al reiniciar la caja, que es lo correcto.
 */

/** ItemId imposible que el CRT manda cuando NO pudo resolver la lista. Debe coincidir con ValesItemsController.Centinela. */
const CENTINELA_NO_RESUELTO: string = "*NO-RESUELTO*";

const CLAVE_ESTADO: string = "__truValePortador";

interface IRestriccionVale {
    permiteAlcohol: boolean;
    esPortador: boolean;
    indeterminado: boolean;
    mensaje: string;
}

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
    vales: { [codigo: string]: IRestriccionVale };
}

/** Espera tras un fallo al traer la lista. Corta para que un corte breve se recupere solo. */
const ESPERA_REINTENTO_MS: number = 60000;

function estado(): IEstadoCompartido {
    const w: any = window as any;
    if (!w[CLAVE_ESTADO]) {
        w[CLAVE_ESTADO] = {
            items: null, itemsResueltos: false, itemsEnVuelo: null, itemsReintentarDesde: 0, vales: {}
        };
    }
    return w[CLAVE_ESTADO] as IEstadoCompartido;
}

export class ValePortadorRule {

    /* ------------------------------------------------------------------ API */

    /**
     * Al pasar un vale por caja. Devuelve el motivo del bloqueo, o cadena vacía si se puede
     * seguir. Cuando el vale es al portador y la venta NO tiene alcohol, no bloquea pero sí
     * avisa: el cajero tiene que saber con qué está cobrando antes de que el cliente agregue
     * una cerveza al final.
     */
    public static evaluarVale(context: any, codigo: string, cart: any): Promise<string> {
        return ValePortadorRule._restriccion(context, codigo)
            .then((restriccion: IRestriccionVale): Promise<string> => {
                if (restriccion.permiteAlcohol) {
                    return Promise.resolve("");
                }

                return ValePortadorRule._alcoholEnCarrito(context, cart)
                    .then((hallazgo: { resuelto: boolean; lineas: string[] }): Promise<string> => {
                        if (!hallazgo.resuelto) {
                            return Promise.resolve(
                                "Este vale es AL PORTADOR y no puede pagar bebidas alcohólicas, pero "
                                + "ahora mismo no se puede verificar qué productos lo son.\n\n"
                                + "Cobre con otro medio de pago y avise a sistemas.");
                        }

                        if (hallazgo.lineas.length > 0) {
                            return Promise.resolve(ValePortadorRule._motivo(hallazgo.lineas));
                        }

                        // Sin alcohol en la venta: se informa y se sigue.
                        return ValePortadorRule.mostrarAviso(
                            context,
                            "Vale AL PORTADOR",
                            "Este vale no puede pagar bebidas alcohólicas.\n\n"
                            + "La venta actual no tiene ninguna, así que puede continuar.")
                            .then((): string => "");
                    });
            })
            .catch((razon: any): string => {
                ValePortadorRule._log(context, "evaluarVale", razon);
                return "";
            });
    }

    /**
     * Al agregar un artículo a la venta. Solo mira si YA hay un vale al portador aplicado:
     * sin él no hay nada que restringir y la caja no debe pagar ningún costo.
     */
    public static evaluarProductos(context: any, cart: any, itemIds: string[]): Promise<string> {
        const candidatos: string[] = (itemIds || []).filter((x: string): boolean => !!x);
        if (candidatos.length === 0) {
            return Promise.resolve("");
        }

        return ValePortadorRule._hayValePortador(context, cart)
            .then((hayPortador: boolean): Promise<string> => {
                if (!hayPortador) {
                    return Promise.resolve("");
                }

                return ValePortadorRule._items(context)
                    .then((lista: { resuelto: boolean; items: { [itemId: string]: string } }): string => {
                        if (!lista.resuelto) {
                            return "La venta se está pagando con un vale AL PORTADOR y no se puede "
                                + "verificar si este producto es una bebida alcohólica.\n\n"
                                + "Quite el vale y cobre con otro medio de pago.";
                        }

                        const bloqueados: string[] = [];
                        for (let i: number = 0; i < candidatos.length; i++) {
                            const categoria: string = lista.items[candidatos[i].toLowerCase()];
                            if (categoria) {
                                bloqueados.push(candidatos[i] + " (" + categoria + ")");
                            }
                        }

                        return bloqueados.length > 0
                            ? "Esta venta se está pagando con un vale AL PORTADOR, que no cubre "
                              + "bebidas alcohólicas:\n\n" + bloqueados.join("\n")
                              + "\n\nQuite el vale del pago, o venda el licor en otra transacción."
                            : "";
                    });
            })
            .catch((razon: any): string => {
                ValePortadorRule._log(context, "evaluarProductos", razon);
                return "";
            });
    }

    /**
     * Red de seguridad sobre la venta entera: ¿hay un vale al portador pagando una venta con
     * alcohol? La usan PreAddTenderLine y PreEndTransaction.
     */
    public static evaluarCarrito(context: any, cart: any): Promise<string> {
        return ValePortadorRule._hayValePortador(context, cart)
            .then((hayPortador: boolean): Promise<string> => {
                if (!hayPortador) {
                    return Promise.resolve("");
                }

                return ValePortadorRule._alcoholEnCarrito(context, cart)
                    .then((hallazgo: { resuelto: boolean; lineas: string[] }): string => {
                        if (!hallazgo.resuelto) {
                            return "La venta se está pagando con un vale AL PORTADOR y no se puede "
                                + "verificar si tiene bebidas alcohólicas.\n\n"
                                + "Quite el vale y cobre con otro medio de pago.";
                        }
                        return hallazgo.lineas.length > 0 ? ValePortadorRule._motivo(hallazgo.lineas) : "";
                    });
            })
            .catch((razon: any): string => {
                ValePortadorRule._log(context, "evaluarCarrito", razon);
                return "";
            });
    }

    /* ------------------------------------------------------------- Diálogos */

    /** Aviso que bloquea la operación. */
    public static mostrarBloqueo(context: any, motivo: string): Promise<void> {
        return ValePortadorRule._dialogo(context, "Vale AL PORTADOR: no cubre bebidas alcohólicas", motivo);
    }

    /** Aviso informativo: el cajero puede continuar. */
    public static mostrarAviso(context: any, titulo: string, mensaje: string): Promise<void> {
        return ValePortadorRule._dialogo(context, titulo, mensaje);
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
                context.logger.logError("ValePortadorRule: no se pudo mostrar el aviso.");
            });
    }

    /* --------------------------------------------------------------- Interno */

    private static _motivo(lineas: string[]): string {
        return "Este vale es AL PORTADOR y no cubre bebidas alcohólicas.\n\n"
            + "La venta tiene:\n" + lineas.join("\n")
            + "\n\nRetire esos productos, o cóbrelos con otro medio de pago.";
    }

    /** Restricción de un código, cacheada: el mismo vale se consulta en varios puntos de control. */
    private static _restriccion(context: any, codigo: string): Promise<IRestriccionVale> {
        const clave: string = (codigo || "").trim().toUpperCase();
        if (!clave) {
            return Promise.resolve({ permiteAlcohol: true, esPortador: false, indeterminado: false, mensaje: "" });
        }

        const cacheado: IRestriccionVale = estado().vales[clave];
        if (cacheado) {
            return Promise.resolve(cacheado);
        }

        return context.runtime
            .executeAsync(new ConsultarRestriccionValeRequest<ConsultarRestriccionValeResponse>(clave))
            .then((respuesta: any): IRestriccionVale => {
                const filas: ValeRestriccionEntity[] =
                    (respuesta && respuesta.data && respuesta.data.result) || [];
                const fila: ValeRestriccionEntity = filas.length > 0 ? filas[0] : null;

                const restriccion: IRestriccionVale = fila
                    ? {
                        permiteAlcohol: fila.PermiteAlcohol,
                        esPortador: fila.TipoVale === "AlPortador",
                        indeterminado: fila.Indeterminado,
                        mensaje: fila.Mensaje || ""
                    }
                    : { permiteAlcohol: true, esPortador: false, indeterminado: true, mensaje: "" };

                context.logger.logInformational(
                    "ValePortadorRule: vale=" + clave
                    + " | tipo=" + (fila ? fila.TipoVale : "(sin respuesta)")
                    + " | permiteAlcohol=" + restriccion.permiteAlcohol
                    + " | indeterminado=" + restriccion.indeterminado
                    + " | " + (fila ? (fila.Detalle || "") : ""));

                // Lo indeterminado NO se cachea: la próxima vez el servicio puede estar de vuelta.
                if (!restriccion.indeterminado) {
                    estado().vales[clave] = restriccion;
                }
                return restriccion;
            })
            .catch((razon: any): IRestriccionVale => {
                ValePortadorRule._log(context, "_restriccion(" + clave + ")", razon);
                return { permiteAlcohol: true, esPortador: false, indeterminado: true, mensaje: "" };
            });
    }

    /** ¿Alguna línea de pago del carrito es un vale al portador? */
    private static _hayValePortador(context: any, cart: any): Promise<boolean> {
        const codigos: string[] = ValePortadorRule._codigosDeValesEnCarrito(cart);
        if (codigos.length === 0) {
            return Promise.resolve(false);
        }

        return Promise.all(codigos.map((c: string): Promise<IRestriccionVale> =>
            ValePortadorRule._restriccion(context, c)))
            .then((restricciones: IRestriccionVale[]): boolean =>
                restricciones.some((r: IRestriccionVale): boolean => !r.permiteAlcohol));
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
        return ValePortadorRule._items(context)
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
                            "ValePortadorRule: el CSU no pudo resolver los artículos restringidos: "
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
                        "ValePortadorRule: " + filas.length + " artículos restringidos en caché.");

                    estado().items = mapa;
                    estado().itemsResueltos = filas.length > 0;
                })
                .catch((razon: any): void => {
                    ValePortadorRule._log(context, "_items", razon);
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
        context.logger.logError("ValePortadorRule." + donde + ": " + detalle);
    }
}

export default ValePortadorRule;
