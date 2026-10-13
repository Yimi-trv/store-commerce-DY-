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
    var PaymentTriggers_1, ValeRestringidoRule_1, PostGetGiftCardNumberValeRestringidoTrigger;
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
            PostGetGiftCardNumberValeRestringidoTrigger = (function (_super) {
                __extends(PostGetGiftCardNumberValeRestringidoTrigger, _super);
                function PostGetGiftCardNumberValeRestringidoTrigger() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                PostGetGiftCardNumberValeRestringidoTrigger.prototype.execute = function (options) {
                    var _this = this;
                    var codigo = options ? options.giftCardNumber : "";
                    var cart = options ? options.cart : null;
                    if (!codigo) {
                        return Promise.resolve({ canceled: false });
                    }
                    return ValeRestringidoRule_1.default.evaluarVale(this.context, codigo, cart)
                        .then(function (motivo) {
                        if (!motivo) {
                            return Promise.resolve({ canceled: false });
                        }
                        _this.context.logger.logInformational("PostGetGiftCardNumberValeRestringidoTrigger: vale rechazado. " + motivo);
                        return ValeRestringidoRule_1.default.mostrarBloqueo(_this.context, motivo)
                            .then(function () {
                            return { canceled: true };
                        });
                    });
                };
                return PostGetGiftCardNumberValeRestringidoTrigger;
            }(PaymentTriggers_1.PostGetGiftCardNumberTrigger));
            exports_1("default", PostGetGiftCardNumberValeRestringidoTrigger);
        }
    };
});
