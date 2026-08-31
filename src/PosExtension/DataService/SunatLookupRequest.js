System.register(["PosApi/Consume/DataService"], function (exports_1, context_1) {
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
    var DataService_1, SunatCustomerResultEntity, ConsultarDocumentoSunatResponse, ConsultarDocumentoSunatRequest;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (DataService_1_1) {
                DataService_1 = DataService_1_1;
            }
        ],
        execute: function () {
            SunatCustomerResultEntity = (function () {
                function SunatCustomerResultEntity(odataObject) {
                    var origen = odataObject || {};
                    this.Id = (origen.Id != null) ? parseInt(origen.Id, 10) : undefined;
                    this.Found = !!origen.Found;
                    this.Message = origen.Message;
                    this.Provider = origen.Provider;
                    this.DocumentNumber = origen.DocumentNumber;
                    this.DocumentType = origen.DocumentType;
                    this.Name = origen.Name;
                    this.FirstName = origen.FirstName;
                    this.LastName = origen.LastName;
                    this.TaxpayerStatus = origen.TaxpayerStatus;
                    this.TaxpayerCondition = origen.TaxpayerCondition;
                    this.Address = origen.Address;
                    this.Department = origen.Department;
                    this.Province = origen.Province;
                    this.District = origen.District;
                    this.UbigeoSunat = origen.UbigeoSunat;
                    this.PadronesText = origen.PadronesText;
                    this.IsRetentionAgent = !!origen.IsRetentionAgent;
                    this.IsPerceptionAgent = !!origen.IsPerceptionAgent;
                    this.IsGoodTaxpayer = !!origen.IsGoodTaxpayer;
                }
                return SunatCustomerResultEntity;
            }());
            exports_1("SunatCustomerResultEntity", SunatCustomerResultEntity);
            ConsultarDocumentoSunatResponse = (function (_super) {
                __extends(ConsultarDocumentoSunatResponse, _super);
                function ConsultarDocumentoSunatResponse() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                return ConsultarDocumentoSunatResponse;
            }(DataService_1.DataServiceResponse));
            exports_1("ConsultarDocumentoSunatResponse", ConsultarDocumentoSunatResponse);
            ConsultarDocumentoSunatRequest = (function (_super) {
                __extends(ConsultarDocumentoSunatRequest, _super);
                function ConsultarDocumentoSunatRequest(documento) {
                    var _this = _super.call(this) || this;
                    _this._entitySet = "TRU_Sunat";
                    _this._entityType = "SunatCustomerResult";
                    _this._method = "ConsultarDocumento";
                    _this._parameters = { documento: documento };
                    _this._isAction = false;
                    _this._returnType = SunatCustomerResultEntity;
                    _this._isReturnTypeCollection = true;
                    return _this;
                }
                return ConsultarDocumentoSunatRequest;
            }(DataService_1.DataServiceRequest));
            exports_1("ConsultarDocumentoSunatRequest", ConsultarDocumentoSunatRequest);
        }
    };
});
