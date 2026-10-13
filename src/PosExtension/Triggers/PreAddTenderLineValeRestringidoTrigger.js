System.register(["PosApi/Extend/Triggers/PaymentTriggers", "../Services/ValeRestringidoRule"], function (exports_1, context_1) {
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
    var PaymentTriggers_1, ValeRestringidoRule_1, PreAddTenderLineValeRestringidoTrigger;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (PaymentTriggers_1_1) {
                PaymentTriggers_1 = PaymentTriggers_1_1;
            },
            function (ValeRestringidoRule_1_1) {
                ValeRestringidoRule_1 = ValeRestringidoRule_1_1;
            }
        ],
        execute: function () {
            PreAddTenderLineValeRestringidoTrigger = (function (_super) {
                __extends(PreAddTenderLineValeRestringidoTrigger, _super);
                function PreAddTenderLineValeRestringidoTrigger() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                PreAddTenderLineValeRestringidoTrigger.prototype.execute = function (options) {
                    var _this = this;
                    var linea = options ? options.tenderLine : null;
                    var codigo = linea && linea.GiftCardId ? String(linea.GiftCardId) : "";
                    if (!codigo) {
                        return Promise.resolve({ canceled: false });
                    }
                    return ValeRestringidoRule_1.default.evaluarVale(this.context, codigo, options ? options.cart : null)
                        .then(function (motivo) {
                        if (!motivo) {
                            return Promise.resolve({ canceled: false });
                        }
                        _this.context.logger.logInformational("PreAddTenderLineValeRestringidoTrigger: pago bloqueado. " + motivo);
                        return ValeRestringidoRule_1.default.mostrarBloqueo(_this.context, motivo)
                            .then(function () {
                            return { canceled: true };
                        });
                    });
                };
                return PreAddTenderLineValeRestringidoTrigger;
            }(PaymentTriggers_1.PreAddTenderLineTrigger));
            exports_1("default", PreAddTenderLineValeRestringidoTrigger);
        }
    };
});
