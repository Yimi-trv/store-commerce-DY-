import { ClientEntities } from "PosApi/Entities";
import { IOperationTriggerOptions, PreOperationTrigger } from "PosApi/Extend/Triggers/OperationTriggers";
import CustomerInlineDialog, { ICustomerInlineDialogResult } from "../Controls/Dialogs/CustomerInline/CustomerInlineDialog";
import {
    GUARD_KEY, PROGRAMMATIC_KEY, searchAndAssignCustomer, seleccionarYAsignarCliente,
    esVistaDeVenta, anotarOperacionIniciada, tomarOperacionEnvolvente
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
 * Operacion 202 = "Pay customer account" ("A cuenta de terceros"). Necesita saber A QUE CUENTA
 * se abona, y lo resuelve abriendo la busqueda de cliente DESDE DENTRO de su propia pantalla.
 */
const PAY_CUSTOMER_ACCOUNT_OPERATION_ID: number = 202;

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

        // ANTES de que la pantalla de pago se abra, no despues. Ver _pedirClienteAntesDePagar.
        if (operationId === PAY_CUSTOMER_ACCOUNT_OPERATION_ID) {
            return this._pedirClienteAntesDePagar(request);
        }

        if (operationId === CUSTOMER_SEARCH_OPERATION_ID) {
            return this._openModalForSearch();
        }

        // Se apunta para saber, si más tarde llega una búsqueda de cliente, quién la envolvía.
        // Las operaciones de cliente NO cuentan: relanzar un "Customer clear" o un "Customer"
        // no devolvería a nadie a donde estaba, y "Customer clear" además envuelve a "Customer",
        // así que apuntarlas ensuciaría el anidamiento con ruido propio del propio flujo.
        if (!esOperacionDeCliente(operationId)) {
            anotarOperacionIniciada(operationId, request);
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

        // ¿La pidió el cajero, o la pidió otra operación desde dentro de su propia pantalla?
        const envolvente: any = tomarOperacionEnvolvente();

        this.context.logger.logInformational(
            "OperationProbeTrigger: busqueda de cliente | la pidio "
            + (envolvente ? ("la operacion " + (envolvente.operationId || "(sin id)")) : "el cajero")
            + " | esVistaDeVenta()=" + esVistaDeVenta() + " (solo dato, no decide)");

        // LA PIDIÓ OTRA OPERACIÓN: se deja pasar al buscador nativo del POS.
        //
        // Esa operación espera un RESULTADO, y un PreOperationTrigger no puede entregarlo: solo
        // dejar pasar o cancelar. Se intentó cancelar y relanzar la operación de fuera para que
        // volviera a leer el carrito. Funcionaba —el log de UAT muestra el cobro completándose—
        // pero dejaba la caja colgada en "Se sigue trabajando en su solicitud...": el pago
        // entero corría dentro de un setTimeout nuestro, disparado desde un trigger que ya había
        // resuelto, y al desmontarse la vista la cola de bloqueos de periféricos se quedaba con
        // promesas rechazadas que nadie recogía.
        //
        // Cancelar y volver a lanzar operaciones del POS desde fuera de su propio flujo no es
        // algo que la extensión pueda hacer de forma sana. Aquí ya no hace falta: el cliente se
        // pide en _pedirClienteAntesDePagar, antes de que esta pantalla exista.
        if (envolvente) {
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

    /**
     * PIDE EL CLIENTE ANTES DE ABRIR LA PANTALLA DE PAGO.
     * ===================================================
     *
     * "A cuenta de terceros" necesita saber a qué cuenta abona. Su forma de averiguarlo es abrir
     * la búsqueda de cliente DESDE DENTRO de su pantalla, y quedarse esperando el resultado —un
     * resultado que un PreOperationTrigger no puede entregarle.
     *
     * Así que se le pregunta antes. Cuando la pantalla se abre, el carrito ya tiene la cuenta y
     * la lee sola por el camino de siempre. No hay nada que cancelar, nada que relanzar y nada
     * que pueda quedar a medias: la operación sigue su curso normal, solo que más informada.
     *
     * Si el cajero cierra el modal sin elegir, se cancela la operación. Es lo correcto: cancelar
     * un pago que todavía no abrió ninguna pantalla no deja rastro.
     */
    private _pedirClienteAntesDePagar(request: any): Promise<ClientEntities.ICancelable> {
        if ((window as any)[GUARD_KEY] || (window as any)[PROGRAMMATIC_KEY]) {
            return Promise.resolve({ canceled: false });
        }

        (window as any)[GUARD_KEY] = true;
        const dialog: CustomerInlineDialog = new CustomerInlineDialog();

        return dialog.open("search", null, "")
            .then((result: ICustomerInlineDialogResult | null): Promise<ClientEntities.ICancelable> => {
                if (result && result.action === "native_search") {
                    return seleccionarYAsignarCliente(this.context, result.searchText || "")
                        .then((cuenta: string): ClientEntities.ICancelable => this._seguirSiHayCuenta(cuenta));
                }

                (window as any)[GUARD_KEY] = false;
                return Promise.resolve(this._seguirSiHayCuenta((result && result.customerAccountNumber) || ""));
            })
            .catch((reason: any): ClientEntities.ICancelable => {
                (window as any)[GUARD_KEY] = false;
                this.context.logger.logError("OperationProbeTrigger (202) error: " + JSON.stringify(reason));
                // Ante un fallo se deja pasar: el POS pedirá el cliente a su manera, que funciona.
                return { canceled: false };
            });
    }

    /** Con cuenta elegida el pago sigue; sin ella no se abre la pantalla. */
    private _seguirSiHayCuenta(accountNumber: string): ClientEntities.ICancelable {
        if (!accountNumber) {
            this.context.logger.logInformational(
                "OperationProbeTrigger: no se eligio cliente; el pago a cuenta no se abre.");
            return { canceled: true };
        }

        this.context.logger.logInformational(
            "OperationProbeTrigger: cuenta " + accountNumber + " elegida ANTES de abrir el pago;"
            + " la pantalla la leera del carrito al cargarse.");
        return { canceled: false };
    }
}

/**
 * Operaciones del propio flujo de cliente. No sirven como "operación que envolvía la búsqueda".
 * 600 Customer · 602 Customer search · 603 Customer clear.
 */
function esOperacionDeCliente(operationId: any): boolean {
    return operationId === 600 || operationId === 602 || operationId === 603;
}
