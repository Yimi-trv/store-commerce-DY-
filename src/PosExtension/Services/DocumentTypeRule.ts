import { ProxyEntities } from "PosApi/Entities";
import { GetCurrentCartClientRequest, GetCurrentCartClientResponse } from "PosApi/Consume/Cart";
import { GetCustomerClientRequest, GetCustomerClientResponse } from "PosApi/Consume/Customer";
import { ShowMessageDialogClientRequest, ShowMessageDialogClientResponse } from "PosApi/Consume/Dialogs";
import SunatCustomerService from "./SunatCustomerService";
import { GetCustomerGroupsRequest, GetCustomerGroupsResponse } from "../DataService/CustomerGroupsRequest";

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
/** Lo que hace falta saber del cliente para decidir el comprobante. */
interface IDatosFiscales {
    documento: string;
    grupo: string;
}

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
    private static _documentCache: { [accountNumber: string]: IDatosFiscales } = {};

    /**
     * Numeros de los grupos de cliente que son "Recibo por Honorarios", resueltos del canal.
     *
     * No se escribe el numero a mano (hoy es el 70) porque es configuracion del canal y puede
     * cambiar en HQ sin avisar. Se busca por NOMBRE, que es como lo nombra el negocio en la
     * instruccion que dio origen a esta excepcion. null = todavia no se consulto.
     */
    private static _gruposDeHonorarios: string[] | null = null;

    /**
     * Medio de pago "cuenta de cliente", aprendido en el primer cobro a cuenta de la sesion.
     *
     * Al cerrar la transaccion ya no hay `tenderType` que mirar, solo las lineas de pago del
     * carrito, y estas identifican el medio por su id de canal. Se aprende en vez de escribirse
     * a mano por lo mismo que los grupos: la numeracion es configuracion, no una constante.
     */
    private static _medioDeCuentaDeCliente: string = "";

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
    public static evaluateCart(context: any, cartFromTrigger: any, esPagoACuentaDeCliente: boolean): Promise<string> {
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

                const cached: IDatosFiscales = DocumentTypeRule._documentCache[accountNumber];

                // Lo ya conocido evita releer el cliente en el segundo punto de control: al
                // cobrar y al cerrar se preguntaba lo mismo dos veces.
                if (cached) {
                    return DocumentTypeRule._evaluateDocument(
                        document, cached, accountNumber, context, esPagoACuentaDeCliente);
                }

                return context.runtime
                    .executeAsync(new GetCustomerClientRequest<GetCustomerClientResponse>(accountNumber, correlationId))
                    .then((customerResponse: any): Promise<string> => {
                        const customer: ProxyEntities.Customer =
                            customerResponse && customerResponse.data && customerResponse.data.result;
                        const service: SunatCustomerService = new SunatCustomerService();
                        const datos: IDatosFiscales = {
                            documento: customer ? service.getDocumentNumber(customer) : "",
                            grupo: (customer && (customer as any).CustomerGroup) || ""
                        };

                        DocumentTypeRule._documentCache[accountNumber] = datos;

                        return DocumentTypeRule._evaluateDocument(
                            document, datos, accountNumber, context, esPagoACuentaDeCliente);
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
    private static _evaluateDocument(
        document: string,
        datos: IDatosFiscales,
        accountNumber: string,
        context: any,
        esPagoACuentaDeCliente: boolean): Promise<string> {

        const service: SunatCustomerService = new SunatCustomerService();
        const documentNumber: string = datos.documento;
        const documentType: string | null = service.getDocumentType(documentNumber);
        const hasRuc: boolean = documentType === "RUC";

        context.logger.logInformational(
            "DocumentTypeRule: comprobante=" + document
            + " | cuenta=" + accountNumber
            + " | documento=" + (documentNumber || "(sin documento)")
            + " | tipo=" + (documentType || "(ninguno)")
            + " | grupo=" + (datos.grupo || "(sin grupo)")
            + " | a cuenta de cliente=" + esPagoACuentaDeCliente);

        if (document === DocumentTypeRule.BOLETA && hasRuc) {
            const bloqueo: string = "El cliente " + accountNumber + " tiene RUC " + documentNumber + "."
                + "\n\nA un cliente con RUC se le emite FACTURA, no boleta."
                + "\n\nCambie el comprobante a Factura, o asigne a la venta un cliente sin RUC.";

            // EXCEPCION DEL NEGOCIO, SOLO EN EL COBRO A CUENTA DE CLIENTE:
            // "Empleado con RUC puede hacer boleta o factura. Verificar que el grupo de cliente
            // sea EMPLEADOS/Recibo por Honorarios."
            //
            // Es un trabajador que factura por recibo por honorarios: tiene RUC porque emite
            // recibos, no porque sea una empresa. Cobrarle a su cuenta con boleta es correcto.
            // La excepcion NO se extiende a la venta normal: alli la regla sigue estricta.
            if (!esPagoACuentaDeCliente) {
                return Promise.resolve(bloqueo);
            }

            return DocumentTypeRule._esEmpleadoPorHonorarios(context, datos.grupo)
                .then((esEmpleado: boolean): string => {
                    if (!esEmpleado) {
                        return bloqueo;
                    }

                    context.logger.logInformational(
                        "DocumentTypeRule: " + accountNumber + " es empleado por Recibo por Honorarios"
                        + " (grupo " + datos.grupo + ") y se cobra a su cuenta: la boleta con RUC se admite.");
                    return "";
                });
        }

        if (document === DocumentTypeRule.FACTURA && !hasRuc) {
            return Promise.resolve("El cliente " + accountNumber
                + (documentNumber ? " tiene el documento " + documentNumber + ", que no es un RUC." : " no tiene RUC registrado.")
                + "\n\nLa FACTURA exige un cliente con RUC."
                + "\n\nCambie el comprobante a Boleta, o asigne a la venta un cliente con RUC.");
        }

        return Promise.resolve("");
    }

    /** ¿El grupo del cliente es uno de los de "Recibo por Honorarios" del canal? */
    private static _esEmpleadoPorHonorarios(context: any, grupo: string): Promise<boolean> {
        if (!grupo) {
            return Promise.resolve(false);
        }

        return DocumentTypeRule._cargarGruposDeHonorarios(context)
            .then((grupos: string[]): boolean => grupos.indexOf(grupo.toString()) >= 0);
    }

    /**
     * Resuelve del canal que grupos son "Recibo por Honorarios", una vez por sesion.
     *
     * Ante un fallo NO se cachea la respuesta vacia: un error de red pasajero dejaria la
     * excepcion apagada el resto del turno, y el cajero no tendria forma de saber por que.
     */
    private static _cargarGruposDeHonorarios(context: any): Promise<string[]> {
        if (DocumentTypeRule._gruposDeHonorarios) {
            return Promise.resolve(DocumentTypeRule._gruposDeHonorarios);
        }

        return context.runtime
            .executeAsync(new GetCustomerGroupsRequest<GetCustomerGroupsResponse>())
            .then((response: any): string[] => {
                const grupos: any[] = (response && response.data && response.data.result) || [];
                const encontrados: string[] = [];

                for (let i: number = 0; i < grupos.length; i++) {
                    const nombre: string = DocumentTypeRule._sinAcentos(grupos[i].CustomerGroupName || "");

                    if (nombre.indexOf("HONORARIO") >= 0) {
                        encontrados.push((grupos[i].CustomerGroupNumber || "").toString());
                    }
                }

                DocumentTypeRule._gruposDeHonorarios = encontrados;
                context.logger.logInformational(
                    "DocumentTypeRule: grupos de Recibo por Honorarios del canal: "
                    + (encontrados.join(", ") || "(ninguno)"));
                return encontrados;
            })
            .catch((reason: any): string[] => {
                context.logger.logError(
                    "DocumentTypeRule: no se pudieron leer los grupos de cliente; la excepcion de"
                    + " empleados no se aplica esta vez: " + String(reason));
                return [];
            });
    }

    /** Mayusculas sin acentos, para comparar nombres escritos de cualquier forma. */
    private static _sinAcentos(texto: string): string {
        const con: string = "ÁÀÄÂÉÈËÊÍÌÏÎÓÒÖÔÚÙÜÛÑáàäâéèëêíìïîóòöôúùüûñ";
        const sin: string = "AAAAEEEEIIIIOOOOUUUUNAAAAEEEEIIIIOOOOUUUUN";
        let salida: string = "";

        for (let i: number = 0; i < texto.length; i++) {
            const pos: number = con.indexOf(texto.charAt(i));
            salida += pos >= 0 ? sin.charAt(pos) : texto.charAt(i);
        }

        return salida.toUpperCase();
    }

    /** Se aprende del primer cobro a cuenta; ver _medioDeCuentaDeCliente. */
    public static recordarMedioDeCuentaDeCliente(tenderTypeId: string): void {
        if (tenderTypeId) {
            DocumentTypeRule._medioDeCuentaDeCliente = tenderTypeId.toString();
        }
    }

    /**
     * ¿Esta venta se cobro ENTERA a cuenta de cliente?
     *
     * Se pregunta al cerrar la transaccion, cuando ya no hay `tenderType` que mirar y solo
     * quedan las lineas de pago del carrito.
     *
     * TIENEN QUE SERLO TODAS, NO BASTA UNA. La excepcion que permite boleta con RUC vale solo
     * en el cobro a cuenta de terceros, y antes bastaba con que UNA linea lo fuera: una venta
     * cobrada mitad en efectivo y mitad a cuenta se llevaba la excepcion entera, cuando el
     * efectivo no la tiene. Al pagar, el cobro en efectivo ya se bloquea; esto cierra el mismo
     * hueco en el cierre, que es la red de seguridad por si algun camino no pasa por alli.
     *
     * Cada linea se reconoce por dos señales, y basta una: el medio aprendido en el cobro, o
     * que la linea lleve cuenta de cliente —solo el pago a cuenta la lleva—. La segunda
     * sobrevive a un recargo del POS a mitad de venta, que dejaria la primera en blanco y
     * bloquearia el cierre de una venta ya cobrada.
     *
     * No cuentan ni las lineas anuladas ni la del vuelto: el vuelto no es una forma de pago
     * elegida por el cajero, es dinero que se devuelve.
     */
    public static carritoPagaACuentaDeCliente(cart: any): boolean {
        const lineas: any[] = (cart && cart.TenderLines) || [];
        let cobros: number = 0;

        for (let i: number = 0; i < lineas.length; i++) {
            const linea: any = lineas[i];

            if (!linea || linea.IsVoided || linea.IsChangeLine) {
                continue;
            }

            cobros++;

            if (!DocumentTypeRule._esLineaACuentaDeCliente(linea)) {
                return false;
            }
        }

        // Sin ningun cobro todavia no hay nada que afirmar.
        return cobros > 0;
    }

    /** Una linea de pago cobrada a la cuenta del cliente. */
    private static _esLineaACuentaDeCliente(linea: any): boolean {
        if (DocumentTypeRule._medioDeCuentaDeCliente
            && (linea.TenderTypeId || "").toString() === DocumentTypeRule._medioDeCuentaDeCliente) {
            return true;
        }

        return !!linea.CustomerId;
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
