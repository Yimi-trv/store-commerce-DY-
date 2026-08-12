System.register(["PosApi/Extend/Views/ManageShiftsView", "../../Controls/Dialogs/MessageDialog/MessageDialog", "PosApi/TypeExtensions"], function (exports_1, context_1) {
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
    var ManageShiftsView, MessageDialog_1, TypeExtensions_1, ManageShiftsCommand;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (ManageShiftsView_1) {
                ManageShiftsView = ManageShiftsView_1;
            },
            function (MessageDialog_1_1) {
                MessageDialog_1 = MessageDialog_1_1;
            },
            function (TypeExtensions_1_1) {
                TypeExtensions_1 = TypeExtensions_1_1;
            }
        ],
        execute: function () {
            ManageShiftsCommand = (function (_super) {
                __extends(ManageShiftsCommand, _super);
                function ManageShiftsCommand(context) {
                    var _this = _super.call(this, context) || this;
                    _this.id = "sampleManageShiftsCommand";
                    _this.label = "Datos complementarios";
                    _this.extraClass = "iconLightningBolt";
                    _this.shiftSelectedHandler = function (data) {
                        _this.canExecute = true;
                        _this._selectedShift = data.selectedShift;
                    };
                    _this.shiftSelectionClearedHandler = function () {
                        _this.canExecute = false;
                    };
                    return _this;
                }
                ManageShiftsCommand.prototype.init = function (state) {
                    this.isVisible = true;
                };
                ManageShiftsCommand.prototype.execute = function () {
                    var empleadoProperty = Commerce.ArrayExtensions.firstOrUndefined(this._selectedShift.ExtensionProperties, function (property) {
                        return property.Key === "EmpleadoName";
                    });
                    var empleado;
                    if (!TypeExtensions_1.ObjectExtensions.isNullOrUndefined(empleadoProperty) && !TypeExtensions_1.ObjectExtensions.isNullOrUndefined(empleadoProperty.Value)) {
                        empleado = empleadoProperty.Value.StringValue;
                    }
                    ;
                    var message = "ID: " + this._selectedShift.StaffId + " Empleado: " + empleado;
                    this.refreshShifts();
                    MessageDialog_1.default.show(this.context, message.toString());
                };
                return ManageShiftsCommand;
            }(ManageShiftsView.ManageShiftsExtensionCommandBase));
            exports_1("default", ManageShiftsCommand);
        }
    };
});
//# sourceMappingURL=C:/RetailLocEnviado/SCR-9.57/src/LocalizacionPeru/Pos/ViewExtensions/ManageShifts/ManageShiftsCommand.js.map