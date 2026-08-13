System.register(["PosApi/Create/Dialogs", "PosApi/Consume/Customer", "PosApi/Consume/Cart", "PosApi/Entities", "../../../Services/SunatCustomerService"], function (exports_1, context_1) {
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
    var Dialogs_1, Customer_1, Cart_1, Entities_1, SunatCustomerService_1, CustomerInlineDialog;
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
            }
        ],
        execute: function () {
            CustomerInlineDialog = (function (_super) {
                __extends(CustomerInlineDialog, _super);
                function CustomerInlineDialog() {
                    var _this = _super.call(this) || this;
                    _this._mode = "search";
                    _this._resolve = null;
                    _this._currentCustomer = null;
                    _this._selectedCustomer = null;
                    _this._initialSearchText = "";
                    _this._sunatService = new SunatCustomerService_1.default();
                    _this._sunatByDocument = {};
                    return _this;
                }
                CustomerInlineDialog.prototype.open = function (mode, customer, initialSearchText) {
                    var _this = this;
                    this._mode = mode;
                    this._currentCustomer = customer || null;
                    this._selectedCustomer = null;
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
                    this._bindTab(element, "search", "customerInlineTabSearch");
                    this._bindTab(element, "create", "customerInlineTabCreate");
                    this._bindTab(element, "edit", "customerInlineTabEdit");
                    this._bindAction(element, "customerInlineSearchButton", this._searchAndSetCustomer.bind(this));
                    this._bindAction(element, "customerInlineSearchSunatButton", this._validateSearchWithSunat.bind(this));
                    this._bindAction(element, "customerInlineCreateSunatButton", this._lookupSunatForCreate.bind(this));
                    this._bindAction(element, "customerInlineCreateButton", this._createCustomer.bind(this));
                    this._bindAction(element, "customerInlineEditSunatButton", this._lookupSunatForEdit.bind(this));
                    this._bindAction(element, "customerInlineEditButton", this._updateCustomer.bind(this));
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
                    }
                    if (this._currentCustomer) {
                        this._setValue(element, "customerInlineEditAccount", this._currentCustomer.AccountNumber || "");
                        this._setValue(element, "customerInlineEditDocument", this._sunatService.getDocumentNumber(this._currentCustomer));
                        this._setValue(element, "customerInlineEditName", this._currentCustomer.Name || "");
                        this._setValue(element, "customerInlineEditPhone", this._currentCustomer.Phone || "");
                        this._setValue(element, "customerInlineEditEmail", this._currentCustomer.Email || "");
                        this._showCustomerResult(element, "customerInlineEditResult", this._currentCustomer);
                    }
                };
                CustomerInlineDialog.prototype._searchAndSetCustomer = function (element) {
                    var _this = this;
                    var searchText = this._getValue(element, "customerInlineSearchText");
                    var searchType = this._getValue(element, "customerInlineSearchType");
                    if (!searchText) {
                        this._showMessage(element, "Ingrese cuenta, DNI/RUC o nombre para buscar en el sistema.");
                        return Promise.resolve();
                    }
                    this._showMessage(element, "Buscando cliente en Store Commerce/D365...");
                    return this._findCustomerInSystem(searchText, searchType)
                        .then(function (customer) {
                        if (!customer) {
                            _this._showMessage(element, "No se selecciono ningun cliente del sistema.");
                            return Promise.resolve();
                        }
                        _this._selectedCustomer = customer;
                        _this._showCustomerResult(element, "customerInlineSearchResult", customer);
                        var accountNumber = customer.AccountNumber || "";
                        if (!accountNumber) {
                            _this._showMessage(element, "El cliente seleccionado no tiene numero de cuenta para asignar a la venta.");
                            return Promise.resolve();
                        }
                        return _this._setCustomerOnCart(accountNumber).then(function () {
                            _this._showMessage(element, "Cliente del sistema asignado a la venta. Puede validar SUNAT sin sobrescribir o cerrar.");
                        });
                    });
                };
                CustomerInlineDialog.prototype._validateSearchWithSunat = function (element) {
                    var _this = this;
                    var customer = this._selectedCustomer || this._currentCustomer;
                    var documentNumber = this._sunatService.normalizeDocument(this._getValue(element, "customerInlineSearchText"));
                    if (!this._sunatService.getDocumentType(documentNumber) && customer) {
                        documentNumber = this._sunatService.getDocumentNumber(customer);
                    }
                    if (!this._sunatService.getDocumentType(documentNumber)) {
                        this._showMessage(element, "Para validar SUNAT ingrese o seleccione un cliente con DNI/RUC fiscal.");
                        return Promise.resolve();
                    }
                    this._showMessage(element, "Validando contra SUNAT sin modificar el cliente del sistema...");
                    return this._getSunatData(documentNumber)
                        .then(function (sunatData) {
                        var differences = customer ? _this._sunatService.compareWithCustomer(customer, sunatData) : [
                            "SUNAT validado. Seleccione el cliente del sistema para comparar trazabilidad."
                        ];
                        _this._showTextResult(element, "customerInlineSearchResult", _this._formatSunatSummary(sunatData) + "\n" + differences.join("\n"));
                        _this._showMessage(element, "SUNAT se uso solo como validacion. No se actualizo ningun dato del cliente.");
                    });
                };
                CustomerInlineDialog.prototype._lookupSunatForCreate = function (element) {
                    var _this = this;
                    var documentNumber = this._sunatService.normalizeDocument(this._getValue(element, "customerInlineCreateDocument"));
                    if (!this._sunatService.getDocumentType(documentNumber)) {
                        this._showMessage(element, "Ingrese un DNI de 8 digitos o RUC de 11 digitos.");
                        return Promise.resolve();
                    }
                    this._showMessage(element, "Consultando SUNAT para prellenar el cliente...");
                    return this._getSunatData(documentNumber)
                        .then(function (sunatData) {
                        _this._setValue(element, "customerInlineCreateName", sunatData.name || "");
                        _this._showTextResult(element, "customerInlineCreateSunatResult", _this._formatSunatSummary(sunatData));
                        _this._showMessage(element, "Datos SUNAT cargados como sugerencia. Revise y confirme Crear.");
                    });
                };
                CustomerInlineDialog.prototype._createCustomer = function (element) {
                    var _this = this;
                    var documentNumber = this._sunatService.normalizeDocument(this._getValue(element, "customerInlineCreateDocument"));
                    if (!this._sunatService.getDocumentType(documentNumber)) {
                        this._showMessage(element, "Para crear con trazabilidad ingrese DNI o RUC valido.");
                        return Promise.resolve();
                    }
                    this._showMessage(element, "Validando SUNAT antes de crear el cliente...");
                    return this._getSunatData(documentNumber)
                        .then(function (sunatData) {
                        var customer = new Entities_1.ProxyEntities.CustomerClass({});
                        _this._sunatService.applySunatIdentity(customer, sunatData);
                        _this._applyEditableFields(customer, _this._getValue(element, "customerInlineCreateName") || sunatData.name, _this._getValue(element, "customerInlineCreatePhone"), _this._getValue(element, "customerInlineCreateEmail"));
                        var request = new Customer_1.CreateCustomerServiceRequest(_this._getCorrelationId(), customer);
                        return _this.context.runtime.executeAsync(request)
                            .then(function (response) {
                            if (response.canceled || !response.data || !response.data.customer) {
                                _this._showMessage(element, "La creacion del cliente fue cancelada o no devolvio cliente.");
                                return Promise.resolve();
                            }
                            var createdCustomer = response.data.customer;
                            var accountNumber = createdCustomer.AccountNumber || "";
                            if (!accountNumber) {
                                _this._showCustomerResult(element, "customerInlineCreateSunatResult", createdCustomer);
                                _this._showMessage(element, "Cliente creado, pero no se recibio cuenta para asignarlo a la venta.");
                                return Promise.resolve();
                            }
                            return _this._setCustomerOnCart(accountNumber).then(function () {
                                _this._complete({
                                    mode: "create",
                                    action: "createAndSetCustomerOnCart",
                                    customerAccountNumber: accountNumber
                                });
                            });
                        });
                    });
                };
                CustomerInlineDialog.prototype._lookupSunatForEdit = function (element) {
                    var _this = this;
                    var documentNumber = this._sunatService.normalizeDocument(this._getValue(element, "customerInlineEditDocument"));
                    if (!this._sunatService.getDocumentType(documentNumber)) {
                        this._showMessage(element, "Ingrese un DNI de 8 digitos o RUC de 11 digitos.");
                        return Promise.resolve();
                    }
                    this._showMessage(element, "Consultando SUNAT para comparar antes de editar...");
                    return this._getSunatData(documentNumber)
                        .then(function (sunatData) {
                        if (!_this._getValue(element, "customerInlineEditName")) {
                            _this._setValue(element, "customerInlineEditName", sunatData.name || "");
                        }
                        var differences = _this._currentCustomer ? _this._sunatService.compareWithCustomer(_this._currentCustomer, sunatData) : [
                            "SUNAT validado. Cargue la cuenta del cliente para comparar contra el sistema."
                        ];
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
                                    _this._showMessage(element, "La actualizacion fue cancelada o no devolvio cliente.");
                                    return Promise.resolve();
                                }
                                var updatedCustomer = response.data.customer;
                                var accountNumber = updatedCustomer.AccountNumber || _this._getValue(element, "customerInlineEditAccount");
                                if (!accountNumber) {
                                    _this._showMessage(element, "Cliente actualizado, pero no se recibio cuenta para asignarlo a la venta.");
                                    return Promise.resolve();
                                }
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
                            _this._showMessage(element, "El documento de edicion debe ser DNI de 8 digitos o RUC de 11 digitos.");
                            return Promise.resolve();
                        }
                        _this._showMessage(element, "Validando SUNAT antes de guardar cambios...");
                        return _this._getSunatData(documentNumber)
                            .then(function (sunatData) {
                            _this._sunatService.applySunatMetadata(customer, sunatData);
                            return updateWithCustomer(customer);
                        });
                    });
                };
                CustomerInlineDialog.prototype._findCustomerInSystem = function (searchText, searchType) {
                    var _this = this;
                    if (searchType === "account") {
                        return this._getCustomerByAccount(searchText)
                            .then(function (customer) {
                            return customer ? Promise.resolve(customer) : _this._selectCustomerFromSystem(searchText);
                        });
                    }
                    return this._selectCustomerFromSystem(searchText);
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
                CustomerInlineDialog.prototype._selectCustomerFromSystem = function (searchText) {
                    var request = new Customer_1.SelectCustomerClientRequest(this._getCorrelationId(), searchText);
                    return this.context.runtime.executeAsync(request)
                        .then(function (response) {
                        if (response.canceled || !response.data || !response.data.result) {
                            return null;
                        }
                        return response.data.result;
                    });
                };
                CustomerInlineDialog.prototype._setCustomerOnCart = function (accountNumber) {
                    var request = new Cart_1.SetCustomerOnCartOperationRequest(this._getCorrelationId(), accountNumber);
                    return this.context.runtime.executeAsync(request)
                        .then(function (response) {
                        if (response.canceled) {
                            throw new Error("La asignacion del cliente a la venta fue cancelada.");
                        }
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
                        if (!customer) {
                            throw new Error("No se encontro el cliente en el sistema.");
                        }
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
                CustomerInlineDialog.prototype._getSunatData = function (documentNumber) {
                    var _this = this;
                    var normalizedDocument = this._sunatService.normalizeDocument(documentNumber);
                    if (this._sunatByDocument[normalizedDocument]) {
                        return Promise.resolve(this._sunatByDocument[normalizedDocument]);
                    }
                    return this._sunatService.lookup(normalizedDocument)
                        .then(function (sunatData) {
                        _this._sunatByDocument[normalizedDocument] = sunatData;
                        return sunatData;
                    });
                };
                CustomerInlineDialog.prototype._setMode = function (element, mode) {
                    this._mode = mode;
                    this._toggle(element, "customerInlineTabSearch", mode === "search");
                    this._toggle(element, "customerInlineTabCreate", mode === "create");
                    this._toggle(element, "customerInlineTabEdit", mode === "edit");
                    this._toggle(element, "customerInlinePanelSearch", mode === "search");
                    this._toggle(element, "customerInlinePanelCreate", mode === "create");
                    this._toggle(element, "customerInlinePanelEdit", mode === "edit");
                    this._showMessage(element, this._getModeMessage(mode));
                };
                CustomerInlineDialog.prototype._toggle = function (element, id, active) {
                    var target = element.querySelector("#" + id);
                    if (!target) {
                        return;
                    }
                    if (active) {
                        target.classList.add("is-active");
                    }
                    else {
                        target.classList.remove("is-active");
                    }
                };
                CustomerInlineDialog.prototype._showMessage = function (element, message) {
                    var messageElement = element.querySelector("#customerInlineMessage");
                    if (messageElement) {
                        messageElement.textContent = message;
                    }
                };
                CustomerInlineDialog.prototype._showCustomerResult = function (element, id, customer) {
                    this._showTextResult(element, id, this._formatCustomerSummary(customer));
                };
                CustomerInlineDialog.prototype._showTextResult = function (element, id, message) {
                    var target = element.querySelector("#" + id);
                    if (target) {
                        target.textContent = message || "";
                    }
                };
                CustomerInlineDialog.prototype._getModeMessage = function (mode) {
                    switch (mode) {
                        case "create":
                            return "Cree el cliente desde la venta. SUNAT prellena, el cajero confirma.";
                        case "edit":
                            return "Edite el cliente sin salir de la venta. SUNAT valida antes de guardar.";
                        default:
                            return "Buscar usa clientes del sistema. SUNAT solo valida y no sobrescribe.";
                    }
                };
                CustomerInlineDialog.prototype._getValue = function (element, id) {
                    var target = element.querySelector("#" + id);
                    return target && target.value ? target.value.trim() : "";
                };
                CustomerInlineDialog.prototype._setValue = function (element, id, value) {
                    var target = element.querySelector("#" + id);
                    if (target) {
                        target.value = value || "";
                    }
                };
                CustomerInlineDialog.prototype._formatCustomerSummary = function (customer) {
                    if (!customer) {
                        return "";
                    }
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
                    if (sunatData.padronesText) {
                        lines.push("Padrones: " + sunatData.padronesText);
                    }
                    if (sunatData.documentType === "RUC") {
                        lines.push("Retencion: " + (sunatData.isRetentionAgent ? "Si" : "No"));
                        lines.push("Percepcion: " + (sunatData.isPerceptionAgent ? "Si" : "No"));
                        lines.push("Sector publico: " + (sunatData.isPublicSector ? "Si" : "No"));
                    }
                    return lines.join("\n");
                };
                CustomerInlineDialog.prototype._getCorrelationId = function () {
                    var logger = this.context && this.context.logger;
                    if (logger && logger.getNewCorrelationId) {
                        return logger.getNewCorrelationId();
                    }
                    return "customer-inline-" + new Date().getTime().toString();
                };
                CustomerInlineDialog.prototype._complete = function (result) {
                    if (this._resolve) {
                        this._resolve(result);
                        this._resolve = null;
                    }
                    this.closeDialog();
                };
                CustomerInlineDialog.prototype._closeClickHandler = function () {
                    if (this._resolve) {
                        this._resolve(null);
                        this._resolve = null;
                    }
                    return true;
                };
                CustomerInlineDialog.prototype._getErrorMessage = function (reason) {
                    if (reason && reason.message) {
                        return reason.message;
                    }
                    return "No se pudo completar la accion. Revise el log del POS.";
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
                    if (this.context && this.context.logger) {
                        this.context.logger.logError(message);
                    }
                };
                return CustomerInlineDialog;
            }(Dialogs_1.ExtensionTemplatedDialogBase));
            exports_1("default", CustomerInlineDialog);
        }
    };
});
