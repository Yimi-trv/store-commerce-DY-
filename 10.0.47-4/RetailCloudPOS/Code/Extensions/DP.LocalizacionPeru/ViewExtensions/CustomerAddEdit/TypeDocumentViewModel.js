System.register(["PosApi/Consume/Device", "./BaseClasses/KnockoutExtensionViewModelBase", "PosApi/TypeExtensions", "../../Converter/TypeDocumentConverter", "../../DataService/DataServiceRequests.g", "knockout"], function (exports_1, context_1) {
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
    var Device_1, KnockoutExtensionViewModelBase_1, TypeExtensions_1, TypeDocumentConverter_1, Messages, knockout_1, TypeDocumentViewModel;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (Device_1_1) {
                Device_1 = Device_1_1;
            },
            function (KnockoutExtensionViewModelBase_1_1) {
                KnockoutExtensionViewModelBase_1 = KnockoutExtensionViewModelBase_1_1;
            },
            function (TypeExtensions_1_1) {
                TypeExtensions_1 = TypeExtensions_1_1;
            },
            function (TypeDocumentConverter_1_1) {
                TypeDocumentConverter_1 = TypeDocumentConverter_1_1;
            },
            function (Messages_1) {
                Messages = Messages_1;
            },
            function (knockout_1_1) {
                knockout_1 = knockout_1_1;
            }
        ],
        execute: function () {
            TypeDocumentViewModel = (function (_super) {
                __extends(TypeDocumentViewModel, _super);
                function TypeDocumentViewModel(context, options) {
                    var _this = _super.call(this) || this;
                    _this._context = context;
                    _this.currentTypeDocuments = knockout_1.default.observableArray([]);
                    _this._context.runtime.executeAsync(new Device_1.GetDeviceConfigurationClientRequest())
                        .then(function (response) {
                        return response.data.result;
                    })
                        .then(function (deviceConfiguration) {
                        return _this._context.runtime.executeAsync(new Messages.DPTypeDocumIdentPE.GetTypeDocumenIdentByDataAreaRequest());
                    }).then(function (response) {
                        if (TypeExtensions_1.ObjectExtensions.isNullOrUndefined(response)
                            || TypeExtensions_1.ObjectExtensions.isNullOrUndefined(response.data)
                            || response.canceled) {
                            return;
                        }
                        var typeDocumentsId = [];
                        response.data.result.forEach(function (typeDocument) {
                            typeDocumentsId.push(TypeDocumentConverter_1.default.convertToClientTypeDocument(typeDocument));
                        });
                        _this._TypeDocuments = typeDocumentsId;
                        _this.currentTypeDocuments(_this._TypeDocuments);
                    }).catch(function (reason) {
                        _this._context.logger.logError("TypeDocumentsView: " + JSON.stringify(reason));
                    });
                    return _this;
                }
                TypeDocumentViewModel.prototype.getTypeDoc = function () {
                    var _this = this;
                    var request = new Messages.DPTypeDocumIdentPE.GetTypeDocumenIdentByDataAreaRequest();
                    return this._context.runtime.executeAsync(request)
                        .then(function (result) {
                        var typeDocumentsId = [];
                        if (!result.canceled) {
                            var message = "resultado " + result.data.result;
                            _this._context.logger.logInformational(message);
                            result.data.result.forEach(function (typeDocument) {
                                typeDocumentsId.push(TypeDocumentConverter_1.default.convertToClientTypeDocument(typeDocument));
                            });
                        }
                        return typeDocumentsId;
                    }).catch(function (reason) {
                        _this._context.logger.logError(JSON.stringify(reason), _this._context.logger.getNewCorrelationId());
                        return null;
                    });
                };
                TypeDocumentViewModel.prototype.listItemSelected = function (item) {
                    this._context.logger.logInformational("Item selected on:" + item.TypeDocId);
                };
                return TypeDocumentViewModel;
            }(KnockoutExtensionViewModelBase_1.default));
            exports_1("default", TypeDocumentViewModel);
        }
    };
});
//# sourceMappingURL=C:/RetailLocEnviado/SCR-9.57/src/LocalizacionPeru/Pos/ViewExtensions/CustomerAddEdit/TypeDocumentViewModel.js.map