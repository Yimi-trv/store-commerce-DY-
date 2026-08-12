System.register(["./BaseClasses/KnockoutExtensionViewControllerBase", "./TypeDocumentViewModel", "PosApi/Consume/Controls"], function (exports_1, context_1) {
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
    var KnockoutExtensionViewControllerBase_1, TypeDocumentViewModel_1, Controls_1, TypeDocumentView;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (KnockoutExtensionViewControllerBase_1_1) {
                KnockoutExtensionViewControllerBase_1 = KnockoutExtensionViewControllerBase_1_1;
            },
            function (TypeDocumentViewModel_1_1) {
                TypeDocumentViewModel_1 = TypeDocumentViewModel_1_1;
            },
            function (Controls_1_1) {
                Controls_1 = Controls_1_1;
            }
        ],
        execute: function () {
            TypeDocumentView = (function (_super) {
                __extends(TypeDocumentView, _super);
                function TypeDocumentView(context, options) {
                    var _this = _super.call(this, context, false) || this;
                    _this.viewModel = new TypeDocumentViewModel_1.default(context, options);
                    return _this;
                }
                TypeDocumentView.prototype.onReady = function (element) {
                    var dataListOptions = {
                        interactionMode: Controls_1.DataListInteractionMode.Invoke,
                        data: this.viewModel.currentTypeDocuments,
                        columns: [
                            {
                                title: "RecId",
                                ratio: 40, collapseOrder: 1, minWidth: 100,
                                computeValue: function (event) { return event.recId.toString(); }
                            },
                            {
                                title: "TYPEDOCID",
                                ratio: 30, collapseOrder: 2, minWidth: 100,
                                computeValue: function (event) { return event.typeDocId; }
                            },
                            {
                                title: "description",
                                ratio: 30, collapseOrder: 3, minWidth: 100,
                                computeValue: function (event) { return event.description; }
                            }
                        ]
                    };
                    var dataListRootElem = element.querySelector("#customerPersonalizado");
                    this.dataList = this.context.controlFactory.create(this.context.logger.getNewCorrelationId(), "DataList", dataListOptions, dataListRootElem);
                };
                return TypeDocumentView;
            }(KnockoutExtensionViewControllerBase_1.default));
            exports_1("default", TypeDocumentView);
        }
    };
});
//# sourceMappingURL=C:/RetailLocEnviado/SCR-9.57/src/LocalizacionPeru/Pos/ViewExtensions/CustomerAddEdit/TypeDocumentView.js.map