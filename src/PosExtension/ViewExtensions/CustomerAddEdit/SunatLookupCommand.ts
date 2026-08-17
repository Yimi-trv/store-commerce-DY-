import {
    CustomerAddEditExtensionCommandBase,
    CustomerAddEditCustomerUpdatedData,
    ICustomerAddEditExtensionCommandContext
} from "PosApi/Extend/Views/CustomerAddEditView";
import {
    IMessageDialogOptions,
    ShowMessageDialogClientRequest,
    IAlphanumericInputDialogOptions,
    ShowAlphanumericInputDialogClientRequest
} from "PosApi/Consume/Dialogs";
import { ProxyEntities } from "PosApi/Entities";
import { TRU_GeographicData } from "../../DataService/DataServiceRequests.g";
import { Entities } from "../../DataService/DataServiceEntities.g";

export default class SunatLookupCommand extends CustomerAddEditExtensionCommandBase {

    constructor(context: ICustomerAddEditExtensionCommandContext) {
        super(context);
        this.id = "sunatLookupCommand";
        this.label = "Consultar SUNAT";
        this.extraClass = "iconLightningBolt";

        this.customerUpdatedHandler = (data: CustomerAddEditCustomerUpdatedData): void => {
            this.canExecute = true;
        };
    }

    protected init(state: Commerce.Extensibility.ICustomerAddEditExtensionCommandState): void {
        this.canExecute = true;
        this.isVisible = true;
    }

    protected execute(): void {
        let inputOptions: IAlphanumericInputDialogOptions = {
            title: "CONSULTAR SUNAT",
            numPadLabel: "Ingrese RUC (11 dígitos) o DNI (8 dígitos):",
        };

        this.context.runtime.executeAsync(new ShowAlphanumericInputDialogClientRequest(inputOptions))
            .then((inputResult) => {
                if (inputResult.canceled || !inputResult.data || !inputResult.data.result || !inputResult.data.result.value) {
                    return;
                }

                let documentNumber: string = inputResult.data.result.value.trim();

                if (documentNumber.length !== 8 && documentNumber.length !== 11) {
                    this._showMessage("CONSULTA SUNAT", "El número debe ser de 8 dígitos (DNI) o 11 dígitos (RUC).");
                    return;
                }

                let apiDocType: string = documentNumber.length === 11 ? "RUC" : "DNI";
                this.isProcessing = true;

                let apiKey: string = "cGVydWRldnMucHJvZHVjdGlvbi5maXRjb2RlcnMuNjgxY2IzYzE5ZmE0MTczZjYxMzIwYWVh";
                let apiUrl: string;

                if (apiDocType === "RUC") {
                    apiUrl = "https://api.perudevs.com/api/v1/ruc?document=" + documentNumber + "&key=" + apiKey;
                } else {
                    apiUrl = "https://api.perudevs.com/api/v1/dni/complete?document=" + documentNumber + "&key=" + apiKey;
                }

                fetch(apiUrl, { method: "GET" })
                    .then((response: Response) => response.json())
                    .then((apiData: any) => {
                        this.isProcessing = false;

                        if (apiData && apiData.estado === true && apiData.resultado) {
                            let r: any = apiData.resultado;

                            this._applyToCustomer(r, apiDocType, documentNumber);

                            let info: string = apiDocType === "RUC"
                                ? this._formatRucResult(r, documentNumber)
                                : "Documento: " + documentNumber + "\n" + this._formatApiResult(r);
                            info += "\n\n✓ Datos aplicados al cliente";

                            if (apiDocType === "RUC" && (r.departamento || r.provincia)) {
                                // Dirección automática: solo si el ubigeo resuelve contra los
                                // maestros del channel DB (una dirección inválida bloquea el alta).
                                this._resolveAndAttachAddress(r).then((outcome: string): void => {
                                    this._showMessage("SUNAT - RUC ENCONTRADO", info + "\n" + outcome);
                                });
                            } else {
                                this._showMessage("SUNAT - " + apiDocType + " ENCONTRADO", info);
                            }
                        } else {
                            let msg: string = apiData && apiData.mensaje ? apiData.mensaje : "No se encontró el documento.";
                            this._showMessage("SUNAT - NO ENCONTRADO", msg);
                        }
                    })
                    .catch((error: any) => {
                        this.isProcessing = false;
                        this.context.logger.logError("SunatLookup error: " + JSON.stringify(error));
                        this._showMessage("SUNAT - ERROR", "Error al consultar la API.");
                    });
            })
            .catch((reason: any) => {
                this.context.logger.logError("SunatLookup dialog error: " + JSON.stringify(reason));
            });
    }

    private _applyToCustomer(resultado: any, docType: string, docNumber: string): void {
        let updatedCustomer: ProxyEntities.Customer = this.customer;
        if (!updatedCustomer) return;

        if (docType === "RUC") {
            updatedCustomer.Name = resultado.razon_social || "";
            updatedCustomer.CustomerTypeValue = 2; // Organization

            // Extension Properties DP
            this._setExtProp(updatedCustomer, "DPTYPEDOCID_PE", "6");
            this._setExtProp(updatedCustomer, "DPNUMBERDOCUMID_PE", docNumber);

            // Agente retención
            let padrones: string = "";
            if (resultado.padrones) {
                if (Array.isArray(resultado.padrones)) {
                    padrones = resultado.padrones.join(" ");
                } else {
                    padrones = resultado.padrones.toString();
                }
            }
            let isAgentRetention: boolean = padrones.toLowerCase().indexOf("retencion") >= 0 ||
                                             padrones.toLowerCase().indexOf("retención") >= 0;
            let isAgentPerception: boolean = padrones.toLowerCase().indexOf("percepcion") >= 0 ||
                                              padrones.toLowerCase().indexOf("percepción") >= 0;

            this._setExtPropInt(updatedCustomer, "DPAGENTRETENTION_PE", isAgentRetention ? 1 : 0);
            this._setExtPropInt(updatedCustomer, "DPAGENTPERCEPTION_PE", isAgentPerception ? 1 : 0);

            // Sector público
            let tipo: string = (resultado.tipo || "").toLowerCase();
            let isPublicSector: boolean = tipo.indexOf("publica") >= 0 || tipo.indexOf("pública") >= 0;
            this._setExtPropInt(updatedCustomer, "DPPUBLICSECTOR_PE", isPublicSector ? 1 : 0);

            // NOTA (v2.8.2): la dirección SUNAT ya NO se agrega automáticamente.
            // City=distrito / County=provincia como texto libre NO validan contra los maestros
            // LogisticsAddress* de D365 y bloquean el guardado del cliente (y el POS no permite
            // quitar la dirección una vez agregada). La dirección válida contra maestros es la
            // Fase F1 (ver diagnóstico GeoMasters). El cajero la ingresa manualmente.

        } else {
            // DNI
            updatedCustomer.FirstName = resultado.nombres || "";
            // Los DOS apellidos van en LastName. El materno estaba en MiddleName, que es un
            // segundo NOMBRE: D365 compone la persona como FirstName + MiddleName + LastName y
            // el comprobante salía con los apellidos invertidos. Mismo criterio que el modal
            // (SunatCustomerService), para que un cliente no quede distinto según por dónde se
            // haya creado.
            updatedCustomer.LastName = [resultado.apellido_paterno || "", resultado.apellido_materno || ""]
                .join(" ").replace(/\s+/g, " ").trim();
            updatedCustomer.MiddleName = "";
            updatedCustomer.Name = resultado.nombre_completo || "";
            updatedCustomer.CustomerTypeValue = 1; // Person

            // Extension Properties DP
            this._setExtProp(updatedCustomer, "DPTYPEDOCID_PE", "1");
            this._setExtProp(updatedCustomer, "DPNUMBERDOCUMID_PE", docNumber);
        }

        // Notificar al POS que el customer cambió
        this.customer = updatedCustomer;
    }

    private _setExtProp(customer: ProxyEntities.Customer, key: string, value: string): void {
        if (!customer.ExtensionProperties) {
            customer.ExtensionProperties = [];
        }

        let found: boolean = false;
        for (let i: number = 0; i < customer.ExtensionProperties.length; i++) {
            if (customer.ExtensionProperties[i].Key === key) {
                customer.ExtensionProperties[i].Value = { StringValue: value };
                found = true;
                break;
            }
        }

        if (!found) {
            let prop: ProxyEntities.CommerceProperty = new ProxyEntities.CommercePropertyClass();
            prop.Key = key;
            prop.Value = { StringValue: value };
            customer.ExtensionProperties.push(prop);
        }
    }

    private _setExtPropInt(customer: ProxyEntities.Customer, key: string, value: number): void {
        if (!customer.ExtensionProperties) {
            customer.ExtensionProperties = [];
        }

        let found: boolean = false;
        for (let i: number = 0; i < customer.ExtensionProperties.length; i++) {
            if (customer.ExtensionProperties[i].Key === key) {
                customer.ExtensionProperties[i].Value = { IntegerValue: value };
                found = true;
                break;
            }
        }

        if (!found) {
            let prop: ProxyEntities.CommerceProperty = new ProxyEntities.CommercePropertyClass();
            prop.Key = key;
            prop.Value = { IntegerValue: value };
            customer.ExtensionProperties.push(prop);
        }
    }

    /**
     * Resuelve el ubigeo SUNAT (nombres) contra los maestros del channel DB vía
     * TRU_GeographicData/ResolveUbigeo y, si TODO resuelve, agrega la dirección con los
     * valores que D365 valida (State/County por código; City según convención del entorno:
     * código ubigeo del distrito). Si algo no resuelve, NO agrega nada (dirección manual) —
     * regla aprendida: una dirección inválida bloquea el alta sin salida.
     * Nunca rechaza: siempre resuelve a un string de resultado para el diálogo.
     */
    private _resolveAndAttachAddress(r: any): Promise<string> {
        let departamento: string = r.departamento || "";
        let provincia: string = r.provincia || "";
        let distrito: string = r.distrito || "";
        let request: TRU_GeographicData.ResolveUbigeoRequest<TRU_GeographicData.ResolveUbigeoResponse> =
            new TRU_GeographicData.ResolveUbigeoRequest(departamento, provincia, distrito);

        return this.context.runtime.executeAsync(request)
            .then((response: any): string => {
                let u: Entities.UbigeoResolutionResult =
                    (response && response.data && response.data.result && response.data.result.length > 0)
                        ? response.data.result[0]
                        : null;
                if (u && u.IsValid) {
                    this._attachAddress(r, u);
                    return "✓ Dirección agregada automáticamente (ubigeo " + u.StateId + "-" + u.CountyId + "-" + u.CityName + ")";
                }
                let motivo: string = u && u.Notes ? u.Notes : "sin respuesta del resolver";
                this.context.logger.logInformational("SunatLookup ubigeo no resuelto: " + motivo);
                return "⚠ Dirección NO agregada: no se pudo validar el ubigeo contra los maestros.\nIngrésela manualmente en Direcciones.";
            })
            .catch((error: any): string => {
                this.context.logger.logError("SunatLookup ResolveUbigeo error: " + JSON.stringify(error));
                return "⚠ Dirección NO agregada (error consultando maestros).\nIngrésela manualmente en Direcciones.";
            });
    }

    /** Agrega la dirección con los valores RESUELTOS (códigos) — el formato que D365 acepta. */
    private _attachAddress(r: any, u: Entities.UbigeoResolutionResult): void {
        let customer: ProxyEntities.Customer = this.customer;
        if (!customer) {
            return;
        }
        let address: ProxyEntities.Address = new ProxyEntities.AddressClass();
        address.AddressTypeValue = 2; // Negocio
        address.ThreeLetterISORegionName = "PER";
        address.Name = "DOMICILIO FISCAL";
        address.Street = (r.direccion || "").trim();
        address.State = u.StateId;    // ej. "02" (Ancash)
        address.County = u.CountyId;  // ej. "01" (Huaraz) — CÓDIGO, no nombre (causa del bug original)
        address.City = u.CityName;    // valor exacto del maestro CITY (convención: código ubigeo)

        let hasAddresses: boolean = customer.Addresses && customer.Addresses.length > 0 ? true : false;
        address.IsPrimary = !hasAddresses; // no pisar una dirección que el cajero ya cargó
        if (!customer.Addresses) {
            customer.Addresses = [];
        }
        customer.Addresses.push(address);

        // Notificar al POS (refresca la tarjeta de Direcciones y nuestro control de padrones).
        this.customer = customer;
    }

    /**
     * Diálogo RUC: SOLO los campos definidos por el negocio, en este orden fijo
     * (pedido 2026-07-10). Los padrones se listan en viñetas, uno por línea, para
     * que el texto respire (el ancho del diálogo lo fija el POS y no es configurable).
     */
    private _formatRucResult(r: any, documentNumber: string): string {
        let lines: string[] = [];
        lines.push("Documento: " + documentNumber);
        if (r.razon_social) { lines.push("Razón Social: " + r.razon_social); }
        if (r.condicion) { lines.push("Condición: " + r.condicion); }
        if (r.estado) { lines.push("Estado: " + r.estado); }
        if (r.direccion) { lines.push("Dirección: " + r.direccion); }

        if (r.padrones) {
            let items: string[] = Array.isArray(r.padrones) ? r.padrones : [r.padrones.toString()];
            if (items.length > 0) {
                lines.push("");
                lines.push("Padrones:");
                for (let i: number = 0; i < items.length; i++) {
                    lines.push("• " + String(items[i]));
                }
                lines.push("");
            }
        }

        if (r.departamento) { lines.push("Departamento: " + r.departamento); }
        if (r.provincia) { lines.push("Provincia: " + r.provincia); }
        if (r.distrito) { lines.push("Distrito: " + r.distrito); }
        return lines.join("\n");
    }

    /**
     * Renderiza TODOS los campos de la respuesta de la API (clave: valor por línea).
     * Usado para DNI (pocos campos). Omite vacíos; arrays separados por coma.
     */
    private _formatApiResult(r: any): string {
        let lines: string[] = [];
        let keys: string[] = Object.keys(r);
        for (let i: number = 0; i < keys.length; i++) {
            let key: string = keys[i];
            let value: any = r[key];
            if (value === null || value === undefined || value === "") {
                continue;
            }
            let text: string;
            if (Array.isArray(value)) {
                if (value.length === 0) {
                    continue;
                }
                let parts: string[] = [];
                for (let j: number = 0; j < value.length; j++) {
                    let item: any = value[j];
                    parts.push(item !== null && typeof item === "object" ? JSON.stringify(item) : String(item));
                }
                text = parts.join(", ");
            } else if (typeof value === "object") {
                text = JSON.stringify(value);
            } else {
                text = String(value);
            }
            lines.push(this._prettyLabel(key) + ": " + text);
        }
        return lines.join("\n");
    }

    /** "nombre_comercial" -> "Nombre Comercial" */
    private _prettyLabel(key: string): string {
        let words: string[] = key.split("_");
        let out: string[] = [];
        for (let i: number = 0; i < words.length; i++) {
            let w: string = words[i];
            if (w.length > 0) {
                out.push(w.charAt(0).toUpperCase() + w.substring(1));
            }
        }
        return out.join(" ");
    }

    private _showMessage(title: string, message: string): void {
        let dialogOptions: IMessageDialogOptions = {
            title: title,
            message: message,
            showCloseX: true,
            button1: { id: "btnOk", label: "OK", result: "OK" }
        };
        this.context.runtime.executeAsync(new ShowMessageDialogClientRequest(dialogOptions));
    }
}
