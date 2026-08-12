System.register(["PosApi/Consume/Formatters", "PosApi/TypeExtensions"], function (exports_1, context_1) {
    "use strict";
    var Formatters_1, TypeExtensions_1;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (Formatters_1_1) {
                Formatters_1 = Formatters_1_1;
            },
            function (TypeExtensions_1_1) {
                TypeExtensions_1 = TypeExtensions_1_1;
            }
        ],
        execute: function () {
            exports_1("default", (function (context) {
                return [
                    {
                        title: "N�MERO DE PRODUCTO",
                        computeValue: function (row) { return row.ItemId; },
                        ratio: 20,
                        collapseOrder: 3,
                        minWidth: 120
                    }, {
                        title: "DESCRIPCI�N",
                        computeValue: function (row) {
                            if (!TypeExtensions_1.ObjectExtensions.isNullOrUndefined(row.ExtensionProperties)) {
                                var inventProperties = row.ExtensionProperties.filter(function (value) { return value.Key === "Description"; });
                                return inventProperties.length > 0 ? inventProperties[0].Value.StringValue : TypeExtensions_1.StringExtensions.EMPTY;
                            }
                            return TypeExtensions_1.StringExtensions.EMPTY;
                        },
                        ratio: 40,
                        collapseOrder: 4,
                        minWidth: 200
                    }, {
                        title: "NOMBRE",
                        computeValue: function (row) { return row.Name; },
                        ratio: 30,
                        collapseOrder: 2,
                        minWidth: 200
                    }, {
                        title: "PRECIO",
                        computeValue: function (row) { return Formatters_1.CurrencyFormatter.toCurrency(row.Price); },
                        ratio: 10,
                        collapseOrder: 1,
                        minWidth: 100,
                        isRightAligned: true
                    }
                ];
            }));
        }
    };
});
//# sourceMappingURL=C:/RetailLocEnviado/SCR-9.57/src/LocalizacionPeru/Pos/ViewExtensions/Search/CustomProductSearchColumns.js.map