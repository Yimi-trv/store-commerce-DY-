System.register(["PosApi/Extend/Triggers/ProductTriggers", "../Services/ValePortadorRule"], function (exports_1, context_1) {
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
    var ProductTriggers_1, ValePortadorRule_1, PreProductSaleValePortadorTrigger;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (ProductTriggers_1_1) {
                ProductTriggers_1 = ProductTriggers_1_1;
            },
            function (ValePortadorRule_1_1) {
                ValePortadorRule_1 = ValePortadorRule_1_1;
            }
        ],
        execute: function () {
            PreProductSaleValePortadorTrigger = (function (_super) {
                __extends(PreProductSaleValePortadorTrigger, _super);
                function PreProductSaleValePortadorTrigger() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                PreProductSaleValePortadorTrigger.prototype.execute = function (options) {
                    var _this = this;
                    var detalles = (options && options.productSaleDetails) || [];
                    var itemIds = detalles
                        .map(function (detalle) {
                        return (detalle && detalle.product && detalle.product.ItemId) ? String(detalle.product.ItemId) : "";
                    })
                        .filter(function (itemId) { return !!itemId; });
                    if (itemIds.length === 0) {
                        return Promise.resolve({ canceled: false });
                    }
                    return ValePortadorRule_1.default.evaluarProductos(this.context, options ? options.cart : null, itemIds)
                        .then(function (motivo) {
                        if (!motivo) {
                            return Promise.resolve({ canceled: false });
                        }
                        _this.context.logger.logInformational("PreProductSaleValePortadorTrigger: artículo rechazado. " + motivo);
                        return ValePortadorRule_1.default.mostrarBloqueo(_this.context, motivo)
                            .then(function () {
                            return { canceled: true };
                        });
                    });
                };
                return PreProductSaleValePortadorTrigger;
            }(ProductTriggers_1.PreProductSaleTrigger));
            exports_1("default", PreProductSaleValePortadorTrigger);
        }
    };
});
