System.register(["PosApi/Extend/Views/CustomerAddEditView", "PosApi/TypeExtensions", "./TypeDocumentViewModel", "knockout"], function (exports_1, context_1) {
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
    var CustomerAddEditView_1, TypeExtensions_1, TypeDocumentViewModel_1, knockout_1, CustomerFieldsPeru;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (CustomerAddEditView_1_1) {
                CustomerAddEditView_1 = CustomerAddEditView_1_1;
            },
            function (TypeExtensions_1_1) {
                TypeExtensions_1 = TypeExtensions_1_1;
            },
            function (TypeDocumentViewModel_1_1) {
                TypeDocumentViewModel_1 = TypeDocumentViewModel_1_1;
            },
            function (knockout_1_1) {
                knockout_1 = knockout_1_1;
            }
        ],
        execute: function () {
            CustomerFieldsPeru = (function (_super) {
                __extends(CustomerFieldsPeru, _super);
                function CustomerFieldsPeru(id, context) {
                    var _this = _super.call(this, id, context) || this;
                    _this.currentTypeDocuments = knockout_1.default.observableArray([]);
                    _this.header = knockout_1.default.observable("Datos Peru");
                    _this.custAcc = knockout_1.default.observable("");
                    _this.custAcc.subscribe(function (newValue) {
                        var key = "DPACCOUNTNUM_PE";
                        _this._addOrUpdateExtensionProperty(key, { StringValue: newValue });
                        _this.customer.AccountNumber = newValue;
                    });
                    var key = "DPTYPEDOCID_PE";
                    _this.personalizado = knockout_1.default.observable("");
                    _this.personalizado.subscribe(function (newValue) {
                        _this._addOrUpdateExtensionProperty(key, { StringValue: newValue });
                    });
                    var dpnumberdocumid_pekey = "DPNUMBERDOCUMID_PE";
                    _this.dpnumberdocumid_pe = knockout_1.default.observable("");
                    _this.dpnumberdocumid_pe.subscribe(function (newValue) {
                        _this._addOrUpdateExtensionProperty(dpnumberdocumid_pekey, { StringValue: newValue });
                    });
                    var dpagentretention_pekey = "DPAGENTRETENTION_PE";
                    _this.dpagentretention_pe = knockout_1.default.observable(false);
                    _this.dpagentretention_pe.subscribe(function (newValue) {
                        _this._addOrUpdateExtensionProperty(dpagentretention_pekey, { BooleanValue: newValue });
                    });
                    var dpagentperception_pekey = "DPAGENTPERCEPTION_PE";
                    _this.dpagentperception_pe = knockout_1.default.observable(false);
                    _this.dpagentperception_pe.subscribe(function (newValue) {
                        _this._addOrUpdateExtensionProperty(dpagentperception_pekey, { BooleanValue: newValue });
                    });
                    var dpexoneratedperception_pekey = "DPEXONERATEDPERCEPTION_PE";
                    _this.dpexoneratedperception_pe = knockout_1.default.observable(false);
                    _this.dpexoneratedperception_pe.subscribe(function (newValue) {
                        _this._addOrUpdateExtensionProperty(dpexoneratedperception_pekey, { BooleanValue: newValue });
                    });
                    var dpothers_pekey = "DPOTHERS_PE";
                    _this.dpothers_pe = knockout_1.default.observable(false);
                    _this.dpothers_pe.subscribe(function (newValue) {
                        _this._addOrUpdateExtensionProperty(dpothers_pekey, { BooleanValue: newValue });
                    });
                    var dpemergencyzone_pekey = "DPEMERGENCYZONE_PE";
                    _this.dpemergencyzone_pe = knockout_1.default.observable(false);
                    _this.dpemergencyzone_pe.subscribe(function (newValue) {
                        _this._addOrUpdateExtensionProperty(dpemergencyzone_pekey, { BooleanValue: newValue });
                    });
                    var dpfinalconsumer_pekey = "DPFINALCONSUMER_PE";
                    _this.dpfinalconsumer_pe = knockout_1.default.observable(false);
                    _this.dpfinalconsumer_pe.subscribe(function (newValue) {
                        _this._addOrUpdateExtensionProperty(dpfinalconsumer_pekey, { BooleanValue: newValue });
                    });
                    var dpnotdomiciled_pekey = "DPNOTDOMICILED_PE";
                    _this.dpnotdomiciled_pe = knockout_1.default.observable(false);
                    _this.dpnotdomiciled_pe.subscribe(function (newValue) {
                        _this._addOrUpdateExtensionProperty(dpnotdomiciled_pekey, { BooleanValue: newValue });
                    });
                    var dppublicsector_pekey = "DPPUBLICSECTOR_PE";
                    _this.dppublicsector_pe = knockout_1.default.observable(false);
                    _this.dppublicsector_pe.subscribe(function (newValue) {
                        _this._addOrUpdateExtensionProperty(dppublicsector_pekey, { BooleanValue: newValue });
                    });
                    _this.typeDocumentViewModel = knockout_1.default.observable(new TypeDocumentViewModel_1.default(_this.context));
                    _this.dpinvoice01_pe = knockout_1.default.computed(function () {
                        if (_this.personalizado() === "6")
                            return true;
                        else
                            return false;
                    });
                    return _this;
                }
                CustomerFieldsPeru.prototype.onReady = function (element) {
                    var _this = this;
                    knockout_1.default.applyBindingsToNode(element, {
                        template: {
                            name: CustomerFieldsPeru.TEMPLATE_ID,
                            data: this
                        }
                    });
                    var dpagentretention_pekey = "DPAGENTRETENTION_PE";
                    var dpagentretentionProperty;
                    if (!TypeExtensions_1.ObjectExtensions.isNullOrUndefined(this.customer) && !TypeExtensions_1.ObjectExtensions.isNullOrUndefined(this.customer.ExtensionProperties)) {
                        dpagentretentionProperty =
                            Commerce.ArrayExtensions.firstOrUndefined(this.customer.ExtensionProperties, function (property) {
                                return property.Key === dpagentretention_pekey;
                            });
                    }
                    else {
                        dpagentretentionProperty = this._CreateaddOrUpdateExtensionProperty(dpagentretention_pekey, { IntegerValue: 0 });
                    }
                    var dpagentretenextensionValue = undefined;
                    dpagentretenextensionValue = dpagentretentionProperty.Value;
                    this.dpagentretention_pe(dpagentretenextensionValue.IntegerValue == 1 ? true : false);
                    var toggleOptionsRetention = {
                        tabIndex: 0,
                        enabled: true,
                        checked: dpagentretenextensionValue.IntegerValue == 1 ? true : false,
                        labelOn: "On",
                        labelOff: "Off",
                    };
                    var toggleRootElemRetention = element.querySelector("#dpagentretention_pe");
                    this.toggleSwitch = this.context.controlFactory.create(this.context.logger.getNewCorrelationId(), "Toggle", toggleOptionsRetention, toggleRootElemRetention);
                    this.toggleSwitch.addEventListener("CheckedChanged", function (eventData) {
                        _this.toggledpAgentretention(eventData.checked);
                    });
                    var dpagentperception_pekey = "DPAGENTPERCEPTION_PE";
                    var dpagentperceptionProperty;
                    if (!TypeExtensions_1.ObjectExtensions.isNullOrUndefined(this.customer) && !TypeExtensions_1.ObjectExtensions.isNullOrUndefined(this.customer.ExtensionProperties)) {
                        dpagentperceptionProperty =
                            Commerce.ArrayExtensions.firstOrUndefined(this.customer.ExtensionProperties, function (property) {
                                return property.Key === dpagentperception_pekey;
                            });
                    }
                    else {
                        dpagentperceptionProperty = this._CreateaddOrUpdateExtensionProperty(dpagentperception_pekey, { IntegerValue: 0 });
                    }
                    var dpagentperceptionextensionValue = undefined;
                    dpagentperceptionextensionValue = dpagentperceptionProperty.Value;
                    this.dpagentperception_pe(dpagentperceptionextensionValue.IntegerValue == 1 ? true : false);
                    var toggleOptionsPerception = {
                        tabIndex: 0,
                        enabled: true,
                        checked: dpagentperceptionextensionValue.IntegerValue == 1 ? true : false,
                        labelOn: "On",
                        labelOff: "Off",
                    };
                    var toggleRootElemPerception = element.querySelector("#dpagentperception_pe");
                    this.toggleSwitch = this.context.controlFactory.create(this.context.logger.getNewCorrelationId(), "Toggle", toggleOptionsPerception, toggleRootElemPerception);
                    this.toggleSwitch.addEventListener("CheckedChanged", function (eventData) {
                        _this.toggledpAgentperception(eventData.checked);
                    });
                    var dpexoneratedperception_pekey = "DPEXONERATEDPERCEPTION_PE";
                    var dpexoneratedperceptionProperty;
                    if (!TypeExtensions_1.ObjectExtensions.isNullOrUndefined(this.customer) && !TypeExtensions_1.ObjectExtensions.isNullOrUndefined(this.customer.ExtensionProperties)) {
                        dpexoneratedperceptionProperty =
                            Commerce.ArrayExtensions.firstOrUndefined(this.customer.ExtensionProperties, function (property) {
                                return property.Key === dpexoneratedperception_pekey;
                            });
                    }
                    else {
                        dpexoneratedperceptionProperty = this._CreateaddOrUpdateExtensionProperty(dpexoneratedperception_pekey, { IntegerValue: 0 });
                    }
                    var dpexoneratedperceptionextensionValue = undefined;
                    dpexoneratedperceptionextensionValue = dpexoneratedperceptionProperty.Value;
                    this.dpexoneratedperception_pe(dpexoneratedperceptionextensionValue.IntegerValue == 1 ? true : false);
                    var toggleOptionsExoPerception = {
                        tabIndex: 0,
                        enabled: true,
                        checked: dpexoneratedperceptionextensionValue.IntegerValue == 1 ? true : false,
                        labelOn: "On",
                        labelOff: "Off",
                    };
                    var toggleRootElemExoPerception = element.querySelector("#dpexoneratedperception_pe");
                    this.toggleSwitch = this.context.controlFactory.create(this.context.logger.getNewCorrelationId(), "Toggle", toggleOptionsExoPerception, toggleRootElemExoPerception);
                    this.toggleSwitch.addEventListener("CheckedChanged", function (eventData) {
                        _this.toggledpExoneratedperception(eventData.checked);
                    });
                    var dpothers_pekey = "DPOTHERS_PE";
                    var dpothersProperty;
                    if (!TypeExtensions_1.ObjectExtensions.isNullOrUndefined(this.customer) && !TypeExtensions_1.ObjectExtensions.isNullOrUndefined(this.customer.ExtensionProperties)) {
                        dpothersProperty =
                            Commerce.ArrayExtensions.firstOrUndefined(this.customer.ExtensionProperties, function (property) {
                                return property.Key === dpothers_pekey;
                            });
                    }
                    else {
                        dpothersProperty = this._CreateaddOrUpdateExtensionProperty(dpothers_pekey, { IntegerValue: 0 });
                    }
                    var dpothersextensionValue = undefined;
                    dpothersextensionValue = dpothersProperty.Value;
                    this.dpothers_pe(dpothersextensionValue.IntegerValue == 1 ? true : false);
                    var toggleOptionsOthers = {
                        tabIndex: 0,
                        enabled: true,
                        checked: dpothersextensionValue.IntegerValue == 1 ? true : false,
                        labelOn: "On",
                        labelOff: "Off",
                    };
                    var toggleRootElemOthers = element.querySelector("#dpothers_pe");
                    this.toggleSwitch = this.context.controlFactory.create(this.context.logger.getNewCorrelationId(), "Toggle", toggleOptionsOthers, toggleRootElemOthers);
                    this.toggleSwitch.addEventListener("CheckedChanged", function (eventData) {
                        _this.toggledpOthers(eventData.checked);
                    });
                    var dpemergencyzone_pekey = "DPEMERGENCYZONE_PE";
                    var dpemergencyzoneProperty;
                    if (!TypeExtensions_1.ObjectExtensions.isNullOrUndefined(this.customer) && !TypeExtensions_1.ObjectExtensions.isNullOrUndefined(this.customer.ExtensionProperties)) {
                        dpemergencyzoneProperty =
                            Commerce.ArrayExtensions.firstOrUndefined(this.customer.ExtensionProperties, function (property) {
                                return property.Key === dpemergencyzone_pekey;
                            });
                    }
                    else {
                        dpemergencyzoneProperty = this._CreateaddOrUpdateExtensionProperty(dpemergencyzone_pekey, { IntegerValue: 0 });
                    }
                    var dpemergencyzoneextensionValue = undefined;
                    dpemergencyzoneextensionValue = dpemergencyzoneProperty.Value;
                    this.dpemergencyzone_pe(dpemergencyzoneextensionValue.IntegerValue == 1 ? true : false);
                    var toggleOptionsEmergZone = {
                        tabIndex: 0,
                        enabled: true,
                        checked: dpemergencyzoneextensionValue.IntegerValue == 1 ? true : false,
                        labelOn: "On",
                        labelOff: "Off",
                    };
                    var toggleRootElemEmerZone = element.querySelector("#dpemergencyzone_pe");
                    this.toggleSwitch = this.context.controlFactory.create(this.context.logger.getNewCorrelationId(), "Toggle", toggleOptionsEmergZone, toggleRootElemEmerZone);
                    this.toggleSwitch.addEventListener("CheckedChanged", function (eventData) {
                        _this.toggledpEmergencyzone(eventData.checked);
                    });
                    var dpfinalconsumer_pekey = "DPFINALCONSUMER_PE";
                    var dpfinalconsumerProperty;
                    if (!TypeExtensions_1.ObjectExtensions.isNullOrUndefined(this.customer) && !TypeExtensions_1.ObjectExtensions.isNullOrUndefined(this.customer.ExtensionProperties)) {
                        dpfinalconsumerProperty =
                            Commerce.ArrayExtensions.firstOrUndefined(this.customer.ExtensionProperties, function (property) {
                                return property.Key === dpfinalconsumer_pekey;
                            });
                    }
                    else {
                        dpfinalconsumerProperty = this._CreateaddOrUpdateExtensionProperty(dpfinalconsumer_pekey, { IntegerValue: 0 });
                    }
                    var dpfinalconsumerextensionValue = undefined;
                    dpfinalconsumerextensionValue = dpfinalconsumerProperty.Value;
                    this.dpfinalconsumer_pe(dpfinalconsumerextensionValue.IntegerValue == 1 ? true : false);
                    var toggleOptionsFinalConsum = {
                        tabIndex: 0,
                        enabled: true,
                        checked: dpfinalconsumerextensionValue.IntegerValue == 1 ? true : false,
                        labelOn: "On",
                        labelOff: "Off",
                    };
                    var toggleRootElemFinalConsum = element.querySelector("#dpfinalconsumer_pe");
                    this.toggleSwitch = this.context.controlFactory.create(this.context.logger.getNewCorrelationId(), "Toggle", toggleOptionsFinalConsum, toggleRootElemFinalConsum);
                    this.toggleSwitch.addEventListener("CheckedChanged", function (eventData) {
                        _this.toggledpFinalconsumer(eventData.checked);
                    });
                    var dpnotdomiciled_pekey = "DPNOTDOMICILED_PE";
                    var dpnotdomiciledProperty;
                    if (!TypeExtensions_1.ObjectExtensions.isNullOrUndefined(this.customer) && !TypeExtensions_1.ObjectExtensions.isNullOrUndefined(this.customer.ExtensionProperties)) {
                        dpnotdomiciledProperty =
                            Commerce.ArrayExtensions.firstOrUndefined(this.customer.ExtensionProperties, function (property) {
                                return property.Key === dpnotdomiciled_pekey;
                            });
                    }
                    else {
                        dpnotdomiciledProperty = this._CreateaddOrUpdateExtensionProperty(dpnotdomiciled_pekey, { IntegerValue: 0 });
                    }
                    var dpnotdomiciledextensionValue = undefined;
                    dpnotdomiciledextensionValue = dpnotdomiciledProperty.Value;
                    this.dpnotdomiciled_pe(dpnotdomiciledextensionValue.IntegerValue == 1 ? true : false);
                    var toggleOptionsNotDomici = {
                        tabIndex: 0,
                        enabled: true,
                        checked: dpnotdomiciledextensionValue.IntegerValue == 1 ? true : false,
                        labelOn: "On",
                        labelOff: "Off",
                    };
                    var toggleRootElemNotDomici = element.querySelector("#dpnotdomiciled_pe");
                    this.toggleSwitch = this.context.controlFactory.create(this.context.logger.getNewCorrelationId(), "Toggle", toggleOptionsNotDomici, toggleRootElemNotDomici);
                    this.toggleSwitch.addEventListener("CheckedChanged", function (eventData) {
                        _this.toggledpNotdomiciled(eventData.checked);
                    });
                    var dppublicsector_pekey = "DPPUBLICSECTOR_PE";
                    var dppublicsectorProperty;
                    if (!TypeExtensions_1.ObjectExtensions.isNullOrUndefined(this.customer) && !TypeExtensions_1.ObjectExtensions.isNullOrUndefined(this.customer.ExtensionProperties)) {
                        dppublicsectorProperty =
                            Commerce.ArrayExtensions.firstOrUndefined(this.customer.ExtensionProperties, function (property) {
                                return property.Key === dppublicsector_pekey;
                            });
                    }
                    else {
                        dppublicsectorProperty = this._CreateaddOrUpdateExtensionProperty(dppublicsector_pekey, { IntegerValue: 0 });
                    }
                    var dppublicsectorextensionValue = undefined;
                    dppublicsectorextensionValue = dppublicsectorProperty.Value;
                    this.dppublicsector_pe(dppublicsectorextensionValue.IntegerValue == 1 ? true : false);
                    var toggleOptionsPublicSector = {
                        tabIndex: 0,
                        enabled: true,
                        checked: dppublicsectorextensionValue.IntegerValue == 1 ? true : false,
                        labelOn: "On",
                        labelOff: "Off",
                    };
                    var toggleRootElemPublicSector = element.querySelector("#dppublicsector_pe");
                    this.toggleSwitch = this.context.controlFactory.create(this.context.logger.getNewCorrelationId(), "Toggle", toggleOptionsPublicSector, toggleRootElemPublicSector);
                    this.toggleSwitch.addEventListener("CheckedChanged", function (eventData) {
                        _this.toggledppublicsector(eventData.checked);
                    });
                };
                CustomerFieldsPeru.prototype.init = function (state) {
                    var _this = this;
                    if (!state.isSelectionMode) {
                        this.isVisible = true;
                        this.custAcc(state.customer.AccountNumber);
                        var key_1 = "DPTYPEDOCID_PE";
                        var extensionProperty = Commerce.ArrayExtensions.firstOrUndefined(this.customer.ExtensionProperties, function (property) {
                            return property.Key === key_1;
                        });
                        var extensionValue_1 = TypeExtensions_1.ObjectExtensions.isNullOrUndefined(extensionProperty) ? undefined : extensionProperty.Value;
                        var selectedTypeDocId_1 = undefined;
                        this.typeDocumentViewModel().getTypeDoc().then(function (typeDocumentsId) {
                            _this.currentTypeDocuments(typeDocumentsId);
                            _this.currentTypeDocuments().forEach(function (t) {
                                if (!TypeExtensions_1.ObjectExtensions.isNullOrUndefined(extensionValue_1) && t.typeDocId === extensionValue_1.StringValue) {
                                    selectedTypeDocId_1 = t;
                                    _this.personalizado(selectedTypeDocId_1.typeDocId);
                                }
                            });
                        });
                        var dpnumberdocumid_pekey_1 = "DPNUMBERDOCUMID_PE";
                        var dpnumberextensionProperty = Commerce.ArrayExtensions.firstOrUndefined(this.customer.ExtensionProperties, function (property) {
                            return property.Key === dpnumberdocumid_pekey_1;
                        });
                        var dpnumberextensionValue = undefined;
                        if (!TypeExtensions_1.ObjectExtensions.isNullOrUndefined(dpnumberextensionProperty)) {
                            dpnumberextensionValue = dpnumberextensionProperty.Value;
                            this.dpnumberdocumid_pe(dpnumberextensionValue.StringValue);
                        }
                    }
                };
                CustomerFieldsPeru.prototype.toggledpAgentretention = function (checked) {
                    this._addOrUpdateExtensionProperty("DPAGENTRETENTION_PE", { BooleanValue: checked });
                };
                CustomerFieldsPeru.prototype.toggledpAgentperception = function (checked) {
                    this._addOrUpdateExtensionProperty("DPAGENTPERCEPTION_PE", { BooleanValue: checked });
                };
                CustomerFieldsPeru.prototype.toggledpExoneratedperception = function (checked) {
                    this._addOrUpdateExtensionProperty("DPEXONERATEDPERCEPTION_PE", { BooleanValue: checked });
                };
                CustomerFieldsPeru.prototype.toggledpOthers = function (checked) {
                    this._addOrUpdateExtensionProperty("DPOTHERS_PE", { BooleanValue: checked });
                };
                CustomerFieldsPeru.prototype.toggledpEmergencyzone = function (checked) {
                    this._addOrUpdateExtensionProperty("DPEMERGENCYZONE_PE", { BooleanValue: checked });
                };
                CustomerFieldsPeru.prototype.toggledpFinalconsumer = function (checked) {
                    this._addOrUpdateExtensionProperty("DPFINALCONSUMER_PE", { BooleanValue: checked });
                };
                CustomerFieldsPeru.prototype.toggledpNotdomiciled = function (checked) {
                    this._addOrUpdateExtensionProperty("DPNOTDOMICILED_PE", { BooleanValue: checked });
                };
                CustomerFieldsPeru.prototype.toggledppublicsector = function (checked) {
                    this._addOrUpdateExtensionProperty("DPPUBLICSECTOR_PE", { BooleanValue: checked });
                };
                CustomerFieldsPeru.prototype._addOrUpdateExtensionProperty = function (key, newValue) {
                    var customer = this.customer;
                    if (TypeExtensions_1.ObjectExtensions.isNullOrUndefined(customer))
                        return;
                    if (TypeExtensions_1.ObjectExtensions.isNullOrUndefined(customer.ExtensionProperties)) {
                        customer.ExtensionProperties = [];
                    }
                    var extensionProperty = Commerce.ArrayExtensions.firstOrUndefined(customer.ExtensionProperties, function (property) {
                        return property.Key === key;
                    });
                    if (TypeExtensions_1.ObjectExtensions.isNullOrUndefined(extensionProperty)) {
                        var newProperty = {
                            Key: key,
                            Value: newValue
                        };
                        if (TypeExtensions_1.ObjectExtensions.isNullOrUndefined(customer.ExtensionProperties)) {
                            customer.ExtensionProperties = [];
                        }
                        customer.ExtensionProperties.push(newProperty);
                    }
                    else {
                        extensionProperty.Value = newValue;
                    }
                    this.customer = customer;
                };
                CustomerFieldsPeru.prototype._CreateaddOrUpdateExtensionProperty = function (key, newValue) {
                    var newPropertyObj;
                    var newProperty = {
                        Key: key,
                        Value: newValue
                    };
                    newPropertyObj = newProperty;
                    return newPropertyObj;
                };
                CustomerFieldsPeru.TEMPLATE_ID = "Microsoft_Pos_Extensibility_Localizacion_CustomerFieldsPeru";
                return CustomerFieldsPeru;
            }(CustomerAddEditView_1.CustomerAddEditCustomControlBase));
            exports_1("default", CustomerFieldsPeru);
        }
    };
});
//# sourceMappingURL=C:/RetailLocEnviado/SCR-9.57/src/LocalizacionPeru/Pos/ViewExtensions/CustomerAddEdit/CustomerFieldsPeru.js.map