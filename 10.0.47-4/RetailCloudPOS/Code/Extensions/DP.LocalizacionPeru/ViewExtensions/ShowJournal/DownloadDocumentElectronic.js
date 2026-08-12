System.register(["PosApi/Entities", "PosApi/Extend/Views/ShowJournalView", "../../DataService/DataServiceRequests.g", "../../DataService/DataServiceEntities.g", "PosApi/TypeExtensions", "PosApi/Consume/Dialogs"], function (exports_1, context_1) {
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
    var Entities_1, ShowJournalView, DataServiceRequests_g_1, DataServiceEntities_g_1, TypeExtensions_1, Dialogs_1, DownloadDocumentElectronic;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (Entities_1_1) {
                Entities_1 = Entities_1_1;
            },
            function (ShowJournalView_1) {
                ShowJournalView = ShowJournalView_1;
            },
            function (DataServiceRequests_g_1_1) {
                DataServiceRequests_g_1 = DataServiceRequests_g_1_1;
            },
            function (DataServiceEntities_g_1_1) {
                DataServiceEntities_g_1 = DataServiceEntities_g_1_1;
            },
            function (TypeExtensions_1_1) {
                TypeExtensions_1 = TypeExtensions_1_1;
            },
            function (Dialogs_1_1) {
                Dialogs_1 = Dialogs_1_1;
            }
        ],
        execute: function () {
            DownloadDocumentElectronic = (function (_super) {
                __extends(DownloadDocumentElectronic, _super);
                function DownloadDocumentElectronic(context) {
                    var _this = _super.call(this, context) || this;
                    _this.id = "downloadDocumentElectronic";
                    _this.label = "Descargar TXT";
                    _this.extraClass = "iconLightningBolt";
                    _this.journalSelectionHandler = function (data) {
                        _this._journalChanged(data);
                    };
                    _this.journalSelectionClearedHandler = function () {
                        _this._selectedJournal = undefined;
                        _this.canExecute = false;
                    };
                    _this.receiptSelectionHandler = function (data) {
                        _this.isVisible = false;
                    };
                    _this.receiptSelectionClearedHandler = function () {
                        _this.isVisible = true;
                    };
                    _this.journalTransactionsLoadedHandler = function (data) {
                        _this.isVisible = _this._mode === Entities_1.ClientEntities.ShowJournalMode.ShowJournal;
                        _this.context.logger.logInformational("Executing journalTransactionsLoadedHandler for DownloadDocumentCommand: "
                            + JSON.stringify(data) + ".");
                    };
                    return _this;
                }
                DownloadDocumentElectronic.prototype.init = function (state) {
                    this._mode = state.mode;
                };
                DownloadDocumentElectronic.prototype.execute = function () {
                    var _this = this;
                    this.isProcessing = true;
                    window.setTimeout(function () {
                        _this.isProcessing = false;
                        var rsDataPrintGeneral = new DataServiceEntities_g_1.Entities.DataPrintGeneral();
                        rsDataPrintGeneral.IdTransaction = _this._selectedJournal.Id;
                        rsDataPrintGeneral.FilePath = _this._selectedJournal.TerminalId;
                        rsDataPrintGeneral.FilePathBackup = _this._selectedJournal.StoreId;
                        rsDataPrintGeneral.FileContents = _this._selectedJournal.ChannelId.toString();
                        rsDataPrintGeneral.Id = 1;
                        _this.context.runtime.executeAsync(new DataServiceRequests_g_1.DocumentElectronic.UpdateDocumentElectronicRequest(rsDataPrintGeneral.Id, rsDataPrintGeneral)).then(function (response) {
                            if (TypeExtensions_1.ObjectExtensions.isNullOrUndefined(response)
                                || TypeExtensions_1.ObjectExtensions.isNullOrUndefined(response.data)
                                || response.canceled) {
                                return;
                            }
                            var messageDialogOptions = {
                                title: "FACTURACIÓN ELECTRÓNICA",
                                message: "¿Desea descargar el archivo: " + _this._selectedJournal.ReceiptId + " ?",
                                showCloseX: true,
                                button1: {
                                    id: "Button1Close",
                                    label: "OK",
                                    result: "OKResult"
                                },
                                button2: {
                                    id: "Button2Cancel",
                                    label: "Cancel",
                                    result: "CancelResult"
                                }
                            };
                            var dialogRequest = new Dialogs_1.ShowMessageDialogClientRequest(messageDialogOptions);
                            _this.context.runtime.executeAsync(dialogRequest).then(function (result) {
                                if (!result.canceled) {
                                    if (!(response.data.result.FileContents.length === 0) && result.data.result.dialogResult === "OKResult") {
                                        _this.saveTextAsFile(response.data.result.FileContents, _this._selectedJournal.ReceiptId + ".txt", "text/plain");
                                    }
                                }
                            }).catch(function (reason) {
                                _this.context.logger.logError(JSON.stringify(reason));
                            });
                        }).catch(function (reason) {
                            _this.context.logger.logError("DocumentElectronic.UpdateDocumentElectronicRequest: " + JSON.stringify(reason));
                        });
                    }, 2000);
                };
                DownloadDocumentElectronic.prototype._journalChanged = function (data) {
                    this._selectedJournal = data.salesOrder;
                    this.canExecute = true;
                };
                DownloadDocumentElectronic.prototype.saveTextAsFile = function (textToWrite, fileNameToSaveAs, fileType) {
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
                return DownloadDocumentElectronic;
            }(ShowJournalView.ShowJournalExtensionCommandBase));
            exports_1("default", DownloadDocumentElectronic);
        }
    };
});
//# sourceMappingURL=C:/RetailLocEnviado/SCR-9.57/src/LocalizacionPeru/Pos/ViewExtensions/ShowJournal/DownloadDocumentElectronic.js.map