System.register(["PosApi/Consume/DataService", "PosApi/Entities"], function (exports_1, context_1) {
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
    var DataService_1, Entities_1, GetAddressPurposesResponse, GetAddressPurposesRequest;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (DataService_1_1) {
                DataService_1 = DataService_1_1;
            },
            function (Entities_1_1) {
                Entities_1 = Entities_1_1;
            }
        ],
        execute: function () {
            GetAddressPurposesResponse = (function (_super) {
                __extends(GetAddressPurposesResponse, _super);
                function GetAddressPurposesResponse() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                return GetAddressPurposesResponse;
            }(DataService_1.DataServiceResponse));
            exports_1("GetAddressPurposesResponse", GetAddressPurposesResponse);
            GetAddressPurposesRequest = (function (_super) {
                __extends(GetAddressPurposesRequest, _super);
                function GetAddressPurposesRequest() {
                    var _this = _super.call(this) || this;
                    _this._entitySet = "";
                    _this._entityType = "AddressPurpose";
                    _this._method = "GetAddressPurposes";
                    _this._parameters = {};
                    _this._isAction = false;
                    _this._returnType = Entities_1.ProxyEntities.AddressPurposeClass;
                    _this._isReturnTypeCollection = true;
                    return _this;
                }
                return GetAddressPurposesRequest;
            }(DataService_1.DataServiceRequest));
            exports_1("GetAddressPurposesRequest", GetAddressPurposesRequest);
        }
    };
});
