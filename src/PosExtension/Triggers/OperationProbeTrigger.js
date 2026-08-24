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
                    return Promise.resolve({ canceled: false });
                };
                OperationProbeTrigger.prototype._openModalForSearch = function () {
                    var _this = this;
                    if (window[CustomerModalHelper_1.GUARD_KEY] || window[CustomerModalHelper_1.PROGRAMMATIC_KEY]) {
                        return Promise.resolve({ canceled: false });
                    }
                    window[CustomerModalHelper_1.GUARD_KEY] = true;
                    var dialog = new CustomerInlineDialog_1.default();
                    return dialog.open("search", null, "")
                        .then(function (result) {
                        if (result && result.action === "native_search") {
                            return CustomerModalHelper_1.searchAndAssignCustomer(_this.context, result.searchText || "");
                        }
                        window[CustomerModalHelper_1.GUARD_KEY] = false;
                        return Promise.resolve({ canceled: true });
                    })
                        .catch(function (reason) {
                        window[CustomerModalHelper_1.GUARD_KEY] = false;
                        _this.context.logger.logError("OperationProbeTrigger (602) error: " + JSON.stringify(reason));
                        return { canceled: false };
                    });
                };
                return OperationProbeTrigger;
            }(OperationTriggers_1.PreOperationTrigger));
            exports_1("default", OperationProbeTrigger);
        }
    };
});
