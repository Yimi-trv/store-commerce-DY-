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
    var DataService_1, Entities_1, GetCustomerSearchFieldsResponse, GetCustomerSearchFieldsRequest, CustomerSearchByFieldsResponse, CustomerSearchByFieldsRequest;
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
            GetCustomerSearchFieldsResponse = (function (_super) {
                __extends(GetCustomerSearchFieldsResponse, _super);
                function GetCustomerSearchFieldsResponse() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                return GetCustomerSearchFieldsResponse;
            }(DataService_1.DataServiceResponse));
            exports_1("GetCustomerSearchFieldsResponse", GetCustomerSearchFieldsResponse);
            GetCustomerSearchFieldsRequest = (function (_super) {
                __extends(GetCustomerSearchFieldsRequest, _super);
                function GetCustomerSearchFieldsRequest() {
                    var _this = _super.call(this) || this;
                    _this._entitySet = "Customers";
                    _this._entityType = "CustomerSearchField";
                    _this._method = "GetCustomerSearchFields";
                    _this._parameters = {};
                    _this._isAction = true;
                    _this._returnType = Entities_1.ProxyEntities.CustomerSearchFieldClass;
                    _this._isReturnTypeCollection = true;
                    return _this;
                }
                return GetCustomerSearchFieldsRequest;
            }(DataService_1.DataServiceRequest));
            exports_1("GetCustomerSearchFieldsRequest", GetCustomerSearchFieldsRequest);
            CustomerSearchByFieldsResponse = (function (_super) {
                __extends(CustomerSearchByFieldsResponse, _super);
                function CustomerSearchByFieldsResponse() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                return CustomerSearchByFieldsResponse;
            }(DataService_1.DataServiceResponse));
            exports_1("CustomerSearchByFieldsResponse", CustomerSearchByFieldsResponse);
            CustomerSearchByFieldsRequest = (function (_super) {
                __extends(CustomerSearchByFieldsRequest, _super);
                function CustomerSearchByFieldsRequest(searchTerm, searchField, top, skip) {
                    var _this = _super.call(this) || this;
                    var criterion = {
                        SearchTerm: searchTerm || "",
                        SearchField: searchField
                    };
                    var criteria = {
                        Criteria: [criterion]
                    };
                    _this._entitySet = "Customers";
                    _this._entityType = "GlobalCustomer";
                    _this._method = "SearchByFields";
                    _this._parameters = { CustomerSearchByFieldCriteria: criteria };
                    _this._isAction = true;
                    _this._returnType = Entities_1.ProxyEntities.GlobalCustomerClass;
                    _this._isReturnTypeCollection = true;
                    _this.top = top;
                    _this.skip = skip;
                    return _this;
                }
                return CustomerSearchByFieldsRequest;
            }(DataService_1.DataServiceRequest));
            exports_1("CustomerSearchByFieldsRequest", CustomerSearchByFieldsRequest);
        }
    };
});
