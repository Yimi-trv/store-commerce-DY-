System.register(["PosApi/Extend/Triggers/ProductTriggers", "../Services/LectorCodigoBarras"], function (exports_1, context_1) {
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
    var ProductTriggers_1, LectorCodigoBarras_1, LectorProductoTrigger;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (ProductTriggers_1_1) {
                ProductTriggers_1 = ProductTriggers_1_1;
            },
            function (LectorCodigoBarras_1_1) {
                LectorCodigoBarras_1 = LectorCodigoBarras_1_1;
            }
        ],
        execute: function () {
            LectorProductoTrigger = (function (_super) {
                __extends(LectorProductoTrigger, _super);
                function LectorProductoTrigger() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                LectorProductoTrigger.prototype.execute = function (options) {
                    LectorCodigoBarras_1.default.anotarProductos(options ? options.productSaleDetails : null);
                    return Promise.resolve();
                };
                return LectorProductoTrigger;
            }(ProductTriggers_1.PostProductSaleTrigger));
            exports_1("default", LectorProductoTrigger);
        }
    };
});
