System.register(["PosApi/Create/Dialogs", "PosApi/Consume/Customer", "PosApi/Consume/Cart", "PosApi/Consume/Device", "PosApi/Entities", "../../../Services/SunatCustomerService", "../../../DataService/DataServiceRequests.g"], function (exports_1, context_1) {
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
    var Dialogs_1, Customer_1, Cart_1, Device_1, Entities_1, SunatCustomerService_1, DataServiceRequests_g_1, GUARD_KEY, DIAG_PREFIX, CustomerInlineDialog;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (Dialogs_1_1) {
                Dialogs_1 = Dialogs_1_1;
            },
            function (Customer_1_1) {
                Customer_1 = Customer_1_1;
            },
            function (Cart_1_1) {
                Cart_1 = Cart_1_1;
            },
            function (Device_1_1) {
                Device_1 = Device_1_1;
            },
            function (Entities_1_1) {
                Entities_1 = Entities_1_1;
            },
            function (SunatCustomerService_1_1) {
                SunatCustomerService_1 = SunatCustomerService_1_1;
            },
            function (DataServiceRequests_g_1_1) {
                DataServiceRequests_g_1 = DataServiceRequests_g_1_1;
            }
        ],
        execute: function () {
            GUARD_KEY = "__customerInlineDialogActive";
            DIAG_PREFIX = "__diag:";
            CustomerInlineDialog = (function (_super) {
                __extends(CustomerInlineDialog, _super);
                function CustomerInlineDialog() {
                    var _this = _super.call(this) || this;
                    _this._mode = "search";
                    _this._resolve = null;
                    _this._currentCustomer = null;
                    _this._initialSearchText = "";
                    _this._sunatService = new SunatCustomerService_1.default();
                    _this._lastSunatData = null;
                    return _this;
                }
                CustomerInlineDialog.prototype.open = function (mode, customer, initialSearchText) {
                    var _this = this;
                    this._mode = mode;
                    if (["search", "create", "edit"].indexOf(this._mode) === -1) {
                        this._mode = "search";
                    }
                    this._currentCustomer = customer || null;
                    this._initialSearchText = initialSearchText || "";
                    return new Promise(function (resolve) {
                        _this._resolve = resolve;
                        var dialogOptions = {
                            title: "Cliente",
                            button1: {
                                id: "customerInlineClose",
                                label: "Cerrar",
                                isPrimary: true,
                                onClick: _this._closeClickHandler.bind(_this)
                            },
                            onCloseX: _this._closeClickHandler.bind(_this)
                        };
                        _this.openDialog(dialogOptions);
                    });
                };
                CustomerInlineDialog.prototype.onReady = function (element) {
                    var _this = this;
                    this._bindTab(element, "search", "customerInlineTabSearch");
                    this._bindTab(element, "create", "customerInlineTabCreate");
                    this._bindTab(element, "edit", "customerInlineTabEdit");
                    var searchBtn = element.querySelector("#customerInlineSearchBtn");
                    if (searchBtn) {
                        searchBtn.onclick = function () {
                            _this._executeSearch(element, false);
                        };
                    }
                    this._bindAction(element, "customerInlineCreateSunatButton", this._lookupSunatForCreate.bind(this));
                    this._bindAction(element, "customerInlineCreateButton", this._executeCreate.bind(this));
                    this._bindAction(element, "customerInlineEditSunatButton", this._lookupSunatForEdit.bind(this));
                    this._bindAction(element, "customerInlineEditButton", this._updateCustomer.bind(this));
                    if (!this._currentCustomer) {
                        var editTab = element.querySelector("#customerInlineTabEdit");
                        if (editTab) {
                            editTab.style.display = "none";
                        }
                    }
                    this._prefillInitialValues(element);
                    this._setMode(element, this._mode);
                };
                CustomerInlineDialog.prototype._bindTab = function (element, mode, buttonId) {
                    var _this = this;
                    var button = element.querySelector("#" + buttonId);
                    if (button) {
                        button.onclick = function () {
                            _this._setMode(element, mode);
                        };
                    }
                };
                CustomerInlineDialog.prototype._bindAction = function (element, buttonId, action) {
                    var _this = this;
                    var button = element.querySelector("#" + buttonId);
                    if (!button) {
                        return;
                    }
                    button.onclick = function () {
                        button.disabled = true;
                        action(element).then(function () {
                            button.disabled = false;
                        }).catch(function (reason) {
                            button.disabled = false;
                            _this._logError(buttonId + " error: " + _this._stringify(reason));
                            _this._showMessage(element, _this._getErrorMessage(reason));
                        });
                    };
                };
                CustomerInlineDialog.prototype._prefillInitialValues = function (element) {
                    if (this._initialSearchText) {
                        this._setValue(element, "customerInlineSearchText", this._initialSearchText);
                        this._setValue(element, "customerInlineCreateDocument", this._initialSearchText);
                    }
                    if (this._currentCustomer) {
                        this._setValue(element, "customerInlineEditAccount", this._currentCustomer.AccountNumber || "");
                        this._setValue(element, "customerInlineEditDocument", this._sunatService.getDocumentNumber(this._currentCustomer) || "");
                        this._setValue(element, "customerInlineEditName", this._currentCustomer.Name || "");
                        this._setValue(element, "customerInlineEditPhone", this._currentCustomer.Phone || "");
                        this._setValue(element, "customerInlineEditEmail", this._currentCustomer.Email || "");
                        this._showTextResult(element, "customerInlineEditResult", this._formatCustomerSummary(this._currentCustomer));
                    }
                };
                CustomerInlineDialog.prototype._executeSearch = function (element, isPagination) {
                    if (isPagination === void 0) { isPagination = false; }
                    var searchText = this._getValue(element, "customerInlineSearchText") || this._initialSearchText;
                    if (searchText.indexOf(DIAG_PREFIX) === 0) {
                        return this._runSchemaDiagnostic(element, searchText.substring(DIAG_PREFIX.length));
                    }
                    this.closeDialog();
                    if (this._resolve) {
                        this._resolve({
                            mode: "search",
                            action: "native_search",
                            searchText: searchText
                        });
                        this._resolve = null;
                    }
                    return Promise.resolve();
                };
                CustomerInlineDialog.prototype._runSchemaDiagnostic = function (element, argument) {
                    var _this = this;
                    var mode = "Columns";
                    var parameter = argument;
                    var separatorIndex = argument.indexOf("|");
                    if (separatorIndex >= 0) {
                        mode = argument.substring(0, separatorIndex) || "Columns";
                        parameter = argument.substring(separatorIndex + 1);
                    }
                    this._showMessage(element, "Ejecutando diagnóstico " + mode + " (" + parameter + ")...");
                    this._showTextResult(element, "customerInlineSearchResult", "");
                    var request = new DataServiceRequests_g_1.TRU_Diagnostics.RunRequest(mode, parameter);
                    return this.context.runtime.executeAsync(request)
                        .then(function (response) {
                        var rows = (response && response.data && response.data.result) || [];
                        var first = rows.length > 0 ? rows[0] : null;
                        var text = (first && (first.TxtContent || first.ErrorMessage)) || "(sin contenido)";
                        var header = "=== TRU_Diagnostics " + mode + " '" + parameter + "' ===";
                        _this._logChunked(header, text);
                        _this._showTextResult(element, "customerInlineSearchResult", text);
                        _this._showMessage(element, "Diagnóstico listo. Copie el bloque desde la consola (F12).");
                    })
                        .catch(function (reason) {
                        var message = _this._getErrorMessage(reason);
                        _this._logChunked("=== TRU_Diagnostics " + mode + " FALLÓ ===", message);
                        _this._showTextResult(element, "customerInlineSearchResult", message);
                        _this._showMessage(element, "El diagnóstico falló: " + message);
                    });
                };
                CustomerInlineDialog.prototype._logChunked = function (header, body) {
                    var CHUNK_SIZE = 3000;
                    var logger = this.context && this.context.logger;
                    if (typeof console !== "undefined" && console.log) {
                        console.log(header + "\n" + body);
                    }
                    for (var start = 0, part = 1; start < body.length; start += CHUNK_SIZE, part++) {
                        var chunk = header + " [" + part + "] " + body.substring(start, start + CHUNK_SIZE);
                        if (logger && logger.logInformational) {
                            logger.logInformational(chunk);
                        }
                    }
                };
                CustomerInlineDialog.prototype._lookupSunatForCreate = function (element) {
                    var _this = this;
                    var rawDocument = this._getValue(element, "customerInlineCreateDocument");
                    var documentNumber = this._sunatService.normalizeDocument(rawDocument);
                    if (!this._sunatService.getDocumentType(documentNumber)) {
                        this._showMessage(element, "Ingrese un DNI de 8 dígitos o RUC de 11 dígitos válido.");
                        return Promise.resolve();
                    }
                    this._showMessage(element, "Consultando SUNAT...");
                    this._showTextResult(element, "customerInlineCreateResult", "");
                    return this._sunatService.lookup(documentNumber)
                        .then(function (sunatData) {
                        _this._lastSunatData = sunatData;
                        _this._setValue(element, "customerInlineCreateName", sunatData.name || "");
                        _this._setValue(element, "customerInlineCreateAddress", sunatData.address || "");
                        _this._setValue(element, "customerInlineCreateDepartment", sunatData.department || "");
                        _this._setValue(element, "customerInlineCreateProvince", sunatData.province || "");
                        _this._setValue(element, "customerInlineCreateDistrict", sunatData.district || "");
                        _this._setValue(element, "customerInlineCreateCondition", (sunatData.raw && sunatData.raw.condicion) || "");
                        _this._setChecked(element, "customerInlineCreateRetention", sunatData.isRetentionAgent);
                        _this._setChecked(element, "customerInlineCreatePerception", sunatData.isPerceptionAgent);
                        _this._setChecked(element, "customerInlineCreatePublicSector", sunatData.isPublicSector);
                        _this._setChecked(element, "customerInlineCreateEmergencyZone", sunatData.isEmergencyZone);
                        _this._setChecked(element, "customerInlineCreateExoneratedPerception", sunatData.isExoneratedPerception);
                        _this._setChecked(element, "customerInlineCreateFinalConsumer", sunatData.isFinalConsumer);
                        _this._setChecked(element, "customerInlineCreateOthers", sunatData.isOthers);
                        _this._setChecked(element, "customerInlineCreateNotDomiciled", sunatData.isNotDomiciled);
                        _this._showTextResult(element, "customerInlineCreateResult", _this._formatSunatSummary(sunatData));
                        _this._showMessage(element, "Datos obtenidos. Complete si falta algo y presione Crear en Sistema.");
                    });
                };
                CustomerInlineDialog.prototype._executeCreate = function (element) {
                    var rawDocument = this._getValue(element, "customerInlineCreateDocument");
                    var documentNumber = this._sunatService.normalizeDocument(rawDocument);
                    if (!this._sunatService.getDocumentType(documentNumber)) {
                        this._showMessage(element, "Ingrese un documento válido.");
                        return Promise.resolve();
                    }
                    var name = this._getValue(element, "customerInlineCreateName");
                    if (!name) {
                        this._showMessage(element, "El nombre/razón social es obligatorio.");
                        return Promise.resolve();
                    }
                    this._showMessage(element, "Paso 1: Resolviendo dirección (Ubigeo)...");
                    var sunatDataToUse = this._lastSunatData || {
                        documentNumber: documentNumber,
                        documentType: this._sunatService.getDocumentType(documentNumber),
                        name: name
                    };
                    sunatDataToUse.isRetentionAgent = this._getChecked(element, "customerInlineCreateRetention");
                    sunatDataToUse.isPerceptionAgent = this._getChecked(element, "customerInlineCreatePerception");
                    sunatDataToUse.isPublicSector = this._getChecked(element, "customerInlineCreatePublicSector");
                    sunatDataToUse.isEmergencyZone = this._getChecked(element, "customerInlineCreateEmergencyZone");
                    sunatDataToUse.isExoneratedPerception = this._getChecked(element, "customerInlineCreateExoneratedPerception");
                    sunatDataToUse.isFinalConsumer = this._getChecked(element, "customerInlineCreateFinalConsumer");
                    sunatDataToUse.isOthers = this._getChecked(element, "customerInlineCreateOthers");
                    sunatDataToUse.isNotDomiciled = this._getChecked(element, "customerInlineCreateNotDomiciled");
                    sunatDataToUse.address = this._getValue(element, "customerInlineCreateAddress");
                    sunatDataToUse.department = this._getValue(element, "customerInlineCreateDepartment");
                    sunatDataToUse.province = this._getValue(element, "customerInlineCreateProvince");
                    sunatDataToUse.district = this._getValue(element, "customerInlineCreateDistrict");
                    return this._resolveAndCreateCustomer(element, sunatDataToUse, name, this._getValue(element, "customerInlineCreatePhone"), this._getValue(element, "customerInlineCreateEmail"));
                };
                CustomerInlineDialog.prototype._resolveAndCreateCustomer = function (element, sunatData, overrideName, phone, email) {
                    var _this = this;
                    var customer = new Entities_1.ProxyEntities.CustomerClass({});
                    this._sunatService.applySunatIdentity(customer, sunatData);
                    customer.Name = overrideName || customer.Name;
                    customer.Phone = phone || "";
                    customer.Email = email || "";
                    var resolvePromise = Promise.resolve(null);
                    if (sunatData.department || sunatData.province || sunatData.district) {
                        var request = new DataServiceRequests_g_1.TRU_GeographicData.ResolveUbigeoRequest(sunatData.department || "", sunatData.province || "", sunatData.district || "");
                        resolvePromise = this.context.runtime.executeAsync(request)
                            .then(function (response) {
                            if (response && response.data && response.data.result && response.data.result.length > 0) {
                                return response.data.result[0];
                            }
                            return null;
                        })
                            .catch(function (error) {
                            _this._logError("ResolveUbigeo error: " + _this._stringify(error));
                            return null;
                        });
                    }
                    return resolvePromise.then(function (u) {
                        var addressStreet = _this._getValue(element, "customerInlineCreateAddress");
                        _this._logChunked("=== ResolveUbigeo ===", u
                            ? "IsValid=" + u.IsValid
                                + " | StateId=" + (u.StateId || "(vacio)")
                                + " | CountyId=" + (u.CountyId || "(vacio)")
                                + " | CityName=" + (u.CityName || "(vacio)")
                                + " | Notes=" + (u.Notes || "")
                            : "sin resultado (no se consultó o falló)");
                        if ((u && u.IsValid) || addressStreet) {
                            var addressPurpose = _this._getValue(element, "customerInlineCreateAddressPurpose") || "Negocio";
                            var address = new Entities_1.ProxyEntities.AddressClass();
                            address.ThreeLetterISORegionName = "PER";
                            address.Name = addressPurpose;
                            address.Street = addressStreet;
                            address.IsPrimary = true;
                            address.RecordId = 0;
                            address.Deactivate = false;
                            if (addressPurpose === "Entrega") {
                                address.AddressTypeValue = Entities_1.ProxyEntities.AddressType.Delivery;
                            }
                            else if (addressPurpose === "Factura") {
                                address.AddressTypeValue = Entities_1.ProxyEntities.AddressType.Invoice;
                            }
                            else if (addressPurpose === "Casa") {
                                address.AddressTypeValue = Entities_1.ProxyEntities.AddressType.Home;
                            }
                            else {
                                address.AddressTypeValue = Entities_1.ProxyEntities.AddressType.Business;
                            }
                            address.ExtensionProperties = [];
                            if (u && u.IsValid) {
                                address.State = u.StateId;
                                address.County = u.CountyId;
                                address.City = u.CityName;
                                address.DistrictName = sunatData.district || "";
                            }
                            customer.Addresses = [address];
                            _this._logChunked("=== Address enviada ===", _this._stringify(address));
                        }
                        else {
                            _this._logChunked("=== Address NO enviada ===", "ubigeo invalido y calle vacia — el cliente se crea sin direccion");
                        }
                        _this._showMessage(element, "Paso 2: Aplicando valores por defecto del canal...");
                        return _this._applyChannelDefaults(customer).then(function () {
                            _this._showMessage(element, "Paso 3: Registrando cliente en D365...");
                            var createRequest = new Customer_1.CreateCustomerServiceRequest(_this._getCorrelationId(), customer);
                            return _this.context.runtime.executeAsync(createRequest)
                                .then(function (response) {
                                if (response.canceled || !response.data || !response.data.customer) {
                                    _this._showMessage(element, "La creación del cliente falló o fue cancelada por el sistema.");
                                    return Promise.resolve();
                                }
                                var createdCustomer = response.data.customer;
                                var accountNumber = createdCustomer.AccountNumber || "";
                                var savedAddresses = createdCustomer.Addresses || [];
                                _this._logChunked("=== Cliente creado ===", "AccountNumber=" + accountNumber
                                    + " | CustomerGroup=" + (createdCustomer.CustomerGroup || "(vacio)")
                                    + " | CurrencyCode=" + (createdCustomer.CurrencyCode || "(vacio)")
                                    + " | Addresses devueltas=" + savedAddresses.length
                                    + (savedAddresses.length > 0 ? "\n" + _this._stringify(savedAddresses) : ""));
                                if (!accountNumber) {
                                    _this._showMessage(element, "Cliente creado pero sin número de cuenta.");
                                    return Promise.resolve();
                                }
                                return _this._ensureAddressPersisted(element, accountNumber, customer.Addresses || [])
                                    .then(function () {
                                    _this._showMessage(element, "Paso 4: Asignando nuevo cliente a la venta...");
                                    return _this._setCustomerOnCartAndClose(element, accountNumber);
                                });
                            });
                        });
                    });
                };
                CustomerInlineDialog.prototype._ensureAddressPersisted = function (element, accountNumber, intendedAddresses) {
                    var _this = this;
                    if (!intendedAddresses || intendedAddresses.length === 0) {
                        return Promise.resolve();
                    }
                    return this._getCustomerByAccount(accountNumber)
                        .then(function (persisted) {
                        var existing = (persisted && persisted.Addresses) || [];
                        _this._logChunked("=== Direccion tras releer el cliente ===", "Addresses=" + existing.length
                            + (existing.length > 0 ? "\n" + _this._stringify(existing) : ""));
                        if (!persisted || existing.length > 0) {
                            return Promise.resolve();
                        }
                        _this._showMessage(element, "La dirección no quedó en el alta; reintentando...");
                        var retryCustomer = _this._cloneCustomer(persisted);
                        retryCustomer.Addresses = intendedAddresses;
                        var updateRequest = new Customer_1.UpdateCustomerServiceRequest(_this._getCorrelationId(), retryCustomer);
                        return _this.context.runtime.executeAsync(updateRequest)
                            .then(function (response) {
                            var updated = response && response.data && response.data.customer;
                            var after = (updated && updated.Addresses) || [];
                            _this._logChunked("=== Reintento de direccion ===", "Addresses=" + after.length
                                + (after.length > 0 ? "\n" + _this._stringify(after) : " (el reintento tampoco la guardó)"));
                        });
                    })
                        .catch(function (reason) {
                        _this._logError("_ensureAddressPersisted error: " + _this._stringify(reason));
                        _this._logChunked("=== Reintento de direccion FALLO ===", _this._getErrorMessage(reason));
                    });
                };
                CustomerInlineDialog.prototype._setCustomerOnCartAndClose = function (element, accountNumber) {
                    var _this = this;
                    return this._setCustomerOnCart(accountNumber)
                        .then(function () {
                        _this._complete({
                            mode: "create",
                            action: "createAndSetCustomerOnCart",
                            customerAccountNumber: accountNumber
                        });
                    })
                        .catch(function (reason) {
                        _this._logError("SetCustomerOnCart error: " + _this._stringify(reason));
                        _this._showMessage(element, "Cliente " + accountNumber + " creado, pero no se pudo asignar a la venta: "
                            + _this._getErrorMessage(reason));
                    });
                };
                CustomerInlineDialog.prototype._applyChannelDefaults = function (customer) {
                    var _this = this;
                    if (!customer.AccountNumber) {
                        customer.AccountNumber = "";
                    }
                    var channelPromise = this.context.runtime
                        .executeAsync(new Device_1.GetChannelConfigurationClientRequest(this._getCorrelationId()))
                        .then(function (response) {
                        var config = response && response.data && response.data.result;
                        if (!config) {
                            return;
                        }
                        if (!customer.CurrencyCode && config.Currency) {
                            customer.CurrencyCode = config.Currency;
                        }
                        if (!customer.Language && config.DefaultLanguageId) {
                            customer.Language = config.DefaultLanguageId;
                        }
                        if (!customer.ReceiptSettings && config.ReceiptSettingsValue) {
                            customer.ReceiptSettings = config.ReceiptSettingsValue;
                        }
                    })
                        .catch(function (reason) {
                        _this._logError("GetChannelConfiguration error: " + _this._stringify(reason));
                    });
                    return channelPromise
                        .then(function () {
                        if (customer.CustomerGroup) {
                            return Promise.resolve(null);
                        }
                        return _this.context.runtime
                            .executeAsync(new Cart_1.GetCurrentCartClientRequest(_this._getCorrelationId()))
                            .then(function (response) {
                            var cart = response && response.data && response.data.result;
                            var templateAccount = (cart && cart.CustomerId) || "";
                            if (!templateAccount) {
                                return Promise.resolve(null);
                            }
                            return _this._getCustomerByAccount(templateAccount);
                        });
                    })
                        .then(function (template) {
                        if (!template) {
                            return;
                        }
                        if (!customer.CustomerGroup && template.CustomerGroup) {
                            customer.CustomerGroup = template.CustomerGroup;
                        }
                        if (!customer.CurrencyCode && template.CurrencyCode) {
                            customer.CurrencyCode = template.CurrencyCode;
                        }
                        if (!customer.Language && template.Language) {
                            customer.Language = template.Language;
                        }
                    })
                        .catch(function (reason) {
                        _this._logError("Channel defaults (template customer) error: " + _this._stringify(reason));
                    });
                };
                CustomerInlineDialog.prototype._lookupSunatForEdit = function (element) {
                    var _this = this;
                    var documentNumber = this._sunatService.normalizeDocument(this._getValue(element, "customerInlineEditDocument"));
                    if (!this._sunatService.getDocumentType(documentNumber)) {
                        this._showMessage(element, "Ingrese un DNI de 8 dígitos o RUC de 11 dígitos.");
                        return Promise.resolve();
                    }
                    this._showMessage(element, "Consultando SUNAT para comparar antes de editar...");
                    return this._sunatService.lookup(documentNumber)
                        .then(function (sunatData) {
                        if (!_this._getValue(element, "customerInlineEditName")) {
                            _this._setValue(element, "customerInlineEditName", sunatData.name || "");
                        }
                        var differences = _this._currentCustomer ? _this._sunatService.compareWithCustomer(_this._currentCustomer, sunatData) : [];
                        _this._showTextResult(element, "customerInlineEditResult", _this._formatSunatSummary(sunatData) + "\n" + differences.join("\n"));
                        _this._showMessage(element, "SUNAT consultado. Revise diferencias y confirme Guardar.");
                    });
                };
                CustomerInlineDialog.prototype._updateCustomer = function (element) {
                    var _this = this;
                    return this._loadCustomerForEdit(element)
                        .then(function (customer) {
                        var documentNumber = _this._sunatService.normalizeDocument(_this._getValue(element, "customerInlineEditDocument"));
                        _this._applyEditableFields(customer, _this._getValue(element, "customerInlineEditName"), _this._getValue(element, "customerInlineEditPhone"), _this._getValue(element, "customerInlineEditEmail"));
                        var updateWithCustomer = function (customerToUpdate) {
                            var request = new Customer_1.UpdateCustomerServiceRequest(_this._getCorrelationId(), customerToUpdate);
                            return _this.context.runtime.executeAsync(request)
                                .then(function (response) {
                                if (response.canceled || !response.data || !response.data.customer) {
                                    _this._showMessage(element, "La actualización fue cancelada.");
                                    return Promise.resolve();
                                }
                                var updatedCustomer = response.data.customer;
                                var accountNumber = updatedCustomer.AccountNumber || _this._getValue(element, "customerInlineEditAccount");
                                return _this._setCustomerOnCart(accountNumber)
                                    .then(function () {
                                    _this._complete({
                                        mode: "edit",
                                        action: "updateAndSetCustomerOnCart",
                                        customerAccountNumber: accountNumber
                                    });
                                })
                                    .catch(function (reason) {
                                    _this._logError("SetCustomerOnCart error: " + _this._stringify(reason));
                                    _this._showMessage(element, "Cliente actualizado, pero no se pudo asignar a la venta: "
                                        + _this._getErrorMessage(reason));
                                });
                            });
                        };
                        if (!documentNumber) {
                            return updateWithCustomer(customer);
                        }
                        if (!_this._sunatService.getDocumentType(documentNumber)) {
                            _this._showMessage(element, "El documento debe ser válido.");
                            return Promise.resolve();
                        }
                        _this._showMessage(element, "Validando SUNAT antes de guardar cambios...");
                        return _this._sunatService.lookup(documentNumber)
                            .then(function (sunatData) {
                            _this._sunatService.applySunatMetadata(customer, sunatData);
                            return updateWithCustomer(customer);
                        });
                    });
                };
                CustomerInlineDialog.prototype._setCustomerOnCart = function (accountNumber) {
                    var request = new Cart_1.SetCustomerOnCartOperationRequest(this._getCorrelationId(), accountNumber);
                    return this.context.runtime.executeAsync(request)
                        .then(function (response) {
                        if (response.canceled) {
                            throw new Error("La asignación del cliente a la venta fue cancelada.");
                        }
                    });
                };
                CustomerInlineDialog.prototype._getCustomerByAccount = function (accountNumber) {
                    var request = new Customer_1.GetCustomerClientRequest(accountNumber, this._getCorrelationId());
                    return this.context.runtime.executeAsync(request)
                        .then(function (response) {
                        if (response.canceled || !response.data || !response.data.result) {
                            return null;
                        }
                        return response.data.result;
                    });
                };
                CustomerInlineDialog.prototype._loadCustomerForEdit = function (element) {
                    var _this = this;
                    if (this._currentCustomer) {
                        return Promise.resolve(this._cloneCustomer(this._currentCustomer));
                    }
                    var accountNumber = this._getValue(element, "customerInlineEditAccount");
                    if (!accountNumber) {
                        return Promise.reject(new Error("Ingrese la cuenta del cliente a editar."));
                    }
                    return this._getCustomerByAccount(accountNumber)
                        .then(function (customer) {
                        if (!customer)
                            throw new Error("No se encontro el cliente en el sistema.");
                        return _this._cloneCustomer(customer);
                    });
                };
                CustomerInlineDialog.prototype._cloneCustomer = function (customer) {
                    var customerCopy = {};
                    try {
                        customerCopy = JSON.parse(JSON.stringify(customer || {}));
                    }
                    catch (error) {
                        customerCopy = customer || {};
                    }
                    return new Entities_1.ProxyEntities.CustomerClass(customerCopy);
                };
                CustomerInlineDialog.prototype._applyEditableFields = function (customer, name, phone, email) {
                    customer.Name = name || customer.Name || "";
                    customer.Phone = phone || "";
                    customer.Email = email || "";
                };
                CustomerInlineDialog.prototype._setMode = function (element, mode) {
                    this._mode = mode;
                    this._toggle(element, "customerInlineTabSearch", mode === "search");
                    this._toggle(element, "customerInlineTabCreate", mode === "create");
                    this._toggle(element, "customerInlineTabEdit", mode === "edit");
                    this._toggle(element, "customerInlinePanelSearch", mode === "search");
                    this._toggle(element, "customerInlinePanelCreate", mode === "create");
                    this._toggle(element, "customerInlinePanelEdit", mode === "edit");
                    if (mode === "search") {
                        this._showMessage(element, "Busque clientes existentes por documento, nombre o cuenta.");
                    }
                    else if (mode === "create") {
                        this._showMessage(element, "El cliente será creado directamente validando la data desde SUNAT.");
                    }
                    else {
                        this._showMessage(element, "Edite el cliente actual.");
                    }
                };
                CustomerInlineDialog.prototype._toggle = function (element, id, active) {
                    var target = element.querySelector("#" + id);
                    if (!target)
                        return;
                    if (active)
                        target.classList.add("is-active");
                    else
                        target.classList.remove("is-active");
                };
                CustomerInlineDialog.prototype._showMessage = function (element, message) {
                    var messageElement = element.querySelector("#customerInlineMessage");
                    if (messageElement)
                        messageElement.textContent = message;
                };
                CustomerInlineDialog.prototype._showTextResult = function (element, id, message) {
                    var target = element.querySelector("#" + id);
                    if (target)
                        target.textContent = message || "";
                };
                CustomerInlineDialog.prototype._getValue = function (element, id) {
                    var target = element.querySelector("#" + id);
                    return target && target.value ? target.value.trim() : "";
                };
                CustomerInlineDialog.prototype._setValue = function (element, id, value) {
                    var target = element.querySelector("#" + id);
                    if (target)
                        target.value = value || "";
                };
                CustomerInlineDialog.prototype._getChecked = function (element, id) {
                    var target = element.querySelector("#" + id);
                    return target ? target.checked : false;
                };
                CustomerInlineDialog.prototype._setChecked = function (element, id, value) {
                    var target = element.querySelector("#" + id);
                    if (target)
                        target.checked = value || false;
                };
                CustomerInlineDialog.prototype._formatCustomerSummary = function (customer) {
                    if (!customer)
                        return "";
                    return [
                        "Cliente del sistema",
                        "Cuenta: " + (customer.AccountNumber || ""),
                        "Nombre: " + (customer.Name || ""),
                        "Documento fiscal: " + (this._sunatService.getDocumentNumber(customer) || "Sin documento")
                    ].join("\n");
                };
                CustomerInlineDialog.prototype._formatSunatSummary = function (sunatData) {
                    var lines = [
                        "SUNAT " + sunatData.documentType + ": " + sunatData.documentNumber,
                        "Nombre: " + (sunatData.name || "")
                    ];
                    if (sunatData.padronesText)
                        lines.push("Padrones: " + sunatData.padronesText);
                    return lines.join("\n");
                };
                CustomerInlineDialog.prototype._getCorrelationId = function () {
                    var logger = this.context && this.context.logger;
                    if (logger && logger.getNewCorrelationId)
                        return logger.getNewCorrelationId();
                    return "customer-inline-" + new Date().getTime().toString();
                };
                CustomerInlineDialog.prototype._complete = function (result) {
                    window[GUARD_KEY] = false;
                    if (this._resolve) {
                        this._resolve(result);
                        this._resolve = null;
                    }
                    this.closeDialog();
                };
                CustomerInlineDialog.prototype._closeClickHandler = function () {
                    window[GUARD_KEY] = false;
                    if (this._resolve) {
                        this._resolve(null);
                        this._resolve = null;
                    }
                    return true;
                };
                CustomerInlineDialog.prototype._getErrorMessage = function (reason) {
                    try {
                        if (typeof reason === "string")
                            return reason;
                        if (Array.isArray(reason) && reason.length > 0) {
                            var first = reason[0];
                            if (first && first.message)
                                return first.message;
                            if (first && first.ErrorCode)
                                return "Error Code: " + first.ErrorCode;
                            return JSON.stringify(reason);
                        }
                        if (reason && reason.message)
                            return reason.message;
                        if (reason && reason.ErrorCode)
                            return "Error Code: " + reason.ErrorCode;
                        if (reason)
                            return JSON.stringify(reason);
                    }
                    catch (e) {
                    }
                    return "Error desconocido. Revise F12.";
                };
                CustomerInlineDialog.prototype._stringify = function (value) {
                    try {
                        return JSON.stringify(value);
                    }
                    catch (error) {
                        return value ? value.toString() : "";
                    }
                };
                CustomerInlineDialog.prototype._logError = function (message) {
                    if (this.context && this.context.logger)
                        this.context.logger.logError(message);
                };
                return CustomerInlineDialog;
            }(Dialogs_1.ExtensionTemplatedDialogBase));
            exports_1("default", CustomerInlineDialog);
        }
    };
});
