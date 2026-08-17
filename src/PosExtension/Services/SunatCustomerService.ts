/**
 * CONSULTA SUNAT (proveedor PeruDevs)
 * ===================================
 *
 * Normaliza el documento, consulta el padrón y mapea el resultado a las propiedades fiscales
 * que espera la localización Perú DP.
 *
 * ---------------------------------------------------------------------------------------
 * RESISTENCIA A CAÍDAS DEL PROVEEDOR — agregado tras un HTTP 502 real en UAT
 * ---------------------------------------------------------------------------------------
 *
 * - CACHÉ estática de 30 minutos por número de documento. Es estática y no de instancia
 *   porque el modal crea un servicio nuevo en cada apertura. Vive en memoria y se pierde al
 *   recargar el POS: no se persisten datos de clientes en el navegador.
 *
 * - Se revisa `response.ok` ANTES de parsear. Llamar a `response.json()` sobre un 502 intenta
 *   parsear la página de error del gateway y lanza un SyntaxError que no dice nada.
 *
 * - TIMEOUT por carrera contra temporizador: `fetch` no tiene timeout propio y el cajero se
 *   quedaba esperando sin saber por qué.
 *
 * - Los mensajes distinguen si el problema es del proveedor o de la caja, y en todos los casos
 *   indican que se puede continuar la venta ingresando los datos a mano. Un cajero no debería
 *   detener una venta por una caída de un tercero.
 *
 * PENDIENTE EVALUADO Y NO IMPLEMENTADO: un segundo proveedor como respaldo, y el padrón
 * reducido de SUNAT cargado localmente. Ver la nota de Obsidian sobre el dimensionamiento —
 * el padrón resultó ser una decisión de infraestructura, no una tarea de esta extensión.
 */

import { ProxyEntities } from "PosApi/Entities";

export type SunatDocumentType = "DNI" | "RUC";

export interface ISunatCustomerData {
    documentNumber: string;
    documentType: SunatDocumentType;
    documentTypeCode: string;
    customerTypeValue: number;
    name: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    padronesText?: string;
    isRetentionAgent?: boolean;
    isPerceptionAgent?: boolean;
    isPublicSector?: boolean;
    isEmergencyZone?: boolean;
    isExoneratedPerception?: boolean;
    isFinalConsumer?: boolean;
    isOthers?: boolean;
    isNotDomiciled?: boolean;
    department?: string;
    province?: string;
    district?: string;
    address?: string;
    raw: any;
}

export default class SunatCustomerService {
    private static readonly _apiKey: string = "cGVydWRldnMucHJvZHVjdGlvbi5maXRjb2RlcnMuNjgxY2IzYzE5ZmE0MTczZjYxMzIwYWVh";

    /** Corte de espera antes de dar por caido al proveedor. */
    private static readonly _timeoutMs: number = 8000;

    /**
     * Vigencia de una consulta en cache. Media hora es suficiente para cubrir un pico de caja
     * y lo bastante corto para que un cambio de padron se refleje el mismo dia.
     */
    private static readonly _cacheTtlMs: number = 30 * 60 * 1000;

    /**
     * Cache por numero de documento, compartida por todas las instancias del servicio: el modal
     * crea una instancia nueva en cada apertura, asi que guardarla en la instancia no serviria
     * de nada. Vive en memoria y se pierde al recargar el POS, que es el comportamiento
     * deseado — no se persisten datos de clientes en el navegador.
     */
    private static _cache: { [documentNumber: string]: { data: ISunatCustomerData; expiresAt: number } } = {};

    public normalizeDocument(documentNumber: string): string {
        return (documentNumber || "").replace(/\D/g, "");
    }

    public getDocumentType(documentNumber: string): SunatDocumentType | null {
        const normalizedDocument: string = this.normalizeDocument(documentNumber);

        if (normalizedDocument.length === 11) {
            return "RUC";
        }

        if (normalizedDocument.length === 8) {
            return "DNI";
        }

        return null;
    }

    public lookup(documentNumber: string): Promise<ISunatCustomerData> {
        const normalizedDocument: string = this.normalizeDocument(documentNumber);
        const documentType: SunatDocumentType | null = this.getDocumentType(normalizedDocument);

        if (!documentType) {
            return Promise.reject(new Error("Ingrese un DNI de 8 digitos o RUC de 11 digitos."));
        }

        // Un documento ya consultado no vuelve a salir a la red. Además de ahorrar llamadas,
        // esto mantiene el flujo vivo durante una caída del proveedor para los documentos que
        // ya pasaron por caja en el turno.
        const cached: ISunatCustomerData | null = SunatCustomerService._readCache(normalizedDocument);
        if (cached) {
            return Promise.resolve(cached);
        }

        const url: string = documentType === "RUC"
            ? "https://api.perudevs.com/api/v1/ruc?document=" + normalizedDocument + "&key=" + SunatCustomerService._apiKey
            : "https://api.perudevs.com/api/v1/dni/complete?document=" + normalizedDocument + "&key=" + SunatCustomerService._apiKey;

        return this._fetchWithTimeout(url)
            .then((response: Response): Promise<any> => {
                // `response.json()` sobre un 502 intenta parsear la página de error del gateway
                // y lanza un SyntaxError que no dice nada útil. El estado HTTP se revisa antes.
                if (!response.ok) {
                    throw new Error(SunatCustomerService._describeHttpFailure(response.status));
                }

                return response.json().then(
                    (parsed: any): any => parsed,
                    (): any => {
                        throw new Error(
                            "El servicio de consulta SUNAT respondio algo que no se pudo interpretar. "
                            + "Ingrese los datos manualmente.");
                    });
            })
            .then((apiData: any): ISunatCustomerData => {
                if (apiData && apiData.estado === true && apiData.resultado) {
                    const mapped: ISunatCustomerData =
                        this._mapResult(apiData.resultado, documentType, normalizedDocument);
                    SunatCustomerService._writeCache(normalizedDocument, mapped);
                    return mapped;
                }

                throw new Error(apiData && apiData.mensaje ? apiData.mensaje : "No se encontro el documento en SUNAT.");
            });
    }

    /**
     * `fetch` no tiene timeout propio: si el proveedor deja la conexion abierta, el cajero se
     * queda esperando sin saber por que. La carrera contra un temporizador acota esa espera.
     */
    private _fetchWithTimeout(url: string): Promise<Response> {
        const timeoutPromise: Promise<Response> = new Promise((_resolve: any, reject: (reason: any) => void): void => {
            setTimeout((): void => {
                reject(new Error(
                    "El servicio de consulta SUNAT no respondio en "
                    + (SunatCustomerService._timeoutMs / 1000) + " segundos. "
                    + "Reintente o ingrese los datos manualmente."));
            }, SunatCustomerService._timeoutMs);
        });

        const networkPromise: Promise<Response> = fetch(url, { method: "GET" })
            .then(
                (response: Response): Response => response,
                (): Response => {
                    // Un fallo de fetch no trae detalle util: puede ser DNS, CORS o falta de red.
                    throw new Error(
                        "No se pudo contactar el servicio de consulta SUNAT. "
                        + "Verifique la conexion o ingrese los datos manualmente.");
                });

        return Promise.race([networkPromise, timeoutPromise]);
    }

    /** Traduce el estado HTTP a algo que un cajero pueda entender y accionar. */
    private static _describeHttpFailure(status: number): string {
        if (status === 401 || status === 403) {
            return "La clave del servicio de consulta SUNAT fue rechazada (HTTP " + status
                + "). Avise a sistemas; ingrese los datos manualmente.";
        }
        if (status === 429) {
            return "Se alcanzo el limite de consultas del servicio SUNAT. "
                + "Espere unos minutos o ingrese los datos manualmente.";
        }
        if (status >= 500) {
            return "El servicio de consulta SUNAT no esta disponible en este momento (HTTP " + status
                + "). No es un problema de la caja: ingrese los datos manualmente y continue la venta.";
        }
        return "El servicio de consulta SUNAT rechazo la consulta (HTTP " + status
            + "). Verifique el documento o ingrese los datos manualmente.";
    }

    private static _readCache(documentNumber: string): ISunatCustomerData | null {
        const entry: { data: ISunatCustomerData; expiresAt: number } = SunatCustomerService._cache[documentNumber];
        if (!entry) {
            return null;
        }

        if (new Date().getTime() > entry.expiresAt) {
            delete SunatCustomerService._cache[documentNumber];
            return null;
        }

        return entry.data;
    }

    private static _writeCache(documentNumber: string, data: ISunatCustomerData): void {
        SunatCustomerService._cache[documentNumber] = {
            data: data,
            expiresAt: new Date().getTime() + SunatCustomerService._cacheTtlMs
        };
    }

    public getDocumentNumber(customer: ProxyEntities.Customer): string {
        const valueFromProperty: string = this._getStringProperty(customer, "DPNUMBERDOCUMID_PE");

        if (valueFromProperty) {
            return valueFromProperty;
        }

        return this.normalizeDocument((customer && (customer.IdentificationNumber || customer.PartyNumber)) || "");
    }

    public applyDocumentProperties(customer: ProxyEntities.Customer, documentNumber: string): ProxyEntities.Customer {
        const normalizedDocument: string = this.normalizeDocument(documentNumber);
        const documentType: SunatDocumentType | null = this.getDocumentType(normalizedDocument);

        if (!customer || !documentType) {
            return customer;
        }

        this._setStringProperty(customer, "DPTYPEDOCID_PE", documentType === "RUC" ? "6" : "1");
        this._setStringProperty(customer, "DPNUMBERDOCUMID_PE", normalizedDocument);
        customer.IdentificationNumber = normalizedDocument;

        if (documentType === "RUC") {
            customer.CustomerTypeValue = 2;
        } else if (!customer.CustomerTypeValue) {
            customer.CustomerTypeValue = 1;
        }

        return customer;
    }

    public applySunatMetadata(customer: ProxyEntities.Customer, sunatData: ISunatCustomerData): ProxyEntities.Customer {
        if (!customer || !sunatData) {
            return customer;
        }

        this.applyDocumentProperties(customer, sunatData.documentNumber);

        this._setIntegerProperty(customer, "DPAGENTRETENTION_PE", sunatData.isRetentionAgent ? 1 : 0);
        this._setIntegerProperty(customer, "DPAGENTPERCEPTION_PE", sunatData.isPerceptionAgent ? 1 : 0);
        this._setIntegerProperty(customer, "DPPUBLICSECTOR_PE", sunatData.isPublicSector ? 1 : 0);
        this._setIntegerProperty(customer, "DPEMERGENCYZONE_PE", sunatData.isEmergencyZone ? 1 : 0);
        this._setIntegerProperty(customer, "DPEXONERATEDPERCEPTION_PE", sunatData.isExoneratedPerception ? 1 : 0);
        this._setIntegerProperty(customer, "DPFINALCONSUMER_PE", sunatData.isFinalConsumer ? 1 : 0);
        this._setIntegerProperty(customer, "DPOTHERS_PE", sunatData.isOthers ? 1 : 0);
        this._setIntegerProperty(customer, "DPNOTDOMICILED_PE", sunatData.isNotDomiciled ? 1 : 0);

        return customer;
    }

    public applySunatIdentity(customer: ProxyEntities.Customer, sunatData: ISunatCustomerData): ProxyEntities.Customer {
        if (!customer || !sunatData) {
            return customer;
        }

        if (sunatData.documentType === "RUC") {
            customer.Name = sunatData.name || customer.Name || "";
            customer.CustomerTypeValue = 2;
        } else {
            customer.FirstName = sunatData.firstName || customer.FirstName || "";
            customer.LastName = sunatData.lastName || customer.LastName || "";
            customer.MiddleName = sunatData.middleName || customer.MiddleName || "";
            customer.Name = sunatData.name || customer.Name || "";
            customer.CustomerTypeValue = 1;
        }

        return this.applySunatMetadata(customer, sunatData);
    }

    public compareWithCustomer(customer: ProxyEntities.Customer, sunatData: ISunatCustomerData): string[] {
        const differences: string[] = [];

        if (!customer || !sunatData) {
            differences.push("No hay cliente del sistema para comparar.");
            return differences;
        }

        const customerDocument: string = this.getDocumentNumber(customer);

        if (!customerDocument) {
            differences.push("El cliente del sistema no tiene documento fiscal registrado.");
        } else if (customerDocument !== sunatData.documentNumber) {
            differences.push("Documento distinto. Sistema: " + customerDocument + " / SUNAT: " + sunatData.documentNumber + ".");
        }

        const customerName: string = customer.Name || this._joinName(customer.FirstName, customer.MiddleName, customer.LastName);

        if (customerName && sunatData.name && this._normalizeForCompare(customerName) !== this._normalizeForCompare(sunatData.name)) {
            differences.push("Nombre distinto. Sistema: " + customerName + " / SUNAT: " + sunatData.name + ".");
        }

        if (differences.length === 0) {
            differences.push("Sin diferencias principales entre el cliente del sistema y SUNAT.");
        }

        return differences;
    }

    private _mapResult(result: any, documentType: SunatDocumentType, documentNumber: string): ISunatCustomerData {
        const padronesText: string = this._padronesToText(result && result.padrones);
        const lowerPadrones: string = padronesText.toLowerCase();
        const lowerTipo: string = ((result && result.tipo) || "").toString().toLowerCase();

        if (documentType === "RUC") {
            return {
                documentNumber: documentNumber,
                documentType: documentType,
                documentTypeCode: "6",
                customerTypeValue: 2,
                name: (result && result.razon_social) || "",
                padronesText: padronesText,
                isRetentionAgent: lowerPadrones.indexOf("retencion") >= 0 || lowerPadrones.indexOf("retenci\u00f3n") >= 0,
                isPerceptionAgent: lowerPadrones.indexOf("percepcion") >= 0 || lowerPadrones.indexOf("percepci\u00f3n") >= 0,
                isPublicSector: lowerTipo.indexOf("publica") >= 0 || lowerTipo.indexOf("p\u00fablica") >= 0,
                isEmergencyZone: false,
                isExoneratedPerception: false,
                isFinalConsumer: false,
                isOthers: false,
                isNotDomiciled: false,
                department: (result && result.departamento) || "",
                province: (result && result.provincia) || "",
                district: (result && result.distrito) || "",
                address: (result && result.direccion) || "",
                raw: result
            };
        }

        return {
            documentNumber: documentNumber,
            documentType: documentType,
            documentTypeCode: "1",
            customerTypeValue: 1,
            name: (result && result.nombre_completo) || this._joinName(result && result.nombres, result && result.apellido_paterno, result && result.apellido_materno),
            firstName: (result && result.nombres) || "",
            lastName: (result && result.apellido_paterno) || "",
            middleName: (result && result.apellido_materno) || "",
            padronesText: "",
            isRetentionAgent: false,
            isPerceptionAgent: false,
            isPublicSector: false,
            isEmergencyZone: false,
            // Criterio funcional de Terranova: una persona natural (DNI) es consumidor final.
            // Para RUC la casilla depende de la consulta y queda en manos del cajero.
            isFinalConsumer: true,
            isExoneratedPerception: false,
            isOthers: false,
            isNotDomiciled: false,
            raw: result
        };
    }

    private _padronesToText(padrones: any): string {
        if (!padrones) {
            return "";
        }

        if (Array.isArray(padrones)) {
            return padrones.join(" ");
        }

        return padrones.toString();
    }

    private _getStringProperty(customer: ProxyEntities.Customer, key: string): string {
        if (!customer || !customer.ExtensionProperties) {
            return "";
        }

        for (let i: number = 0; i < customer.ExtensionProperties.length; i++) {
            const property: ProxyEntities.CommerceProperty = customer.ExtensionProperties[i];
            if (property.Key === key && property.Value && property.Value.StringValue) {
                return property.Value.StringValue;
            }
        }

        return "";
    }

    private _setStringProperty(customer: ProxyEntities.Customer, key: string, value: string): void {
        this._setProperty(customer, key, { StringValue: value || "" });
    }

    private _setIntegerProperty(customer: ProxyEntities.Customer, key: string, value: number): void {
        this._setProperty(customer, key, { IntegerValue: value || 0 });
    }

    private _setProperty(customer: ProxyEntities.Customer, key: string, value: ProxyEntities.CommercePropertyValue): void {
        if (!customer.ExtensionProperties) {
            customer.ExtensionProperties = [];
        }

        for (let i: number = 0; i < customer.ExtensionProperties.length; i++) {
            if (customer.ExtensionProperties[i].Key === key) {
                customer.ExtensionProperties[i].Value = value;
                return;
            }
        }

        const property: ProxyEntities.CommerceProperty = new ProxyEntities.CommercePropertyClass();
        property.Key = key;
        property.Value = value;
        customer.ExtensionProperties.push(property);
    }

    private _joinName(first: string, middle: string, last: string): string {
        return [first || "", middle || "", last || ""].join(" ").replace(/\s+/g, " ").trim();
    }

    private _normalizeForCompare(value: string): string {
        return (value || "").toUpperCase().replace(/\s+/g, " ").trim();
    }
}
