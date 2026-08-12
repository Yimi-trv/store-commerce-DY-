System.register(["PosApi/Entities", "./DataServiceEntities.g", "PosApi/Consume/DataService"], function (exports_1, context_1) {
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
    var Entities_1, DataServiceEntities_g_1, DataService_1, StoreReceiptValues, DPTypeDocumIdentPE, DocumentElectronic;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (Entities_1_1) {
                Entities_1 = Entities_1_1;
            },
            function (DataServiceEntities_g_1_1) {
                DataServiceEntities_g_1 = DataServiceEntities_g_1_1;
            },
            function (DataService_1_1) {
                DataService_1 = DataService_1_1;
            }
        ],
        execute: function () {
            exports_1("ProxyEntities", Entities_1.ProxyEntities);
            exports_1("Entities", DataServiceEntities_g_1.Entities);
            (function (StoreReceiptValues) {
                var DPUpdateStoreReceiptValuesResponse = (function (_super) {
                    __extends(DPUpdateStoreReceiptValuesResponse, _super);
                    function DPUpdateStoreReceiptValuesResponse() {
                        return _super !== null && _super.apply(this, arguments) || this;
                    }
                    return DPUpdateStoreReceiptValuesResponse;
                }(DataService_1.DataServiceResponse));
                StoreReceiptValues.DPUpdateStoreReceiptValuesResponse = DPUpdateStoreReceiptValuesResponse;
                var DPUpdateStoreReceiptValuesRequest = (function (_super) {
                    __extends(DPUpdateStoreReceiptValuesRequest, _super);
                    function DPUpdateStoreReceiptValuesRequest(id, updatedEntity) {
                        var _this = _super.call(this) || this;
                        _this._entitySet = "StoreReceiptValues";
                        _this._entityType = "StoreReceiptValues";
                        _this._method = "DPUpdateStoreReceiptValues";
                        _this._parameters = { updatedEntity: updatedEntity };
                        _this._isAction = true;
                        _this._returnType = null;
                        _this._isReturnTypeCollection = false;
                        _this._keys = { Id: id };
                        return _this;
                    }
                    return DPUpdateStoreReceiptValuesRequest;
                }(DataService_1.DataServiceRequest));
                StoreReceiptValues.DPUpdateStoreReceiptValuesRequest = DPUpdateStoreReceiptValuesRequest;
                var DPGetStoreReceiptValuesByStoreResponse = (function (_super) {
                    __extends(DPGetStoreReceiptValuesByStoreResponse, _super);
                    function DPGetStoreReceiptValuesByStoreResponse() {
                        return _super !== null && _super.apply(this, arguments) || this;
                    }
                    return DPGetStoreReceiptValuesByStoreResponse;
                }(DataService_1.DataServiceResponse));
                StoreReceiptValues.DPGetStoreReceiptValuesByStoreResponse = DPGetStoreReceiptValuesByStoreResponse;
                var DPGetStoreReceiptValuesByStoreRequest = (function (_super) {
                    __extends(DPGetStoreReceiptValuesByStoreRequest, _super);
                    function DPGetStoreReceiptValuesByStoreRequest() {
                        var _this = _super.call(this) || this;
                        _this._entitySet = "StoreReceiptValues";
                        _this._entityType = "StoreReceiptValues";
                        _this._method = "DPGetStoreReceiptValuesByStore";
                        _this._parameters = {};
                        _this._isAction = false;
                        _this._returnType = DataServiceEntities_g_1.Entities.StoreReceiptValues;
                        _this._isReturnTypeCollection = true;
                        return _this;
                    }
                    return DPGetStoreReceiptValuesByStoreRequest;
                }(DataService_1.DataServiceRequest));
                StoreReceiptValues.DPGetStoreReceiptValuesByStoreRequest = DPGetStoreReceiptValuesByStoreRequest;
            })(StoreReceiptValues || (StoreReceiptValues = {}));
            exports_1("StoreReceiptValues", StoreReceiptValues);
            (function (DPTypeDocumIdentPE) {
                var GetTypeDocumenIdentByDataAreaResponse = (function (_super) {
                    __extends(GetTypeDocumenIdentByDataAreaResponse, _super);
                    function GetTypeDocumenIdentByDataAreaResponse() {
                        return _super !== null && _super.apply(this, arguments) || this;
                    }
                    return GetTypeDocumenIdentByDataAreaResponse;
                }(DataService_1.DataServiceResponse));
                DPTypeDocumIdentPE.GetTypeDocumenIdentByDataAreaResponse = GetTypeDocumenIdentByDataAreaResponse;
                var GetTypeDocumenIdentByDataAreaRequest = (function (_super) {
                    __extends(GetTypeDocumenIdentByDataAreaRequest, _super);
                    function GetTypeDocumenIdentByDataAreaRequest() {
                        var _this = _super.call(this) || this;
                        _this._entitySet = "DPTypeDocumIdentPE";
                        _this._entityType = "DPTypeDocumIdentPE";
                        _this._method = "GetTypeDocumenIdentByDataArea";
                        _this._parameters = {};
                        _this._isAction = false;
                        _this._returnType = DataServiceEntities_g_1.Entities.DPTypeDocumIdentPE;
                        _this._isReturnTypeCollection = true;
                        return _this;
                    }
                    return GetTypeDocumenIdentByDataAreaRequest;
                }(DataService_1.DataServiceRequest));
                DPTypeDocumIdentPE.GetTypeDocumenIdentByDataAreaRequest = GetTypeDocumenIdentByDataAreaRequest;
            })(DPTypeDocumIdentPE || (DPTypeDocumIdentPE = {}));
            exports_1("DPTypeDocumIdentPE", DPTypeDocumIdentPE);
            (function (DocumentElectronic) {
                var UpdateDocumentElectronicResponse = (function (_super) {
                    __extends(UpdateDocumentElectronicResponse, _super);
                    function UpdateDocumentElectronicResponse() {
                        return _super !== null && _super.apply(this, arguments) || this;
                    }
                    return UpdateDocumentElectronicResponse;
                }(DataService_1.DataServiceResponse));
                DocumentElectronic.UpdateDocumentElectronicResponse = UpdateDocumentElectronicResponse;
                var UpdateDocumentElectronicRequest = (function (_super) {
                    __extends(UpdateDocumentElectronicRequest, _super);
                    function UpdateDocumentElectronicRequest(id, documentElectronic) {
                        var _this = _super.call(this) || this;
                        _this._entitySet = "DocumentElectronic";
                        _this._entityType = "DataPrintGeneral";
                        _this._method = "UpdateDocumentElectronic";
                        _this._parameters = { documentElectronic: documentElectronic };
                        _this._isAction = true;
                        _this._returnType = DataServiceEntities_g_1.Entities.DataPrintGeneral;
                        _this._isReturnTypeCollection = false;
                        _this._keys = { Id: id };
                        return _this;
                    }
                    return UpdateDocumentElectronicRequest;
                }(DataService_1.DataServiceRequest));
                DocumentElectronic.UpdateDocumentElectronicRequest = UpdateDocumentElectronicRequest;
                var GetDocumentElectronicByIDResponse = (function (_super) {
                    __extends(GetDocumentElectronicByIDResponse, _super);
                    function GetDocumentElectronicByIDResponse() {
                        return _super !== null && _super.apply(this, arguments) || this;
                    }
                    return GetDocumentElectronicByIDResponse;
                }(DataService_1.DataServiceResponse));
                DocumentElectronic.GetDocumentElectronicByIDResponse = GetDocumentElectronicByIDResponse;
                var GetDocumentElectronicByIDRequest = (function (_super) {
                    __extends(GetDocumentElectronicByIDRequest, _super);
                    function GetDocumentElectronicByIDRequest(idTransaction) {
                        var _this = _super.call(this) || this;
                        _this._entitySet = "DocumentElectronic";
                        _this._entityType = "DataPrintGeneral";
                        _this._method = "GetDocumentElectronicByID";
                        _this._parameters = { idTransaction: idTransaction };
                        _this._isAction = false;
                        _this._returnType = DataServiceEntities_g_1.Entities.DataPrintGeneral;
                        _this._isReturnTypeCollection = true;
                        return _this;
                    }
                    return GetDocumentElectronicByIDRequest;
                }(DataService_1.DataServiceRequest));
                DocumentElectronic.GetDocumentElectronicByIDRequest = GetDocumentElectronicByIDRequest;
            })(DocumentElectronic || (DocumentElectronic = {}));
            exports_1("DocumentElectronic", DocumentElectronic);
        }
    };
});
//# sourceMappingURL=C:/RetailLocEnviado/SCR-9.57/src/LocalizacionPeru/Pos/DataService/DataServiceRequests.g.js.map