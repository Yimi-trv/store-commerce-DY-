System.register(["PosApi/TypeExtensions", "PosApi/Consume/Cart"], function (exports_1, context_1) {
    "use strict";
    var TypeExtensions_1, Cart_1, CartDataHelper;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (TypeExtensions_1_1) {
                TypeExtensions_1 = TypeExtensions_1_1;
            },
            function (Cart_1_1) {
                Cart_1 = Cart_1_1;
            }
        ],
        execute: function () {
            CartDataHelper = (function () {
                function CartDataHelper() {
                }
                CartDataHelper.prototype.saveArrayToCart = function (context, arr, correlationId, cart) {
                    if (TypeExtensions_1.ObjectExtensions.isNullOrUndefined(cart.ExtensionProperties))
                        cart.ExtensionProperties = [];
                    arr.forEach(function (prop) {
                        var cartExtensionProperty = Commerce.ArrayExtensions.firstOrUndefined(cart.ExtensionProperties, function (property) {
                            return property.Key === prop.Key;
                        });
                        if (TypeExtensions_1.ObjectExtensions.isNullOrUndefined(cartExtensionProperty)) {
                            var newProperty = {
                                Key: prop.Key,
                                Value: { StringValue: prop.Value.StringValue }
                            };
                            if (TypeExtensions_1.ObjectExtensions.isNullOrUndefined(cart.ExtensionProperties)) {
                                cart.ExtensionProperties = [];
                            }
                            cart.ExtensionProperties.push(newProperty);
                        }
                        else {
                            cartExtensionProperty.Value = { StringValue: prop.Value.StringValue };
                        }
                    });
                    var saveExtensionPropertiesOnCartClientRequest = new Cart_1.SaveExtensionPropertiesOnCartClientRequest(cart.ExtensionProperties, correlationId);
                    return context.runtime.executeAsync(saveExtensionPropertiesOnCartClientRequest)
                        .then(function (saveExtensionPropertiesReponse) {
                        if (saveExtensionPropertiesReponse.canceled) {
                            return Promise.resolve({ canceled: true, data: null });
                        }
                        return Promise.resolve({
                            canceled: false,
                            data: saveExtensionPropertiesReponse.data
                        });
                    });
                };
                CartDataHelper.prototype.saveDataToCart = function (context, key, newValue, correlationId, cart) {
                    var cartExtensionProperty = Commerce.ArrayExtensions.firstOrUndefined(cart.ExtensionProperties, function (property) {
                        return property.Key === key;
                    });
                    if (TypeExtensions_1.ObjectExtensions.isNullOrUndefined(cartExtensionProperty)) {
                        var newProperty = {
                            Key: key,
                            Value: { StringValue: newValue }
                        };
                        if (TypeExtensions_1.ObjectExtensions.isNullOrUndefined(cart.ExtensionProperties)) {
                            cart.ExtensionProperties = [];
                        }
                        cart.ExtensionProperties.push(newProperty);
                    }
                    else {
                        cartExtensionProperty.Value = { StringValue: newValue };
                    }
                    var saveExtensionPropertiesOnCartClientRequest = new Cart_1.SaveExtensionPropertiesOnCartClientRequest(cart.ExtensionProperties, correlationId);
                    return context.runtime.executeAsync(saveExtensionPropertiesOnCartClientRequest)
                        .then(function (saveExtensionPropertiesReponse) {
                        if (saveExtensionPropertiesReponse.canceled) {
                            return Promise.resolve({ canceled: true, data: null });
                        }
                        return Promise.resolve({
                            canceled: false,
                            data: saveExtensionPropertiesReponse.data
                        });
                    });
                };
                CartDataHelper.isFromPaymentDialog = false;
                CartDataHelper.isFromAmountDueClick = false;
                CartDataHelper.isVoided = false;
                CartDataHelper.isCRDiaogOpened = false;
                CartDataHelper.isOfflineModeWithException = false;
                CartDataHelper.isReturnOperationCalled = false;
                CartDataHelper.isCRShowOffline = false;
                return CartDataHelper;
            }());
            exports_1("default", CartDataHelper);
        }
    };
});
//# sourceMappingURL=C:/RetailLocEnviado/SCR-9.57/src/LocalizacionPeru/Pos/Helper/CartDataHelper.js.map