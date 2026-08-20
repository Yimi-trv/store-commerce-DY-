System.register(["PosApi/Extend/Triggers/ProductTriggers", "PosApi/Consume/Cart", "./CustomerModalHelper"], function (exports_1, context_1) {
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
    var ProductTriggers_1, Cart_1, Cart_2, CustomerModalHelper_1, DefaultCustomerTrigger;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (ProductTriggers_1_1) {
                ProductTriggers_1 = ProductTriggers_1_1;
            },
            function (Cart_1_1) {
                Cart_1 = Cart_1_1;
                Cart_2 = Cart_1_1;
            },
            function (CustomerModalHelper_1_1) {
                CustomerModalHelper_1 = CustomerModalHelper_1_1;
            }
        ],
        execute: function () {
            DefaultCustomerTrigger = (function (_super) {
                __extends(DefaultCustomerTrigger, _super);
                function DefaultCustomerTrigger() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                DefaultCustomerTrigger.prototype.execute = function (options) {
                    var _this = this;
                    if (window[CustomerModalHelper_1.GUARD_KEY]) {
                        return Promise.resolve();
                    }
                    var correlationId = this.context.logger.getNewCorrelationId();
                    return this.context.runtime
                        .executeAsync(new Cart_1.GetCurrentCartClientRequest(correlationId))
                        .then(function (response) {
                        var cart = response && response.data && response.data.result;
                        if (!cart || (cart.CustomerId && cart.CustomerId !== "")) {
                            return Promise.resolve();
                        }
                        return _this.context.runtime
                            .executeAsync(new Cart_2.SetCustomerOnCartOperationRequest(correlationId, DefaultCustomerTrigger.DEFAULT_CUSTOMER_ACCOUNT))
                            .then(function () {
                            _this.context.logger.logInformational("DefaultCustomerTrigger: cliente descriptivo "
                                + DefaultCustomerTrigger.DEFAULT_CUSTOMER_ACCOUNT + " asignado a la venta.");
                        });
                    })
                        .catch(function (reason) {
                        var detail = "";
                        try {
                            detail = JSON.stringify(reason);
                        }
                        catch (e) {
                            detail = String(reason);
                        }
                        _this.context.logger.logError("DefaultCustomerTrigger error: " + detail);
                    });
                };
                DefaultCustomerTrigger.DEFAULT_CUSTOMER_ACCOUNT = "TRV-000001";
                return DefaultCustomerTrigger;
            }(ProductTriggers_1.PostProductSaleTrigger));
            exports_1("default", DefaultCustomerTrigger);
        }
    };
});
