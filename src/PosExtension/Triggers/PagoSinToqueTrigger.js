System.register(["PosApi/Extend/Triggers/PaymentTriggers", "../Services/BotonesDePago"], function (exports_1, context_1) {
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
    var PaymentTriggers_1, BotonesDePago_1, PagoSinToqueTrigger;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (PaymentTriggers_1_1) {
                PaymentTriggers_1 = PaymentTriggers_1_1;
            },
            function (BotonesDePago_1_1) {
                BotonesDePago_1 = BotonesDePago_1_1;
            }
        ],
        execute: function () {
            PagoSinToqueTrigger = (function (_super) {
                __extends(PagoSinToqueTrigger, _super);
                function PagoSinToqueTrigger() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                PagoSinToqueTrigger.prototype.execute = function (options) {
                    BotonesDePago_1.default.anotarPago();
                    return Promise.resolve({ canceled: false });
                };
                return PagoSinToqueTrigger;
            }(PaymentTriggers_1.PrePaymentTrigger));
            exports_1("default", PagoSinToqueTrigger);
        }
    };
});
