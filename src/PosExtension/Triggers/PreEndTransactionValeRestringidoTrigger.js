System.register(["PosApi/Extend/Triggers/TransactionTriggers", "../Services/ValeRestringidoRule"], function (exports_1, context_1) {
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
    var TransactionTriggers_1, ValeRestringidoRule_1, PreEndTransactionValeRestringidoTrigger;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (TransactionTriggers_1_1) {
                TransactionTriggers_1 = TransactionTriggers_1_1;
            },
            function (ValeRestringidoRule_1_1) {
                ValeRestringidoRule_1 = ValeRestringidoRule_1_1;
            }
        ],
        execute: function () {
            PreEndTransactionValeRestringidoTrigger = (function (_super) {
                __extends(PreEndTransactionValeRestringidoTrigger, _super);
                function PreEndTransactionValeRestringidoTrigger() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                PreEndTransactionValeRestringidoTrigger.prototype.execute = function (options) {
                    var _this = this;
                    return ValeRestringidoRule_1.default.evaluarCarrito(this.context, options ? options.cart : null)
                        .then(function (motivo) {
                        if (!motivo) {
                            return Promise.resolve({ canceled: false });
                        }
                        _this.context.logger.logInformational("PreEndTransactionValeRestringidoTrigger: cierre bloqueado. " + motivo);
                        return ValeRestringidoRule_1.default.mostrarBloqueo(_this.context, motivo)
                            .then(function () {
                            return { canceled: true };
                        });
                    });
                };
                return PreEndTransactionValeRestringidoTrigger;
            }(TransactionTriggers_1.PreEndTransactionTrigger));
            exports_1("default", PreEndTransactionValeRestringidoTrigger);
        }
    };
});
