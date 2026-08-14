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

        const url: string = documentType === "RUC"
            ? "https://api.perudevs.com/api/v1/ruc?document=" + normalizedDocument + "&key=" + SunatCustomerService._apiKey
            : "https://api.perudevs.com/api/v1/dni/complete?document=" + normalizedDocument + "&key=" + SunatCustomerService._apiKey;

        return fetch(url, { method: "GET" })
            .then((response: Response): Promise<any> => response.json())
            .then((apiData: any): ISunatCustomerData => {
                if (apiData && apiData.estado === true && apiData.resultado) {
                    return this._mapResult(apiData.resultado, documentType, normalizedDocument);
                }

                throw new Error(apiData && apiData.mensaje ? apiData.mensaje : "No se encontro el documento en SUNAT.");
            });
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
            isExoneratedPerception: false,
            isFinalConsumer: false,
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
