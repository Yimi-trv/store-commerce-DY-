System.register(["PosApi/Entities"], function (exports_1, context_1) {
    "use strict";
    var Entities_1, Entities;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (Entities_1_1) {
                Entities_1 = Entities_1_1;
            }
        ],
        execute: function () {
            exports_1("ProxyEntities", Entities_1.ProxyEntities);
            (function (Entities) {
                var StoreReceiptValues = (function () {
                    function StoreReceiptValues(odataObject) {
                        odataObject = odataObject || {};
                        this.TransType = odataObject.TransType;
                        this.DocumentType = odataObject.DocumentType;
                        this.Mask = odataObject.Mask;
                        this.RefDocumentType = odataObject.RefDocumentType;
                        this.DataValue = (odataObject.DataValue != null) ? parseInt(odataObject.DataValue, 10) : undefined;
                        this.Id = (odataObject.Id != null) ? parseInt(odataObject.Id, 10) : undefined;
                        this.ExtensionProperties = undefined;
                        if (odataObject.ExtensionProperties) {
                            this.ExtensionProperties = [];
                            for (var i = 0; i < odataObject.ExtensionProperties.length; i++) {
                                if (odataObject.ExtensionProperties[i] != null) {
                                    if (odataObject.ExtensionProperties[i]['@odata.type'] != null) {
                                        var className = odataObject.ExtensionProperties[i]['@odata.type'];
                                        className = className.substr(className.lastIndexOf('.') + 1).concat("Class");
                                        this.ExtensionProperties[i] = new Entities_1.ProxyEntities[className](odataObject.ExtensionProperties[i]);
                                    }
                                    else {
                                        this.ExtensionProperties[i] = new Entities_1.ProxyEntities.CommercePropertyClass(odataObject.ExtensionProperties[i]);
                                    }
                                }
                                else {
                                    this.ExtensionProperties[i] = undefined;
                                }
                            }
                        }
                    }
                    return StoreReceiptValues;
                }());
                Entities.StoreReceiptValues = StoreReceiptValues;
                var DPTypeDocumIdentPE = (function () {
                    function DPTypeDocumIdentPE(odataObject) {
                        odataObject = odataObject || {};
                        this.TypeDocId = odataObject.TypeDocId;
                        this.Description = odataObject.Description;
                        this.DataAreaId = odataObject.DataAreaId;
                        this.Id = (odataObject.Id != null) ? parseInt(odataObject.Id, 10) : undefined;
                        this.ExtensionProperties = undefined;
                        if (odataObject.ExtensionProperties) {
                            this.ExtensionProperties = [];
                            for (var i = 0; i < odataObject.ExtensionProperties.length; i++) {
                                if (odataObject.ExtensionProperties[i] != null) {
                                    if (odataObject.ExtensionProperties[i]['@odata.type'] != null) {
                                        var className = odataObject.ExtensionProperties[i]['@odata.type'];
                                        className = className.substr(className.lastIndexOf('.') + 1).concat("Class");
                                        this.ExtensionProperties[i] = new Entities_1.ProxyEntities[className](odataObject.ExtensionProperties[i]);
                                    }
                                    else {
                                        this.ExtensionProperties[i] = new Entities_1.ProxyEntities.CommercePropertyClass(odataObject.ExtensionProperties[i]);
                                    }
                                }
                                else {
                                    this.ExtensionProperties[i] = undefined;
                                }
                            }
                        }
                    }
                    return DPTypeDocumIdentPE;
                }());
                Entities.DPTypeDocumIdentPE = DPTypeDocumIdentPE;
                var DataPrintGeneral = (function () {
                    function DataPrintGeneral(odataObject) {
                        odataObject = odataObject || {};
                        this.FilePath = odataObject.FilePath;
                        this.FilePathBackup = odataObject.FilePathBackup;
                        this.FileContents = odataObject.FileContents;
                        this.IdTransaction = odataObject.IdTransaction;
                        this.Id = (odataObject.Id != null) ? parseInt(odataObject.Id, 10) : undefined;
                        this.ExtensionProperties = undefined;
                        if (odataObject.ExtensionProperties) {
                            this.ExtensionProperties = [];
                            for (var i = 0; i < odataObject.ExtensionProperties.length; i++) {
                                if (odataObject.ExtensionProperties[i] != null) {
                                    if (odataObject.ExtensionProperties[i]['@odata.type'] != null) {
                                        var className = odataObject.ExtensionProperties[i]['@odata.type'];
                                        className = className.substr(className.lastIndexOf('.') + 1).concat("Class");
                                        this.ExtensionProperties[i] = new Entities_1.ProxyEntities[className](odataObject.ExtensionProperties[i]);
                                    }
                                    else {
                                        this.ExtensionProperties[i] = new Entities_1.ProxyEntities.CommercePropertyClass(odataObject.ExtensionProperties[i]);
                                    }
                                }
                                else {
                                    this.ExtensionProperties[i] = undefined;
                                }
                            }
                        }
                    }
                    return DataPrintGeneral;
                }());
                Entities.DataPrintGeneral = DataPrintGeneral;
            })(Entities || (Entities = {}));
            exports_1("Entities", Entities);
        }
    };
});
//# sourceMappingURL=C:/RetailLocEnviado/SCR-9.57/src/LocalizacionPeru/Pos/DataService/DataServiceEntities.g.js.map