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
    var DataService_1, Entities_1, COUNTRY_REGION, GetCountiesResponse, GetCountiesRequest, GetCitiesResponse, GetCitiesRequest;
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
            COUNTRY_REGION = "PER";
            GetCountiesResponse = (function (_super) {
                __extends(GetCountiesResponse, _super);
                function GetCountiesResponse() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                return GetCountiesResponse;
            }(DataService_1.DataServiceResponse));
            exports_1("GetCountiesResponse", GetCountiesResponse);
            GetCountiesRequest = (function (_super) {
                __extends(GetCountiesRequest, _super);
                function GetCountiesRequest(stateId) {
                    var _this = _super.call(this) || this;
                    _this._entitySet = "";
                    _this._entityType = "CountyInfo";
                    _this._method = "GetCounties";
                    _this._parameters = { countryRegionId: COUNTRY_REGION, stateProvinceId: stateId };
                    _this._isAction = true;
                    _this._returnType = Entities_1.ProxyEntities.CountyInfoClass;
                    _this._isReturnTypeCollection = true;
                    return _this;
                }
                return GetCountiesRequest;
            }(DataService_1.DataServiceRequest));
            exports_1("GetCountiesRequest", GetCountiesRequest);
            GetCitiesResponse = (function (_super) {
                __extends(GetCitiesResponse, _super);
                function GetCitiesResponse() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                return GetCitiesResponse;
            }(DataService_1.DataServiceResponse));
            exports_1("GetCitiesResponse", GetCitiesResponse);
            GetCitiesRequest = (function (_super) {
                __extends(GetCitiesRequest, _super);
                function GetCitiesRequest(stateId, countyId) {
                    var _this = _super.call(this) || this;
                    _this._entitySet = "";
                    _this._entityType = "CityInfo";
                    _this._method = "GetCities";
                    _this._parameters = {
                        countryRegionId: COUNTRY_REGION,
                        stateProvinceId: stateId,
                        countyId: countyId
                    };
                    _this._isAction = true;
                    _this._returnType = Entities_1.ProxyEntities.CityInfoClass;
                    _this._isReturnTypeCollection = true;
                    return _this;
                }
                return GetCitiesRequest;
            }(DataService_1.DataServiceRequest));
            exports_1("GetCitiesRequest", GetCitiesRequest);
        }
    };
});
