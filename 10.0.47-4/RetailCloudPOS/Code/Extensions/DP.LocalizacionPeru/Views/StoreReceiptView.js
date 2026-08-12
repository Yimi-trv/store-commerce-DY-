System.register(["PosApi/Create/Views", "./StoreReceiptsViewModel", "PosApi/Consume/Controls", "PosApi/TypeExtensions"], function (exports_1, context_1) {
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
    var Views, StoreReceiptsViewModel_1, Controls_1, TypeExtensions_1, StoreReceiptView;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (Views_1) {
                Views = Views_1;
            },
            function (StoreReceiptsViewModel_1_1) {
                StoreReceiptsViewModel_1 = StoreReceiptsViewModel_1_1;
            },
            function (Controls_1_1) {
                Controls_1 = Controls_1_1;
            },
            function (TypeExtensions_1_1) {
                TypeExtensions_1 = TypeExtensions_1_1;
            }
        ],
        execute: function () {
            StoreReceiptView = (function (_super) {
                __extends(StoreReceiptView, _super);
                function StoreReceiptView(context) {
                    var _this = this;
                    var config = {
                        title: context.resources.getString("string_0001"),
                        commandBar: {
                            commands: [
                                {
                                    name: "Edit",
                                    label: context.resources.getString("string_2002"),
                                    icon: Views.Icons.Edit,
                                    isVisible: true,
                                    canExecute: false,
                                    execute: function (args) {
                                        _this.state.isProcessing = true;
                                        _this.viewModel.editStoreReceiptEntity().then(function (editsMade) {
                                            if (editsMade) {
                                                _this.dataList.data = _this.viewModel.loadedData;
                                            }
                                            _this.state.isProcessing = false;
                                        });
                                    }
                                }
                            ]
                        }
                    };
                    _this = _super.call(this, context, config) || this;
                    _this.viewModel = new StoreReceiptsViewModel_1.default(context);
                    return _this;
                }
                StoreReceiptView.prototype.dispose = function () {
                    TypeExtensions_1.ObjectExtensions.disposeAllProperties(this);
                };
                StoreReceiptView.prototype.onReady = function (element) {
                    var _this = this;
                    var dataListOptions = {
                        interactionMode: Controls_1.DataListInteractionMode.SingleSelect,
                        data: this.viewModel.loadedData,
                        columns: [
                            {
                                title: "TIPO DE TRANSACCION",
                                ratio: 20, collapseOrder: 1, minWidth: 100,
                                computeValue: function (data) { return data.TransType.toString(); }
                            },
                            {
                                title: "TIPO DE COMPROBANTE",
                                ratio: 20, collapseOrder: 2, minWidth: 100,
                                computeValue: function (data) { return data.DocumentType; }
                            },
                            {
                                title: "FORMATO",
                                ratio: 20, collapseOrder: 3, minWidth: 100,
                                computeValue: function (data) { return data.Mask; }
                            },
                            {
                                title: "TIPO DE COMPROBANTE REFERENCIA",
                                ratio: 20, collapseOrder: 4, minWidth: 100,
                                computeValue: function (data) { return data.RefDocumentType; }
                            },
                            {
                                title: "NRO. SECUENCIA",
                                ratio: 20, collapseOrder: 5, minWidth: 100,
                                computeValue: function (data) { return data.DataValue.toString(); }
                            }
                        ]
                    };
                    var dataListRootElem = element.querySelector("#storeReceiptsListView");
                    this.dataList = this.context.controlFactory.create(this.context.logger.getNewCorrelationId(), "DataList", dataListOptions, dataListRootElem);
                    this.dataList.addEventListener("SelectionChanged", function (eventData) {
                        _this.viewModel.seletionChanged(eventData.items);
                        _this.state.commandBar.commands.forEach(function (command) { return command.canExecute = (_this.viewModel.isItemSelected()); });
                    });
                    this.state.isProcessing = true;
                    this.viewModel.load().then(function () {
                        _this.dataList.data = _this.viewModel.loadedData;
                        _this.state.isProcessing = false;
                    });
                };
                return StoreReceiptView;
            }(Views.CustomViewControllerBase));
            exports_1("default", StoreReceiptView);
        }
    };
});
//# sourceMappingURL=C:/RetailLocEnviado/SCR-9.57/src/LocalizacionPeru/Pos/Views/StoreReceiptView.js.map