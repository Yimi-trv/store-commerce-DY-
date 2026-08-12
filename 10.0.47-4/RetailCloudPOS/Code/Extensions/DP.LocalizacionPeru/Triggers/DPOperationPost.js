System.register(["PosApi/Extend/Triggers/OperationTriggers", "../Helper/CartDataHelper", "PosApi/Consume/Cart", "PosApi/TypeExtensions", "knockout"], function (exports_1, context_1) {
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
    var Triggers, CartDataHelper_1, Cart_1, TypeExtensions_1, knockout_1, DPOperationPost;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (Triggers_1) {
                Triggers = Triggers_1;
            },
            function (CartDataHelper_1_1) {
                CartDataHelper_1 = CartDataHelper_1_1;
            },
            function (Cart_1_1) {
                Cart_1 = Cart_1_1;
            },
            function (TypeExtensions_1_1) {
                TypeExtensions_1 = TypeExtensions_1_1;
            },
            function (knockout_1_1) {
                knockout_1 = knockout_1_1;
            }
        ],
        execute: function () {
            DPOperationPost = (function (_super) {
                __extends(DPOperationPost, _super);
                function DPOperationPost() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                DPOperationPost.prototype.execute = function (options) {
                    var _this = this;
                    if (options.operationRequest.operationId == 600) {
                        var correlationId_1 = this.context.logger.getNewCorrelationId();
                        var cart_1 = null;
                        var helper_1 = new CartDataHelper_1.default();
                        var getCurrentCartClientRequest = new Cart_1.GetCurrentCartClientRequest(correlationId_1);
                        this.context.runtime.executeAsync(getCurrentCartClientRequest)
                            .then(function (getCurrentCartClientResponse) {
                            if (getCurrentCartClientResponse.canceled) {
                                return Promise.resolve({ canceled: true, data: null });
                            }
                            cart_1 = getCurrentCartClientResponse.data.result;
                            var SelectedOptionExtensionProperty = Commerce.ArrayExtensions.firstOrUndefined(cart_1.ExtensionProperties, function (property) {
                                return property.Key === "SelectedOption";
                            });
                            if (!TypeExtensions_1.ObjectExtensions.isNullOrUndefined(SelectedOptionExtensionProperty) && !TypeExtensions_1.ObjectExtensions.isNullOrUndefined(SelectedOptionExtensionProperty.Value)) {
                                _this._selectedOption = knockout_1.default.observable(SelectedOptionExtensionProperty.Value.StringValue);
                                _this.selectedOption = knockout_1.default.observable(SelectedOptionExtensionProperty.Value.StringValue);
                            }
                            var arr = [];
                            var key = "SelectedOption";
                            var selectedOptionProperty = {
                                Key: key,
                                Value: { StringValue: _this._selectedOption() }
                            };
                            arr.push(selectedOptionProperty);
                            return helper_1.saveArrayToCart(_this.context, arr, correlationId_1, cart_1).then(function (result1) {
                                _this.selectedOption(_this._selectedOption());
                                return Promise.resolve();
                            }).then(function () {
                                return Promise.resolve({ canceled: true, data: getCurrentCartClientResponse.data });
                            });
                        });
                    }
                    return Promise.resolve();
                };
                return DPOperationPost;
            }(Triggers.PostOperationTrigger));
            exports_1("default", DPOperationPost);
        }
    };
});
//# sourceMappingURL=C:/RetailLocEnviado/SCR-9.57/src/LocalizacionPeru/Pos/Triggers/DPOperationPost.js.map