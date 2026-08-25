System.register(["PosApi/Extend/Triggers/ApplicationTriggers", "PosApi/Consume/Cart", "PosApi/Consume/Customer", "../Controls/Dialogs/CustomerInline/CustomerInlineDialog", "./CustomerModalHelper"], function (exports_1, context_1) {
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
    var ApplicationTriggers_1, Cart_1, Customer_1, CustomerInlineDialog_1, CustomerModalHelper_1, RE_ESPACIOS, SALTO, CustomerPanelAddressTrigger;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (ApplicationTriggers_1_1) {
                ApplicationTriggers_1 = ApplicationTriggers_1_1;
            },
            function (Cart_1_1) {
                Cart_1 = Cart_1_1;
            },
            function (Customer_1_1) {
                Customer_1 = Customer_1_1;
            },
            function (CustomerInlineDialog_1_1) {
                CustomerInlineDialog_1 = CustomerInlineDialog_1_1;
            },
            function (CustomerModalHelper_1_1) {
                CustomerModalHelper_1 = CustomerModalHelper_1_1;
            }
        ],
        execute: function () {
            RE_ESPACIOS = new RegExp("[\\s]+", "g");
            SALTO = String.fromCharCode(10);
            CustomerPanelAddressTrigger = (function (_super) {
                __extends(CustomerPanelAddressTrigger, _super);
                function CustomerPanelAddressTrigger() {
                    var _this = _super !== null && _super.apply(this, arguments) || this;
                    _this._lastInterceptAt = 0;
                    _this._unknownLabels = {};
                    return _this;
                }
                CustomerPanelAddressTrigger.prototype.execute = function (options) {
                    var _this = this;
                    if (typeof document === "undefined" || window[CustomerPanelAddressTrigger.INSTALLED_KEY]) {
                        return Promise.resolve();
                    }
                    window[CustomerPanelAddressTrigger.INSTALLED_KEY] = true;
                    var eventos = ["pointerdown", "mousedown", "click"];
                    for (var i = 0; i < eventos.length; i++) {
                        document.addEventListener(eventos[i], function (event) {
                            _this._onDocumentClick(event);
                        }, true);
                    }
                    var marca = "RegenerateFE 1.3.1 activo | reglas: comprobante-vs-documento,"
                        + " veto-RUC-observado, cliente-descriptivo, direccion-obligatoria-solo-empresas,"
                        + " modal-en-toda-vista, cliente-antes-del-pago, empleado-honorarios-a-cuenta, mapa-de-clicks";
                    this.context.logger.logInformational(marca);
                    if (typeof console !== "undefined" && console.log) {
                        console.log("=== " + marca + " ===");
                    }
                    return Promise.resolve();
                };
                CustomerPanelAddressTrigger.prototype._onDocumentClick = function (event) {
                    try {
                        if (window[CustomerModalHelper_1.GUARD_KEY]) {
                            return;
                        }
                        if (event.type === "click") {
                            this._mapearElemento(event.target);
                        }
                        var clickable = this._findAddressButton(event.target);
                        if (!clickable) {
                            return;
                        }
                        event.preventDefault();
                        event.stopPropagation();
                        if (typeof event.stopImmediatePropagation === "function") {
                            event.stopImmediatePropagation();
                        }
                        var ahora = new Date().getTime();
                        if (ahora - this._lastInterceptAt < 900) {
                            return;
                        }
                        this._lastInterceptAt = ahora;
                        this.context.logger.logInformational("CustomerPanelAddressTrigger: interceptado por " + event.type + " | rotulo='"
                            + (clickable.textContent || "").replace(/\s+/g, " ").trim()
                            + "' | clases=" + (typeof clickable.className === "string" ? clickable.className : "(sin clases)")
                            + " | dentro del panel=" + this._isInsideCustomerPanel(clickable));
                        this._openEditDialog();
                    }
                    catch (error) {
                        this.context.logger.logError("CustomerPanelAddressTrigger error: " + String(error));
                    }
                };
                CustomerPanelAddressTrigger.prototype._findAddressButton = function (target) {
                    var porBinding = this._findByKnockoutBinding(target);
                    if (porBinding) {
                        return porBinding;
                    }
                    var node = target;
                    for (var depth = 0; node && depth < 5; depth++) {
                        var raw = node.textContent || "";
                        if (raw.length > CustomerPanelAddressTrigger.MAX_LABEL_LENGTH) {
                            if (this._looksLikeAddressLabel(raw)) {
                                var limpio = raw.replace(/\s+/g, " ").trim();
                                this._reportUnknownLabel(limpio.substring(0, 120) + " [...] (texto largo)");
                            }
                            return null;
                        }
                        if (this._looksLikeAddressLabel(raw)) {
                            if (this._matchesLabel(node)) {
                                return node;
                            }
                            this._reportUnknownLabel(raw);
                        }
                        node = node.parentElement;
                    }
                    return null;
                };
                CustomerPanelAddressTrigger.prototype._mapearElemento = function (target) {
                    if (window.__mapaDeClicks === false || !target) {
                        return;
                    }
                    var lineas = ["=== CLICK ==="];
                    var nodo = target;
                    for (var nivel = 0; nodo && nivel < 7; nivel++) {
                        var clases = (typeof nodo.className === "string" && nodo.className)
                            ? "." + nodo.className.replace(RE_ESPACIOS, ".")
                            : "";
                        var id = nodo.id ? "#" + nodo.id : "";
                        var bind = nodo.getAttribute ? (nodo.getAttribute("data-bind") || "") : "";
                        var texto = (nodo.textContent || "").replace(RE_ESPACIOS, " ").trim();
                        lineas.push("  " + nivel + ") " + nodo.tagName + id + clases);
                        if (bind) {
                            lineas.push("       bind = " + bind);
                        }
                        if (texto) {
                            lineas.push("       texto = '" + texto.substring(0, 60) + "'");
                        }
                        nodo = nodo.parentElement;
                    }
                    this._mapearModeloDeVista(target, lineas);
                    var salida = lineas.join(SALTO);
                    if (typeof console !== "undefined" && console.log) {
                        console.log(salida);
                    }
                    this.context.logger.logInformational(salida);
                };
                CustomerPanelAddressTrigger.prototype._mapearModeloDeVista = function (target, lineas) {
                    var ko = window.ko;
                    if (!ko || typeof ko.dataFor !== "function") {
                        lineas.push("  ko: no disponible");
                        return;
                    }
                    try {
                        var modelo = ko.dataFor(target);
                        if (!modelo) {
                            lineas.push("  ko: sin modelo de vista en este elemento");
                            return;
                        }
                        var nombre = (modelo.constructor && modelo.constructor.name) || "(anonimo)";
                        var interesantes = [];
                        for (var clave in modelo) {
                            var k = clave.toLowerCase();
                            if (k.indexOf("customer") >= 0 || k.indexOf("account") >= 0 || k.indexOf("cart") >= 0) {
                                interesantes.push(clave + " (" + typeof modelo[clave] + ")");
                            }
                        }
                        lineas.push("  ko: " + nombre);
                        lineas.push("       cliente/cuenta/carrito: "
                            + (interesantes.length ? interesantes.join(", ") : "(ninguna)"));
                    }
                    catch (error) {
                        lineas.push("  ko: no se pudo leer el modelo de vista (" + error + ")");
                    }
                };
                CustomerPanelAddressTrigger.prototype._reportUnknownLabel = function (raw) {
                    var texto = (raw || "").replace(/\s+/g, " ").trim();
                    if (!texto || this._unknownLabels[texto]) {
                        return;
                    }
                    this._unknownLabels[texto] = true;
                    this.context.logger.logInformational("CustomerPanelAddressTrigger: rotulo parecido NO reconocido: '" + texto + "'");
                };
                CustomerPanelAddressTrigger.prototype._findByKnockoutBinding = function (target) {
                    var node = target;
                    for (var depth = 0; node && depth < 10; depth++) {
                        if (typeof node.getAttribute === "function") {
                            var bind = node.getAttribute("data-bind") || "";
                            if (bind.indexOf("addressEditClickHandler") >= 0
                                || bind.indexOf("AddressEditClick") >= 0) {
                                return node;
                            }
                        }
                        node = node.parentElement;
                    }
                    return null;
                };
                CustomerPanelAddressTrigger.prototype._looksLikeAddressLabel = function (raw) {
                    var text = raw.toUpperCase();
                    return text.indexOf("IRECCI") >= 0 || text.indexOf("DDRESS") >= 0;
                };
                CustomerPanelAddressTrigger.prototype._isInsideCustomerPanel = function (node) {
                    var current = node;
                    for (var depth = 0; current && depth < 12; depth++) {
                        var id = current.id || "";
                        var cls = typeof current.className === "string" ? current.className : "";
                        if (id.indexOf("CustomerPanel") >= 0
                            || cls.indexOf("customerPanel") >= 0
                            || cls.indexOf("customerDetailsCardStyle") >= 0) {
                            return true;
                        }
                        current = current.parentElement;
                    }
                    return false;
                };
                CustomerPanelAddressTrigger.prototype._matchesLabel = function (node) {
                    var text = (node.textContent || "")
                        .toUpperCase()
                        .replace(/[ÁÀÄÂ]/g, "A").replace(/[ÉÈËÊ]/g, "E").replace(/[ÍÌÏÎ]/g, "I")
                        .replace(/[ÓÒÖÔ]/g, "O").replace(/[ÚÙÜÛ]/g, "U")
                        .replace(/Ñ/g, "N")
                        .replace(/[^A-Z ]/g, " ")
                        .replace(/\s+/g, " ")
                        .trim();
                    for (var i = 0; i < CustomerPanelAddressTrigger.LABELS.length; i++) {
                        if (text === CustomerPanelAddressTrigger.LABELS[i]) {
                            return true;
                        }
                    }
                    return false;
                };
                CustomerPanelAddressTrigger.prototype._openEditDialog = function () {
                    var _this = this;
                    var correlationId = this.context.logger.getNewCorrelationId();
                    this.context.runtime
                        .executeAsync(new Cart_1.GetCurrentCartClientRequest(correlationId))
                        .then(function (response) {
                        var cart = response && response.data && response.data.result;
                        var accountNumber = (cart && cart.CustomerId) || "";
                        if (!accountNumber) {
                            return Promise.resolve(null);
                        }
                        return _this.context.runtime
                            .executeAsync(new Customer_1.GetCustomerClientRequest(accountNumber, correlationId))
                            .then(function (customerResponse) {
                            return (customerResponse && customerResponse.data && customerResponse.data.result) || null;
                        });
                    })
                        .then(function (customer) {
                        if (!customer) {
                            _this.context.logger.logInformational("CustomerPanelAddressTrigger: la venta no tiene cliente; se abre el modal en Buscar.");
                        }
                        window[CustomerModalHelper_1.GUARD_KEY] = true;
                        var dialog = new CustomerInlineDialog_1.default();
                        return dialog.open(customer ? "edit" : "search", customer, "");
                    })
                        .then(function () {
                        window[CustomerModalHelper_1.GUARD_KEY] = false;
                    })
                        .catch(function (reason) {
                        window[CustomerModalHelper_1.GUARD_KEY] = false;
                        var detail = "";
                        try {
                            detail = JSON.stringify(reason);
                        }
                        catch (error) {
                            detail = String(reason);
                        }
                        _this.context.logger.logError("CustomerPanelAddressTrigger: no se pudo abrir el modal: " + detail);
                    });
                };
                CustomerPanelAddressTrigger.INSTALLED_KEY = "__customerPanelAddressHooked";
                CustomerPanelAddressTrigger.MAX_LABEL_LENGTH = 40;
                CustomerPanelAddressTrigger.LABELS = [
                    "AGREGAR DIRECCION",
                    "ANADIR DIRECCION",
                    "ADD ADDRESS",
                    "ADD AN ADDRESS",
                    "NEW ADDRESS"
                ];
                return CustomerPanelAddressTrigger;
            }(ApplicationTriggers_1.ApplicationStartTrigger));
            exports_1("default", CustomerPanelAddressTrigger);
        }
    };
});
