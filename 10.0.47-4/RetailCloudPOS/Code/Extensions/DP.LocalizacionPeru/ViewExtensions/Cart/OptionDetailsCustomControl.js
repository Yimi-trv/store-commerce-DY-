System.register(["PosApi/Extend/Views/CartView", "PosApi/Entities", "../../Helper/CartDataHelper", "PosApi/Consume/Cart", "knockout"], function (exports_1, context_1) {
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
    var CartView_1, Entities_1, CartDataHelper_1, Cart_1, knockout_1, OptionDetailsCustomControl;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (CartView_1_1) {
                CartView_1 = CartView_1_1;
            },
            function (Entities_1_1) {
                Entities_1 = Entities_1_1;
            },
            function (CartDataHelper_1_1) {
                CartDataHelper_1 = CartDataHelper_1_1;
            },
            function (Cart_1_1) {
                Cart_1 = Cart_1_1;
            },
            function (knockout_1_1) {
                knockout_1 = knockout_1_1;
            }
        ],
        execute: function () {
            OptionDetailsCustomControl = (function (_super) {
                __extends(OptionDetailsCustomControl, _super);
                function OptionDetailsCustomControl(id, context) {
                    var _this = _super.call(this, id, context) || this;
                    _this.customerIsPerson = knockout_1.default.observable(false);
                    _this.isNonReturnTransaction = knockout_1.default.observable(true);
                    _this._selectedOption = knockout_1.default.observable("Boleta");
                    _this.selectedOption = knockout_1.default.observable("Boleta");
                    _this.optionPreferences =
                        [
                            { description: "Boleta", value: "Boleta" },
                            { description: "Factura", value: "Factura" }
                        ];
                    _this._isLoaderVisible = knockout_1.default.observable(false);
                    _this.cartChangedHandler = function (data) {
                        try {
                            _this._isLoaderVisible(true);
                            if (data.cart.Id == "") {
                                _this._selectedOption("Boleta");
                                _this.selectedOption("Boleta");
                            }
                        }
                        catch (e) {
                            _this.context.logger.logInformational(e);
                        }
                        _this._isLoaderVisible(false);
                        _this.dialogResult = knockout_1.default.observable("");
                    };
                    return _this;
                }
                OptionDetailsCustomControl.prototype.onReady = function (element) {
                    try {
                        knockout_1.default.applyBindingsToNode(element, {
                            template: {
                                name: OptionDetailsCustomControl.TEMPLATE_ID,
                                data: this
                            }
                        });
                    }
                    catch (e) {
                        this.context.logger.logInformational(e);
                    }
                };
                OptionDetailsCustomControl.prototype.init = function (state) {
                    this.customerIsPerson(state.customer.CustomerTypeValue === Entities_1.ProxyEntities.CustomerType.Person);
                };
                OptionDetailsCustomControl.prototype.toggleClicked = function () {
                    var _this = this;
                    var correlationId = this.context.logger.getNewCorrelationId();
                    var cart = null;
                    var helper = new CartDataHelper_1.default();
                    var getCurrentCartClientRequest = new Cart_1.GetCurrentCartClientRequest(correlationId);
                    this.context.runtime.executeAsync(getCurrentCartClientRequest)
                        .then(function (getCurrentCartClientResponse) {
                        if (getCurrentCartClientResponse.canceled) {
                            return Promise.resolve({ canceled: true, data: null });
                        }
                        var arr = [];
                        var key = "SelectedOption";
                        var selectedOptionProperty = {
                            Key: key,
                            Value: { StringValue: _this._selectedOption() }
                        };
                        arr.push(selectedOptionProperty);
                        cart = getCurrentCartClientResponse.data.result;
                        return helper.saveArrayToCart(_this.context, arr, correlationId, cart).then(function (result1) {
                            _this.selectedOption(_this._selectedOption());
                            return Promise.resolve();
                        }).then(function () {
                            return Promise.resolve({ canceled: true, data: getCurrentCartClientResponse.data });
                        });
                    });
                };
                OptionDetailsCustomControl.TEMPLATE_ID = "DP_OSSMostrarMensaje_OptionDetails";
                return OptionDetailsCustomControl;
            }(CartView_1.CartViewCustomControlBase));
            exports_1("default", OptionDetailsCustomControl);
        }
    };
});
//# sourceMappingURL=C:/RetailLocEnviado/SCR-9.57/src/LocalizacionPeru/Pos/ViewExtensions/Cart/OptionDetailsCustomControl.js.map