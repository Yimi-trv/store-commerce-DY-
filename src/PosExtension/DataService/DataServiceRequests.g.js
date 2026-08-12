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
    var Entities_1, DataServiceEntities_g_1, DataService_1, TRU_Diagnostics, TRU_GeographicData, TRU_SalesTransactions;
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
            (function (TRU_Diagnostics) {
                var GetByReceiptIdResponse = (function (_super) {
                    __extends(GetByReceiptIdResponse, _super);
                    function GetByReceiptIdResponse() {
                        return _super !== null && _super.apply(this, arguments) || this;
                    }
                    return GetByReceiptIdResponse;
                }(DataService_1.DataServiceResponse));
                TRU_Diagnostics.GetByReceiptIdResponse = GetByReceiptIdResponse;
                var GetByReceiptIdRequest = (function (_super) {
                    __extends(GetByReceiptIdRequest, _super);
                    function GetByReceiptIdRequest(receiptId, storeId) {
                        var _this = _super.call(this) || this;
                        _this._entitySet = "TRU_Diagnostics";
                        _this._entityType = "ElectronicDocumentResult";
                        _this._method = "GetByReceiptId";
                        _this._parameters = { receiptId: receiptId, storeId: storeId };
                        _this._isAction = false;
                        _this._returnType = DataServiceEntities_g_1.Entities.ElectronicDocumentResult;
                        _this._isReturnTypeCollection = true;
                        return _this;
                    }
                    return GetByReceiptIdRequest;
                }(DataService_1.DataServiceRequest));
                TRU_Diagnostics.GetByReceiptIdRequest = GetByReceiptIdRequest;
                var RunResponse = (function (_super) {
                    __extends(RunResponse, _super);
                    function RunResponse() {
                        return _super !== null && _super.apply(this, arguments) || this;
                    }
                    return RunResponse;
                }(DataService_1.DataServiceResponse));
                TRU_Diagnostics.RunResponse = RunResponse;
                var RunRequest = (function (_super) {
                    __extends(RunRequest, _super);
                    function RunRequest(mode, receiptId) {
                        var _this = _super.call(this) || this;
                        _this._entitySet = "TRU_Diagnostics";
                        _this._entityType = "ElectronicDocumentResult";
                        _this._method = "Run";
                        _this._parameters = { mode: mode, receiptId: receiptId };
                        _this._isAction = false;
                        _this._returnType = DataServiceEntities_g_1.Entities.ElectronicDocumentResult;
                        _this._isReturnTypeCollection = true;
                        return _this;
                    }
                    return RunRequest;
                }(DataService_1.DataServiceRequest));
                TRU_Diagnostics.RunRequest = RunRequest;
            })(TRU_Diagnostics || (exports_1("TRU_Diagnostics", TRU_Diagnostics = {})));
            (function (TRU_GeographicData) {
                var ResolveUbigeoResponse = (function (_super) {
                    __extends(ResolveUbigeoResponse, _super);
                    function ResolveUbigeoResponse() {
                        return _super !== null && _super.apply(this, arguments) || this;
                    }
                    return ResolveUbigeoResponse;
                }(DataService_1.DataServiceResponse));
                TRU_GeographicData.ResolveUbigeoResponse = ResolveUbigeoResponse;
                var ResolveUbigeoRequest = (function (_super) {
                    __extends(ResolveUbigeoRequest, _super);
                    function ResolveUbigeoRequest(departamento, provincia, distrito) {
                        var _this = _super.call(this) || this;
                        _this._entitySet = "TRU_GeographicData";
                        _this._entityType = "UbigeoResolutionResult";
                        _this._method = "ResolveUbigeo";
                        _this._parameters = { departamento: departamento, provincia: provincia, distrito: distrito };
                        _this._isAction = false;
                        _this._returnType = DataServiceEntities_g_1.Entities.UbigeoResolutionResult;
                        _this._isReturnTypeCollection = true;
                        return _this;
                    }
                    return ResolveUbigeoRequest;
                }(DataService_1.DataServiceRequest));
                TRU_GeographicData.ResolveUbigeoRequest = ResolveUbigeoRequest;
            })(TRU_GeographicData || (exports_1("TRU_GeographicData", TRU_GeographicData = {})));
            (function (TRU_SalesTransactions) {
                var QueryResponse = (function (_super) {
                    __extends(QueryResponse, _super);
                    function QueryResponse() {
                        return _super !== null && _super.apply(this, arguments) || this;
                    }
                    return QueryResponse;
                }(DataService_1.DataServiceResponse));
                TRU_SalesTransactions.QueryResponse = QueryResponse;
                var QueryRequest = (function (_super) {
                    __extends(QueryRequest, _super);
                    function QueryRequest(fromDate, toDate, storeId, terminalId, receiptId, top, detail, skip) {
                        var _this = _super.call(this) || this;
                        _this._entitySet = "TRU_SalesTransactions";
                        _this._entityType = "SalesTransactionItem";
                        _this._method = "Query";
                        _this._parameters = { fromDate: fromDate, toDate: toDate, storeId: storeId, terminalId: terminalId, receiptId: receiptId, top: top, detail: detail, skip: skip };
                        _this._isAction = false;
                        _this._returnType = DataServiceEntities_g_1.Entities.SalesTransactionItem;
                        _this._isReturnTypeCollection = true;
                        return _this;
                    }
                    return QueryRequest;
                }(DataService_1.DataServiceRequest));
                TRU_SalesTransactions.QueryRequest = QueryRequest;
            })(TRU_SalesTransactions || (exports_1("TRU_SalesTransactions", TRU_SalesTransactions = {})));
        }
    };
});
