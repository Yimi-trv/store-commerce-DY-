System.register(["PosApi/Extend/Triggers/CustomerTriggers", "../Controls/Dialogs/CustomerInline/CustomerInlineDialog"], function (exports_1, context_1) {
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
    var CustomerTriggers_1, CustomerInlineDialog_1, PreCustomerAddModalTrigger;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (CustomerTriggers_1_1) {
                CustomerTriggers_1 = CustomerTriggers_1_1;
            },
            function (CustomerInlineDialog_1_1) {
                CustomerInlineDialog_1 = CustomerInlineDialog_1_1;
            }
        ],
        execute: function () {
            PreCustomerAddModalTrigger = (function (_super) {
                __extends(PreCustomerAddModalTrigger, _super);
                function PreCustomerAddModalTrigger() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                PreCustomerAddModalTrigger.prototype.execute = function (options) {
                    var _this = this;
                    var dialog = new CustomerInlineDialog_1.default();
                    return dialog.open("create")
                        .then(function () {
                        return { canceled: true };
                    })
                        .catch(function (reason) {
                        _this.context.logger.logError("PreCustomerAddModalTrigger error: " + JSON.stringify(reason));
                        return { canceled: false };
                    });
                };
                return PreCustomerAddModalTrigger;
            }(CustomerTriggers_1.PreCustomerAddTrigger));
            exports_1("default", PreCustomerAddModalTrigger);
        }
    };
});
