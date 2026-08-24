import { ProxyEntities } from "PosApi/Entities";
import { GetCurrentCartClientRequest, GetCurrentCartClientResponse } from "PosApi/Consume/Cart";
import { GetCustomerClientRequest, GetCustomerClientResponse } from "PosApi/Consume/Customer";
import { ShowMessageDialogClientRequest, ShowMessageDialogClientResponse } from "PosApi/Consume/Dialogs";
import SunatCustomerService from "./SunatCustomerService";

/**
 * REGLA FISCAL: EL COMPROBANTE DEBE CORRESPONDER AL DOCUMENTO DEL CLIENTE
 * =======================================================================
 *
 * SUNAT no admite cualquier combinación:
 *
 *   FACTURA  -> exige RUC. A un cliente sin RUC la factura sale observada.
 *   BOLETA   -> es para consumidor final (DNI o sin documento). Emitirle boleta a un RUC
 *               le niega el crédito fiscal al comprador y es el caso que se reportó.
 *
 * DE DÓNDE SALE EL TIPO DE COMPROBANTE
 * Lo elige el control "Boleta / Factura" de la localización DP (OptionDetailsCustomControl),
 * que al presionar "Aplicar documento" guarda la elección en el CARRITO como propiedad de
 * extensión `SelectedOption`, con los valores literales "Boleta" o "Factura".
 *
 * Verificado leyendo el paquete DP 10.0.47-4:
 *   ViewExtensions/Cart/OptionDetailsCustomControl.js -> key "SelectedOption"
 *   optionPreferences = [{value:"Boleta"}, {value:"Factura"}]
 *
 * POR QUÉ LO VALIDA ESTA EXTENSIÓN Y NO DP
 * El control de DP calcula un `customerIsPerson` a partir de `CustomerTypeValue` y NO lo usa
 * para restringir nada. Y aunque lo usara, esa regla sería incorrecta: un RUC 10 es PERSONA
 * natural con RUC y sí lleva factura. Lo que manda es el TIPO DE DOCUMENTO, no el tipo de
 * cliente. El paquete DP es código cerrado que no se modifica (regla de oro del proyecto),
 * así que la validación vive aquí.
 */
export class DocumentTypeRule {

    /** Valores literales que usa el control de DP. */
    private static readonly BOLETA: string = "BOLETA";
    private static readonly FACTURA: string = "FACTURA";

    /**
     * Evalúa la venta actual. Resuelve el motivo del bloqueo, o cadena vacía si es válida.
     *
     * NUNCA lanza: ante cualquier fallo de lectura devuelve "" y la venta sigue. Es el mismo
     * criterio de todo el proyecto — un problema técnico no detiene una caja.
     */
    public static evaluateCurrentCart(context: any): Promise<string> {
        const correlationId: string = context.logger.getNewCorrelationId();

        return context.runtime
            .executeAsync(new GetCurrentCartClientRequest<GetCurrentCartClientResponse>(correlationId))
            .then((response: any): Promise<string> => {
                const cart: any = response && response.data && response.data.result;

                if (!cart) {
                    return Promise.resolve("");
                }

                const document: string = DocumentTypeRule._readSelectedOption(cart);

                // Sin documento elegido no hay nada que validar: el control de DP todavía no
                // aplicó ninguna opción.
                if (!document) {
                    return Promise.resolve("");
                }

                const accountNumber: string = cart.CustomerId || "";

                if (!accountNumber) {
                    // Sin cliente solo puede ir boleta; la factura exige RUC.
                    return Promise.resolve(document === DocumentTypeRule.FACTURA
                        ? "La venta no tiene cliente asignado y la FACTURA exige un cliente con RUC."
                        : "");
                }

                return context.runtime
                    .executeAsync(new GetCustomerClientRequest<GetCustomerClientResponse>(accountNumber, correlationId))
                    .then((customerResponse: any): string => {
                        const customer: ProxyEntities.Customer =
                            customerResponse && customerResponse.data && customerResponse.data.result;

                        return DocumentTypeRule._evaluate(document, customer, accountNumber, context);
                    });
            })
            .catch((reason: any): string => {
                let detail: string = "";
                try { detail = JSON.stringify(reason); } catch (error) { detail = String(reason); }
                context.logger.logError("DocumentTypeRule: no se pudo validar el comprobante: " + detail);
                return "";
            });
    }

    /**
     * Decide con el documento fiscal del cliente, NO con su CustomerTypeValue: un RUC 10 es
     * persona natural y sí lleva factura.
     */
    private static _evaluate(document: string, customer: ProxyEntities.Customer, accountNumber: string, context: any): string {
        const service: SunatCustomerService = new SunatCustomerService();
        const documentNumber: string = customer ? service.getDocumentNumber(customer) : "";
        const documentType: string | null = service.getDocumentType(documentNumber);
        const hasRuc: boolean = documentType === "RUC";

        context.logger.logInformational(
            "DocumentTypeRule: comprobante=" + document
            + " | cuenta=" + accountNumber
            + " | documento=" + (documentNumber || "(sin documento)")
            + " | tipo=" + (documentType || "(ninguno)"));

        if (document === DocumentTypeRule.BOLETA && hasRuc) {
            return "El cliente " + accountNumber + " tiene RUC " + documentNumber + "."
                + "\n\nA un cliente con RUC se le emite FACTURA, no boleta."
                + "\n\nCambie el comprobante a Factura, o asigne a la venta un cliente sin RUC.";
        }

        if (document === DocumentTypeRule.FACTURA && !hasRuc) {
            return "El cliente " + accountNumber
                + (documentNumber ? " tiene el documento " + documentNumber + ", que no es un RUC." : " no tiene RUC registrado.")
                + "\n\nLa FACTURA exige un cliente con RUC."
                + "\n\nCambie el comprobante a Boleta, o asigne a la venta un cliente con RUC.";
        }

        return "";
    }

    /** Lee la propiedad de extensión que escribe el control de DP, normalizada a mayúsculas. */
    private static _readSelectedOption(cart: any): string {
        const properties: any[] = (cart && cart.ExtensionProperties) || [];

        for (let i: number = 0; i < properties.length; i++) {
            const property: any = properties[i];

            if (property && property.Key === "SelectedOption" && property.Value) {
                return (property.Value.StringValue || "").toString().toUpperCase().trim();
            }
        }

        return "";
    }

    /**
     * Muestra el motivo del bloqueo. Se usa el diálogo de mensaje del POS —y no una alerta
     * propia— porque aquí NO hay ningún templated dialog abierto: el gotcha que impedía
     * apilarlos no aplica desde un trigger.
     */
    public static showBlockedDialog(context: any, reason: string): Promise<void> {
        const options: any = {
            title: "Comprobante no válido para este cliente",
            message: reason,
            showCloseX: false,
            button1: { id: "understood", label: "Entendido", isPrimary: true, result: "ok" }
        };

        return context.runtime
            .executeAsync(new ShowMessageDialogClientRequest<ShowMessageDialogClientResponse>(
                options, context.logger.getNewCorrelationId()))
            .then((): void => { return; })
            .catch((): void => {
                // Que no se pueda mostrar el aviso no cambia la decisión: la venta ya se canceló.
                context.logger.logError("DocumentTypeRule: no se pudo mostrar el aviso de bloqueo.");
            });
    }
}

export default DocumentTypeRule;
