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
 * SONDA DE DIAGNÓSTICO — TEMPORAL
 * ================================
 *
 * Registra en la consola qué operación dispara cada botón del POS, sin interferir con ninguna:
 * siempre deja pasar la operación.
 *
 * PARA QUÉ EXISTE
 * El botón "Agregar cliente" del panel de la venta no abre el modal, y no se sabe qué operación
 * ejecuta. Los triggers actuales cubren PreCustomerSearch, PreCustomerAdd y PreCustomerEdit; si
 * ese botón usara alguna de esas, el modal se abriría. Como no lo hace, dispara otra cosa.
 *
 * CÓMO USARLA
 * Presionar el botón en cuestión y buscar en la consola (F12):
 *
 *     === OPERACION === id=612 | nombre=CustomerAdd
 *
 * Con ese número se decide si hace falta un trigger nuevo o si alcanza con los existentes.
 *
 * ELIMINAR cuando el botón "Agregar cliente" quede resuelto. Está registrada en manifest.json
 * como OperationProbeTrigger.
 */
export default class OperationProbeTrigger extends PreOperationTrigger {
    public execute(options: IOperationTriggerOptions): Promise<ClientEntities.ICancelable> {
        let operationId: any = null;

        try {
            const request: any = options ? options.operationRequest : null;
            operationId = request ? request.operationId : null;

            let typeName: string = "";
            if (request && request.constructor && request.constructor.name) {
                typeName = request.constructor.name;
            }

            const line: string = "=== OPERACION === id=" + operationId + " | tipo=" + typeName;
            if (typeof console !== "undefined" && console.log) {
                console.log(line);
            }
            this.context.logger.logInformational(line);
        } catch (error) {
            // La sonda jamás debe romper una operación de caja.
        }

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
