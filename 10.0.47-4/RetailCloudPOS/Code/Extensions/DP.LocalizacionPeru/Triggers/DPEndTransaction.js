System.register(["PosApi/TypeExtensions", "PosApi/Extend/Triggers/TransactionTriggers"], function (exports_1, context_1) {
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
    var TypeExtensions_1, Triggers, DPEndTransaction;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (TypeExtensions_1_1) {
                TypeExtensions_1 = TypeExtensions_1_1;
            },
            function (Triggers_1) {
                Triggers = Triggers_1;
            }
        ],
        execute: function () {
            DPEndTransaction = (function (_super) {
                __extends(DPEndTransaction, _super);
                function DPEndTransaction() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                DPEndTransaction.prototype.execute = function (options) {
                    if (options.receipts.length > 0) {
                        var filePathExtensionProperty = Commerce.ArrayExtensions.firstOrUndefined(options.receipts[0].ExtensionProperties, function (property) {
                            return property.Key === "DPFilePath";
                        });
                        var filePathBackupExtensionProperty = Commerce.ArrayExtensions.firstOrUndefined(options.receipts[0].ExtensionProperties, function (property) {
                            return property.Key === "DPFilePathBackup";
                        });
                        var fileContentsExtensionProperty = Commerce.ArrayExtensions.firstOrUndefined(options.receipts[0].ExtensionProperties, function (property) {
                            return property.Key === "DPFileContents";
                        });
                        var dpIsDocRetornoExtensionProperty = Commerce.ArrayExtensions.firstOrUndefined(options.receipts[0].ExtensionProperties, function (property) {
                            return property.Key === "DPIsDocRetorno";
                        });
                        if (!TypeExtensions_1.ObjectExtensions.isNullOrUndefined(filePathExtensionProperty) && !TypeExtensions_1.ObjectExtensions.isNullOrUndefined(filePathExtensionProperty.Value) &&
                            !TypeExtensions_1.ObjectExtensions.isNullOrUndefined(fileContentsExtensionProperty) && !TypeExtensions_1.ObjectExtensions.isNullOrUndefined(fileContentsExtensionProperty.Value)) {
                            if (TypeExtensions_1.ObjectExtensions.isNullOrUndefined(filePathBackupExtensionProperty.Value)) {
                                filePathBackupExtensionProperty == "";
                            }
                            if (TypeExtensions_1.ObjectExtensions.isNullOrUndefined(dpIsDocRetornoExtensionProperty.Value.StringValue)) {
                                this.saveTextAsFile(fileContentsExtensionProperty.Value.StringValue, options.receipts[0].ReceiptId + ".txt", "text/plain");
                            }
                        }
                    }
                    return Promise.resolve();
                };
                DPEndTransaction.prototype.saveTextAsFile = function (textToWrite, fileNameToSaveAs, fileType) {
                    var textFileAsBlob = new Blob([textToWrite], { type: fileType });
                    var downloadLink = document.createElement('a');
                    downloadLink.download = fileNameToSaveAs;
                    downloadLink.innerHTML = 'Download File';
                    if (window.webkitURL != null) {
                        downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
                    }
                    else {
                        downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
                        downloadLink.style.display = 'none';
                        document.body.appendChild(downloadLink);
                    }
                    downloadLink.click();
                };
                return DPEndTransaction;
            }(Triggers.PostEndTransactionTrigger));
            exports_1("default", DPEndTransaction);
        }
    };
});
//# sourceMappingURL=C:/RetailLocEnviado/SCR-9.57/src/LocalizacionPeru/Pos/Triggers/DPEndTransaction.js.map