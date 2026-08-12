System.register(["PosApi/TypeExtensions"], function (exports_1, context_1) {
    "use strict";
    var TypeExtensions_1, KnockoutExtensionViewModelBase;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (TypeExtensions_1_1) {
                TypeExtensions_1 = TypeExtensions_1_1;
            }
        ],
        execute: function () {
            KnockoutExtensionViewModelBase = (function () {
                function KnockoutExtensionViewModelBase() {
                }
                KnockoutExtensionViewModelBase.prototype.dispose = function () {
                    TypeExtensions_1.ObjectExtensions.disposeAllProperties(this);
                };
                return KnockoutExtensionViewModelBase;
            }());
            exports_1("default", KnockoutExtensionViewModelBase);
        }
    };
});
//# sourceMappingURL=C:/RetailLocEnviado/SCR-9.57/src/LocalizacionPeru/Pos/ViewExtensions/CustomerAddEdit/BaseClasses/KnockoutExtensionViewModelBase.js.map