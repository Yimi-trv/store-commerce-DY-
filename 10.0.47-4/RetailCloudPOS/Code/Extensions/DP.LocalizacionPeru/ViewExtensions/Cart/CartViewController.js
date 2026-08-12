System.register(["PosApi/Extend/Views/CartView"], function (exports_1, context_1) {
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
    var CartView, CartViewController;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (CartView_1) {
                CartView = CartView_1;
            }
        ],
        execute: function () {
            CartViewController = (function (_super) {
                __extends(CartViewController, _super);
                function CartViewController(context) {
                    var _this = _super.call(this, context) || this;
                    _this.cartChangedHandler = function (data) {
                    };
                    return _this;
                }
                return CartViewController;
            }(CartView.CartExtensionViewControllerBase));
            exports_1("default", CartViewController);
        }
    };
});
//# sourceMappingURL=C:/RetailLocEnviado/SCR-9.57/src/LocalizacionPeru/Pos/ViewExtensions/Cart/CartViewController.js.map