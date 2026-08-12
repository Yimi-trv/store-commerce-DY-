System.register(["PosApi/Create/Dialogs", "PosApi/TypeExtensions"], function (exports_1, context_1) {
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
    var Dialogs, TypeExtensions_1, StoreReceiptEditDialog;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (Dialogs_1) {
                Dialogs = Dialogs_1;
            },
            function (TypeExtensions_1_1) {
                TypeExtensions_1 = TypeExtensions_1_1;
            }
        ],
        execute: function () {
            StoreReceiptEditDialog = (function (_super) {
                __extends(StoreReceiptEditDialog, _super);
                function StoreReceiptEditDialog() {
                    return _super.call(this) || this;
                }
                StoreReceiptEditDialog.prototype.onReady = function (element) {
                    var _this = this;
                    var intDataInput = element.querySelector("#intData");
                    intDataInput.value = this._data.Id.toString();
                    intDataInput.onchange = function () { _this._data.Id = intDataInput.valueAsNumber; };
                    var stringDataInput = element.querySelector("#stringData");
                    stringDataInput.value = this._data.DataValue.toString();
                    stringDataInput.onchange = function () { _this._data.DataValue = stringDataInput.valueAsNumber; };
                };
                StoreReceiptEditDialog.prototype.open = function (dataToEdit) {
                    var _this = this;
                    this._data = dataToEdit;
                    var promise = new Promise(function (resolve, reject) {
                        _this._resolve = resolve;
                        var option = {
                            title: "SECUENCIA N�MERICA",
                            button1: {
                                id: "buttonUpdate",
                                label: _this.context.resources.getString("string_2002"),
                                isPrimary: true,
                                onClick: _this._buttonUpdateClickHandler.bind(_this)
                            },
                            button2: {
                                id: "buttonCancel",
                                label: _this.context.resources.getString("string_2004"),
                                onClick: _this._buttonCancelClickHandler.bind(_this)
                            },
                            onCloseX: function () { return _this._buttonCancelClickHandler(); }
                        };
                        _this.openDialog(option);
                    });
                    return promise;
                };
                StoreReceiptEditDialog.prototype._buttonUpdateClickHandler = function () {
                    this._resolvePromise(this._data);
                    return true;
                };
                StoreReceiptEditDialog.prototype._buttonCancelClickHandler = function () {
                    this._resolvePromise(null);
                    return true;
                };
                StoreReceiptEditDialog.prototype._resolvePromise = function (editResult) {
                    if (TypeExtensions_1.ObjectExtensions.isFunction(this._resolve)) {
                        this._resolve(editResult);
                        this._resolve = null;
                    }
                };
                return StoreReceiptEditDialog;
            }(Dialogs.ExtensionTemplatedDialogBase));
            exports_1("default", StoreReceiptEditDialog);
        }
    };
});
//# sourceMappingURL=C:/RetailLocEnviado/SCR-9.57/src/LocalizacionPeru/Pos/Controls/Dialogs/Edit/StoreReceiptEditDialogModule.js.map