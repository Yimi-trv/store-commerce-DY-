import { ProxyEntities } from "PosApi/Entities";
import { GetCurrentCartClientRequest, GetCurrentCartClientResponse } from "PosApi/Consume/Cart";
import { GetCustomerClientRequest, GetCustomerClientResponse } from "PosApi/Consume/Customer";
import { ShowMessageDialogClientRequest, ShowMessageDialogClientResponse } from "PosApi/Consume/Dialogs";
import SunatCustomerService from "./SunatCustomerService";

/**
 * REGLA FISCAL: EL COMPROBANTE DEBE CORRESPONDER AL CLIENTE
 * ==========================================================
 *
 *   FACTURA  -> exige RUC. A un cliente sin RUC la factura sale observada.
 *   BOLETA   -> es para consumidor final. Solo se le niega a las EMPRESAS.
 *
 * QUÉ CUENTA COMO EMPRESA, Y POR QUÉ NO BASTA "TENER RUC"
 * Solo el RUC que empieza en 20. Los que empiezan en 10, 15 o 17 son PERSONAS naturales con
 * RUC —un profesional que emite recibos por honorarios, por ejemplo— y a una persona sí se le
 * emite boleta: la boleta es para consumidor final, y comprando para sí misma lo es.
 *
 * Ese criterio lo decide `isOrganizationDocument`, que ya existía y es el mismo que decide si
 * hace falta dirección fiscal. Una sola definición de "empresa" para las dos reglas.
 *
 * ANTES ESTO ERA MÁS ENREDADO. Se bloqueaba la boleta a TODO RUC, y para dejar pasar a los
 * empleados por Recibo por Honorarios había una excepción que miraba el grupo de cliente del
 * canal y exigía que el cobro fuera a cuenta de terceros. Con la regla de arriba esos empleados
 * entran solos —tienen RUC 10— y aquella excepción quedó cubierta, así que se quitó: dos
 * caminos hacia la misma decisión es como las reglas terminan separándose.
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
 * para restringir nada. El paquete DP es código cerrado que no se modifica (regla de oro del
 * proyecto), así que la validación vive aquí.
 */
export class DocumentTypeRule {

    /** Valores literales que usa el control de DP. */
    private static readonly BOLETA: string = "BOLETA";
    private static readonly FACTURA: string = "FACTURA";

    /**
     * Documento fiscal por cuenta, para no releer el mismo cliente en cada punto de control.
     *
     * El documento de un cliente no cambia durante una venta, y la regla se evalúa dos veces
     * (al pagar y al cerrar): sin caché eran dos lecturas idénticas seguidas. Vive en memoria
     * y se pierde al recargar el POS, que es lo correcto — no se persisten datos de clientes.
     */
    private static _documentCache: { [accountNumber: string]: string } = {};

    /**
     * Evalúa la venta. Resuelve el motivo del bloqueo, o cadena vacía si es válida.
     *
     * El carrito llega por parámetro: los triggers de pago y de fin de transacción ya lo
     * reciben en `options.cart`, así que pedirlo otra vez al servidor era una ida y vuelta
     * regalada en cada cobro. Solo se pide si quien llama no lo tiene.
     *
     * NUNCA lanza: ante cualquier fallo de lectura devuelve "" y la venta sigue. Es el mismo
     * criterio de todo el proyecto — un problema técnico no detiene una caja.
     */
    public static evaluateCart(context: any, cartFromTrigger: any): Promise<string> {
        const correlationId: string = context.logger.getNewCorrelationId();

        const cartPromise: Promise<any> = cartFromTrigger
            ? Promise.resolve(cartFromTrigger)
            : context.runtime
                .executeAsync(new GetCurrentCartClientRequest<GetCurrentCartClientResponse>(correlationId))
                .then((response: any): any => response && response.data && response.data.result);

        return cartPromise
            .then((cart: any): Promise<string> => {
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

                // Lo ya conocido evita releer el cliente en el segundo punto de control: al
                // cobrar y al cerrar se preguntaba lo mismo dos veces.
                const cached: string = DocumentTypeRule._documentCache[accountNumber];

                if (typeof cached === "string") {
                    return Promise.resolve(
                        DocumentTypeRule._evaluateDocument(document, cached, accountNumber, context));
                }

                return context.runtime
                    .executeAsync(new GetCustomerClientRequest<GetCustomerClientResponse>(accountNumber, correlationId))
                    .then((customerResponse: any): string => {
                        const customer: ProxyEntities.Customer =
                            customerResponse && customerResponse.data && customerResponse.data.result;
                        const service: SunatCustomerService = new SunatCustomerService();
                        const documentNumber: string = customer ? service.getDocumentNumber(customer) : "";

                        DocumentTypeRule._documentCache[accountNumber] = documentNumber;

                        return DocumentTypeRule._evaluateDocument(document, documentNumber, accountNumber, context);
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
     * Decide con el DOCUMENTO del cliente, no con su CustomerTypeValue.
     *
     * Un RUC 10 es persona natural: lleva factura si la pide, y boleta si compra para sí.
     */
    private static _evaluateDocument(
        document: string, documentNumber: string, accountNumber: string, context: any): string {

        const service: SunatCustomerService = new SunatCustomerService();
        const documentType: string | null = service.getDocumentType(documentNumber);
        const hasRuc: boolean = documentType === "RUC";
        const esEmpresa: boolean = service.isOrganizationDocument(documentNumber);

        context.logger.logInformational(
            "DocumentTypeRule: comprobante=" + document
            + " | cuenta=" + accountNumber
            + " | documento=" + (documentNumber || "(sin documento)")
            + " | tipo=" + (documentType || "(ninguno)")
            + " | empresa=" + esEmpresa);

        // Solo a las EMPRESAS se les niega la boleta. Una persona natural con RUC (10, 15, 17)
        // es consumidor final cuando compra para sí misma, y la boleta le corresponde.
        if (document === DocumentTypeRule.BOLETA && esEmpresa) {
            return "El cliente " + accountNumber + " es una empresa: su RUC " + documentNumber
                + " empieza en 20."
                + "\n\nA una empresa se le emite FACTURA, no boleta."
                + "\n\nCambie el comprobante a Factura, o asigne a la venta un cliente que no sea"
                + " una empresa.";
        }

        if (document === DocumentTypeRule.FACTURA && !hasRuc) {
            return "El cliente " + accountNumber
                + (documentNumber ? " tiene el documento " + documentNumber + ", que no es un RUC." : " no tiene RUC registrado.")
                + "\n\nLa FACTURA exige un cliente con RUC."
                + "\n\nCambie el comprobante a Boleta, o asigne a la venta un cliente con RUC.";
        }

        return "";
    }

    /**
     * Olvida el documento cacheado de una cuenta. HAY QUE LLAMARLO al crear o editar un
     * cliente: el documento SÍ se puede cambiar desde el modal, y una caché vieja diría que
     * un cliente que acaba de recibir un RUC sigue sin tenerlo — dejando pasar la boleta que
     * esta regla existe para impedir.
     */
    public static forget(accountNumber: string): void {
        if (accountNumber && DocumentTypeRule._documentCache.hasOwnProperty(accountNumber)) {
            delete DocumentTypeRule._documentCache[accountNumber];
        }
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
