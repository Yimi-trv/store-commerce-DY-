System.register(["PosApi/Extend/Triggers/ProductTriggers", "../Theme/ThemeEngine"], function (exports_1, context_1) {
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
    var ProductTriggers_1, ThemeEngine_1, AvisoProductoTrigger;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (ProductTriggers_1_1) {
                ProductTriggers_1 = ProductTriggers_1_1;
            },
            function (ThemeEngine_1_1) {
                ThemeEngine_1 = ThemeEngine_1_1;
            }
        ],
        execute: function () {
            AvisoProductoTrigger = (function (_super) {
                __extends(AvisoProductoTrigger, _super);
                function AvisoProductoTrigger() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                AvisoProductoTrigger.prototype.execute = function (options) {
                    ThemeEngine_1.ThemeEngine.anunciarVenta(options ? options.productSaleDetails : null, options ? options.cart : null);
                    return Promise.resolve();
                };
                return AvisoProductoTrigger;
            }(ProductTriggers_1.PostProductSaleTrigger));
            exports_1("default", AvisoProductoTrigger);
        }
    };
});
