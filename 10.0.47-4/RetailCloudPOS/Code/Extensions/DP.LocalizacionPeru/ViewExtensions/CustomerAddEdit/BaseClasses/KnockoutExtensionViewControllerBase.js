System.register(["PosApi/Create/Views", "knockout"], function (exports_1, context_1) {
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
    var NewView, knockout_1, KnockoutExtensionViewControllerBase;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (NewView_1) {
                NewView = NewView_1;
            },
            function (knockout_1_1) {
                knockout_1 = knockout_1_1;
            }
        ],
        execute: function () {
            KnockoutExtensionViewControllerBase = (function (_super) {
                __extends(KnockoutExtensionViewControllerBase, _super);
                function KnockoutExtensionViewControllerBase(context, saveInHistory) {
                    return _super.call(this, context, saveInHistory) || this;
                }
                KnockoutExtensionViewControllerBase.prototype.onReady = function (element) {
                    _super.prototype.onReady.call(this, element);
                    knockout_1.default.applyBindings(this, element);
                };
                return KnockoutExtensionViewControllerBase;
            }(NewView.ExtensionViewControllerBase));
            exports_1("default", KnockoutExtensionViewControllerBase);
        }
    };
});
//# sourceMappingURL=C:/RetailLocEnviado/SCR-9.57/src/LocalizacionPeru/Pos/ViewExtensions/CustomerAddEdit/BaseClasses/KnockoutExtensionViewControllerBase.js.map