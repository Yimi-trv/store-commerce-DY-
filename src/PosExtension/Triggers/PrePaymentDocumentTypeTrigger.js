System.register(["PosApi/Extend/Triggers/PaymentTriggers", "../Services/DocumentTypeRule"], function (exports_1, context_1) {
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
    var PaymentTriggers_1, DocumentTypeRule_1, PrePaymentDocumentTypeTrigger;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (PaymentTriggers_1_1) {
                PaymentTriggers_1 = PaymentTriggers_1_1;
            },
            function (DocumentTypeRule_1_1) {
                DocumentTypeRule_1 = DocumentTypeRule_1_1;
            }
        ],
        execute: function () {
            PrePaymentDocumentTypeTrigger = (function (_super) {
                __extends(PrePaymentDocumentTypeTrigger, _super);
                function PrePaymentDocumentTypeTrigger() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                PrePaymentDocumentTypeTrigger.prototype.execute = function (options) {
                    var _this = this;
                    return DocumentTypeRule_1.default.evaluateCart(this.context, options ? options.cart : null)
                        .then(function (reason) {
                        if (!reason) {
                            return Promise.resolve({ canceled: false });
                        }
                        _this.context.logger.logInformational("PrePaymentDocumentTypeTrigger: pago bloqueado. " + reason);
                        return DocumentTypeRule_1.default.showBlockedDialog(_this.context, reason)
                            .then(function () {
                            return { canceled: true };
                        });
                    });
                };
                return PrePaymentDocumentTypeTrigger;
            }(PaymentTriggers_1.PrePaymentTrigger));
            exports_1("default", PrePaymentDocumentTypeTrigger);
        }
    };
});
