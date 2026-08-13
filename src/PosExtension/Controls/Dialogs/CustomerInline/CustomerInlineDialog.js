System.register(["PosApi/Create/Dialogs", "PosApi/Consume/Customer", "PosApi/Consume/Cart", "PosApi/Entities", "../../../Services/SunatCustomerService", "../../../DataService/DataServiceRequests.g"], function (exports_1, context_1) {
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
    var Dialogs_1, Customer_1, Cart_1, Entities_1, SunatCustomerService_1, DataServiceRequests_g_1, GUARD_KEY, CustomerInlineDialog;
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
            CustomerInlineDialog = (function (_super) {
                __extends(CustomerInlineDialog, _super);
                function CustomerInlineDialog() {
                    var _this = _super.call(this) || this;
                    _this._mode = "searchcreate";
                    _this._resolve = null;
                    _this._currentCustomer = null;
                    _this._initialSearchText = "";
                    _this._sunatService = new SunatCustomerService_1.default();
                    return _this;
                }
                CustomerInlineDialog.prototype.open = function (mode, customer, initialSearchText) {
                    var _this = this;
                    this._mode = mode === "edit" ? "edit" : "searchcreate";
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
                    this._bindTab(element, "searchcreate", "customerInlineTabSearchCreate");
                    this._bindTab(element, "edit", "customerInlineTabEdit");
                    this._bindAction(element, "customerInlineSearchCreateButton", this._processDocument.bind(this));
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
                        this._setValue(element, "customerInlineSearchDocument", this._initialSearchText);
                    }
                    if (this._currentCustomer) {
                        this._setValue(element, "customerInlineEditAccount", this._currentCustomer.AccountNumber || "");
                        this._setValue(element, "customerInlineEditDocument", this._sunatService.getDocumentNumber(this._currentCustomer));
                        this._setValue(element, "customerInlineEditName", this._currentCustomer.Name || "");
                        this._setValue(element, "customerInlineEditPhone", this._currentCustomer.Phone || "");
                        this._setValue(element, "customerInlineEditEmail", this._currentCustomer.Email || "");
                        this._showTextResult(element, "customerInlineEditResult", this._formatCustomerSummary(this._currentCustomer));
                    }
                };
                CustomerInlineDialog.prototype._processDocument = function (element) {
                    var _this = this;
                    var rawDocument = this._getValue(element, "customerInlineSearchDocument");
                    var documentNumber = this._sunatService.normalizeDocument(rawDocument);
                    if (!this._sunatService.getDocumentType(documentNumber)) {
                        this._showMessage(element, "Ingrese un DNI de 8 dígitos o RUC de 11 dígitos válido.");
                        return Promise.resolve();
                    }
                    this._showMessage(element, "Paso 1: Buscando cliente en Store Commerce...");
                    this._showTextResult(element, "customerInlineSearchCreateResult", "");
                    return this._selectCustomerFromSystem(documentNumber)
                        .then(function (customer) {
                        if (customer) {
                            _this._showMessage(element, "Cliente encontrado en el sistema. Asignando a la venta...");
                            var accountNumber_1 = customer.AccountNumber || "";
                            if (!accountNumber_1) {
                                _this._showMessage(element, "El cliente del sistema no tiene número de cuenta.");
                                return Promise.resolve();
                            }
                            return _this._setCustomerOnCart(accountNumber_1).then(function () {
                                _this._complete({
                                    mode: "searchcreate",
                                    action: "searchAndSetCustomerOnCart",
                                    customerAccountNumber: accountNumber_1
                                });
                            });
                        }
                        else {
                            _this._showMessage(element, "Paso 2: Consultando SUNAT para crear cliente...");
                            return _this._sunatService.lookup(documentNumber)
                                .then(function (sunatData) {
                                _this._showMessage(element, "Paso 3: Resolviendo dirección (Ubigeo)...");
                                return _this._resolveAndCreateCustomer(element, sunatData);
                            });
                        }
                    });
                };
                CustomerInlineDialog.prototype._resolveAndCreateCustomer = function (element, sunatData) {
                    var _this = this;
                    var customer = new Entities_1.ProxyEntities.CustomerClass({});
                    this._sunatService.applySunatIdentity(customer, sunatData);
                    var resolvePromise = Promise.resolve(null);
                    if (sunatData.documentType === "RUC" && (sunatData.department || sunatData.province)) {
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
                        if (u && u.IsValid) {
                            var address = new Entities_1.ProxyEntities.AddressClass();
                            address.AddressTypeValue = 2;
                            address.ThreeLetterISORegionName = "PER";
                            address.Name = "DOMICILIO FISCAL";
                            address.Street = (sunatData.address || "").trim();
                            address.State = u.StateId;
                            address.County = u.CountyId;
                            address.City = u.CityName;
                            address.IsPrimary = true;
                            customer.Addresses = [address];
                        }
                        _this._showMessage(element, "Paso 4: Registrando cliente en D365...");
                        var createRequest = new Customer_1.CreateCustomerServiceRequest(_this._getCorrelationId(), customer);
                        return _this.context.runtime.executeAsync(createRequest)
                            .then(function (response) {
                            if (response.canceled || !response.data || !response.data.customer) {
                                _this._showMessage(element, "La creación del cliente falló o fue cancelada.");
                                return Promise.resolve();
                            }
                            var createdCustomer = response.data.customer;
                            var accountNumber = createdCustomer.AccountNumber || "";
                            if (!accountNumber) {
                                _this._showMessage(element, "Cliente creado pero sin número de cuenta.");
                                return Promise.resolve();
                            }
                            _this._showMessage(element, "Paso 5: Asignando nuevo cliente a la venta...");
                            return _this._setCustomerOnCart(accountNumber).then(function () {
                                _this._complete({
                                    mode: "searchcreate",
                                    action: "createAndSetCustomerOnCart",
                                    customerAccountNumber: accountNumber
                                });
                            });
                        });
                    });
                };
                CustomerInlineDialog.prototype._selectCustomerFromSystem = function (searchText) {
                    var request = new Customer_1.SelectCustomerClientRequest(this._getCorrelationId(), searchText);
                    return this.context.runtime.executeAsync(request)
                        .then(function (response) {
                        if (response.canceled || !response.data || !response.data.result) {
                            return null;
                        }
                        return response.data.result;
                    })
                        .catch(function () {
                        return null;
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
                                return _this._setCustomerOnCart(accountNumber).then(function () {
                                    _this._complete({
                                        mode: "edit",
                                        action: "updateAndSetCustomerOnCart",
                                        customerAccountNumber: accountNumber
                                    });
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
                    this._toggle(element, "customerInlineTabSearchCreate", mode === "searchcreate");
                    this._toggle(element, "customerInlineTabEdit", mode === "edit");
                    this._toggle(element, "customerInlinePanelSearchCreate", mode === "searchcreate");
                    this._toggle(element, "customerInlinePanelEdit", mode === "edit");
                    this._showMessage(element, mode === "edit" ? "Edite el cliente actual." : "Si no existe en D365, se consultará en SUNAT automáticamente.");
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
                    if (reason && reason.message)
                        return reason.message;
                    return "No se pudo completar la acción. Revise el log del POS.";
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
