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
    var DataService_1, ItemRestringidoEntity, ItemsRestringidosResponse, ItemsRestringidosRequest;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (DataService_1_1) {
                DataService_1 = DataService_1_1;
            }
        ],
        execute: function () {
            ItemRestringidoEntity = (function () {
                function ItemRestringidoEntity(odataObject) {
                    var origen = odataObject || {};
                    this.Id = (origen.Id != null) ? parseInt(origen.Id, 10) : undefined;
                    this.ItemId = origen.ItemId;
                    this.Categoria = origen.Categoria;
                }
                return ItemRestringidoEntity;
            }());
            exports_1("ItemRestringidoEntity", ItemRestringidoEntity);
            ItemsRestringidosResponse = (function (_super) {
                __extends(ItemsRestringidosResponse, _super);
                function ItemsRestringidosResponse() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                return ItemsRestringidosResponse;
            }(DataService_1.DataServiceResponse));
            exports_1("ItemsRestringidosResponse", ItemsRestringidosResponse);
            ItemsRestringidosRequest = (function (_super) {
                __extends(ItemsRestringidosRequest, _super);
                function ItemsRestringidosRequest() {
                    var _this = _super.call(this) || this;
                    _this._entitySet = "TRU_ValesItems";
                    _this._entityType = "ItemRestringidoResult";
                    _this._method = "Restringidos";
                    _this._parameters = {};
                    _this._isAction = false;
                    _this._returnType = ItemRestringidoEntity;
                    _this._isReturnTypeCollection = true;
                    return _this;
                }
                return ItemsRestringidosRequest;
            }(DataService_1.DataServiceRequest));
            exports_1("ItemsRestringidosRequest", ItemsRestringidosRequest);
        }
    };
});
