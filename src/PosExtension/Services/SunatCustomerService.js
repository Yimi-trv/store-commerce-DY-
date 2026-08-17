System.register(["PosApi/Entities"], function (exports_1, context_1) {
    "use strict";
    var Entities_1, SunatCustomerService;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (Entities_1_1) {
                Entities_1 = Entities_1_1;
            }
        ],
        execute: function () {
            SunatCustomerService = (function () {
                function SunatCustomerService() {
                }
                SunatCustomerService.prototype.normalizeDocument = function (documentNumber) {
                    return (documentNumber || "").replace(/\D/g, "");
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
                    var url = documentType === "RUC"
                        ? "https://api.perudevs.com/api/v1/ruc?document=" + normalizedDocument + "&key=" + SunatCustomerService._apiKey
                        : "https://api.perudevs.com/api/v1/dni/complete?document=" + normalizedDocument + "&key=" + SunatCustomerService._apiKey;
                    return this._fetchWithTimeout(url)
                        .then(function (response) {
                        if (!response.ok) {
                            throw new Error(SunatCustomerService._describeHttpFailure(response.status));
                        }
                        return response.json().then(function (parsed) { return parsed; }, function () {
                            throw new Error("El servicio de consulta SUNAT respondio algo que no se pudo interpretar. "
                                + "Ingrese los datos manualmente.");
                        });
                    })
                        .then(function (apiData) {
                        if (apiData && apiData.estado === true && apiData.resultado) {
                            var mapped = _this._mapResult(apiData.resultado, documentType, normalizedDocument);
                            SunatCustomerService._writeCache(normalizedDocument, mapped);
                            return mapped;
                        }
                        throw new Error(apiData && apiData.mensaje ? apiData.mensaje : "No se encontro el documento en SUNAT.");
                    });
                };
                SunatCustomerService.prototype._fetchWithTimeout = function (url) {
                    var timeoutPromise = new Promise(function (_resolve, reject) {
                        setTimeout(function () {
                            reject(new Error("El servicio de consulta SUNAT no respondio en "
                                + (SunatCustomerService._timeoutMs / 1000) + " segundos. "
                                + "Reintente o ingrese los datos manualmente."));
                        }, SunatCustomerService._timeoutMs);
                    });
                    var networkPromise = fetch(url, { method: "GET" })
                        .then(function (response) { return response; }, function () {
                        throw new Error("No se pudo contactar el servicio de consulta SUNAT. "
                            + "Verifique la conexion o ingrese los datos manualmente.");
                    });
                    return Promise.race([networkPromise, timeoutPromise]);
                };
                SunatCustomerService._describeHttpFailure = function (status) {
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
                    return this.normalizeDocument((customer && (customer.IdentificationNumber || customer.PartyNumber)) || "");
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
                    if (documentType === "RUC") {
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
                    if (sunatData.documentType === "RUC") {
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
                SunatCustomerService.prototype._mapResult = function (result, documentType, documentNumber) {
                    var padronesText = this._padronesToText(result && result.padrones);
                    var lowerPadrones = padronesText.toLowerCase();
                    var lowerTipo = ((result && result.tipo) || "").toString().toLowerCase();
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
                        isFinalConsumer: true,
                        isExoneratedPerception: false,
                        isOthers: false,
                        isNotDomiciled: false,
                        raw: result
                    };
                };
                SunatCustomerService.prototype._padronesToText = function (padrones) {
                    if (!padrones) {
                        return "";
                    }
                    if (Array.isArray(padrones)) {
                        return padrones.join(" ");
                    }
                    return padrones.toString();
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
                SunatCustomerService._apiKey = "cGVydWRldnMucHJvZHVjdGlvbi5maXRjb2RlcnMuNjgxY2IzYzE5ZmE0MTczZjYxMzIwYWVh";
                SunatCustomerService._timeoutMs = 8000;
                SunatCustomerService._cacheTtlMs = 30 * 60 * 1000;
                SunatCustomerService._cache = {};
                return SunatCustomerService;
            }());
            exports_1("default", SunatCustomerService);
        }
    };
});
