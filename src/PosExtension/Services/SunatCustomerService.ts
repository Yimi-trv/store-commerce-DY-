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
import {
    ConsultarDocumentoSunatRequest, ConsultarDocumentoSunatResponse, SunatCustomerResultEntity
} from "../DataService/SunatLookupRequest";

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
    /** Estado del contribuyente en SUNAT: ACTIVO, BAJA DEFINITIVA, SUSPENSION TEMPORAL... Solo RUC. */
    taxpayerStatus?: string;
    /** Condición del domicilio en SUNAT: HABIDO, NO HABIDO, NO HALLADO... Solo RUC. */
    taxpayerCondition?: string;
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

    /**
     * Contexto del POS, necesario para llamar al Commerce Runtime.
     *
     * Es opcional porque hay usos que no consultan nada: DocumentTypeRule construye el servicio
     * solo para clasificar un documento. Sin contexto, `lookup` avisa en vez de reventar.
     */
    private _context: any;

    public constructor(context?: any) {
        this._context = context;
    }

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

    /**
     * Palabras con las que arranca el complemento en las direcciones de SUNAT y RENIEC.
     * No pretende ser exhaustiva: lo que no esté aquí solo hace que la dirección se parta
     * como antes, nunca que se parta mal.
     */
    private static readonly _COMPLEMENTOS: string[] = [
        "INT", "INTERIOR", "DPTO", "DPT", "DEPT", "DEPARTAMENTO", "PISO", "OF", "OFIC", "OFICINA",
        "MZ", "MZA", "MANZANA", "LT", "LTE", "LOTE", "BLOCK", "BLQ", "TDA", "TIENDA",
        "URB", "URBANIZACION", "BARRIO", "BARR", "ASOC", "ASOCIACION", "AAHH", "PJ", "PJE",
        "PSJE", "SECTOR", "ETAPA", "COND", "CONDOMINIO", "RESIDENCIAL", "RES", "CASERIO", "CAS"
    ];

    public normalizeDocument(documentNumber: string): string {
        return (documentNumber || "").replace(/\D/g, "");
    }

    /**
     * Un RUC no implica organización. Según el criterio funcional de Terranova, solo el RUC que
     * empieza en 20 es organización; los que empiezan en 10, 15 o 17 son PERSONAS naturales con
     * RUC y D365 los exige con nombres y apellidos, no con razón social.
     *
     * Tratarlos a todos como organización provocaba "Los campos de nombre son campos
     * obligatorios" al crear un RUC 10 — verificado en UAT con 10422774438.
     */
    public isOrganizationDocument(documentNumber: string): boolean {
        const normalized: string = this.normalizeDocument(documentNumber);
        return normalized.length === 11 && normalized.indexOf("20") === 0;
    }

    /**
     * Parte la razón social de una persona natural con RUC en apellidos y nombres.
     *
     * SUNAT la entrega concatenada como "APELLIDO_PATERNO APELLIDO_MATERNO NOMBRES", así que se
     * toman los dos primeros bloques como apellidos y el resto como nombres.
     *
     * ES UNA HEURÍSTICA: con apellidos compuestos ("DE LA CRUZ") o un solo nombre parte mal. Por
     * eso los campos quedan editables en el modal — el cajero corrige lo que haga falta antes de
     * crear.
     */
    public splitPersonName(fullName: string): { firstName: string; lastName: string } {
        const parts: string[] = (fullName || "").replace(/\s+/g, " ").trim().split(" ");

        if (parts.length === 0 || parts[0] === "") {
            return { firstName: "", lastName: "" };
        }
        if (parts.length === 1) {
            return { firstName: "", lastName: parts[0] };
        }
        if (parts.length === 2) {
            return { lastName: parts[0], firstName: parts[1] };
        }

        return {
            lastName: parts[0] + " " + parts[1],
            firstName: parts.slice(2).join(" ")
        };
    }

    /**
     * Parte la dirección de SUNAT en los tres campos que maneja D365.
     *
     * SUNAT devuelve la dirección en una sola cadena con su propia nomenclatura:
     *
     *   "CAL. LORETO NRO. 208"                -> CAL. LORETO NRO.      | 208  | (vacío)
     *   "AV. LARCO NRO. 1234 INT. 501"        -> AV. LARCO NRO.        | 1234 | INT. 501
     *   "JR. UNION NRO. 123 DPTO. 401 PISO 4" -> JR. UNION NRO.        | 123  | DPTO. 401 PISO 4
     *   "AV. PRIMAVERA NRO. S/N"              -> AV. PRIMAVERA NRO.    | S/N  | (vacío)
     *   "CAL. SAN MARTIN 456"                 -> CAL. SAN MARTIN N°    | 456  | (vacío)
     *   "AV. CORDILLERA NEGRA 979 BARRIO..."  -> AV. CORDILLERA NEGRA N° | 979 | BARRIO...
     *
     * El corte se hace sobre el marcador de número (NRO., N°, NUM...), que es lo que SUNAT
     * emite de forma consistente. Lo de antes es la calle, lo de después del número es el
     * complemento (interior, piso, departamento, manzana...).
     *
     * EL MARCADOR SE QUEDA EN LA CALLE. Es parte de cómo se escribe una dirección fiscal en
     * Perú: la dirección impresa es "JR. AREQUIPA NRO. 514", no "JR. AREQUIPA 514". D365 arma
     * la dirección completa concatenando Street y StreetNumber, así que si el "NRO." se
     * descarta al separar, desaparece también del comprobante. Solo se extrae el número.
     *
     * CUANDO NO VIENE MARCADOR, SE ESCRIBE "N°". Factiliza entrega la dirección del DNI sin
     * él —"AV. CORDILLERA NEGRA 979 BARRIO LOS OLIVOS"—, pero ahí el número está igual de
     * claro: va detrás del nombre de la vía. Se asume eso y se añade el marcador, para que la
     * dirección impresa se lea como se escribe en Perú y no como "AV. CORDILLERA NEGRA 979".
     *
     * DELIBERADAMENTE CONSERVADORA: si no hay marcador ni un número reconocible, se devuelve la
     * cadena entera como calle y los otros dos campos vacíos. Es preferible dejar la dirección
     * como llegó a partirla mal —una dirección troceada al azar es peor que una sin trocear, y
     * el cajero no tendría cómo notarlo. Los tres campos quedan editables.
     */
    public parseAddressParts(fullAddress: string): { street: string; streetNumber: string; compliment: string } {
        const clean: string = (fullAddress || "").replace(/\s+/g, " ").trim();

        if (!clean) {
            return { street: "", streetNumber: "", compliment: "" };
        }

        // Un número puede ser "208", "208A", "208-B", "1234/2" o "S/N" (sin número).
        const numberToken: string = "(?:S\\/N|SN|[0-9]+[A-Za-z]?(?:\\s?[\\-\\/]\\s?[0-9A-Za-z]+)?)";

        // Caso normal de SUNAT: marcador explícito de número. El marcador se captura aparte
        // porque NO se descarta: vuelve al final de la calle tal como venía escrito.
        const match: RegExpMatchArray =
            clean.match(new RegExp("\\b((?:NRO|NUM|NUMERO|N[°º])\\.?)\\s*(" + numberToken + ")(?![0-9])", "i"));

        if (match) {
            const markerIndex: number = match.index || 0;
            const beforeMarker: string = this._trimSeparators(clean.substring(0, markerIndex));

            return {
                street: (beforeMarker ? beforeMarker + " " : "") + match[1],
                streetNumber: match[2],
                compliment: this._trimSeparators(clean.substring(markerIndex + match[0].length))
            };
        }

        // Sin marcador: "AV. CORDILLERA NEGRA 979 BARRIO LOS OLIVOS".
        const tokens: string[] = clean.split(" ");
        const isNumber: RegExp = new RegExp("^" + numberToken + "$", "i");

        // Donde empieza el complemento, si es que empieza. Lo que va de ahí en adelante no
        // puede ser el número de la calle: "INT. 4" o "MZ. B LT. 15" son otra cosa.
        let inicioDelComplemento: number = tokens.length;

        for (let index: number = 0; index < tokens.length; index++) {
            if (SunatCustomerService._esInicioDeComplemento(tokens[index])) {
                inicioDelComplemento = index;
                break;
            }
        }

        // EL ÚLTIMO NÚMERO ANTES DEL COMPLEMENTO, NO EL PRIMERO. En "AV. 28 DE JULIO 250" el
        // primero es parte del NOMBRE de la avenida, y quedarse con él daba
        // "AV." + "28" + "DE JULIO 250" — una dirección irreconocible. Los nombres de vía con
        // número son de lo más corriente en Perú (28 de Julio, 2 de Mayo, 9 de Octubre).
        let elegido: number = -1;

        for (let index: number = 1; index < inicioDelComplemento; index++) {
            if (isNumber.test(tokens[index]) && /[A-Za-z]/.test(tokens.slice(0, index).join(" "))) {
                elegido = index;
            }
        }

        if (elegido > 0) {
            const calle: string = this._trimSeparators(tokens.slice(0, elegido).join(" "));

            return {
                // Se añade el marcador que la dirección no traía: es como se escribe una
                // dirección fiscal aquí, y D365 imprime Street + StreetNumber concatenados.
                street: calle ? calle + " N\u00B0" : calle,
                streetNumber: tokens[elegido],
                compliment: this._trimSeparators(tokens.slice(elegido + 1).join(" "))
            };
        }

        return { street: clean, streetNumber: "", compliment: "" };
    }

    /**
     * ¿Este bloque abre la parte de complemento de la dirección?
     *
     * Sirve para no confundir el número de la calle con los que aparecen dentro del
     * complemento: en "JR. LOS OLIVOS 120 INT. 4" el de la calle es el 120, no el 4.
     */
    private static _esInicioDeComplemento(token: string): boolean {
        const limpio: string = (token || "").replace(/[.,]/g, "").toUpperCase();

        return SunatCustomerService._COMPLEMENTOS.indexOf(limpio) >= 0;
    }

    /** Quita puntuación y espacios sueltos que quedan en los bordes al cortar. */
    private _trimSeparators(value: string): string {
        return (value || "").replace(/^[\s.,\-]+/, "").replace(/[\s.,\-]+$/, "").trim();
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

    /**
     * Consulta el documento contra el endpoint propio del Commerce Runtime.
     *
     * LA CLAVE YA NO VIAJA A LA CAJA. Esto llamaba a api.perudevs.com desde el navegador con la
     * clave escrita en este mismo archivo, legible con F12 en cualquier terminal. Ahora pregunta
     * al CSU, que es quien decide entre Factiliza y su respaldo — y quien guarda las claves.
     *
     * LA CACHE SE QUEDA AQUI. Ahorra la ida y vuelta al servidor y, sobre todo, mantiene vivo el
     * flujo durante una caida del proveedor para los documentos que ya pasaron por caja.
     */
    public lookup(documentNumber: string): Promise<ISunatCustomerData> {
        const normalizedDocument: string = this.normalizeDocument(documentNumber);
        const documentType: SunatDocumentType | null = this.getDocumentType(normalizedDocument);

        if (!documentType) {
            return Promise.reject(new Error("Ingrese un DNI de 8 digitos o RUC de 11 digitos."));
        }

        const cached: ISunatCustomerData | null = SunatCustomerService._readCache(normalizedDocument);

        if (cached) {
            return Promise.resolve(cached);
        }

        // Sin contexto no hay forma de llamar al servidor. Pasa si alguien construye el servicio
        // solo para las utilidades de documento (DocumentTypeRule lo hace) y luego pide consultar.
        if (!this._context) {
            return Promise.reject(new Error(
                "La consulta no esta disponible aqui. Ingrese los datos manualmente."));
        }

        return this._context.runtime
            .executeAsync(new ConsultarDocumentoSunatRequest<ConsultarDocumentoSunatResponse>(normalizedDocument))
            .then((response: any): ISunatCustomerData => {
                const lista: SunatCustomerResultEntity[] =
                    (response && response.data && response.data.result) || [];
                const resultado: SunatCustomerResultEntity = lista.length > 0 ? lista[0] : null;

                if (!resultado || !resultado.Found) {
                    throw new Error(
                        (resultado && resultado.Message) || "No se encontro el documento en SUNAT.");
                }

                const mapped: ISunatCustomerData =
                    this._desdeElServidor(resultado, documentType, normalizedDocument);
                SunatCustomerService._writeCache(normalizedDocument, mapped);
                return mapped;
            }, (): ISunatCustomerData => {
                // El detalle del fallo ya queda en el log del CSU; al cajero solo le sirve saber
                // que puede seguir a mano. Mismo criterio de siempre: nunca se detiene una venta.
                throw new Error(
                    "No se pudo consultar el documento. Reintente o ingrese los datos manualmente.");
            });
    }

    /**
     * Lo que respondio el proveedor -> lo que el modal necesita.
     *
     * EL SERVIDOR MANDA SOLO LO QUE DIJO EL PROVEEDOR; lo que se DEDUCE de ahi se calcula aqui,
     * donde ya vive `isOrganizationDocument`. Copiar esa deduccion al C# dejaria dos
     * definiciones de "empresa" —una decide el comprobante y la direccion, la otra el tipo de
     * cliente— y en este proyecto las reglas duplicadas ya divergieron tres veces.
     */
    private _desdeElServidor(
        resultado: SunatCustomerResultEntity,
        documentType: SunatDocumentType,
        documentNumber: string): ISunatCustomerData {

        const esRuc: boolean = documentType === "RUC";
        const isOrganization: boolean = this.isOrganizationDocument(documentNumber);

        return {
            documentNumber: documentNumber,
            documentType: documentType,
            documentTypeCode: esRuc ? "6" : "1",
            customerTypeValue: isOrganization ? 2 : 1,
            name: resultado.Name || "",
            firstName: resultado.FirstName || "",
            // LOS DOS APELLIDOS VAN JUNTOS EN LastName. D365 compone el nombre de una persona
            // como FirstName + MiddleName + LastName; el materno en MiddleName sacaba los
            // apellidos al reves en el comprobante. MiddleName es un segundo NOMBRE.
            lastName: resultado.LastName || "",
            middleName: "",
            padronesText: resultado.PadronesText || "",
            taxpayerStatus: resultado.TaxpayerStatus || "",
            taxpayerCondition: resultado.TaxpayerCondition || "",
            isRetentionAgent: !!resultado.IsRetentionAgent,
            isPerceptionAgent: !!resultado.IsPerceptionAgent,
            // Ningun proveedor los distingue de forma fiable; quedan a criterio del cajero, que
            // los edita en el modal antes de guardar.
            isPublicSector: false,
            isEmergencyZone: false,
            isExoneratedPerception: false,
            // Criterio funcional de Terranova: una persona natural es consumidor final.
            isFinalConsumer: !esRuc,
            isOthers: false,
            isNotDomiciled: false,
            department: resultado.Department || "",
            province: resultado.Province || "",
            district: resultado.District || "",
            address: resultado.Address || "",
            raw: resultado
        };
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

    /**
     * Documento fiscal del cliente. Cadena vacía si no tiene.
     *
     * NO SE USA `PartyNumber` COMO RESPALDO. Lo hacía, y al editar un cliente cuyo
     * DPNUMBERDOCUMID_PE llega vacío el formulario mostraba algo como "000243421" —el número de
     * tercero interno de D365— como si fuera su documento. Un identificador interno no es un
     * documento fiscal y no hay ninguna relación entre los dos.
     *
     * Era además una bomba de tiempo: al guardar, ese número se reescribía sobre el documento
     * del cliente si tenía 8 u 11 dígitos, o sea, si por casualidad pasaba la validación de
     * longitud. Vale más devolver vacío y que el cajero lo vea que inventar un número.
     */
    public getDocumentNumber(customer: ProxyEntities.Customer): string {
        const valueFromProperty: string = this._getStringProperty(customer, "DPNUMBERDOCUMID_PE");

        if (valueFromProperty) {
            return valueFromProperty;
        }

        // IdentificationNumber sí es un documento: applyDocumentProperties lo escribe junto con
        // la propiedad de extensión. Solo se acepta si tiene forma de DNI o RUC.
        const identification: string = this.normalizeDocument((customer && customer.IdentificationNumber) || "");

        return this.getDocumentType(identification) ? identification : "";
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

        if (this.isOrganizationDocument(normalizedDocument)) {
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

        // Lo que decide persona u organización es el PREFIJO del RUC, no el hecho de tener RUC.
        // Solo el RUC 20 es organización; 10, 15 y 17 son personas naturales con RUC.
        if (this.isOrganizationDocument(sunatData.documentNumber)) {
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

    /**
     * Motivos por los que a este contribuyente NO se le puede emitir factura. Vacío = apto.
     *
     * SUNAT solo reconoce crédito fiscal en facturas a contribuyentes con estado ACTIVO y
     * condición HABIDO. Con BAJA, SUSPENSIÓN TEMPORAL, NO HABIDO o NO HALLADO la factura le
     * sale observada al emisor, así que hay que avisarle al cajero ANTES de crear el cliente.
     *
     * Se compara por IGUALDAD, no por indexOf: "NO HABIDO" contiene "HABIDO" y un contains
     * daría al no habido por bueno. Si el campo viene vacío no se acusa nada: sin dato no se
     * bloquea una venta (mismo criterio que el resto de fallos de la consulta).
     */
    public getInvoiceBlockReasons(sunatData: ISunatCustomerData): string[] {
        const reasons: string[] = [];

        if (!sunatData || sunatData.documentType !== "RUC") {
            return reasons;
        }

        const status: string = (sunatData.taxpayerStatus || "").toUpperCase().replace(/\s+/g, " ").trim();
        const condition: string = (sunatData.taxpayerCondition || "").toUpperCase().replace(/\s+/g, " ").trim();

        if (status && status !== "ACTIVO") {
            reasons.push("Estado del RUC: " + status + " (debe ser ACTIVO)");
        }

        if (condition && condition !== "HABIDO") {
            reasons.push("Condición del domicilio: " + condition + " (debe ser HABIDO)");
        }

        return reasons;
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

    private _joinName(first: string, middle: string, last?: string): string {
        return [first || "", middle || "", last || ""].join(" ").replace(/\s+/g, " ").trim();
    }

    private _normalizeForCompare(value: string): string {
        return (value || "").toUpperCase().replace(/\s+/g, " ").trim();
    }
}
