import { ClientEntities } from "PosApi/Entities";
import { IOperationTriggerOptions, PreOperationTrigger } from "PosApi/Extend/Triggers/OperationTriggers";
import CustomerInlineDialog, { ICustomerInlineDialogResult } from "../Controls/Dialogs/CustomerInline/CustomerInlineDialog";
import { GUARD_KEY, PROGRAMMATIC_KEY, searchAndAssignCustomer } from "./CustomerModalHelper";

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
        // único que hace en el caso normal es comparar un número y dejar pasar.
        const request: any = options ? options.operationRequest : null;
        const operationId: any = request ? request.operationId : null;

        if (operationId === CUSTOMER_SEARCH_OPERATION_ID) {
            return this._openModalForSearch();
        }

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

        (window as any)[GUARD_KEY] = true;
        const dialog: CustomerInlineDialog = new CustomerInlineDialog();

        return dialog.open("search", null, "")
            .then((result: ICustomerInlineDialogResult | null): Promise<ClientEntities.ICancelable> => {
                if (result && result.action === "native_search") {
                    return searchAndAssignCustomer(this.context, result.searchText || "");
                }
                (window as any)[GUARD_KEY] = false;
                return Promise.resolve({ canceled: true });
            })
            .catch((reason: any): ClientEntities.ICancelable => {
                (window as any)[GUARD_KEY] = false;
                this.context.logger.logError("OperationProbeTrigger (602) error: " + JSON.stringify(reason));
                // Ante un fallo se deja pasar la operación: mejor la pantalla nativa que nada.
                return { canceled: false };
            });
    }
}
