System.register(["PosApi/Extend/Views/CustomerAddEditView", "PosApi/Consume/Dialogs", "PosApi/Entities", "../../DataService/DataServiceRequests.g"], function (exports_1, context_1) {
    "use strict";
    var __extends = (this && this.__extends) || (function () {
        var extendStatics = function (d, b) {
            extendStatics = Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
                function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
            return extendStatics(d, b);
        };
        return function (d, b) {
            if (typeof b !== "function" && b !== null)
                throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    var CustomerAddEditView_1, Dialogs_1, Entities_1, DataServiceRequests_g_1, SunatLookupCommand;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (CustomerAddEditView_1_1) {
                CustomerAddEditView_1 = CustomerAddEditView_1_1;
            },
            function (Dialogs_1_1) {
                Dialogs_1 = Dialogs_1_1;
            },
            function (Entities_1_1) {
                Entities_1 = Entities_1_1;
            },
            function (DataServiceRequests_g_1_1) {
                DataServiceRequests_g_1 = DataServiceRequests_g_1_1;
            }
        ],
        execute: function () {
            SunatLookupCommand = (function (_super) {
                __extends(SunatLookupCommand, _super);
                function SunatLookupCommand(context) {
                    var _this = _super.call(this, context) || this;
                    _this.id = "sunatLookupCommand";
                    _this.label = "Consultar SUNAT";
                    _this.extraClass = "iconLightningBolt";
                    _this.customerUpdatedHandler = function (data) {
                        _this.canExecute = true;
                    };
                    return _this;
                }
                SunatLookupCommand.prototype.init = function (state) {
                    this.canExecute = true;
                    this.isVisible = true;
                };
                SunatLookupCommand.prototype.execute = function () {
                    var _this = this;
                    var inputOptions = {
                        title: "CONSULTAR SUNAT",
                        numPadLabel: "Ingrese RUC (11 dígitos) o DNI (8 dígitos):",
                    };
                    this.context.runtime.executeAsync(new Dialogs_1.ShowAlphanumericInputDialogClientRequest(inputOptions))
                        .then(function (inputResult) {
                        if (inputResult.canceled || !inputResult.data || !inputResult.data.result || !inputResult.data.result.value) {
                            return;
                        }
                        var documentNumber = inputResult.data.result.value.trim();
                        if (documentNumber.length !== 8 && documentNumber.length !== 11) {
                            _this._showMessage("CONSULTA SUNAT", "El número debe ser de 8 dígitos (DNI) o 11 dígitos (RUC).");
                            return;
                        }
                        var apiDocType = documentNumber.length === 11 ? "RUC" : "DNI";
                        _this.isProcessing = true;
                        var apiKey = "cGVydWRldnMucHJvZHVjdGlvbi5maXRjb2RlcnMuNjgxY2IzYzE5ZmE0MTczZjYxMzIwYWVh";
                        var apiUrl;
                        if (apiDocType === "RUC") {
                            apiUrl = "https://api.perudevs.com/api/v1/ruc?document=" + documentNumber + "&key=" + apiKey;
                        }
                        else {
                            apiUrl = "https://api.perudevs.com/api/v1/dni/complete?document=" + documentNumber + "&key=" + apiKey;
                        }
                        fetch(apiUrl, { method: "GET" })
                            .then(function (response) { return response.json(); })
                            .then(function (apiData) {
                            _this.isProcessing = false;
                            if (apiData && apiData.estado === true && apiData.resultado) {
                                var r = apiData.resultado;
                                _this._applyToCustomer(r, apiDocType, documentNumber);
                                var info_1 = apiDocType === "RUC"
                                    ? _this._formatRucResult(r, documentNumber)
                                    : "Documento: " + documentNumber + "\n" + _this._formatApiResult(r);
                                info_1 += "\n\n✓ Datos aplicados al cliente";
                                if (apiDocType === "RUC" && (r.departamento || r.provincia)) {
                                    _this._resolveAndAttachAddress(r).then(function (outcome) {
                                        _this._showMessage("SUNAT - RUC ENCONTRADO", info_1 + "\n" + outcome);
                                    });
                                }
                                else {
                                    _this._showMessage("SUNAT - " + apiDocType + " ENCONTRADO", info_1);
                                }
                            }
                            else {
                                var msg = apiData && apiData.mensaje ? apiData.mensaje : "No se encontró el documento.";
                                _this._showMessage("SUNAT - NO ENCONTRADO", msg);
                            }
                        })
                            .catch(function (error) {
                            _this.isProcessing = false;
                            _this.context.logger.logError("SunatLookup error: " + JSON.stringify(error));
                            _this._showMessage("SUNAT - ERROR", "Error al consultar la API.");
                        });
                    })
                        .catch(function (reason) {
                        _this.context.logger.logError("SunatLookup dialog error: " + JSON.stringify(reason));
                    });
                };
                SunatLookupCommand.prototype._applyToCustomer = function (resultado, docType, docNumber) {
                    var updatedCustomer = this.customer;
                    if (!updatedCustomer)
                        return;
                    if (docType === "RUC") {
                        updatedCustomer.Name = resultado.razon_social || "";
                        updatedCustomer.CustomerTypeValue = 2;
                        this._setExtProp(updatedCustomer, "DPTYPEDOCID_PE", "6");
                        this._setExtProp(updatedCustomer, "DPNUMBERDOCUMID_PE", docNumber);
                        var padrones = "";
                        if (resultado.padrones) {
                            if (Array.isArray(resultado.padrones)) {
                                padrones = resultado.padrones.join(" ");
                            }
                            else {
                                padrones = resultado.padrones.toString();
                            }
                        }
                        var isAgentRetention = padrones.toLowerCase().indexOf("retencion") >= 0 ||
                            padrones.toLowerCase().indexOf("retención") >= 0;
                        var isAgentPerception = padrones.toLowerCase().indexOf("percepcion") >= 0 ||
                            padrones.toLowerCase().indexOf("percepción") >= 0;
                        this._setExtPropInt(updatedCustomer, "DPAGENTRETENTION_PE", isAgentRetention ? 1 : 0);
                        this._setExtPropInt(updatedCustomer, "DPAGENTPERCEPTION_PE", isAgentPerception ? 1 : 0);
                        var tipo = (resultado.tipo || "").toLowerCase();
                        var isPublicSector = tipo.indexOf("publica") >= 0 || tipo.indexOf("pública") >= 0;
                        this._setExtPropInt(updatedCustomer, "DPPUBLICSECTOR_PE", isPublicSector ? 1 : 0);
                    }
                    else {
                        updatedCustomer.FirstName = resultado.nombres || "";
                        updatedCustomer.LastName = [resultado.apellido_paterno || "", resultado.apellido_materno || ""]
                            .join(" ").replace(/\s+/g, " ").trim();
                        updatedCustomer.MiddleName = "";
                        updatedCustomer.Name = resultado.nombre_completo || "";
                        updatedCustomer.CustomerTypeValue = 1;
                        this._setExtProp(updatedCustomer, "DPTYPEDOCID_PE", "1");
                        this._setExtProp(updatedCustomer, "DPNUMBERDOCUMID_PE", docNumber);
                    }
                    this.customer = updatedCustomer;
                };
                SunatLookupCommand.prototype._setExtProp = function (customer, key, value) {
                    if (!customer.ExtensionProperties) {
                        customer.ExtensionProperties = [];
                    }
                    var found = false;
                    for (var i = 0; i < customer.ExtensionProperties.length; i++) {
                        if (customer.ExtensionProperties[i].Key === key) {
                            customer.ExtensionProperties[i].Value = { StringValue: value };
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        var prop = new Entities_1.ProxyEntities.CommercePropertyClass();
                        prop.Key = key;
                        prop.Value = { StringValue: value };
                        customer.ExtensionProperties.push(prop);
                    }
                };
                SunatLookupCommand.prototype._setExtPropInt = function (customer, key, value) {
                    if (!customer.ExtensionProperties) {
                        customer.ExtensionProperties = [];
                    }
                    var found = false;
                    for (var i = 0; i < customer.ExtensionProperties.length; i++) {
                        if (customer.ExtensionProperties[i].Key === key) {
                            customer.ExtensionProperties[i].Value = { IntegerValue: value };
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        var prop = new Entities_1.ProxyEntities.CommercePropertyClass();
                        prop.Key = key;
                        prop.Value = { IntegerValue: value };
                        customer.ExtensionProperties.push(prop);
                    }
                };
                SunatLookupCommand.prototype._resolveAndAttachAddress = function (r) {
                    var _this = this;
                    var departamento = r.departamento || "";
                    var provincia = r.provincia || "";
                    var distrito = r.distrito || "";
                    var request = new DataServiceRequests_g_1.TRU_GeographicData.ResolveUbigeoRequest(departamento, provincia, distrito);
                    return this.context.runtime.executeAsync(request)
                        .then(function (response) {
                        var u = (response && response.data && response.data.result && response.data.result.length > 0)
                            ? response.data.result[0]
                            : null;
                        if (u && u.IsValid) {
                            _this._attachAddress(r, u);
                            return "✓ Dirección agregada automáticamente (ubigeo " + u.StateId + "-" + u.CountyId + "-" + u.CityName + ")";
                        }
                        var motivo = u && u.Notes ? u.Notes : "sin respuesta del resolver";
                        _this.context.logger.logInformational("SunatLookup ubigeo no resuelto: " + motivo);
                        return "⚠ Dirección NO agregada: no se pudo validar el ubigeo contra los maestros.\nIngrésela manualmente en Direcciones.";
                    })
                        .catch(function (error) {
                        _this.context.logger.logError("SunatLookup ResolveUbigeo error: " + JSON.stringify(error));
                        return "⚠ Dirección NO agregada (error consultando maestros).\nIngrésela manualmente en Direcciones.";
                    });
                };
                SunatLookupCommand.prototype._attachAddress = function (r, u) {
                    var customer = this.customer;
                    if (!customer) {
                        return;
                    }
                    var address = new Entities_1.ProxyEntities.AddressClass();
                    address.AddressTypeValue = 2;
                    address.ThreeLetterISORegionName = "PER";
                    address.Name = "DOMICILIO FISCAL";
                    address.Street = (r.direccion || "").trim();
                    address.State = u.StateId;
                    address.County = u.CountyId;
                    address.City = u.CityName;
                    var hasAddresses = customer.Addresses && customer.Addresses.length > 0 ? true : false;
                    address.IsPrimary = !hasAddresses;
                    if (!customer.Addresses) {
                        customer.Addresses = [];
                    }
                    customer.Addresses.push(address);
                    this.customer = customer;
                };
                SunatLookupCommand.prototype._formatRucResult = function (r, documentNumber) {
                    var lines = [];
                    lines.push("Documento: " + documentNumber);
                    if (r.razon_social) {
                        lines.push("Razón Social: " + r.razon_social);
                    }
                    if (r.condicion) {
                        lines.push("Condición: " + r.condicion);
                    }
                    if (r.estado) {
                        lines.push("Estado: " + r.estado);
                    }
                    if (r.direccion) {
                        lines.push("Dirección: " + r.direccion);
                    }
                    if (r.padrones) {
                        var items = Array.isArray(r.padrones) ? r.padrones : [r.padrones.toString()];
                        if (items.length > 0) {
                            lines.push("");
                            lines.push("Padrones:");
                            for (var i = 0; i < items.length; i++) {
                                lines.push("• " + String(items[i]));
                            }
                            lines.push("");
                        }
                    }
                    if (r.departamento) {
                        lines.push("Departamento: " + r.departamento);
                    }
                    if (r.provincia) {
                        lines.push("Provincia: " + r.provincia);
                    }
                    if (r.distrito) {
                        lines.push("Distrito: " + r.distrito);
                    }
                    return lines.join("\n");
                };
                SunatLookupCommand.prototype._formatApiResult = function (r) {
                    var lines = [];
                    var keys = Object.keys(r);
                    for (var i = 0; i < keys.length; i++) {
                        var key = keys[i];
                        var value = r[key];
                        if (value === null || value === undefined || value === "") {
                            continue;
                        }
                        var text = void 0;
                        if (Array.isArray(value)) {
                            if (value.length === 0) {
                                continue;
                            }
                            var parts = [];
                            for (var j = 0; j < value.length; j++) {
                                var item = value[j];
                                parts.push(item !== null && typeof item === "object" ? JSON.stringify(item) : String(item));
                            }
                            text = parts.join(", ");
                        }
                        else if (typeof value === "object") {
                            text = JSON.stringify(value);
                        }
                        else {
                            text = String(value);
                        }
                        lines.push(this._prettyLabel(key) + ": " + text);
                    }
                    return lines.join("\n");
                };
                SunatLookupCommand.prototype._prettyLabel = function (key) {
                    var words = key.split("_");
                    var out = [];
                    for (var i = 0; i < words.length; i++) {
                        var w = words[i];
                        if (w.length > 0) {
                            out.push(w.charAt(0).toUpperCase() + w.substring(1));
                        }
                    }
                    return out.join(" ");
                };
                SunatLookupCommand.prototype._showMessage = function (title, message) {
                    var dialogOptions = {
                        title: title,
                        message: message,
                        showCloseX: true,
                        button1: { id: "btnOk", label: "OK", result: "OK" }
                    };
                    this.context.runtime.executeAsync(new Dialogs_1.ShowMessageDialogClientRequest(dialogOptions));
                };
                return SunatLookupCommand;
            }(CustomerAddEditView_1.CustomerAddEditExtensionCommandBase));
            exports_1("default", SunatLookupCommand);
        }
    };
});
