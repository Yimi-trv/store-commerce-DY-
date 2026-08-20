System.register(["PosApi/Create/Dialogs", "PosApi/Consume/Customer", "PosApi/Consume/Cart", "PosApi/Consume/Device", "PosApi/Entities", "../../../Services/SunatCustomerService", "../../../DataService/DataServiceRequests.g", "../../../DataService/AddressPurposesRequest", "../../../DataService/CustomerGroupsRequest", "../../../DataService/CustomerSearchRequest", "../../../DataService/CustomerSearchByFieldsRequest", "../../../DataService/GeographicRequests", "PosApi/Consume/StoreOperations"], function (exports_1, context_1) {
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
    var Dialogs_1, Customer_1, Cart_1, Device_1, Entities_1, SunatCustomerService_1, DataServiceRequests_g_1, AddressPurposesRequest_1, CustomerGroupsRequest_1, CustomerSearchRequest_1, CustomerSearchByFieldsRequest_1, GeographicRequests_1, StoreOperations_1, GUARD_KEY, DIAG_PREFIX, CustomerInlineDialog;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (Dialogs_1_1) {
                Dialogs_1 = Dialogs_1_1;
            },
            function (Customer_1_1) {
                Customer_1 = Customer_1_1;
            },
            function (Cart_1_1) {
                Cart_1 = Cart_1_1;
            },
            function (Device_1_1) {
                Device_1 = Device_1_1;
            },
            function (Entities_1_1) {
                Entities_1 = Entities_1_1;
            },
            function (SunatCustomerService_1_1) {
                SunatCustomerService_1 = SunatCustomerService_1_1;
            },
            function (DataServiceRequests_g_1_1) {
                DataServiceRequests_g_1 = DataServiceRequests_g_1_1;
            },
            function (AddressPurposesRequest_1_1) {
                AddressPurposesRequest_1 = AddressPurposesRequest_1_1;
            },
            function (CustomerGroupsRequest_1_1) {
                CustomerGroupsRequest_1 = CustomerGroupsRequest_1_1;
            },
            function (CustomerSearchRequest_1_1) {
                CustomerSearchRequest_1 = CustomerSearchRequest_1_1;
            },
            function (CustomerSearchByFieldsRequest_1_1) {
                CustomerSearchByFieldsRequest_1 = CustomerSearchByFieldsRequest_1_1;
            },
            function (GeographicRequests_1_1) {
                GeographicRequests_1 = GeographicRequests_1_1;
            },
            function (StoreOperations_1_1) {
                StoreOperations_1 = StoreOperations_1_1;
            }
        ],
        execute: function () {
            GUARD_KEY = "__customerInlineDialogActive";
            DIAG_PREFIX = "__diag:";
            CustomerInlineDialog = (function (_super) {
                __extends(CustomerInlineDialog, _super);
                function CustomerInlineDialog() {
                    var _this = _super.call(this) || this;
                    _this._sunatAddressEnforcedFor = "";
                    _this._searchTop = 25;
                    _this._searchSkip = 0;
                    _this._searchInFlight = false;
                    _this._editingAddressRecordId = 0;
                    _this._mode = "search";
                    _this._resolve = null;
                    _this._currentCustomer = null;
                    _this._initialSearchText = "";
                    _this._sunatService = new SunatCustomerService_1.default();
                    _this._lastSunatData = null;
                    return _this;
                }
                CustomerInlineDialog.prototype.open = function (mode, customer, initialSearchText) {
                    var _this = this;
                    this._mode = mode;
                    if (["search", "create", "edit"].indexOf(this._mode) === -1) {
                        this._mode = "search";
                    }
                    this._currentCustomer = customer || null;
                    this._initialSearchText = initialSearchText || "";
                    return new Promise(function (resolve) {
                        _this._resolve = resolve;
                        var dialogOptions = {
                            title: "Cliente",
                            button1: {
                                id: "customerInlineClose",
                                label: "Cerrar",
                                isPrimary: true,
                                onClick: _this._closeClickHandler.bind(_this)
                            },
                            onCloseX: _this._closeClickHandler.bind(_this)
                        };
                        CustomerInlineDialog._ensureHostStyle();
                        CustomerInlineDialog._markBody(true);
                        _this.openDialog(dialogOptions);
                    });
                };
                CustomerInlineDialog.prototype.onReady = function (element) {
                    var _this = this;
                    this._bindTab(element, "search", "customerInlineTabSearch");
                    this._bindTab(element, "create", "customerInlineTabCreate");
                    this._bindTab(element, "edit", "customerInlineTabEdit");
                    var searchBtn = element.querySelector("#customerInlineSearchBtn");
                    if (searchBtn) {
                        searchBtn.onclick = function () {
                            _this._executeSearch(element, false);
                        };
                    }
                    var nativeSearchBtn = element.querySelector("#customerInlineSearchNativeBtn");
                    if (nativeSearchBtn) {
                        nativeSearchBtn.onclick = function () {
                            _this._openNativeSearch(element);
                        };
                    }
                    var searchInput = element.querySelector("#customerInlineSearchText");
                    if (searchInput) {
                        searchInput.onkeydown = function (event) {
                            if (event.keyCode === 13) {
                                event.preventDefault();
                                _this._executeSearch(element, false);
                            }
                        };
                    }
                    this._bindAction(element, "customerInlineCreateSunatButton", this._lookupSunatForCreate.bind(this));
                    this._bindAction(element, "customerInlineCreateButton", this._executeCreate.bind(this));
                    this._bindAction(element, "customerInlineEditSunatButton", this._lookupSunatForEdit.bind(this));
                    this._bindAction(element, "customerInlineEditButton", this._updateCustomer.bind(this));
                    if (!this._currentCustomer) {
                        var editTab = element.querySelector("#customerInlineTabEdit");
                        if (editTab) {
                            editTab.style.display = "none";
                        }
                    }
                    this._widenHostDialog(element);
                    this._prefillInitialValues(element);
                    this._setMode(element, this._mode);
                    this._loadAddressPurposes(element);
                    this._loadCustomerGroups(element);
                    this._loadDepartments(element);
                    var customerTypeSelect = element.querySelector("#customerInlineCreateCustomerType");
                    if (customerTypeSelect) {
                        customerTypeSelect.onchange = function () {
                            _this._togglePersonNameFields(element, parseInt(customerTypeSelect.value, 10) !== Entities_1.ProxyEntities.CustomerType.Organization);
                        };
                    }
                    var departmentSelect = element.querySelector("#customerInlineCreateDepartment");
                    if (departmentSelect) {
                        departmentSelect.onchange = function () {
                            _this._loadProvinces(element, departmentSelect.value);
                        };
                    }
                    var provinceSelect = element.querySelector("#customerInlineCreateProvince");
                    if (provinceSelect) {
                        provinceSelect.onchange = function () {
                            _this._loadDistricts(element, departmentSelect ? departmentSelect.value : "", provinceSelect.value);
                        };
                    }
                    var streetInput = element.querySelector("#customerInlineCreateAddress");
                    if (streetInput) {
                        streetInput.onblur = function () {
                            _this._splitStreetOnBlur(element);
                        };
                    }
                };
                CustomerInlineDialog._ensureHostStyle = function () {
                    if (typeof document === "undefined" || document.getElementById(CustomerInlineDialog._hostStyleId)) {
                        return;
                    }
                    var rules = [
                        "body.customerInlineDialogOpen .extensionTemplatedDialog,",
                        ".customerInlineHostDialog {",
                        "    width: clamp(520px, 82vw, 800px) !important;",
                        "    max-width: 96vw !important;",
                        "    background-color: " + CustomerInlineDialog._colorSurface + " !important;",
                        "    color: " + CustomerInlineDialog._colorText + " !important;",
                        "}",
                        "body.customerInlineDialogOpen .dialogContainer,",
                        "body.customerInlineDialogOpen .ExtensionTemplateDialogContentPlaceholder,",
                        ".customerInlineHostContainer {",
                        "    width: 100% !important;",
                        "    max-width: 100% !important;",
                        "    box-sizing: border-box !important;",
                        "}",
                        "body.customerInlineDialogOpen .extensionTemplatedDialog div,",
                        "body.customerInlineDialogOpen .extensionTemplatedDialog section,",
                        "body.customerInlineDialogOpen .extensionTemplatedDialog header,",
                        "body.customerInlineDialogOpen .extensionTemplatedDialog footer,",
                        "body.customerInlineDialogOpen .extensionTemplatedDialog span {",
                        "    background-color: transparent !important;",
                        "}",
                        "body.customerInlineDialogOpen .extensionTemplatedDialog,",
                        "body.customerInlineDialogOpen .extensionTemplatedDialog div,",
                        "body.customerInlineDialogOpen .extensionTemplatedDialog span,",
                        "body.customerInlineDialogOpen .extensionTemplatedDialog h1,",
                        "body.customerInlineDialogOpen .extensionTemplatedDialog h2,",
                        "body.customerInlineDialogOpen .extensionTemplatedDialog h3,",
                        "body.customerInlineDialogOpen .extensionTemplatedDialog h4 {",
                        "    color: " + CustomerInlineDialog._colorText + " !important;",
                        "}"
                    ].join("\n");
                    var style = document.createElement("style");
                    style.id = CustomerInlineDialog._hostStyleId;
                    style.appendChild(document.createTextNode(rules));
                    (document.head || document.getElementsByTagName("head")[0]).appendChild(style);
                };
                CustomerInlineDialog._markBody = function (open) {
                    if (typeof document === "undefined" || !document.body) {
                        return;
                    }
                    var marker = "customerInlineDialogOpen";
                    var current = typeof document.body.className === "string" ? document.body.className : "";
                    var has = (" " + current + " ").indexOf(" " + marker + " ") >= 0;
                    if (open && !has) {
                        document.body.className = current ? current + " " + marker : marker;
                    }
                    else if (!open && has) {
                        document.body.className = (" " + current + " ").split(" " + marker + " ").join(" ").replace(/\s+/g, " ").replace(/^ | $/g, "");
                    }
                };
                CustomerInlineDialog.prototype._widenHostDialog = function (element) {
                    var _this = this;
                    var attempts = [0, 60, 150, 350];
                    this._applyDialogWidth(element);
                    this._applyDialogTheme(element);
                    for (var i = 0; i < attempts.length; i++) {
                        setTimeout(function () {
                            _this._applyDialogWidth(element);
                            _this._applyDialogTheme(element);
                        }, attempts[i]);
                    }
                    setTimeout(function () { _this._reportDialogWidth(element); }, 950);
                };
                CustomerInlineDialog.prototype._applyDialogTheme = function (element) {
                    var host = this._findHostDialog(element);
                    if (!host) {
                        return;
                    }
                    host.style.setProperty("background-color", CustomerInlineDialog._colorSurface, "important");
                    host.style.setProperty("color", CustomerInlineDialog._colorText, "important");
                    var nodes = host.querySelectorAll("*");
                    for (var i = 0; i < nodes.length; i++) {
                        var node = nodes[i];
                        if (element === node || element.contains(node)) {
                            continue;
                        }
                        node.style.setProperty("color", CustomerInlineDialog._colorText, "important");
                        if (node.tagName !== "BUTTON") {
                            node.style.setProperty("background-color", "transparent", "important");
                        }
                    }
                };
                CustomerInlineDialog.prototype._findHostDialog = function (element) {
                    var node = element.parentElement;
                    for (var depth = 0; node && depth < 10; depth++) {
                        var cls = typeof node.className === "string" ? node.className : "";
                        if (cls.indexOf("extensionTemplatedDialog") >= 0) {
                            return node;
                        }
                        node = node.parentElement;
                    }
                    return null;
                };
                CustomerInlineDialog.prototype._applyDialogWidth = function (element) {
                    var node = element.parentElement;
                    for (var depth = 0; node && depth < 10; depth++) {
                        var cls = typeof node.className === "string" ? node.className : "";
                        if (cls.indexOf("extensionTemplatedDialog") >= 0) {
                            this._addClass(node, "customerInlineHostDialog");
                            break;
                        }
                        if (cls.indexOf("dialogContainer") >= 0
                            || cls.indexOf("ExtensionTemplateDialogContentPlaceholder") >= 0) {
                            this._addClass(node, "customerInlineHostContainer");
                        }
                        node = node.parentElement;
                    }
                };
                CustomerInlineDialog.prototype._addClass = function (node, className) {
                    var current = typeof node.className === "string" ? node.className : "";
                    if ((" " + current + " ").indexOf(" " + className + " ") === -1) {
                        node.className = current ? current + " " + className : className;
                    }
                };
                CustomerInlineDialog.prototype._reportDialogWidth = function (element) {
                    var TARGET_WIDTH = 900;
                    var report = [];
                    var node = element.parentElement;
                    for (var depth = 0; node && depth < 8; depth++) {
                        var width = node.offsetWidth;
                        var tag = node.tagName;
                        var cls = node.className || "(sin clase)";
                        var cssWidth = "";
                        var cssMaxWidth = "";
                        var cssPosition = "";
                        var cssOverflow = "";
                        if (typeof window !== "undefined" && window.getComputedStyle) {
                            var computed = window.getComputedStyle(node);
                            cssWidth = computed.width;
                            cssMaxWidth = computed.maxWidth;
                            cssPosition = computed.position;
                            cssOverflow = computed.overflowX;
                        }
                        report.push(depth + ") " + tag + "." + cls
                            + " | offsetWidth=" + width
                            + " | css width=" + cssWidth
                            + " max-width=" + cssMaxWidth
                            + " position=" + cssPosition
                            + " overflow-x=" + cssOverflow);
                        node = node.parentElement;
                    }
                    report.push("--- ancho final del contenido: " + element.offsetWidth + "px (objetivo " + TARGET_WIDTH + ") ---");
                    report.push("--- viewport: " + (typeof window !== "undefined" ? window.innerWidth : "?") + "px ---");
                    this._logChunked("=== Ancho del dialogo ===", report.join("\n"));
                };
                CustomerInlineDialog.prototype._loadCustomerGroups = function (element) {
                    var _this = this;
                    return this.context.runtime
                        .executeAsync(new CustomerGroupsRequest_1.GetCustomerGroupsRequest())
                        .then(function (response) {
                        var groups = (response && response.data && response.data.result) || [];
                        if (groups.length === 0) {
                            _this._logChunked("=== Grupos de cliente ===", "el canal no devolvio ninguno; se usa el del canal por defecto");
                            _this._fillGroupSelect(element, []);
                            return;
                        }
                        var options = [];
                        for (var i = 0; i < groups.length; i++) {
                            var group = groups[i];
                            var number = group.CustomerGroupNumber || "";
                            var name_1 = group.CustomerGroupName || number;
                            options.push({ value: number, label: name_1 });
                        }
                        _this._logChunked("=== Grupos de cliente (del canal) ===", _this._stringify(options));
                        _this._fillGroupSelect(element, options);
                    })
                        .catch(function (reason) {
                        _this._logChunked("=== Grupos de cliente ===", "GetCustomerGroups fallo, se usa el del canal por defecto: " + _this._getErrorMessage(reason));
                        _this._fillGroupSelect(element, []);
                    });
                };
                CustomerInlineDialog.prototype._preselectGeographyFromSunat = function (element, sunatData) {
                    var _this = this;
                    if (!sunatData.department && !sunatData.province && !sunatData.district) {
                        return Promise.resolve();
                    }
                    var request = new DataServiceRequests_g_1.TRU_GeographicData.ResolveUbigeoRequest(sunatData.department || "", sunatData.province || "", sunatData.district || "");
                    return this.context.runtime.executeAsync(request)
                        .then(function (response) {
                        var resolved = response && response.data && response.data.result && response.data.result[0];
                        if (!resolved || !resolved.IsValid) {
                            _this._logChunked("=== Cascada geografica ===", "el ubigeo de SUNAT no resolvio; el cajero debe elegirlo del desplegable. "
                                + (resolved ? resolved.Notes || "" : ""));
                            return Promise.resolve();
                        }
                        return _this._preselectGeography(element, resolved.StateId, resolved.CountyId, resolved.CityName);
                    })
                        .catch(function (reason) {
                        _this._logError("Preseleccion de ubigeo fallo: " + _this._stringify(reason));
                    });
                };
                CustomerInlineDialog.prototype._loadDepartments = function (element) {
                    var _this = this;
                    return this.context.runtime
                        .executeAsync(new StoreOperations_1.GetStateProvincesServiceRequest(this._getCorrelationId(), "PER"))
                        .then(function (response) {
                        var states = (response && response.data && response.data.stateProvinces) || [];
                        var options = [];
                        for (var i = 0; i < states.length; i++) {
                            options.push({
                                value: states[i].StateId || "",
                                label: states[i].StateName || states[i].StateId || ""
                            });
                        }
                        _this._fillGeoSelect(element, "customerInlineCreateDepartment", options, "Seleccione departamento");
                        _this._logChunked("=== Departamentos ===", options.length + " cargados");
                    })
                        .catch(function (reason) {
                        _this._logChunked("=== Departamentos ===", "no se pudieron cargar: " + _this._getErrorMessage(reason));
                    });
                };
                CustomerInlineDialog.prototype._loadProvinces = function (element, stateId) {
                    var _this = this;
                    this._fillGeoSelect(element, "customerInlineCreateProvince", [], "Seleccione provincia");
                    this._fillGeoSelect(element, "customerInlineCreateDistrict", [], "Seleccione distrito");
                    if (!stateId) {
                        return Promise.resolve();
                    }
                    return this.context.runtime
                        .executeAsync(new GeographicRequests_1.GetCountiesRequest(stateId))
                        .then(function (response) {
                        var counties = (response && response.data && response.data.result) || [];
                        var options = [];
                        for (var i = 0; i < counties.length; i++) {
                            options.push({
                                value: counties[i].CountyId || "",
                                label: counties[i].Name || counties[i].CountyId || ""
                            });
                        }
                        _this._fillGeoSelect(element, "customerInlineCreateProvince", options, "Seleccione provincia");
                    })
                        .catch(function (reason) {
                        _this._logChunked("=== Provincias ===", "no se pudieron cargar: " + _this._getErrorMessage(reason));
                    });
                };
                CustomerInlineDialog.prototype._loadDistricts = function (element, stateId, countyId) {
                    var _this = this;
                    this._fillGeoSelect(element, "customerInlineCreateDistrict", [], "Seleccione distrito");
                    if (!stateId || !countyId) {
                        return Promise.resolve();
                    }
                    return this.context.runtime
                        .executeAsync(new GeographicRequests_1.GetCitiesRequest(stateId, countyId))
                        .then(function (response) {
                        var cities = (response && response.data && response.data.result) || [];
                        var options = [];
                        for (var i = 0; i < cities.length; i++) {
                            options.push({
                                value: cities[i].Name || "",
                                label: cities[i].Description || cities[i].Name || ""
                            });
                        }
                        _this._fillGeoSelect(element, "customerInlineCreateDistrict", options, "Seleccione distrito");
                    })
                        .catch(function (reason) {
                        _this._logChunked("=== Distritos ===", "no se pudieron cargar: " + _this._getErrorMessage(reason));
                    });
                };
                CustomerInlineDialog.prototype._fillGeoSelect = function (element, id, options, placeholder) {
                    var select = element.querySelector("#" + id);
                    if (!select) {
                        return;
                    }
                    select.innerHTML = "";
                    var empty = document.createElement("option");
                    empty.value = "";
                    empty.text = options.length > 0 ? placeholder : "(sin opciones)";
                    select.appendChild(empty);
                    for (var i = 0; i < options.length; i++) {
                        var option = document.createElement("option");
                        option.value = options[i].value;
                        option.text = options[i].label;
                        select.appendChild(option);
                    }
                    select.disabled = options.length === 0;
                };
                CustomerInlineDialog.prototype._trySelectByValue = function (element, id, value) {
                    var select = element.querySelector("#" + id);
                    if (!select || !value) {
                        return false;
                    }
                    for (var i = 0; i < select.options.length; i++) {
                        if (select.options[i].value === value) {
                            select.selectedIndex = i;
                            return true;
                        }
                    }
                    return false;
                };
                CustomerInlineDialog.prototype._preselectGeography = function (element, stateId, countyId, cityCode) {
                    var _this = this;
                    if (!this._trySelectByValue(element, "customerInlineCreateDepartment", stateId)) {
                        this._logChunked("=== Cascada geografica ===", "departamento " + stateId + " no esta en el maestro");
                        return Promise.resolve();
                    }
                    return this._loadProvinces(element, stateId)
                        .then(function () {
                        if (!_this._trySelectByValue(element, "customerInlineCreateProvince", countyId)) {
                            _this._logChunked("=== Cascada geografica ===", "provincia " + countyId + " no esta en el maestro");
                            return Promise.resolve();
                        }
                        return _this._loadDistricts(element, stateId, countyId)
                            .then(function () {
                            _this._trySelectByValue(element, "customerInlineCreateDistrict", cityCode);
                        });
                    });
                };
                CustomerInlineDialog.prototype._fillGroupSelect = function (element, options) {
                    var select = element.querySelector("#customerInlineCreateCustomerGroup");
                    if (!select) {
                        return;
                    }
                    select.innerHTML = "";
                    var fallbackOption = document.createElement("option");
                    fallbackOption.value = "";
                    fallbackOption.text = "(Por defecto del canal)";
                    select.appendChild(fallbackOption);
                    for (var i = 0; i < options.length; i++) {
                        var option = document.createElement("option");
                        option.value = options[i].value;
                        option.text = options[i].label;
                        select.appendChild(option);
                    }
                };
                CustomerInlineDialog.prototype._loadAddressPurposes = function (element) {
                    var _this = this;
                    var fallback = [
                        { value: Entities_1.ProxyEntities.AddressType.Business, label: "Negocio" },
                        { value: Entities_1.ProxyEntities.AddressType.Delivery, label: "Entrega" },
                        { value: Entities_1.ProxyEntities.AddressType.Invoice, label: "Factura" },
                        { value: Entities_1.ProxyEntities.AddressType.Home, label: "Casa" },
                        { value: Entities_1.ProxyEntities.AddressType.Other, label: "Otros" }
                    ];
                    return this.context.runtime
                        .executeAsync(new AddressPurposesRequest_1.GetAddressPurposesRequest())
                        .then(function (response) {
                        var purposes = (response && response.data && response.data.result) || [];
                        if (purposes.length === 0) {
                            _this._logChunked("=== Propositos de direccion ===", "el canal no devolvio ninguno; se usa el enum AddressType");
                            _this._fillPurposeSelect(element, fallback);
                            return;
                        }
                        var fromChannel = [];
                        for (var i = 0; i < purposes.length; i++) {
                            var purpose = purposes[i];
                            fromChannel.push({
                                value: purpose.AddressType,
                                label: purpose.Description || purpose.Name || String(purpose.AddressType)
                            });
                        }
                        _this._logChunked("=== Propositos de direccion (del canal) ===", _this._stringify(fromChannel));
                        _this._fillPurposeSelect(element, fromChannel);
                    })
                        .catch(function (reason) {
                        _this._logChunked("=== Propositos de direccion ===", "GetAddressPurposes fallo, se usa el enum AddressType: " + _this._getErrorMessage(reason));
                        _this._fillPurposeSelect(element, fallback);
                    });
                };
                CustomerInlineDialog.prototype._resolveAddressName = function (documentType, purposeValue, purposeLabel) {
                    if (documentType === "RUC" && purposeValue === Entities_1.ProxyEntities.AddressType.Business) {
                        return "OFICINA";
                    }
                    if (documentType !== "RUC" && purposeValue === Entities_1.ProxyEntities.AddressType.Home) {
                        return "DOMICILIO";
                    }
                    return purposeLabel;
                };
                CustomerInlineDialog.prototype._applyCustomerType = function (element, customerTypeValue) {
                    var select = element.querySelector("#customerInlineCreateCustomerType");
                    if (select) {
                        select.value = String(customerTypeValue);
                    }
                    this._togglePersonNameFields(element, customerTypeValue !== Entities_1.ProxyEntities.CustomerType.Organization);
                };
                CustomerInlineDialog.prototype._togglePersonNameFields = function (element, isPerson) {
                    var ids = ["customerInlineCreateLastNameField", "customerInlineCreateFirstNameField"];
                    for (var i = 0; i < ids.length; i++) {
                        var field = element.querySelector("#" + ids[i]);
                        if (field) {
                            field.style.display = isPerson ? "" : "none";
                        }
                    }
                };
                CustomerInlineDialog.prototype._selectPurposeForDocumentType = function (element, documentType) {
                    var select = element.querySelector("#customerInlineCreateAddressPurpose");
                    if (!select) {
                        return;
                    }
                    var wanted = documentType === "RUC"
                        ? Entities_1.ProxyEntities.AddressType.Business
                        : Entities_1.ProxyEntities.AddressType.Home;
                    for (var i = 0; i < select.options.length; i++) {
                        if (parseInt(select.options[i].value, 10) === wanted) {
                            select.selectedIndex = i;
                            return;
                        }
                    }
                };
                CustomerInlineDialog.prototype._fillPurposeSelect = function (element, options) {
                    var select = element.querySelector("#customerInlineCreateAddressPurpose");
                    if (!select) {
                        return;
                    }
                    select.innerHTML = "";
                    for (var i = 0; i < options.length; i++) {
                        var option = document.createElement("option");
                        option.value = String(options[i].value);
                        option.text = options[i].label;
                        select.appendChild(option);
                    }
                };
                CustomerInlineDialog.prototype._bindTab = function (element, mode, buttonId) {
                    var _this = this;
                    var button = element.querySelector("#" + buttonId);
                    if (button) {
                        button.onclick = function () {
                            _this._setMode(element, mode);
                        };
                    }
                };
                CustomerInlineDialog.prototype._bindAction = function (element, buttonId, action) {
                    var _this = this;
                    var button = element.querySelector("#" + buttonId);
                    if (!button) {
                        return;
                    }
                    button.onclick = function () {
                        button.disabled = true;
                        action(element).then(function () {
                            button.disabled = false;
                        }).catch(function (reason) {
                            button.disabled = false;
                            _this._logError(buttonId + " error: " + _this._stringify(reason));
                            _this._showMessage(element, _this._getErrorMessage(reason));
                        });
                    };
                };
                CustomerInlineDialog.prototype._prefillInitialValues = function (element) {
                    var _this = this;
                    if (this._initialSearchText) {
                        this._setValue(element, "customerInlineSearchText", this._initialSearchText);
                        this._setValue(element, "customerInlineCreateDocument", this._initialSearchText);
                    }
                    if (this._currentCustomer) {
                        this._setValue(element, "customerInlineEditAccount", this._currentCustomer.AccountNumber || "");
                        this._setValue(element, "customerInlineEditDocument", this._sunatService.getDocumentNumber(this._currentCustomer) || "");
                        this._setValue(element, "customerInlineEditName", this._currentCustomer.Name || "");
                        this._setValue(element, "customerInlineEditPhone", this._currentCustomer.Phone || "");
                        this._setValue(element, "customerInlineEditEmail", this._currentCustomer.Email || "");
                        this._showTextResult(element, "customerInlineEditResult", this._formatCustomerSummary(this._currentCustomer));
                        this._logCustomerIdentity("desde el trigger", this._currentCustomer);
                        var addresses = this._currentCustomer.Addresses || [];
                        var hasDocument = !!this._sunatService.getDocumentNumber(this._currentCustomer);
                        if (addresses.length > 0) {
                            this._prefillAddressFromCustomer(element, this._currentCustomer);
                        }
                        if ((addresses.length === 0 || !hasDocument) && this._currentCustomer.AccountNumber) {
                            this._getCustomerByAccount(this._currentCustomer.AccountNumber)
                                .then(function (full) {
                                if (!full) {
                                    return;
                                }
                                _this._currentCustomer = full;
                                _this._logCustomerIdentity("releído por cuenta", full);
                                if (!_this._getValue(element, "customerInlineEditDocument")) {
                                    _this._setValue(element, "customerInlineEditDocument", _this._sunatService.getDocumentNumber(full) || "");
                                }
                                if ((full.Addresses || []).length > 0) {
                                    _this._prefillAddressFromCustomer(element, full);
                                }
                            })
                                .catch(function (reason) {
                                _this._logError("No se pudo releer el cliente para editar: " + _this._stringify(reason));
                            });
                        }
                    }
                };
                CustomerInlineDialog.prototype._logCustomerIdentity = function (origen, customer) {
                    var properties = (customer && customer.ExtensionProperties) || [];
                    var lines = [];
                    for (var i = 0; i < properties.length; i++) {
                        var property = properties[i];
                        var value = property && property.Value;
                        lines.push("  " + (property && property.Key)
                            + " = " + this._stringify(value && (value.StringValue || value.IntegerValue || value)));
                    }
                    this._logChunked("=== Identidad del cliente (" + origen + ") ===", "AccountNumber=" + ((customer && customer.AccountNumber) || "(vacio)")
                        + " | PartyNumber=" + ((customer && customer.PartyNumber) || "(vacio)")
                        + " | IdentificationNumber=" + ((customer && customer.IdentificationNumber) || "(vacio)")
                        + " | documento resuelto=" + (this._sunatService.getDocumentNumber(customer) || "(vacio)")
                        + "\nExtensionProperties (" + properties.length + "):\n"
                        + (lines.length > 0 ? lines.join("\n") : "  (ninguna)"));
                };
                CustomerInlineDialog.prototype._prefillAddressFromCustomer = function (element, customer) {
                    var addresses = (customer && customer.Addresses) || [];
                    if (addresses.length === 0) {
                        this._logChunked("=== Direccion actual del cliente ===", "el cliente no tiene direcciones cargadas");
                        return;
                    }
                    var address = addresses[0];
                    for (var i = 0; i < addresses.length; i++) {
                        if (addresses[i].IsPrimary) {
                            address = addresses[i];
                            break;
                        }
                    }
                    if (address.StreetNumber || address.BuildingCompliment) {
                        this._setValue(element, "customerInlineCreateAddress", address.Street || "");
                        this._setValue(element, "customerInlineCreateStreetNumber", address.StreetNumber || "");
                        this._setValue(element, "customerInlineCreateBuildingCompliment", address.BuildingCompliment || "");
                    }
                    else {
                        this._applyAddressParts(element, address.Street || "");
                    }
                    this._setChecked(element, "customerInlineCreateAddressPrimary", address.IsPrimary !== false);
                    var purposeSelect = element.querySelector("#customerInlineCreateAddressPurpose");
                    if (purposeSelect && address.AddressTypeValue) {
                        purposeSelect.value = String(address.AddressTypeValue);
                    }
                    this._logChunked("=== Direccion actual del cliente ===", "Street=" + (address.Street || "")
                        + " | State=" + (address.State || "") + " County=" + (address.County || "")
                        + " City=" + (address.City || "") + " | AddressType=" + (address.AddressTypeValue || ""));
                    this._preselectGeography(element, address.State || "", address.County || "", address.City || "");
                    this._editingAddressRecordId = address.RecordId || 0;
                };
                CustomerInlineDialog.prototype._executeSearch = function (element, isPagination) {
                    var _this = this;
                    if (isPagination === void 0) { isPagination = false; }
                    var searchText = this._getValue(element, "customerInlineSearchText") || this._initialSearchText;
                    if (searchText.indexOf(DIAG_PREFIX) === 0) {
                        return this._runSchemaDiagnostic(element, searchText.substring(DIAG_PREFIX.length));
                    }
                    if (!searchText) {
                        this._showMessage(element, "Escriba un nombre, cuenta o número de documento.");
                        return Promise.resolve();
                    }
                    if (!isPagination) {
                        this._searchSkip = 0;
                    }
                    var cacheKey = searchText.toUpperCase() + "#" + this._searchSkip;
                    var cachedResults = CustomerInlineDialog._searchCache[cacheKey];
                    if (cachedResults) {
                        this._renderSearchResults(element, cachedResults);
                        this._showMessage(element, cachedResults.length + " resultado(s) (de la última búsqueda). Toque uno para asignarlo.");
                        return Promise.resolve();
                    }
                    if (this._searchInFlight) {
                        return Promise.resolve();
                    }
                    this._searchInFlight = true;
                    this._setSearchBusy(element, true);
                    this._showMessage(element, "Buscando en el sistema... puede tardar unos segundos.");
                    return this._runSearch(searchText)
                        .then(function (response) {
                        var results = (response && response.data && response.data.result) || [];
                        CustomerInlineDialog._searchCache[cacheKey] = results;
                        _this._renderSearchResults(element, results);
                        if (results.length === 0) {
                            _this._showMessage(element, _this._searchSkip > 0
                                ? "No hay más resultados."
                                : "Sin coincidencias para \"" + searchText + "\".");
                        }
                        else {
                            _this._showMessage(element, results.length + " resultado(s). Toque uno para asignarlo a la venta.");
                        }
                    })
                        .catch(function (reason) {
                        _this._logError("Busqueda de clientes fallo: " + _this._stringify(reason));
                        _this._renderSearchResults(element, []);
                        _this._showMessage(element, "No se pudo buscar: " + _this._getErrorMessage(reason)
                            + " Puede usar el buscador del POS.");
                    })
                        .then(function () {
                        _this._searchInFlight = false;
                        _this._setSearchBusy(element, false);
                    });
                };
                CustomerInlineDialog.prototype._runSearchDetailed = function (searchText) {
                    var _this = this;
                    var asDocument = this._sunatService.normalizeDocument(searchText);
                    var looksLikeDocument = asDocument === searchText.trim()
                        && (asDocument.length === 8 || asDocument.length === 11);
                    if (!looksLikeDocument) {
                        return this.context.runtime.executeAsync(new CustomerSearchRequest_1.CustomerSearchRequest(searchText, this._searchTop, this._searchSkip))
                            .then(function (response) {
                            return { response: response, byDocument: false };
                        });
                    }
                    return this._getDocumentSearchField()
                        .then(function (field) {
                        if (!field) {
                            _this._logChunked("=== Busqueda por documento ===", "el canal no expone un campo de documento; se usa palabra clave");
                            return _this.context.runtime.executeAsync(new CustomerSearchRequest_1.CustomerSearchRequest(searchText, _this._searchTop, _this._searchSkip))
                                .then(function (response) {
                                return { response: response, byDocument: false };
                            });
                        }
                        _this._logChunked("=== Busqueda por documento ===", "campo elegido: " + (field.Name || "?") + " (valor " + (field.Value || "?") + ")");
                        return _this.context.runtime.executeAsync(new CustomerSearchByFieldsRequest_1.CustomerSearchByFieldsRequest(searchText, field, _this._searchTop, _this._searchSkip))
                            .then(function (response) {
                            return { response: response, byDocument: true };
                        });
                    });
                };
                CustomerInlineDialog.prototype._runSearch = function (searchText) {
                    return this._runSearchDetailed(searchText)
                        .then(function (outcome) { return outcome.response; });
                };
                CustomerInlineDialog.prototype._getDocumentSearchField = function () {
                    var _this = this;
                    if (CustomerInlineDialog._documentSearchFieldResolved) {
                        return Promise.resolve(CustomerInlineDialog._documentSearchField);
                    }
                    return this.context.runtime
                        .executeAsync(new CustomerSearchByFieldsRequest_1.GetCustomerSearchFieldsRequest())
                        .then(function (response) {
                        var fields = (response && response.data && response.data.result) || [];
                        var summary = [];
                        for (var i = 0; i < fields.length; i++) {
                            var sf = fields[i].SearchField || {};
                            summary.push((sf.Name || "?") + "=" + (sf.Value || "?")
                                + " [" + (fields[i].DisplayName || "") + "]");
                        }
                        _this._logChunked("=== Campos de busqueda del canal ===", summary.join("\n"));
                        var pattern = /doc|identif|tax|ruc|dni|nif/i;
                        for (var i = 0; i < fields.length; i++) {
                            var sf = fields[i].SearchField || {};
                            var haystack = (sf.Name || "") + " " + (fields[i].DisplayName || "");
                            if (pattern.test(haystack)) {
                                CustomerInlineDialog._documentSearchField = sf;
                                break;
                            }
                        }
                        CustomerInlineDialog._documentSearchFieldResolved = true;
                        return CustomerInlineDialog._documentSearchField;
                    })
                        .catch(function (reason) {
                        _this._logChunked("=== Campos de busqueda del canal ===", "GetCustomerSearchFields fallo: " + _this._getErrorMessage(reason));
                        CustomerInlineDialog._documentSearchFieldResolved = true;
                        return null;
                    });
                };
                CustomerInlineDialog.prototype._setSearchBusy = function (element, busy) {
                    var button = element.querySelector("#customerInlineSearchBtn");
                    if (button) {
                        button.disabled = busy;
                        button.textContent = busy ? "Buscando..." : "Buscar";
                    }
                };
                CustomerInlineDialog.prototype._renderSearchResults = function (element, results) {
                    var _this = this;
                    var container = element.querySelector("#customerInlineSearchResults");
                    if (!container) {
                        return;
                    }
                    container.innerHTML = "";
                    if (results.length === 0) {
                        return;
                    }
                    var table = document.createElement("table");
                    var head = table.createTHead().insertRow();
                    var columns = ["Cuenta", "Nombre", "Dirección", "Teléfono"];
                    for (var c = 0; c < columns.length; c++) {
                        var th = document.createElement("th");
                        th.textContent = columns[c];
                        head.appendChild(th);
                    }
                    var body = table.createTBody();
                    var _loop_1 = function (i) {
                        var customer = results[i];
                        var row = body.insertRow();
                        var values = [
                            customer.AccountNumber || "",
                            customer.FullName || "",
                            customer.FullAddress || "",
                            customer.Phone || ""
                        ];
                        for (var v = 0; v < values.length; v++) {
                            var cell = row.insertCell();
                            cell.textContent = values[v];
                            cell.title = values[v];
                        }
                        var accountNumber = customer.AccountNumber || "";
                        row.onclick = function () {
                            _this._selectCustomerFromSearch(element, accountNumber);
                        };
                    };
                    for (var i = 0; i < results.length; i++) {
                        _loop_1(i);
                    }
                    container.appendChild(table);
                };
                CustomerInlineDialog.prototype._selectCustomerFromSearch = function (element, accountNumber) {
                    var _this = this;
                    if (!accountNumber) {
                        this._showMessage(element, "Ese resultado no tiene número de cuenta.");
                        return;
                    }
                    this._showMessage(element, "Asignando " + accountNumber + " a la venta...");
                    this._setCustomerOnCart(accountNumber)
                        .then(function () {
                        _this._complete({
                            mode: "search",
                            action: "searchAndSetCustomerOnCart",
                            customerAccountNumber: accountNumber
                        });
                    })
                        .catch(function (reason) {
                        _this._logError("SetCustomerOnCart desde busqueda fallo: " + _this._stringify(reason));
                        _this._showMessage(element, "No se pudo asignar el cliente: " + _this._getErrorMessage(reason));
                    });
                };
                CustomerInlineDialog.prototype._openNativeSearch = function (element) {
                    var searchText = this._getValue(element, "customerInlineSearchText") || this._initialSearchText;
                    this.closeDialog();
                    if (this._resolve) {
                        this._resolve({
                            mode: "search",
                            action: "native_search",
                            searchText: searchText
                        });
                        this._resolve = null;
                    }
                    return Promise.resolve();
                };
                CustomerInlineDialog.prototype._runSchemaDiagnostic = function (element, argument) {
                    var _this = this;
                    var mode = "Columns";
                    var parameter = argument;
                    var separatorIndex = argument.indexOf("|");
                    if (separatorIndex >= 0) {
                        mode = argument.substring(0, separatorIndex) || "Columns";
                        parameter = argument.substring(separatorIndex + 1);
                    }
                    this._showMessage(element, "Ejecutando diagnóstico " + mode + " (" + parameter + ")...");
                    this._showTextResult(element, "customerInlineSearchResult", "");
                    var request = new DataServiceRequests_g_1.TRU_Diagnostics.RunRequest(mode, parameter);
                    return this.context.runtime.executeAsync(request)
                        .then(function (response) {
                        var rows = (response && response.data && response.data.result) || [];
                        var first = rows.length > 0 ? rows[0] : null;
                        var text = (first && (first.TxtContent || first.ErrorMessage)) || "(sin contenido)";
                        var header = "=== TRU_Diagnostics " + mode + " '" + parameter + "' ===";
                        _this._logChunked(header, text);
                        _this._showTextResult(element, "customerInlineSearchResult", text);
                        _this._showMessage(element, "Diagnóstico listo. Copie el bloque desde la consola (F12).");
                    })
                        .catch(function (reason) {
                        var message = _this._getErrorMessage(reason);
                        _this._logChunked("=== TRU_Diagnostics " + mode + " FALLÓ ===", message);
                        _this._showTextResult(element, "customerInlineSearchResult", message);
                        _this._showMessage(element, "El diagnóstico falló: " + message);
                    });
                };
                CustomerInlineDialog.prototype._logChunked = function (header, body) {
                    var CHUNK_SIZE = 3000;
                    var logger = this.context && this.context.logger;
                    if (typeof console !== "undefined" && console.log) {
                        console.log(header + "\n" + body);
                    }
                    for (var start = 0, part = 1; start < body.length; start += CHUNK_SIZE, part++) {
                        var chunk = header + " [" + part + "] " + body.substring(start, start + CHUNK_SIZE);
                        if (logger && logger.logInformational) {
                            logger.logInformational(chunk);
                        }
                    }
                };
                CustomerInlineDialog.prototype._lookupSunatForCreate = function (element) {
                    var _this = this;
                    var rawDocument = this._getValue(element, "customerInlineCreateDocument");
                    var documentNumber = this._sunatService.normalizeDocument(rawDocument);
                    if (!this._sunatService.getDocumentType(documentNumber)) {
                        this._showMessage(element, "Ingrese un DNI de 8 dígitos o RUC de 11 dígitos válido.");
                        return Promise.resolve();
                    }
                    this._showMessage(element, "Consultando SUNAT...");
                    this._showTextResult(element, "customerInlineCreateResult", "");
                    return this._sunatService.lookup(documentNumber)
                        .then(function (sunatData) {
                        _this._lastSunatData = sunatData;
                        _this._setValue(element, "customerInlineCreateName", sunatData.name || "");
                        _this._applyAddressParts(element, sunatData.address || "");
                        _this._setValue(element, "customerInlineCreateCondition", ((sunatData.raw && sunatData.raw.condicion) || "")
                            + (sunatData.taxpayerStatus && sunatData.taxpayerStatus.toUpperCase() !== "ACTIVO"
                                ? " — " + sunatData.taxpayerStatus : ""));
                        _this._warnInvoiceEligibility(element, sunatData);
                        _this._setChecked(element, "customerInlineCreateRetention", sunatData.isRetentionAgent);
                        _this._setChecked(element, "customerInlineCreatePerception", sunatData.isPerceptionAgent);
                        _this._setChecked(element, "customerInlineCreatePublicSector", sunatData.isPublicSector);
                        _this._setChecked(element, "customerInlineCreateEmergencyZone", sunatData.isEmergencyZone);
                        _this._setChecked(element, "customerInlineCreateExoneratedPerception", sunatData.isExoneratedPerception);
                        _this._setChecked(element, "customerInlineCreateFinalConsumer", sunatData.isFinalConsumer);
                        _this._setChecked(element, "customerInlineCreateOthers", sunatData.isOthers);
                        _this._setChecked(element, "customerInlineCreateNotDomiciled", sunatData.isNotDomiciled);
                        _this._setValue(element, "customerInlineCreateLastName", sunatData.lastName || "");
                        _this._setValue(element, "customerInlineCreateFirstName", sunatData.firstName || "");
                        _this._applyCustomerType(element, sunatData.customerTypeValue);
                        _this._preselectGeographyFromSunat(element, sunatData);
                        _this._selectPurposeForDocumentType(element, sunatData.documentType);
                        _this._setValue(element, "customerInlineCreateCustomerType", String(sunatData.documentType === "RUC"
                            ? Entities_1.ProxyEntities.CustomerType.Organization
                            : Entities_1.ProxyEntities.CustomerType.Person));
                        _this._showTextResult(element, "customerInlineCreateResult", _this._formatSunatSummary(sunatData));
                        _this._showMessage(element, "Datos obtenidos. Complete si falta algo y presione Crear en Sistema.");
                    });
                };
                CustomerInlineDialog.prototype._findExistingByDocument = function (documentNumber) {
                    var _this = this;
                    if (!documentNumber) {
                        return Promise.resolve(null);
                    }
                    return this._runSearchDetailed(documentNumber)
                        .then(function (outcome) {
                        var candidates = (outcome.response && outcome.response.data && outcome.response.data.result) || [];
                        if (candidates.length === 0) {
                            return Promise.resolve(null);
                        }
                        if (outcome.byDocument) {
                            for (var i = 0; i < candidates.length; i++) {
                                if (candidates[i].AccountNumber) {
                                    return Promise.resolve(candidates[i]);
                                }
                            }
                            return Promise.resolve(null);
                        }
                        var accounts = [];
                        for (var i = 0; i < candidates.length && accounts.length < 3; i++) {
                            if (candidates[i].AccountNumber) {
                                accounts.push(candidates[i].AccountNumber);
                            }
                        }
                        var lookups = [];
                        for (var i = 0; i < accounts.length; i++) {
                            lookups.push(_this._getCustomerByAccount(accounts[i])
                                .catch(function () { return null; }));
                        }
                        return Promise.all(lookups)
                            .then(function (customers) {
                            for (var i = 0; i < customers.length; i++) {
                                var customer = customers[i];
                                if (customer && _this._sunatService.getDocumentNumber(customer) === documentNumber) {
                                    return customer;
                                }
                            }
                            return null;
                        });
                    })
                        .catch(function (reason) {
                        _this._logError("Comprobacion de duplicado fallo: " + _this._stringify(reason));
                        return null;
                    });
                };
                CustomerInlineDialog.prototype._isDuplicateDocumentError = function (reason) {
                    var text = this._stringify(reason);
                    return text.indexOf("30104") >= 0
                        || /ya existe para el cliente/i.test(text)
                        || /ya existe.*documento|documento.*ya (existe|est[áa] registrado)/i.test(text);
                };
                CustomerInlineDialog.prototype._extractDuplicateAccount = function (reason) {
                    var text = this._stringify(reason);
                    var match = text.match(/ya existe para el cliente:?\s*([A-Za-z0-9\-]+)/i);
                    return match && match[1] ? match[1] : "";
                };
                CustomerInlineDialog.prototype._executeCreate = function (element) {
                    var _this = this;
                    var rawDocument = this._getValue(element, "customerInlineCreateDocument");
                    var documentNumber = this._sunatService.normalizeDocument(rawDocument);
                    if (!this._sunatService.getDocumentType(documentNumber)) {
                        this._showMessage(element, "Ingrese un documento válido.");
                        return Promise.resolve();
                    }
                    var name = this._getValue(element, "customerInlineCreateName");
                    if (!name) {
                        this._showMessage(element, "El nombre/razón social es obligatorio.");
                        return Promise.resolve();
                    }
                    this._showMessage(element, "Verificando la situación del documento en SUNAT...");
                    return this._sunatService.lookup(documentNumber)
                        .then(function (sunatData) {
                        return _this._warnInvoiceEligibility(element, sunatData);
                    })
                        .catch(function () { return true; })
                        .then(function (eligible) {
                        if (!eligible) {
                            return Promise.resolve();
                        }
                        _this._showMessage(element, "Verificando que el documento no esté ya registrado...");
                        return _this._runCreateAfterEligibility(element, documentNumber, name);
                    });
                };
                CustomerInlineDialog.prototype._runCreateAfterEligibility = function (element, documentNumber, name) {
                    var _this = this;
                    return this._findExistingByDocument(documentNumber)
                        .then(function (existing) {
                        if (existing) {
                            return _this._blockDuplicate(element, existing, documentNumber);
                        }
                        return _this._continueCreate(element, documentNumber, name);
                    })
                        .catch(function (reason) {
                        var handled = _this._handleServerDuplicate(element, reason, documentNumber);
                        return handled ? handled : Promise.reject(reason);
                    });
                };
                CustomerInlineDialog.prototype._handleServerDuplicate = function (element, reason, documentNumber) {
                    var _this = this;
                    if (!this._isDuplicateDocumentError(reason)) {
                        return null;
                    }
                    var duplicateAccount = this._extractDuplicateAccount(reason);
                    this._logChunked("=== Duplicado detectado por el servidor ===", "documento=" + documentNumber
                        + " | cuenta existente=" + (duplicateAccount || "(no vino en el mensaje)"));
                    if (!duplicateAccount) {
                        return this._blockDuplicate(element, { AccountNumber: "", Name: "" }, documentNumber);
                    }
                    var alert = this._blockDuplicate(element, { AccountNumber: duplicateAccount, Name: "" }, documentNumber);
                    this._getCustomerByAccount(duplicateAccount)
                        .then(function (existing) {
                        if (existing && existing.Name) {
                            _this._setAlertBody(element, _this._duplicateAlertBody(duplicateAccount, existing.Name, documentNumber));
                        }
                    })
                        .catch(function () {
                    });
                    return alert;
                };
                CustomerInlineDialog.prototype._blockDuplicate = function (element, existing, documentNumber) {
                    var _this = this;
                    var account = existing.AccountNumber || "";
                    var name = existing.Name || this._formatCustomerSummary(existing);
                    this._logChunked("=== Duplicado evitado ===", "documento=" + documentNumber + " ya pertenece a la cuenta " + account);
                    var body = this._duplicateAlertBody(account, name, documentNumber);
                    return this._showAlert(element, "El cliente ya existe", body, account ? "Aceptar y usar este cliente" : "Aceptar", account ? "Cancelar" : "")
                        .then(function (accepted) {
                        if (!accepted || !account) {
                            _this._showMessage(element, "El documento ya está registrado"
                                + (account ? " en la cuenta " + account : "") + ".");
                            return Promise.resolve();
                        }
                        _this._showMessage(element, "Asignando " + account + " a la venta...");
                        return _this._setCustomerOnCart(account)
                            .then(function () {
                            _this._complete({
                                mode: "create",
                                action: "assignedExistingCustomer",
                                customerAccountNumber: account
                            });
                        })
                            .catch(function (reason) {
                            _this._logError("Asignar cliente existente fallo: " + _this._stringify(reason));
                            _this._showMessage(element, "No se pudo asignar: " + _this._getErrorMessage(reason));
                        });
                    });
                };
                CustomerInlineDialog.prototype._warnInvoiceEligibility = function (element, sunatData) {
                    var _this = this;
                    var reasons = this._sunatService.getInvoiceBlockReasons(sunatData);
                    if (reasons.length === 0) {
                        return Promise.resolve(true);
                    }
                    this._logChunked("=== Contribuyente observado en SUNAT ===", "documento=" + sunatData.documentNumber + " | " + reasons.join(" | "));
                    var body = "SUNAT reporta lo siguiente para el RUC " + sunatData.documentNumber + ":\n\n"
                        + reasons.join("\n") + "\n\n"
                        + "A este cliente NO se le puede vender ni registrar en el sistema.\n\n"
                        + "Debe regularizar su situación en SUNAT antes de poder comprarnos.";
                    return this._showAlert(element, "Cliente observado en SUNAT — venta no permitida", body, "Entendido", "")
                        .then(function () {
                        _this._showMessage(element, "⛔ RUC observado en SUNAT (" + reasons.join("; ") + "). No se le puede vender ni crear.");
                        return false;
                    });
                };
                CustomerInlineDialog.prototype._duplicateAlertBody = function (account, name, documentNumber) {
                    if (!account) {
                        return "El documento " + documentNumber + " ya está registrado en otro cliente.\n\n"
                            + "No se creó un cliente nuevo para no duplicarlo. "
                            + "Búsquelo en la pestaña Buscar Cliente.";
                    }
                    return "El documento " + documentNumber + " ya pertenece a la cuenta " + account
                        + (name ? " (" + name + ")" : "") + ".\n\n"
                        + "No se creó un cliente nuevo para no duplicarlo.\n\n"
                        + "Al aceptar, ese cliente se asigna a esta venta.";
                };
                CustomerInlineDialog.prototype._setAlertBody = function (element, body) {
                    var overlay = element.querySelector("#customerInlineAlertOverlay");
                    var bodyNode = element.querySelector("#customerInlineAlertBody");
                    if (overlay && bodyNode && overlay.style.display !== "none") {
                        bodyNode.textContent = body;
                    }
                };
                CustomerInlineDialog.prototype._showAlert = function (element, title, body, acceptLabel, cancelLabel) {
                    var overlay = element.querySelector("#customerInlineAlertOverlay");
                    var titleNode = element.querySelector("#customerInlineAlertTitle");
                    var bodyNode = element.querySelector("#customerInlineAlertBody");
                    var acceptButton = element.querySelector("#customerInlineAlertAccept");
                    var cancelButton = element.querySelector("#customerInlineAlertCancel");
                    if (!overlay || !acceptButton || !cancelButton) {
                        this._logError("Alerta flotante no disponible en la plantilla; se muestra en el recuadro.");
                        this._showTextResult(element, "customerInlineCreateResult", title + "\n\n" + body);
                        return Promise.resolve(false);
                    }
                    if (titleNode) {
                        titleNode.textContent = title;
                    }
                    if (bodyNode) {
                        bodyNode.textContent = body;
                    }
                    acceptButton.textContent = acceptLabel;
                    cancelButton.textContent = cancelLabel || "Cancelar";
                    cancelButton.style.display = cancelLabel ? "" : "none";
                    overlay.style.display = "flex";
                    return new Promise(function (resolve) {
                        var close = function (accepted) {
                            overlay.style.display = "none";
                            acceptButton.onclick = null;
                            cancelButton.onclick = null;
                            resolve(accepted);
                        };
                        acceptButton.onclick = function () { close(true); };
                        cancelButton.onclick = function () { close(false); };
                    });
                };
                CustomerInlineDialog.prototype._continueCreate = function (element, documentNumber, name) {
                    this._showMessage(element, "Paso 1: Resolviendo dirección (Ubigeo)...");
                    var sunatDataToUse = this._lastSunatData || {
                        documentNumber: documentNumber,
                        documentType: this._sunatService.getDocumentType(documentNumber),
                        name: name
                    };
                    sunatDataToUse.isRetentionAgent = this._getChecked(element, "customerInlineCreateRetention");
                    sunatDataToUse.isPerceptionAgent = this._getChecked(element, "customerInlineCreatePerception");
                    sunatDataToUse.isPublicSector = this._getChecked(element, "customerInlineCreatePublicSector");
                    sunatDataToUse.isEmergencyZone = this._getChecked(element, "customerInlineCreateEmergencyZone");
                    sunatDataToUse.isExoneratedPerception = this._getChecked(element, "customerInlineCreateExoneratedPerception");
                    sunatDataToUse.isFinalConsumer = this._getChecked(element, "customerInlineCreateFinalConsumer");
                    sunatDataToUse.isOthers = this._getChecked(element, "customerInlineCreateOthers");
                    sunatDataToUse.isNotDomiciled = this._getChecked(element, "customerInlineCreateNotDomiciled");
                    sunatDataToUse.address = this._getValue(element, "customerInlineCreateAddress");
                    sunatDataToUse.department = this._getValue(element, "customerInlineCreateDepartment");
                    sunatDataToUse.province = this._getValue(element, "customerInlineCreateProvince");
                    sunatDataToUse.district = this._getValue(element, "customerInlineCreateDistrict");
                    return this._resolveAndCreateCustomer(element, sunatDataToUse, name, this._getValue(element, "customerInlineCreatePhone"), this._getValue(element, "customerInlineCreateEmail"));
                };
                CustomerInlineDialog.prototype._resolveAndCreateCustomer = function (element, sunatData, overrideName, phone, email) {
                    var _this = this;
                    var customer = new Entities_1.ProxyEntities.CustomerClass({});
                    this._sunatService.applySunatIdentity(customer, sunatData);
                    customer.Name = overrideName || customer.Name;
                    customer.Phone = phone || "";
                    customer.Email = email || "";
                    var selectedType = this._getValue(element, "customerInlineCreateCustomerType");
                    if (selectedType) {
                        customer.CustomerTypeValue = parseInt(selectedType, 10);
                    }
                    var selectedGroup = this._getValue(element, "customerInlineCreateCustomerGroup");
                    if (selectedGroup) {
                        customer.CustomerGroup = selectedGroup;
                    }
                    if (customer.CustomerTypeValue !== Entities_1.ProxyEntities.CustomerType.Organization) {
                        var lastName = this._getValue(element, "customerInlineCreateLastName");
                        var firstName = this._getValue(element, "customerInlineCreateFirstName");
                        if (lastName) {
                            customer.LastName = lastName;
                        }
                        if (firstName) {
                            customer.FirstName = firstName;
                        }
                        if (!customer.LastName && !customer.FirstName && customer.Name) {
                            var split = this._sunatService.splitPersonName(customer.Name);
                            customer.LastName = split.lastName;
                            customer.FirstName = split.firstName;
                        }
                        this._logChunked("=== Cliente persona ===", "LastName=" + (customer.LastName || "(vacio)")
                            + " | FirstName=" + (customer.FirstName || "(vacio)")
                            + " | Name=" + (customer.Name || "(vacio)"));
                    }
                    this._logChunked("=== Identidad del cliente ===", "CustomerTypeValue=" + customer.CustomerTypeValue
                        + " | CustomerGroup=" + (customer.CustomerGroup || "(lo resuelve el canal)"));
                    var resolvePromise = Promise.resolve(null);
                    if (sunatData.department || sunatData.province || sunatData.district) {
                        var request = new DataServiceRequests_g_1.TRU_GeographicData.ResolveUbigeoRequest(sunatData.department || "", sunatData.province || "", sunatData.district || "");
                        resolvePromise = this.context.runtime.executeAsync(request)
                            .then(function (response) {
                            if (response && response.data && response.data.result && response.data.result.length > 0) {
                                return response.data.result[0];
                            }
                            return null;
                        })
                            .catch(function (error) {
                            _this._logError("ResolveUbigeo error: " + _this._stringify(error));
                            return null;
                        });
                    }
                    return resolvePromise.then(function (u) {
                        _this._logChunked("=== ResolveUbigeo ===", u
                            ? "IsValid=" + u.IsValid
                                + " | StateId=" + (u.StateId || "(vacio)")
                                + " | CountyId=" + (u.CountyId || "(vacio)")
                                + " | CityName=" + (u.CityName || "(vacio)")
                                + " | Notes=" + (u.Notes || "")
                            : "sin resultado (no se consultó o falló)");
                        var address = _this._buildAddressFromForm(element, 0);
                        if (address) {
                            address.Name = _this._resolveAddressName(sunatData.documentType, address.AddressTypeValue, address.Name);
                            if (!address.State && u && u.IsValid) {
                                address.State = u.StateId;
                                address.County = u.CountyId;
                                address.City = u.CityName;
                                address.DistrictName = sunatData.district || "";
                            }
                            if (!address.State) {
                                _this._logChunked("=== Direccion sin ubigeo ===", "se envia solo la calle; complete departamento, provincia y distrito para que quede completa");
                            }
                            customer.Addresses = [address];
                            _this._logChunked("=== Address enviada ===", _this._stringify(address));
                        }
                        else {
                            _this._logChunked("=== Address NO enviada ===", "sin calle ni departamento — el cliente se crea sin direccion");
                        }
                        _this._showMessage(element, "Paso 2: Aplicando valores por defecto del canal...");
                        return _this._applyChannelDefaults(customer).then(function () {
                            _this._showMessage(element, "Paso 3: Registrando cliente en D365...");
                            _this._logChunked("=== Cliente que se envia ===", _this._stringify({
                                AccountNumber: customer.AccountNumber,
                                CustomerTypeValue: customer.CustomerTypeValue,
                                Name: customer.Name,
                                FirstName: customer.FirstName,
                                MiddleName: customer.MiddleName,
                                LastName: customer.LastName,
                                CustomerGroup: customer.CustomerGroup,
                                CurrencyCode: customer.CurrencyCode,
                                Language: customer.Language,
                                ReceiptSettings: customer.ReceiptSettings,
                                IdentificationNumber: customer.IdentificationNumber,
                                Phone: customer.Phone,
                                Email: customer.Email,
                                Addresses: (customer.Addresses || []).length,
                                ExtensionProperties: (customer.ExtensionProperties || []).length
                            }));
                            var createRequest = new Customer_1.CreateCustomerServiceRequest(_this._getCorrelationId(), customer);
                            return _this.context.runtime.executeAsync(createRequest)
                                .then(function (response) {
                                if (response.canceled || !response.data || !response.data.customer) {
                                    _this._logChunked("=== Alta cancelada por el sistema ===", _this._stringify(response));
                                    var handled = _this._handleServerDuplicate(element, response, sunatData.documentNumber || "");
                                    if (handled) {
                                        return handled;
                                    }
                                    _this._showMessage(element, "La creación del cliente falló o fue cancelada por el sistema. "
                                        + "Revise la consola (F12) para el detalle.");
                                    return Promise.resolve();
                                }
                                var createdCustomer = response.data.customer;
                                var accountNumber = createdCustomer.AccountNumber || "";
                                var savedAddresses = createdCustomer.Addresses || [];
                                _this._logChunked("=== Cliente creado ===", "AccountNumber=" + accountNumber
                                    + " | CustomerGroup=" + (createdCustomer.CustomerGroup || "(vacio)")
                                    + " | CurrencyCode=" + (createdCustomer.CurrencyCode || "(vacio)")
                                    + " | Addresses devueltas=" + savedAddresses.length
                                    + (savedAddresses.length > 0 ? "\n" + _this._stringify(savedAddresses) : ""));
                                if (!accountNumber) {
                                    _this._showMessage(element, "Cliente creado pero sin número de cuenta.");
                                    return Promise.resolve();
                                }
                                return _this._ensureAddressPersisted(element, accountNumber, customer.Addresses || [])
                                    .then(function () {
                                    _this._showMessage(element, "Paso 4: Asignando nuevo cliente a la venta...");
                                    return _this._setCustomerOnCartAndClose(element, accountNumber);
                                });
                            });
                        });
                    });
                };
                CustomerInlineDialog.prototype._ensureAddressPersisted = function (element, accountNumber, intendedAddresses) {
                    var _this = this;
                    if (!intendedAddresses || intendedAddresses.length === 0) {
                        return Promise.resolve();
                    }
                    return this._getCustomerByAccount(accountNumber)
                        .then(function (persisted) {
                        var existing = (persisted && persisted.Addresses) || [];
                        _this._logChunked("=== Direccion tras releer el cliente ===", "Addresses=" + existing.length
                            + (existing.length > 0 ? "\n" + _this._stringify(existing) : ""));
                        if (!persisted || existing.length > 0) {
                            return Promise.resolve();
                        }
                        _this._showMessage(element, "La dirección no quedó en el alta; reintentando...");
                        var retryCustomer = _this._cloneCustomer(persisted);
                        retryCustomer.Addresses = intendedAddresses;
                        var updateRequest = new Customer_1.UpdateCustomerServiceRequest(_this._getCorrelationId(), retryCustomer);
                        return _this.context.runtime.executeAsync(updateRequest)
                            .then(function (response) {
                            var updated = response && response.data && response.data.customer;
                            var after = (updated && updated.Addresses) || [];
                            _this._logChunked("=== Reintento de direccion ===", "Addresses=" + after.length
                                + (after.length > 0 ? "\n" + _this._stringify(after) : " (el reintento tampoco la guardó)"));
                        });
                    })
                        .catch(function (reason) {
                        _this._logError("_ensureAddressPersisted error: " + _this._stringify(reason));
                        _this._logChunked("=== Reintento de direccion FALLO ===", _this._getErrorMessage(reason));
                    });
                };
                CustomerInlineDialog.prototype._setCustomerOnCartAndClose = function (element, accountNumber) {
                    var _this = this;
                    return this._setCustomerOnCart(accountNumber)
                        .then(function () {
                        _this._complete({
                            mode: "create",
                            action: "createAndSetCustomerOnCart",
                            customerAccountNumber: accountNumber
                        });
                    })
                        .catch(function (reason) {
                        _this._logError("SetCustomerOnCart error: " + _this._stringify(reason));
                        _this._showMessage(element, "Cliente " + accountNumber + " creado, pero no se pudo asignar a la venta: "
                            + _this._getErrorMessage(reason));
                    });
                };
                CustomerInlineDialog.prototype._applyChannelDefaults = function (customer) {
                    var _this = this;
                    if (!customer.AccountNumber) {
                        customer.AccountNumber = "";
                    }
                    var channelPromise = this.context.runtime
                        .executeAsync(new Device_1.GetChannelConfigurationClientRequest(this._getCorrelationId()))
                        .then(function (response) {
                        var config = response && response.data && response.data.result;
                        if (!config) {
                            return;
                        }
                        if (!customer.CurrencyCode && config.Currency) {
                            customer.CurrencyCode = config.Currency;
                        }
                        if (!customer.Language && config.DefaultLanguageId) {
                            customer.Language = config.DefaultLanguageId;
                        }
                        if (!customer.ReceiptSettings && config.ReceiptSettingsValue) {
                            customer.ReceiptSettings = config.ReceiptSettingsValue;
                        }
                    })
                        .catch(function (reason) {
                        _this._logError("GetChannelConfiguration error: " + _this._stringify(reason));
                    });
                    return channelPromise
                        .then(function () {
                        if (customer.CustomerGroup) {
                            return Promise.resolve(null);
                        }
                        return _this.context.runtime
                            .executeAsync(new Cart_1.GetCurrentCartClientRequest(_this._getCorrelationId()))
                            .then(function (response) {
                            var cart = response && response.data && response.data.result;
                            var templateAccount = (cart && cart.CustomerId) || "";
                            if (!templateAccount) {
                                return Promise.resolve(null);
                            }
                            return _this._getCustomerByAccount(templateAccount);
                        });
                    })
                        .then(function (template) {
                        if (!template) {
                            return;
                        }
                        if (!customer.CustomerGroup && template.CustomerGroup) {
                            customer.CustomerGroup = template.CustomerGroup;
                        }
                        if (!customer.CurrencyCode && template.CurrencyCode) {
                            customer.CurrencyCode = template.CurrencyCode;
                        }
                        if (!customer.Language && template.Language) {
                            customer.Language = template.Language;
                        }
                    })
                        .catch(function (reason) {
                        _this._logError("Channel defaults (template customer) error: " + _this._stringify(reason));
                    });
                };
                CustomerInlineDialog.prototype._lookupSunatForEdit = function (element) {
                    var _this = this;
                    var documentNumber = this._sunatService.normalizeDocument(this._getValue(element, "customerInlineEditDocument"));
                    if (!this._sunatService.getDocumentType(documentNumber)) {
                        this._showMessage(element, "Ingrese un DNI de 8 dígitos o RUC de 11 dígitos.");
                        return Promise.resolve();
                    }
                    this._showMessage(element, "Consultando SUNAT para comparar antes de editar...");
                    return this._sunatService.lookup(documentNumber)
                        .then(function (sunatData) {
                        if (!_this._getValue(element, "customerInlineEditName")) {
                            _this._setValue(element, "customerInlineEditName", sunatData.name || "");
                        }
                        var differences = _this._currentCustomer ? _this._sunatService.compareWithCustomer(_this._currentCustomer, sunatData) : [];
                        _this._showTextResult(element, "customerInlineEditResult", _this._formatSunatSummary(sunatData) + "\n" + differences.join("\n"));
                        _this._showMessage(element, "SUNAT consultado. Revise diferencias y confirme Guardar.");
                        return _this._warnInvoiceEligibility(element, sunatData)
                            .then(function (eligible) {
                            if (!eligible) {
                                return Promise.resolve();
                            }
                            return _this._enforceSunatAddressOnSave(element, sunatData)
                                .then(function (matched) {
                                if (matched) {
                                    _this._showMessage(element, "SUNAT validado: datos y dirección coinciden. Puede Guardar Cambios.");
                                }
                            });
                        });
                    });
                };
                CustomerInlineDialog.prototype._enforceSunatAddressOnSave = function (element, sunatData) {
                    var _this = this;
                    var fromSunat = ((sunatData && sunatData.address) || "").replace(/\s+/g, " ").trim();
                    if (!fromSunat) {
                        return Promise.resolve(true);
                    }
                    var normalize = function (value) {
                        return (value || "").toUpperCase()
                            .replace(/[ÁÀÄÂ]/g, "A").replace(/[ÉÈËÊ]/g, "E")
                            .replace(/[ÍÌÏÎ]/g, "I").replace(/[ÓÒÖÔ]/g, "O")
                            .replace(/[ÚÙÜÛ]/g, "U")
                            .replace(/[^A-Z0-9Ñ]/g, "");
                    };
                    var current = normalize([
                        this._getValue(element, "customerInlineCreateAddress"),
                        this._getValue(element, "customerInlineCreateStreetNumber"),
                        this._getValue(element, "customerInlineCreateBuildingCompliment")
                    ].join(" "));
                    var streetMatches = current === normalize(fromSunat);
                    var levelMatches = function (sunatName, selectId) {
                        var expected = normalize(sunatName);
                        if (!expected) {
                            return true;
                        }
                        var selected = normalize(_this._getSelectedLabel(element, selectId));
                        return !!selected
                            && (selected.indexOf(expected) >= 0 || expected.indexOf(selected) >= 0);
                    };
                    var ubigeoMatches = levelMatches(sunatData.department || "", "customerInlineCreateDepartment")
                        && levelMatches(sunatData.province || "", "customerInlineCreateProvince")
                        && levelMatches(sunatData.district || "", "customerInlineCreateDistrict");
                    var alreadyEnforced = this._sunatAddressEnforcedFor === sunatData.documentNumber;
                    if (streetMatches && (ubigeoMatches || alreadyEnforced)) {
                        return Promise.resolve(true);
                    }
                    this._logChunked("=== Direccion distinta a SUNAT al guardar ===", "calle coincide=" + streetMatches + " | ubigeo coincide=" + ubigeoMatches
                        + " | formulario=" + (current || "(vacio)") + "\nsunat=" + fromSunat
                        + "\nubigeo formulario=" + this._getSelectedLabel(element, "customerInlineCreateDepartment")
                        + " / " + this._getSelectedLabel(element, "customerInlineCreateProvince")
                        + " / " + this._getSelectedLabel(element, "customerInlineCreateDistrict")
                        + "\nubigeo sunat=" + (sunatData.department || "") + " / " + (sunatData.province || "")
                        + " / " + (sunatData.district || ""));
                    this._sunatAddressEnforcedFor = sunatData.documentNumber;
                    this._applyAddressParts(element, fromSunat);
                    this._preselectGeographyFromSunat(element, sunatData);
                    var sunatUbigeo = [sunatData.department || "", sunatData.province || "", sunatData.district || ""]
                        .join(" / ").replace(/^ \/ | \/ $/g, "");
                    var body = "La dirección fiscal de este contribuyente es la registrada en SUNAT:\n\n"
                        + fromSunat
                        + (sunatUbigeo.replace(/[ \/]/g, "") ? "\nUbigeo: " + sunatUbigeo : "") + "\n\n"
                        + "Los campos de dirección y el ubigeo se rellenaron con esos datos. "
                        + "Revíselos y presione Guardar Cambios.";
                    return this._showAlert(element, "Dirección según SUNAT", body, "Entendido", "")
                        .then(function () {
                        _this._showMessage(element, "Dirección reemplazada por la de SUNAT. Revise y presione Guardar Cambios.");
                        return false;
                    });
                };
                CustomerInlineDialog.prototype._updateCustomer = function (element) {
                    var _this = this;
                    return this._loadCustomerForEdit(element)
                        .then(function (customer) {
                        var documentNumber = _this._sunatService.normalizeDocument(_this._getValue(element, "customerInlineEditDocument"));
                        _this._applyEditableFields(customer, _this._getValue(element, "customerInlineEditName"), _this._getValue(element, "customerInlineEditPhone"), _this._getValue(element, "customerInlineEditEmail"));
                        var editedAddress = _this._buildAddressFromForm(element, _this._editingAddressRecordId);
                        if (editedAddress) {
                            var existingAddresses = (customer.Addresses || []).slice();
                            var replaced = false;
                            for (var i = 0; i < existingAddresses.length; i++) {
                                if (_this._editingAddressRecordId && existingAddresses[i].RecordId === _this._editingAddressRecordId) {
                                    existingAddresses[i] = editedAddress;
                                    replaced = true;
                                    break;
                                }
                            }
                            if (!replaced) {
                                existingAddresses.push(editedAddress);
                            }
                            customer.Addresses = existingAddresses;
                            _this._logChunked("=== Direccion que se guarda ===", (replaced ? "actualiza RecordId=" + _this._editingAddressRecordId : "agrega una nueva")
                                + "\n" + _this._stringify(editedAddress));
                        }
                        var updateWithCustomer = function (customerToUpdate) {
                            var request = new Customer_1.UpdateCustomerServiceRequest(_this._getCorrelationId(), customerToUpdate);
                            return _this.context.runtime.executeAsync(request)
                                .then(function (response) {
                                if (response.canceled || !response.data || !response.data.customer) {
                                    _this._showMessage(element, "La actualización fue cancelada.");
                                    return Promise.resolve();
                                }
                                var updatedCustomer = response.data.customer;
                                var accountNumber = updatedCustomer.AccountNumber || _this._getValue(element, "customerInlineEditAccount");
                                return _this._setCustomerOnCart(accountNumber)
                                    .then(function () {
                                    _this._complete({
                                        mode: "edit",
                                        action: "updateAndSetCustomerOnCart",
                                        customerAccountNumber: accountNumber
                                    });
                                })
                                    .catch(function (reason) {
                                    _this._logError("SetCustomerOnCart error: " + _this._stringify(reason));
                                    _this._showMessage(element, "Cliente actualizado, pero no se pudo asignar a la venta: "
                                        + _this._getErrorMessage(reason));
                                });
                            });
                        };
                        if (!documentNumber) {
                            return updateWithCustomer(customer);
                        }
                        if (!_this._sunatService.getDocumentType(documentNumber)) {
                            _this._showMessage(element, "El documento debe ser válido.");
                            return Promise.resolve();
                        }
                        _this._showMessage(element, "Validando SUNAT antes de guardar cambios...");
                        return _this._sunatService.lookup(documentNumber)
                            .then(function (sunatData) {
                            return _this._enforceSunatAddressOnSave(element, sunatData)
                                .then(function (proceed) {
                                if (!proceed) {
                                    return Promise.resolve();
                                }
                                _this._sunatService.applySunatMetadata(customer, sunatData);
                                return updateWithCustomer(customer);
                            });
                        });
                    });
                };
                CustomerInlineDialog.prototype._setCustomerOnCart = function (accountNumber) {
                    var request = new Cart_1.SetCustomerOnCartOperationRequest(this._getCorrelationId(), accountNumber);
                    return this.context.runtime.executeAsync(request)
                        .then(function (response) {
                        if (response.canceled) {
                            throw new Error("La asignación del cliente a la venta fue cancelada.");
                        }
                    });
                };
                CustomerInlineDialog.prototype._getCustomerByAccount = function (accountNumber) {
                    var request = new Customer_1.GetCustomerClientRequest(accountNumber, this._getCorrelationId());
                    return this.context.runtime.executeAsync(request)
                        .then(function (response) {
                        if (response.canceled || !response.data || !response.data.result) {
                            return null;
                        }
                        return response.data.result;
                    });
                };
                CustomerInlineDialog.prototype._loadCustomerForEdit = function (element) {
                    var _this = this;
                    if (this._currentCustomer) {
                        return Promise.resolve(this._cloneCustomer(this._currentCustomer));
                    }
                    var accountNumber = this._getValue(element, "customerInlineEditAccount");
                    if (!accountNumber) {
                        return Promise.reject(new Error("Ingrese la cuenta del cliente a editar."));
                    }
                    return this._getCustomerByAccount(accountNumber)
                        .then(function (customer) {
                        if (!customer)
                            throw new Error("No se encontro el cliente en el sistema.");
                        return _this._cloneCustomer(customer);
                    });
                };
                CustomerInlineDialog.prototype._cloneCustomer = function (customer) {
                    var customerCopy = {};
                    try {
                        customerCopy = JSON.parse(JSON.stringify(customer || {}));
                    }
                    catch (error) {
                        customerCopy = customer || {};
                    }
                    return new Entities_1.ProxyEntities.CustomerClass(customerCopy);
                };
                CustomerInlineDialog.prototype._applyEditableFields = function (customer, name, phone, email) {
                    customer.Name = name || customer.Name || "";
                    customer.Phone = phone || "";
                    customer.Email = email || "";
                };
                CustomerInlineDialog.prototype._applyAddressParts = function (element, fullAddress) {
                    var parts = this._sunatService.parseAddressParts(fullAddress);
                    this._setValue(element, "customerInlineCreateAddress", parts.street);
                    this._setValue(element, "customerInlineCreateStreetNumber", parts.streetNumber);
                    this._setValue(element, "customerInlineCreateBuildingCompliment", parts.compliment);
                    this._logChunked("=== Direccion separada ===", "origen=" + (fullAddress || "(vacio)")
                        + "\ncalle=" + (parts.street || "(vacio)")
                        + " | numero=" + (parts.streetNumber || "(vacio)")
                        + " | complemento=" + (parts.compliment || "(vacio)"));
                };
                CustomerInlineDialog.prototype._splitStreetOnBlur = function (element) {
                    if (this._getValue(element, "customerInlineCreateStreetNumber")) {
                        return;
                    }
                    var typed = this._getValue(element, "customerInlineCreateAddress");
                    var parts = this._sunatService.parseAddressParts(typed);
                    if (!parts.streetNumber) {
                        return;
                    }
                    this._applyAddressParts(element, typed);
                };
                CustomerInlineDialog.prototype._buildAddressFromForm = function (element, recordId) {
                    var street = this._getValue(element, "customerInlineCreateAddress");
                    var stateId = this._getValue(element, "customerInlineCreateDepartment");
                    var countyId = this._getValue(element, "customerInlineCreateProvince");
                    var cityCode = this._getValue(element, "customerInlineCreateDistrict");
                    if (!street && !stateId) {
                        return null;
                    }
                    var purposeSelect = element.querySelector("#customerInlineCreateAddressPurpose");
                    var purposeValue = purposeSelect && purposeSelect.value
                        ? parseInt(purposeSelect.value, 10)
                        : Entities_1.ProxyEntities.AddressType.Business;
                    var address = new Entities_1.ProxyEntities.AddressClass();
                    address.RecordId = recordId || 0;
                    address.ThreeLetterISORegionName = "PER";
                    address.Name = purposeSelect && purposeSelect.selectedIndex >= 0
                        ? purposeSelect.options[purposeSelect.selectedIndex].text
                        : "Negocio";
                    address.Street = street;
                    address.StreetNumber = this._getValue(element, "customerInlineCreateStreetNumber");
                    address.BuildingCompliment = this._getValue(element, "customerInlineCreateBuildingCompliment");
                    address.AddressTypeValue = purposeValue;
                    address.IsPrimary = this._getChecked(element, "customerInlineCreateAddressPrimary");
                    address.Deactivate = false;
                    address.ExtensionProperties = [];
                    if (stateId && countyId && cityCode) {
                        address.State = stateId;
                        address.County = countyId;
                        address.City = cityCode;
                        address.DistrictName = this._getSelectedLabel(element, "customerInlineCreateDistrict");
                    }
                    return address;
                };
                CustomerInlineDialog.prototype._setMode = function (element, mode) {
                    this._mode = mode;
                    this._toggle(element, "customerInlineTabSearch", mode === "search");
                    this._toggle(element, "customerInlineTabCreate", mode === "create");
                    this._toggle(element, "customerInlineTabEdit", mode === "edit");
                    this._toggle(element, "customerInlinePanelSearch", mode === "search");
                    this._toggle(element, "customerInlinePanelCreate", mode === "create");
                    this._toggle(element, "customerInlinePanelEdit", mode === "edit");
                    var blocks = [
                        { id: "customerInlineAddressSection", visible: mode === "create" || mode === "edit" },
                        { id: "customerInlineCreateActions", visible: mode === "create" },
                        { id: "customerInlineEditActions", visible: mode === "edit" },
                        { id: "customerInlineCreateResult", visible: mode === "create" },
                        { id: "customerInlineEditResult", visible: mode === "edit" }
                    ];
                    for (var i = 0; i < blocks.length; i++) {
                        var block = element.querySelector("#" + blocks[i].id);
                        if (block) {
                            block.style.display = blocks[i].visible ? "" : "none";
                        }
                    }
                    if (mode === "search") {
                        this._showMessage(element, "Busque clientes existentes por documento, nombre o cuenta.");
                    }
                    else if (mode === "create") {
                        this._showMessage(element, "El cliente será creado directamente validando la data desde SUNAT.");
                    }
                    else {
                        this._showMessage(element, "Edite el cliente actual.");
                    }
                };
                CustomerInlineDialog.prototype._toggle = function (element, id, active) {
                    var target = element.querySelector("#" + id);
                    if (!target)
                        return;
                    if (active)
                        target.classList.add("is-active");
                    else
                        target.classList.remove("is-active");
                };
                CustomerInlineDialog.prototype._showMessage = function (element, message) {
                    var messageElement = element.querySelector("#customerInlineMessage");
                    if (messageElement)
                        messageElement.textContent = message;
                };
                CustomerInlineDialog.prototype._showTextResult = function (element, id, message) {
                    var target = element.querySelector("#" + id);
                    if (target)
                        target.textContent = message || "";
                };
                CustomerInlineDialog.prototype._getValue = function (element, id) {
                    var target = element.querySelector("#" + id);
                    return target && target.value ? target.value.trim() : "";
                };
                CustomerInlineDialog.prototype._setValue = function (element, id, value) {
                    var target = element.querySelector("#" + id);
                    if (target)
                        target.value = value || "";
                };
                CustomerInlineDialog.prototype._getSelectedLabel = function (element, id) {
                    var select = element.querySelector("#" + id);
                    if (!select || select.selectedIndex < 0) {
                        return "";
                    }
                    return select.options[select.selectedIndex].text || "";
                };
                CustomerInlineDialog.prototype._getChecked = function (element, id) {
                    var target = element.querySelector("#" + id);
                    return target ? target.checked : false;
                };
                CustomerInlineDialog.prototype._setChecked = function (element, id, value) {
                    var target = element.querySelector("#" + id);
                    if (target)
                        target.checked = value || false;
                };
                CustomerInlineDialog.prototype._formatCustomerSummary = function (customer) {
                    if (!customer)
                        return "";
                    return [
                        "Cliente del sistema",
                        "Cuenta: " + (customer.AccountNumber || ""),
                        "Nombre: " + (customer.Name || ""),
                        "Documento fiscal: " + (this._sunatService.getDocumentNumber(customer) || "Sin documento")
                    ].join("\n");
                };
                CustomerInlineDialog.prototype._formatSunatSummary = function (sunatData) {
                    var lines = [
                        "SUNAT " + sunatData.documentType + ": " + sunatData.documentNumber,
                        "Nombre: " + (sunatData.name || "")
                    ];
                    if (sunatData.padronesText)
                        lines.push("Padrones: " + sunatData.padronesText);
                    return lines.join("\n");
                };
                CustomerInlineDialog.prototype._getCorrelationId = function () {
                    var logger = this.context && this.context.logger;
                    if (logger && logger.getNewCorrelationId)
                        return logger.getNewCorrelationId();
                    return "customer-inline-" + new Date().getTime().toString();
                };
                CustomerInlineDialog.prototype._complete = function (result) {
                    window[GUARD_KEY] = false;
                    CustomerInlineDialog._markBody(false);
                    if (this._resolve) {
                        this._resolve(result);
                        this._resolve = null;
                    }
                    this.closeDialog();
                };
                CustomerInlineDialog.prototype._closeClickHandler = function () {
                    window[GUARD_KEY] = false;
                    CustomerInlineDialog._markBody(false);
                    if (this._resolve) {
                        this._resolve(null);
                        this._resolve = null;
                    }
                    return true;
                };
                CustomerInlineDialog.prototype._getErrorMessage = function (reason) {
                    try {
                        if (typeof reason === "string")
                            return reason;
                        if (Array.isArray(reason) && reason.length > 0) {
                            var first = reason[0];
                            if (first && first.message)
                                return first.message;
                            if (first && first.ErrorCode)
                                return "Error Code: " + first.ErrorCode;
                            return JSON.stringify(reason);
                        }
                        if (reason && reason.message)
                            return reason.message;
                        if (reason && reason.ErrorCode)
                            return "Error Code: " + reason.ErrorCode;
                        if (reason)
                            return JSON.stringify(reason);
                    }
                    catch (e) {
                    }
                    return "Error desconocido. Revise F12.";
                };
                CustomerInlineDialog.prototype._stringify = function (value) {
                    if (value === null || value === undefined) {
                        return "";
                    }
                    if (value instanceof Error) {
                        return value.name + ": " + value.message + (value.stack ? "\n" + value.stack : "");
                    }
                    if (Array.isArray(value)) {
                        var parts = [];
                        for (var i = 0; i < value.length; i++) {
                            parts.push(this._stringify(value[i]));
                        }
                        return parts.join(" | ");
                    }
                    try {
                        var serialized = JSON.stringify(value);
                        if (serialized && serialized !== "{}") {
                            return serialized;
                        }
                    }
                    catch (error) {
                    }
                    if (value.message) {
                        return String(value.message);
                    }
                    return value.toString ? value.toString() : "";
                };
                CustomerInlineDialog.prototype._logError = function (message) {
                    if (this.context && this.context.logger)
                        this.context.logger.logError(message);
                };
                CustomerInlineDialog._hostStyleId = "customerInlineHostStyle";
                CustomerInlineDialog._colorSurface = "#1B1A19";
                CustomerInlineDialog._colorText = "#E8E6E3";
                CustomerInlineDialog._searchCache = {};
                CustomerInlineDialog._documentSearchField = null;
                CustomerInlineDialog._documentSearchFieldResolved = false;
                return CustomerInlineDialog;
            }(Dialogs_1.ExtensionTemplatedDialogBase));
            exports_1("default", CustomerInlineDialog);
        }
    };
});
