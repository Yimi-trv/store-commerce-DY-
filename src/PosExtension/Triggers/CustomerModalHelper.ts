import { ClientEntities } from "PosApi/Entities";
import { SelectCustomerClientRequest, SelectCustomerClientResponse } from "PosApi/Consume/Customer";
import { SetCustomerOnCartOperationRequest, SetCustomerOnCartOperationResponse } from "PosApi/Consume/Cart";

export const GUARD_KEY: string = "__customerInlineDialogActive";
export const PROGRAMMATIC_KEY: string = "__customerSearchProgrammatic";

/**
 * Ejecuta la búsqueda nativa de clientes y asigna el elegido a la venta.
 *
 * Vive en el trigger y no en el diálogo a propósito: el modal ya se cerró cuando esto
 * corre, y un `executeAsync` lanzado desde un diálogo destruido pierde sus errores en
 * silencio (el `.catch` termina escribiendo sobre un DOM desconectado). El trigger sigue
 * vivo hasta que resuelve su promesa, así que es el único lugar donde el fallo se puede
 * registrar de verdad.
 *
 * PROGRAMMATIC_KEY evita que `SelectCustomerClientRequest` vuelva a disparar
 * PreCustomerSearch y reabra este mismo modal en bucle.
 */
/**
 * ¿Está el POS en la pantalla de VENTA?
 *
 * POR QUÉ HACE FALTA
 * El modal asigna el cliente al CARRITO. Eso es lo correcto en la venta, pero hay vistas que
 * piden un cliente para OTRA cosa: "A cuenta de terceros" lo pide para saber a qué cuenta se
 * abona, y espera recibirlo de vuelta en su propia pantalla. Al abrir el modal ahí, el cliente
 * se asignaba al carrito, la vista se quedaba con el anterior, y el pago fallaba con
 * "El pago de la cuenta del cliente requiere su propia cuenta...".
 *
 * En esas vistas hay que dejar pasar la operación para que el POS abra su buscador nativo, que
 * sí devuelve el cliente a quien lo pidió.
 *
 * CÓMO SE RECONOCE
 * Con las dos señales que el tema ya usa para lo mismo (ThemeEngine.marcarAmbito), probadas en
 * producción: la rejilla de botones y el panel de líneas de la transacción. En la vista de pago
 * a cuenta no hay líneas, así que la segunda no aparece.
 */
export function esVistaDeVenta(): boolean {
    if (typeof document === "undefined") {
        return true;
    }

    return !!document.querySelector("#ButtonGrid4Control")
        && !!document.querySelector(".transactionLinesPane");
}

export function searchAndAssignCustomer(context: any, searchText: string): Promise<ClientEntities.ICancelable> {
    const correlationId: string = context && context.logger && context.logger.getNewCorrelationId
        ? context.logger.getNewCorrelationId()
        : "customer-inline-search";

    (window as any)[PROGRAMMATIC_KEY] = true;

    const release: (result: ClientEntities.ICancelable) => ClientEntities.ICancelable =
        (result: ClientEntities.ICancelable): ClientEntities.ICancelable => {
            (window as any)[PROGRAMMATIC_KEY] = false;
            (window as any)[GUARD_KEY] = false;
            return result;
        };

    return context.runtime
        .executeAsync(new SelectCustomerClientRequest<SelectCustomerClientResponse>(correlationId, searchText))
        .then((response: any): Promise<ClientEntities.ICancelable> => {
            const selected: any = response && response.data && response.data.result;
            const accountNumber: string = (selected && selected.AccountNumber) || "";

            if (response && response.canceled) {
                return Promise.resolve(release({ canceled: true }));
            }

            if (!accountNumber) {
                context.logger.logError("searchAndAssignCustomer: la selección no devolvió AccountNumber.");
                return Promise.resolve(release({ canceled: true }));
            }

            return context.runtime
                .executeAsync(new SetCustomerOnCartOperationRequest<SetCustomerOnCartOperationResponse>(correlationId, accountNumber))
                .then((): ClientEntities.ICancelable => release({ canceled: true }));
        })
        .catch((reason: any): ClientEntities.ICancelable => {
            context.logger.logError("searchAndAssignCustomer error: " + safeStringify(reason));
            return release({ canceled: true });
        });
}

function safeStringify(value: any): string {
    try {
        return JSON.stringify(value);
    } catch (error) {
        return value ? value.toString() : "";
    }
}
