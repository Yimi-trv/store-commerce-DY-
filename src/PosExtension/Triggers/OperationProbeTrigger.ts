import { ClientEntities } from "PosApi/Entities";
import { IOperationTriggerOptions, PreOperationTrigger } from "PosApi/Extend/Triggers/OperationTriggers";
import CustomerInlineDialog, { ICustomerInlineDialogResult } from "../Controls/Dialogs/CustomerInline/CustomerInlineDialog";
import {
    GUARD_KEY, PROGRAMMATIC_KEY, searchAndAssignCustomer, esVistaDeVenta,
    anotarOperacionIniciada, tomarOperacionEnvolvente
} from "./CustomerModalHelper";

/**
 * Operación 602 = "Customer search". Es la que dispara el botón "Agregar cliente" del panel de
 * la venta (CartViewController.onAddCustomerClick -> CartViewModel.searchCustomers).
 *
 * Verificado en UAT: esa operación NO dispara el trigger PreCustomerSearch, así que no se podía
 * interceptar por ahí. PreOperation sí se dispara y además es cancelable, que es lo que permite
 * abrir el modal en su lugar.
 */
const CUSTOMER_SEARCH_OPERATION_ID: number = 602;

/**
 * ABRE EL MODAL DESDE EL BOTÓN "AGREGAR CLIENTE" DEL PANEL DE LA VENTA
 * ====================================================================
 *
 * Nació como sonda de diagnóstico: registraba en consola CADA operación del POS para averiguar
 * cuál dispara ese botón. La respuesta fue la 602, y con eso el trigger pasó a interceptarla.
 *
 * ESE REGISTRO YA NO ESTÁ. Corría en cada acción de la caja —cada tecla del numpad, cada
 * producto, cada pago— escribiendo en consola y en el log del POS. Como diagnóstico valía la
 * pena; una vez resuelto lo que buscaba, era trabajo constante a cambio de nada.
 *
 * Si hiciera falta volver a averiguar qué operación dispara un botón, el bloque está en el
 * historial de git (buscar "=== OPERACION ===").
 */
export default class OperationProbeTrigger extends PreOperationTrigger {
    public execute(options: IOperationTriggerOptions): Promise<ClientEntities.ICancelable> {
        // Lectura directa y sin registro: esto corre en CADA operación de la caja, así que lo
        // único que hace en el caso normal es comparar un número, apuntar y dejar pasar.
        const request: any = options ? options.operationRequest : null;
        const operationId: any = request ? request.operationId : null;

        if (operationId === CUSTOMER_SEARCH_OPERATION_ID) {
            return this._openModalForSearch();
        }

        // Se apunta para saber, si más tarde llega una búsqueda de cliente, quién la envolvía.
        anotarOperacionIniciada(operationId, request);

        // Cualquier otra operación pasa sin tocarse.
        return Promise.resolve({ canceled: false });
    }

    /**
     * Abre el modal en la pestaña Buscar y cancela la navegación a la pantalla nativa.
     *
     * Los guardas evitan el bucle: cuando el propio modal ejecuta la búsqueda del POS, la
     * operación 602 puede volver a dispararse y reabriría el modal indefinidamente.
     */
    private _openModalForSearch(): Promise<ClientEntities.ICancelable> {
        if ((window as any)[GUARD_KEY] || (window as any)[PROGRAMMATIC_KEY]) {
            return Promise.resolve({ canceled: false });
        }

        // Se resuelve ANTES de abrir el modal: mientras el modal está abierto la pantalla puede
        // cambiar, y lo que interesa es dónde estaba el cajero cuando pidió el cliente.
        const enLaVenta: boolean = esVistaDeVenta();
        const envolvente: any = enLaVenta ? null : tomarOperacionEnvolvente();

        (window as any)[GUARD_KEY] = true;
        const dialog: CustomerInlineDialog = new CustomerInlineDialog();

        return dialog.open("search", null, "")
            .then((result: ICustomerInlineDialogResult | null): Promise<ClientEntities.ICancelable> => {
                if (result && result.action === "native_search") {
                    return searchAndAssignCustomer(this.context, result.searchText || "");
                }
                (window as any)[GUARD_KEY] = false;

                const cuenta: string = (result && result.customerAccountNumber) || "";

                if (!enLaVenta && cuenta) {
                    this._devolverElControl(envolvente, cuenta);
                }

                return Promise.resolve({ canceled: true });
            })
            .catch((reason: any): ClientEntities.ICancelable => {
                (window as any)[GUARD_KEY] = false;
                this.context.logger.logError("OperationProbeTrigger (602) error: " + JSON.stringify(reason));
                // Ante un fallo se deja pasar la operación: mejor la pantalla nativa que nada.
                return { canceled: false };
            });
    }

    /**
     * Relanza la operación que había pedido la búsqueda, para que vuelva a leer el carrito.
     *
     * Sin esto, elegir el cliente en "A cuenta de terceros" no servía de nada: el cliente sí
     * quedaba en el carrito, pero la pantalla de pago ya lo había leído al abrirse y seguía
     * pidiendo cuenta. Un PreOperationTrigger no puede entregarle el cliente —solo cancelar—,
     * así que la única forma de que lo vea es que la pantalla se vuelva a abrir.
     *
     * NO relanzar es una salida válida: si no se sabe qué operación era, el cliente ya quedó
     * asignado y el cajero puede repetir la acción a mano. Peor sería mandarlo a otra pantalla.
     */
    private _devolverElControl(envolvente: any, accountNumber: string): void {
        if (!envolvente) {
            this.context.logger.logInformational(
                "OperationProbeTrigger: cliente " + accountNumber + " asignado fuera de la venta,"
                + " pero no se sabe qué operación pidió la búsqueda; no se relanza nada.");
            return;
        }

        this.context.logger.logInformational(
            "OperationProbeTrigger: cliente " + accountNumber + " asignado fuera de la pantalla de"
            + " venta; se relanza la operación " + (envolvente.operationId || "(sin id)")
            + " para que vuelva a leer el carrito.");

        // Se espera a que el POS termine de deshacer la operación cancelada. Lanzada en el mismo
        // turno, la nueva llega mientras la anterior aún se está cerrando y se pierde.
        window.setTimeout((): void => {
            try {
                this.context.runtime.executeAsync(envolvente)
                    .catch((reason: any): void => {
                        this.context.logger.logError(
                            "OperationProbeTrigger: no se pudo relanzar la operación: " + JSON.stringify(reason));
                    });
            } catch (error) {
                this.context.logger.logError("OperationProbeTrigger: relanzar la operación lanzó: " + error);
            }
        }, 600);
    }
}
