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
    var DataService_1, Entities_1, CustomerSearchResponse, CustomerSearchRequest;
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
            CustomerSearchResponse = (function (_super) {
                __extends(CustomerSearchResponse, _super);
                function CustomerSearchResponse() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                return CustomerSearchResponse;
            }(DataService_1.DataServiceResponse));
            exports_1("CustomerSearchResponse", CustomerSearchResponse);
            CustomerSearchRequest = (function (_super) {
                __extends(CustomerSearchRequest, _super);
                function CustomerSearchRequest(keyword, top, skip) {
                    var _this = _super.call(this) || this;
                    var criteria = new Entities_1.ProxyEntities.CustomerSearchCriteriaClass();
                    criteria.Keyword = keyword || "";
                    criteria.SearchOnlyCurrentCompany = true;
                    criteria.SearchLocationValue = Entities_1.ProxyEntities.SearchLocation.Local;
                    _this._entitySet = "Customers";
                    _this._entityType = "GlobalCustomer";
                    _this._method = "Search";
                    _this._parameters = { customerSearchCriteria: criteria };
                    _this._isAction = true;
                    _this._returnType = Entities_1.ProxyEntities.GlobalCustomerClass;
                    _this._isReturnTypeCollection = true;
                    _this.top = top;
                    _this.skip = skip;
                    return _this;
                }
                return CustomerSearchRequest;
            }(DataService_1.DataServiceRequest));
            exports_1("CustomerSearchRequest", CustomerSearchRequest);
        }
    };
});
