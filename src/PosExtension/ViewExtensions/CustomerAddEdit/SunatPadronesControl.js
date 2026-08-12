System.register(["PosApi/Extend/Views/CustomerAddEditView", "PosApi/Entities"], function (exports_1, context_1) {
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
    var CustomerAddEditView_1, Entities_1, SunatPadronesControl;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (CustomerAddEditView_1_1) {
                CustomerAddEditView_1 = CustomerAddEditView_1_1;
            },
            function (Entities_1_1) {
                Entities_1 = Entities_1_1;
            }
        ],
        execute: function () {
            SunatPadronesControl = (function (_super) {
                __extends(SunatPadronesControl, _super);
                function SunatPadronesControl(id, context) {
                    var _this = _super.call(this, id, context) || this;
                    _this._toggles = {};
                    _this._isSyncing = false;
                    _this.customerUpdatedHandler = function (data) {
                        _this._syncTogglesFromCustomer();
                        _this._syncDpDocFields();
                    };
                    return _this;
                }
                SunatPadronesControl.prototype.init = function (state) {
                    this.isVisible = true;
                };
                SunatPadronesControl.prototype.onReady = function (element) {
                    element.innerHTML = this._buildHtml();
                    this._hideDpToggles();
                    for (var i = 0; i < SunatPadronesControl.PADRONES.length; i++) {
                        var def = SunatPadronesControl.PADRONES[i];
                        var toggle = this._createToggle(element, def);
                        if (toggle) {
                            this._toggles[def.key] = toggle;
                        }
                    }
                };
                SunatPadronesControl.prototype._buildHtml = function () {
                    var html = '<div class="sunatPadronesPeru" style="margin-top:8px;margin-bottom:8px;">'
                        + '<h2 style="margin-top:8px;margin-bottom:8px;">Padrones SUNAT</h2>'
                        + '<div style="display:flex;flex-wrap:wrap;">';
                    for (var i = 0; i < SunatPadronesControl.PADRONES.length; i++) {
                        var def = SunatPadronesControl.PADRONES[i];
                        html += '<div style="display:flex;flex-direction:column;min-width:170px;margin:0 24px 12px 0;">'
                            + '<label for="' + def.domId + '">' + def.label + '</label>'
                            + '<div id="' + def.domId + '"></div>'
                            + '</div>';
                    }
                    html += '</div></div>';
                    return html;
                };
                SunatPadronesControl.prototype._createToggle = function (element, def) {
                    var _this = this;
                    var root = element.querySelector("#" + def.domId);
                    if (!root) {
                        this.context.logger.logError("SunatPadronesControl: no se encontró el placeholder #" + def.domId);
                        return null;
                    }
                    var key = def.key;
                    var options = {
                        tabIndex: 0,
                        enabled: true,
                        checked: this._readPadron(key),
                        labelOn: "Sí",
                        labelOff: "No"
                    };
                    var toggle = this.context.controlFactory.create(this.context.logger.getNewCorrelationId(), "Toggle", options, root);
                    toggle.addEventListener("CheckedChanged", function (eventData) {
                        if (_this._isSyncing) {
                            return;
                        }
                        _this._writePadron(key, eventData.checked);
                    });
                    return toggle;
                };
                SunatPadronesControl.prototype._syncTogglesFromCustomer = function () {
                    this._isSyncing = true;
                    try {
                        for (var i = 0; i < SunatPadronesControl.PADRONES.length; i++) {
                            var def = SunatPadronesControl.PADRONES[i];
                            var toggle = this._toggles[def.key];
                            if (toggle) {
                                toggle.checked = this._readPadron(def.key);
                            }
                        }
                    }
                    finally {
                        this._isSyncing = false;
                    }
                };
                SunatPadronesControl.prototype._syncDpDocFields = function () {
                    var docType = this._readStringProp("DPTYPEDOCID_PE");
                    var docNumber = this._readStringProp("DPNUMBERDOCUMID_PE");
                    if (docType) {
                        this._setDpSelectValue("customerPersonalizado", docType, 0);
                    }
                    if (docNumber) {
                        this._setDpInputValue("customerdpnumberid_pe", docNumber);
                    }
                };
                SunatPadronesControl.prototype._readStringProp = function (key) {
                    var customer = this.customer;
                    if (!customer || !customer.ExtensionProperties) {
                        return "";
                    }
                    for (var i = 0; i < customer.ExtensionProperties.length; i++) {
                        var prop = customer.ExtensionProperties[i];
                        if (prop.Key === key && prop.Value && prop.Value.StringValue) {
                            return prop.Value.StringValue;
                        }
                    }
                    return "";
                };
                SunatPadronesControl.prototype._setDpInputValue = function (domId, value) {
                    var el = document.getElementById(domId);
                    if (!el || el.value === value) {
                        return;
                    }
                    el.value = value;
                    this._dispatchChange(el);
                };
                SunatPadronesControl.prototype._setDpSelectValue = function (domId, value, attempt) {
                    var _this = this;
                    var el = document.getElementById(domId);
                    if (el) {
                        var hasOption = false;
                        for (var i = 0; i < el.options.length; i++) {
                            if (el.options[i].value === value) {
                                hasOption = true;
                                break;
                            }
                        }
                        if (hasOption) {
                            if (el.value !== value) {
                                el.value = value;
                                this._dispatchChange(el);
                            }
                            return;
                        }
                    }
                    if (attempt < 5) {
                        setTimeout(function () { _this._setDpSelectValue(domId, value, attempt + 1); }, 600);
                    }
                };
                SunatPadronesControl.prototype._dispatchChange = function (el) {
                    var evt;
                    try {
                        evt = new Event("change", { bubbles: true });
                    }
                    catch (_a) {
                        evt = document.createEvent("Event");
                        evt.initEvent("change", true, false);
                    }
                    el.dispatchEvent(evt);
                };
                SunatPadronesControl.prototype._readPadron = function (key) {
                    var customer = this.customer;
                    if (!customer || !customer.ExtensionProperties) {
                        return false;
                    }
                    for (var i = 0; i < customer.ExtensionProperties.length; i++) {
                        var prop = customer.ExtensionProperties[i];
                        if (prop.Key === key && prop.Value) {
                            if (prop.Value.IntegerValue === 1) {
                                return true;
                            }
                            if (prop.Value.BooleanValue === true) {
                                return true;
                            }
                            return false;
                        }
                    }
                    return false;
                };
                SunatPadronesControl.prototype._writePadron = function (key, value) {
                    var customer = this.customer;
                    if (!customer) {
                        return;
                    }
                    if (!customer.ExtensionProperties) {
                        customer.ExtensionProperties = [];
                    }
                    var intValue = value ? 1 : 0;
                    for (var i = 0; i < customer.ExtensionProperties.length; i++) {
                        if (customer.ExtensionProperties[i].Key === key) {
                            customer.ExtensionProperties[i].Value = { IntegerValue: intValue };
                            return;
                        }
                    }
                    var prop = new Entities_1.ProxyEntities.CommercePropertyClass();
                    prop.Key = key;
                    prop.Value = { IntegerValue: intValue };
                    customer.ExtensionProperties.push(prop);
                };
                SunatPadronesControl.prototype._hideDpToggles = function () {
                    var styleId = "sunatPadronesHideDpStyle";
                    if (!document.getElementById(styleId)) {
                        var selectors = [];
                        for (var i = 0; i < SunatPadronesControl.PADRONES.length; i++) {
                            var domId = SunatPadronesControl.PADRONES[i].dpDomId;
                            selectors.push("#" + domId);
                            selectors.push('label[for="' + domId + '"]');
                        }
                        var style = document.createElement("style");
                        style.id = styleId;
                        style.appendChild(document.createTextNode(selectors.join(",") + "{display:none !important;}"));
                        document.head.appendChild(style);
                    }
                    setTimeout(function () {
                        for (var j = 0; j < SunatPadronesControl.PADRONES.length; j++) {
                            var node = document.getElementById(SunatPadronesControl.PADRONES[j].dpDomId);
                            while (node && (!node.className || node.className.indexOf("divTableCell") < 0)) {
                                node = node.parentElement;
                            }
                            if (node) {
                                node.style.display = "none";
                            }
                        }
                    }, 0);
                };
                SunatPadronesControl.PADRONES = [
                    { key: "DPAGENTRETENTION_PE", domId: "sunat_retention_pe", dpDomId: "dpagentretention_pe", label: "Agente de retención" },
                    { key: "DPAGENTPERCEPTION_PE", domId: "sunat_perception_pe", dpDomId: "dpagentperception_pe", label: "Agente de percepción" },
                    { key: "DPPUBLICSECTOR_PE", domId: "sunat_publicsector_pe", dpDomId: "dppublicsector_pe", label: "Sector público" },
                    { key: "DPEMERGENCYZONE_PE", domId: "sunat_emergencyzone_pe", dpDomId: "dpemergencyzone_pe", label: "Zona de emergencia" },
                    { key: "DPEXONERATEDPERCEPTION_PE", domId: "sunat_exoneratedperception_pe", dpDomId: "dpexoneratedperception_pe", label: "Exonerado de percepción" },
                    { key: "DPFINALCONSUMER_PE", domId: "sunat_finalconsumer_pe", dpDomId: "dpfinalconsumer_pe", label: "Consumidor final" },
                    { key: "DPOTHERS_PE", domId: "sunat_others_pe", dpDomId: "dpothers_pe", label: "Otros" },
                    { key: "DPNOTDOMICILED_PE", domId: "sunat_notdomiciled_pe", dpDomId: "dpnotdomiciled_pe", label: "No domiciliado" }
                ];
                return SunatPadronesControl;
            }(CustomerAddEditView_1.CustomerAddEditCustomControlBase));
            exports_1("default", SunatPadronesControl);
        }
    };
});
