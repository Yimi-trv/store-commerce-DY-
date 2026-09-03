System.register(["PosApi/Entities", "../DataService/SunatLookupRequest"], function (exports_1, context_1) {
    "use strict";
    var Entities_1, SunatLookupRequest_1, SunatCustomerService;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (Entities_1_1) {
                Entities_1 = Entities_1_1;
            },
            function (SunatLookupRequest_1_1) {
                SunatLookupRequest_1 = SunatLookupRequest_1_1;
            }
        ],
        execute: function () {
            SunatCustomerService = (function () {
                function SunatCustomerService(context) {
                    this._context = context;
                }
                SunatCustomerService.prototype.normalizeDocument = function (documentNumber) {
                    return (documentNumber || "").replace(/\D/g, "");
                };
                SunatCustomerService.prototype.isOrganizationDocument = function (documentNumber) {
                    var normalized = this.normalizeDocument(documentNumber);
                    return normalized.length === 11 && normalized.indexOf("20") === 0;
                };
                SunatCustomerService.prototype.splitPersonName = function (fullName) {
                    var parts = (fullName || "").replace(/\s+/g, " ").trim().split(" ");
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
                };
                SunatCustomerService.prototype.parseAddressParts = function (fullAddress) {
                    var clean = (fullAddress || "").replace(/\s+/g, " ").trim();
                    if (!clean) {
                        return { street: "", streetNumber: "", compliment: "" };
                    }
                    var numberToken = "(?:S\\/N|SN|[0-9]+[A-Za-z]?(?:\\s?[\\-\\/]\\s?[0-9A-Za-z]+)?)";
                    var match = clean.match(new RegExp("\\b((?:NRO|NUM|NUMERO|N[°º])\\.?)\\s*(" + numberToken + ")(?![0-9])", "i"));
                    if (match) {
                        var markerIndex = match.index || 0;
                        var beforeMarker = this._trimSeparators(clean.substring(0, markerIndex));
                        return {
                            street: (beforeMarker ? beforeMarker + " " : "") + match[1],
                            streetNumber: match[2],
                            compliment: this._trimSeparators(clean.substring(markerIndex + match[0].length))
                        };
                    }
                    var tokens = clean.split(" ");
                    var isNumber = new RegExp("^" + numberToken + "$", "i");
                    var inicioDelComplemento = tokens.length;
                    for (var index = 0; index < tokens.length; index++) {
                        if (SunatCustomerService._esInicioDeComplemento(tokens[index])) {
                            inicioDelComplemento = index;
                            break;
                        }
                    }
                    var elegido = -1;
                    for (var index = 1; index < inicioDelComplemento; index++) {
                        if (isNumber.test(tokens[index]) && /[A-Za-z]/.test(tokens.slice(0, index).join(" "))) {
                            elegido = index;
                        }
                    }
                    if (elegido > 0) {
                        var calle = this._trimSeparators(tokens.slice(0, elegido).join(" "));
                        return {
                            street: calle ? calle + " N\u00B0" : calle,
                            streetNumber: tokens[elegido],
                            compliment: this._trimSeparators(tokens.slice(elegido + 1).join(" "))
                        };
                    }
                    return { street: clean, streetNumber: "", compliment: "" };
                };
                SunatCustomerService._esInicioDeComplemento = function (token) {
                    var limpio = (token || "").replace(/[.,]/g, "").toUpperCase();
                    return SunatCustomerService._COMPLEMENTOS.indexOf(limpio) >= 0;
                };
                SunatCustomerService.prototype._trimSeparators = function (value) {
                    return (value || "").replace(/^[\s.,\-]+/, "").replace(/[\s.,\-]+$/, "").trim();
                };
                SunatCustomerService.prototype.getDocumentType = function (documentNumber) {
                    var normalizedDocument = this.normalizeDocument(documentNumber);
                    if (normalizedDocument.length === 11) {
                        return "RUC";
                    }
                    if (normalizedDocument.length === 8) {
                        return "DNI";
                    }
                    return null;
                };
                SunatCustomerService.prototype.lookup = function (documentNumber) {
                    var _this = this;
                    var normalizedDocument = this.normalizeDocument(documentNumber);
                    var documentType = this.getDocumentType(normalizedDocument);
                    if (!documentType) {
                        return Promise.reject(new Error("Ingrese un DNI de 8 digitos o RUC de 11 digitos."));
                    }
                    var cached = SunatCustomerService._readCache(normalizedDocument);
                    if (cached) {
                        return Promise.resolve(cached);
                    }
                    if (!this._context) {
                        return Promise.reject(new Error("La consulta no esta disponible aqui. Ingrese los datos manualmente."));
                    }
                    return this._context.runtime
                        .executeAsync(new SunatLookupRequest_1.ConsultarDocumentoSunatRequest(normalizedDocument))
                        .then(function (response) {
                        var lista = (response && response.data && response.data.result) || [];
                        var resultado = lista.length > 0 ? lista[0] : null;
                        if (!resultado || !resultado.Found) {
                            throw new Error((resultado && resultado.Message) || "No se encontro el documento en SUNAT.");
                        }
                        var mapped = _this._desdeElServidor(resultado, documentType, normalizedDocument);
                        SunatCustomerService._writeCache(normalizedDocument, mapped);
                        return mapped;
                    }, function () {
                        throw new Error("No se pudo consultar el documento. Reintente o ingrese los datos manualmente.");
                    });
                };
                SunatCustomerService.prototype._desdeElServidor = function (resultado, documentType, documentNumber) {
                    var esRuc = documentType === "RUC";
                    var isOrganization = this.isOrganizationDocument(documentNumber);
                    var partes = (esRuc && !isOrganization)
                        ? this.splitPersonName(resultado.Name || "")
                        : { firstName: resultado.FirstName || "", lastName: resultado.LastName || "" };
                    return {
                        documentNumber: documentNumber,
                        documentType: documentType,
                        documentTypeCode: esRuc ? "6" : "1",
                        customerTypeValue: isOrganization ? 2 : 1,
                        name: resultado.Name || "",
                        firstName: partes.firstName,
                        lastName: partes.lastName,
                        middleName: "",
                        padronesText: resultado.PadronesText || "",
                        taxpayerStatus: resultado.TaxpayerStatus || "",
                        taxpayerCondition: resultado.TaxpayerCondition || "",
                        isRetentionAgent: !!resultado.IsRetentionAgent,
                        isPerceptionAgent: !!resultado.IsPerceptionAgent,
                        isPublicSector: false,
                        isEmergencyZone: false,
                        isExoneratedPerception: false,
                        isFinalConsumer: !esRuc,
                        isOthers: false,
                        isNotDomiciled: false,
                        department: resultado.Department || "",
                        province: resultado.Province || "",
                        district: resultado.District || "",
                        address: resultado.Address || "",
                        raw: resultado
                    };
                };
                SunatCustomerService._readCache = function (documentNumber) {
                    var entry = SunatCustomerService._cache[documentNumber];
                    if (!entry) {
                        return null;
                    }
                    if (new Date().getTime() > entry.expiresAt) {
                        delete SunatCustomerService._cache[documentNumber];
                        return null;
                    }
                    return entry.data;
                };
                SunatCustomerService._writeCache = function (documentNumber, data) {
                    SunatCustomerService._cache[documentNumber] = {
                        data: data,
                        expiresAt: new Date().getTime() + SunatCustomerService._cacheTtlMs
                    };
                };
                SunatCustomerService.prototype.getDocumentNumber = function (customer) {
                    var valueFromProperty = this._getStringProperty(customer, "DPNUMBERDOCUMID_PE");
                    if (valueFromProperty) {
                        return valueFromProperty;
                    }
                    var identification = this.normalizeDocument((customer && customer.IdentificationNumber) || "");
                    return this.getDocumentType(identification) ? identification : "";
                };
                SunatCustomerService.prototype.applyDocumentProperties = function (customer, documentNumber) {
                    var normalizedDocument = this.normalizeDocument(documentNumber);
                    var documentType = this.getDocumentType(normalizedDocument);
                    if (!customer || !documentType) {
                        return customer;
                    }
                    this._setStringProperty(customer, "DPTYPEDOCID_PE", documentType === "RUC" ? "6" : "1");
                    this._setStringProperty(customer, "DPNUMBERDOCUMID_PE", normalizedDocument);
                    customer.IdentificationNumber = normalizedDocument;
                    if (this.isOrganizationDocument(normalizedDocument)) {
                        customer.CustomerTypeValue = 2;
                    }
                    else if (!customer.CustomerTypeValue) {
                        customer.CustomerTypeValue = 1;
                    }
                    return customer;
                };
                SunatCustomerService.prototype.applySunatMetadata = function (customer, sunatData) {
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
                };
                SunatCustomerService.prototype.applySunatIdentity = function (customer, sunatData) {
                    if (!customer || !sunatData) {
                        return customer;
                    }
                    if (this.isOrganizationDocument(sunatData.documentNumber)) {
                        customer.Name = sunatData.name || customer.Name || "";
                        customer.CustomerTypeValue = 2;
                    }
                    else {
                        customer.FirstName = sunatData.firstName || customer.FirstName || "";
                        customer.LastName = sunatData.lastName || customer.LastName || "";
                        customer.MiddleName = sunatData.middleName || customer.MiddleName || "";
                        customer.Name = sunatData.name || customer.Name || "";
                        customer.CustomerTypeValue = 1;
                    }
                    return this.applySunatMetadata(customer, sunatData);
                };
                SunatCustomerService.prototype.compareWithCustomer = function (customer, sunatData) {
                    var differences = [];
                    if (!customer || !sunatData) {
                        differences.push("No hay cliente del sistema para comparar.");
                        return differences;
                    }
                    var customerDocument = this.getDocumentNumber(customer);
                    if (!customerDocument) {
                        differences.push("El cliente del sistema no tiene documento fiscal registrado.");
                    }
                    else if (customerDocument !== sunatData.documentNumber) {
                        differences.push("Documento distinto. Sistema: " + customerDocument + " / SUNAT: " + sunatData.documentNumber + ".");
                    }
                    var customerName = customer.Name || this._joinName(customer.FirstName, customer.MiddleName, customer.LastName);
                    if (customerName && sunatData.name && this._normalizeForCompare(customerName) !== this._normalizeForCompare(sunatData.name)) {
                        differences.push("Nombre distinto. Sistema: " + customerName + " / SUNAT: " + sunatData.name + ".");
                    }
                    if (differences.length === 0) {
                        differences.push("Sin diferencias principales entre el cliente del sistema y SUNAT.");
                    }
                    return differences;
                };
                SunatCustomerService.prototype.getInvoiceBlockReasons = function (sunatData) {
                    var reasons = [];
                    if (!sunatData || sunatData.documentType !== "RUC") {
                        return reasons;
                    }
                    var status = (sunatData.taxpayerStatus || "").toUpperCase().replace(/\s+/g, " ").trim();
                    var condition = (sunatData.taxpayerCondition || "").toUpperCase().replace(/\s+/g, " ").trim();
                    if (status && status !== "ACTIVO") {
                        reasons.push("Estado del RUC: " + status + " (debe ser ACTIVO)");
                    }
                    if (condition && condition !== "HABIDO") {
                        reasons.push("Condición del domicilio: " + condition + " (debe ser HABIDO)");
                    }
                    return reasons;
                };
                SunatCustomerService.prototype._getStringProperty = function (customer, key) {
                    if (!customer || !customer.ExtensionProperties) {
                        return "";
                    }
                    for (var i = 0; i < customer.ExtensionProperties.length; i++) {
                        var property = customer.ExtensionProperties[i];
                        if (property.Key === key && property.Value && property.Value.StringValue) {
                            return property.Value.StringValue;
                        }
                    }
                    return "";
                };
                SunatCustomerService.prototype._setStringProperty = function (customer, key, value) {
                    this._setProperty(customer, key, { StringValue: value || "" });
                };
                SunatCustomerService.prototype._setIntegerProperty = function (customer, key, value) {
                    this._setProperty(customer, key, { IntegerValue: value || 0 });
                };
                SunatCustomerService.prototype._setProperty = function (customer, key, value) {
                    if (!customer.ExtensionProperties) {
                        customer.ExtensionProperties = [];
                    }
                    for (var i = 0; i < customer.ExtensionProperties.length; i++) {
                        if (customer.ExtensionProperties[i].Key === key) {
                            customer.ExtensionProperties[i].Value = value;
                            return;
                        }
                    }
                    var property = new Entities_1.ProxyEntities.CommercePropertyClass();
                    property.Key = key;
                    property.Value = value;
                    customer.ExtensionProperties.push(property);
                };
                SunatCustomerService.prototype._joinName = function (first, middle, last) {
                    return [first || "", middle || "", last || ""].join(" ").replace(/\s+/g, " ").trim();
                };
                SunatCustomerService.prototype._normalizeForCompare = function (value) {
                    return (value || "").toUpperCase().replace(/\s+/g, " ").trim();
                };
                SunatCustomerService._cacheTtlMs = 30 * 60 * 1000;
                SunatCustomerService._cache = {};
                SunatCustomerService._COMPLEMENTOS = [
                    "INT", "INTERIOR", "DPTO", "DPT", "DEPT", "DEPARTAMENTO", "PISO", "OF", "OFIC", "OFICINA",
                    "MZ", "MZA", "MANZANA", "LT", "LTE", "LOTE", "BLOCK", "BLQ", "TDA", "TIENDA",
                    "URB", "URBANIZACION", "BARRIO", "BARR", "ASOC", "ASOCIACION", "AAHH", "PJ", "PJE",
                    "PSJE", "SECTOR", "ETAPA", "COND", "CONDOMINIO", "RESIDENCIAL", "RES", "CASERIO", "CAS"
                ];
                return SunatCustomerService;
            }());
            exports_1("default", SunatCustomerService);
        }
    };
});
