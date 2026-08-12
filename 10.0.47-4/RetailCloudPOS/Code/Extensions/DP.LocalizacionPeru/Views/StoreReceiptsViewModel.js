System.register(["../DataService/DataServiceRequests.g", "../Controls/Dialogs/Edit/StoreReceiptEditDialogModule", "PosApi/TypeExtensions"], function (exports_1, context_1) {
    "use strict";
    var Messages, StoreReceiptEditDialogModule_1, TypeExtensions_1, StoreReceiptsViewModel;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (Messages_1) {
                Messages = Messages_1;
            },
            function (StoreReceiptEditDialogModule_1_1) {
                StoreReceiptEditDialogModule_1 = StoreReceiptEditDialogModule_1_1;
            },
            function (TypeExtensions_1_1) {
                TypeExtensions_1 = TypeExtensions_1_1;
            }
        ],
        execute: function () {
            StoreReceiptsViewModel = (function () {
                function StoreReceiptsViewModel(context) {
                    var _this = this;
                    this._context = context;
                    this.title = "VISTA SECUENCIA NUMERICA";
                    this.loadedData = [];
                    this.isItemSelected = function () { return !TypeExtensions_1.ObjectExtensions.isNullOrUndefined(_this._selectedItem); };
                }
                StoreReceiptsViewModel.prototype.load = function () {
                    var _this = this;
                    return this._context.runtime
                        .executeAsync(new Messages.StoreReceiptValues.DPGetStoreReceiptValuesByStoreRequest())
                        .then(function (response) {
                        if (!response.canceled) {
                            _this.loadedData = response.data.result;
                        }
                    });
                };
                StoreReceiptsViewModel.prototype.seletionChanged = function (items) {
                    this._context.logger.logInformational("Item selected:" + JSON.stringify(items));
                    this._selectedItem = TypeExtensions_1.ArrayExtensions.firstOrUndefined(items);
                    return Promise.resolve();
                };
                StoreReceiptsViewModel.prototype.editStoreReceiptEntity = function () {
                    var _this = this;
                    var dialog = new StoreReceiptEditDialogModule_1.default();
                    return dialog
                        .open(this._selectedItem)
                        .then(function (updatedItem) {
                        if (TypeExtensions_1.ObjectExtensions.isNullOrUndefined(updatedItem)) {
                            _this._context.logger.logInformational("Update canceled for data: " + JSON.stringify(updatedItem));
                            return Promise.resolve(false);
                        }
                        _this._context.logger.logInformational("Updated data is: " + JSON.stringify(updatedItem));
                        return _this._context.runtime
                            .executeAsync(new Messages.StoreReceiptValues.DPUpdateStoreReceiptValuesRequest(updatedItem.Id, updatedItem))
                            .then(function (response) {
                            if (!response.canceled && response.data.result) {
                                _this._context.logger.logInformational("Update success for id: " + updatedItem.Id);
                                return _this.load().then(function () { return true; });
                            }
                            _this._context.logger.logInformational("Update failed for id: " + updatedItem.Id);
                            return Promise.resolve(false);
                        });
                    }).catch(function (reason) {
                        _this._context.logger.logError("Error occurred in the edit dialog: " + JSON.stringify(reason));
                        return Promise.resolve(false);
                    });
                };
                return StoreReceiptsViewModel;
            }());
            exports_1("default", StoreReceiptsViewModel);
        }
    };
});
//# sourceMappingURL=C:/RetailLocEnviado/SCR-9.57/src/LocalizacionPeru/Pos/Views/StoreReceiptsViewModel.js.map