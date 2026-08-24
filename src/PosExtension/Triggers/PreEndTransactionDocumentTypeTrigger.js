System.register(["PosApi/Extend/Triggers/TransactionTriggers", "../Services/DocumentTypeRule"], function (exports_1, context_1) {
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
    var TransactionTriggers_1, DocumentTypeRule_1, PreEndTransactionDocumentTypeTrigger;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (TransactionTriggers_1_1) {
                TransactionTriggers_1 = TransactionTriggers_1_1;
            },
            function (DocumentTypeRule_1_1) {
                DocumentTypeRule_1 = DocumentTypeRule_1_1;
            }
        ],
        execute: function () {
            PreEndTransactionDocumentTypeTrigger = (function (_super) {
                __extends(PreEndTransactionDocumentTypeTrigger, _super);
                function PreEndTransactionDocumentTypeTrigger() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                PreEndTransactionDocumentTypeTrigger.prototype.execute = function (options) {
                    var _this = this;
                    return DocumentTypeRule_1.default.evaluateCurrentCart(this.context)
                        .then(function (reason) {
                        if (!reason) {
                            return Promise.resolve({ canceled: false });
                        }
                        _this.context.logger.logInformational("PreEndTransactionDocumentTypeTrigger: cierre bloqueado. " + reason);
                        return DocumentTypeRule_1.default.showBlockedDialog(_this.context, reason)
                            .then(function () {
                            return { canceled: true };
                        });
                    });
                };
                return PreEndTransactionDocumentTypeTrigger;
            }(TransactionTriggers_1.PreEndTransactionTrigger));
            exports_1("default", PreEndTransactionDocumentTypeTrigger);
        }
    };
});
