System.register(["PosApi/Extend/Triggers/OperationTriggers", "../Controls/Dialogs/CustomerInline/CustomerInlineDialog", "./CustomerModalHelper"], function (exports_1, context_1) {
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
    var OperationTriggers_1, CustomerInlineDialog_1, CustomerModalHelper_1, CUSTOMER_SEARCH_OPERATION_ID, OperationProbeTrigger;
    var __moduleName = context_1 && context_1.id;
    function esOperacionDeCliente(operationId) {
        return operationId === 600 || operationId === 602 || operationId === 603;
    }
    return {
        setters: [
            function (OperationTriggers_1_1) {
                OperationTriggers_1 = OperationTriggers_1_1;
            },
            function (CustomerInlineDialog_1_1) {
                CustomerInlineDialog_1 = CustomerInlineDialog_1_1;
            },
            function (CustomerModalHelper_1_1) {
                CustomerModalHelper_1 = CustomerModalHelper_1_1;
            }
        ],
        execute: function () {
            CUSTOMER_SEARCH_OPERATION_ID = 602;
            OperationProbeTrigger = (function (_super) {
                __extends(OperationProbeTrigger, _super);
                function OperationProbeTrigger() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                OperationProbeTrigger.prototype.execute = function (options) {
                    var request = options ? options.operationRequest : null;
                    var operationId = request ? request.operationId : null;
                    if (operationId === CUSTOMER_SEARCH_OPERATION_ID) {
                        return this._openModalForSearch();
                    }
                    if (!esOperacionDeCliente(operationId)) {
                        CustomerModalHelper_1.anotarOperacionIniciada(operationId, request);
                    }
                    return Promise.resolve({ canceled: false });
                };
                OperationProbeTrigger.prototype._openModalForSearch = function () {
                    var _this = this;
                    if (window[CustomerModalHelper_1.GUARD_KEY] || window[CustomerModalHelper_1.PROGRAMMATIC_KEY]) {
                        return Promise.resolve({ canceled: false });
                    }
                    var envolvente = CustomerModalHelper_1.tomarOperacionEnvolvente();
                    this.context.logger.logInformational("OperationProbeTrigger: busqueda de cliente | la pidio "
                        + (envolvente ? ("la operacion " + (envolvente.operationId || "(sin id)")) : "el cajero")
                        + " | esVistaDeVenta()=" + CustomerModalHelper_1.esVistaDeVenta() + " (solo dato, no decide)");
                    window[CustomerModalHelper_1.GUARD_KEY] = true;
                    var dialog = new CustomerInlineDialog_1.default();
                    return dialog.open("search", null, "")
                        .then(function (result) {
                        if (result && result.action === "native_search") {
                            return CustomerModalHelper_1.searchAndAssignCustomer(_this.context, result.searchText || "");
                        }
                        window[CustomerModalHelper_1.GUARD_KEY] = false;
                        var cuenta = (result && result.customerAccountNumber) || "";
                        if (envolvente && cuenta) {
                            _this._devolverElControl(envolvente, cuenta);
                        }
                        return Promise.resolve({ canceled: true });
                    })
                        .catch(function (reason) {
                        window[CustomerModalHelper_1.GUARD_KEY] = false;
                        _this.context.logger.logError("OperationProbeTrigger (602) error: " + JSON.stringify(reason));
                        return { canceled: false };
                    });
                };
                OperationProbeTrigger.prototype._devolverElControl = function (envolvente, accountNumber) {
                    var _this = this;
                    this.context.logger.logInformational("OperationProbeTrigger: cliente " + accountNumber + " asignado; se relanza la operacion "
                        + (envolvente.operationId || "(sin id)") + " que pidio la busqueda, para que vuelva a"
                        + " leer el carrito.");
                    window.setTimeout(function () {
                        try {
                            _this.context.runtime.executeAsync(envolvente)
                                .catch(function (reason) {
                                _this.context.logger.logError("OperationProbeTrigger: no se pudo relanzar la operación: " + JSON.stringify(reason));
                            });
                        }
                        catch (error) {
                            _this.context.logger.logError("OperationProbeTrigger: relanzar la operación lanzó: " + error);
                        }
                    }, 600);
                };
                return OperationProbeTrigger;
            }(OperationTriggers_1.PreOperationTrigger));
            exports_1("default", OperationProbeTrigger);
        }
    };
});
