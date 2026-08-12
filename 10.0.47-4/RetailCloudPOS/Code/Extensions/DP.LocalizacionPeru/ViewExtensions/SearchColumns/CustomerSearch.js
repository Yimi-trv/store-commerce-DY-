System.register(["PosApi/TypeExtensions"], function (exports_1, context_1) {
    "use strict";
    var TypeExtensions_1;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (TypeExtensions_1_1) {
                TypeExtensions_1 = TypeExtensions_1_1;
            }
        ],
        execute: function () {
            exports_1("default", (function (context) {
                return [
                    {
                        title: "CÓDIGO",
                        computeValue: function (row) { return row.AccountNumber; },
                        ratio: 10,
                        collapseOrder: 5,
                        minWidth: 100
                    }, {
                        title: "NOMBRES",
                        computeValue: function (row) { return row.FullName; },
                        ratio: 30,
                        collapseOrder: 4,
                        minWidth: 300
                    }, {
                        title: "DIRECCIÓN",
                        computeValue: function (row) { return row.FullAddress; },
                        ratio: 30,
                        collapseOrder: 2,
                        minWidth: 300
                    },
                    {
                        title: "TIPO DOC.",
                        computeValue: function (row) {
                            var desiredProperties = row.ExtensionProperties.filter(function (value) {
                                return value.Key === "DPTYPEDOCID";
                            });
                            return desiredProperties.length > 0 ? desiredProperties[0].Value.StringValue : TypeExtensions_1.StringExtensions.EMPTY;
                        },
                        ratio: 15,
                        collapseOrder: 3,
                        minWidth: 60
                    }, {
                        title: "NRO. DOCUMENTO",
                        computeValue: function (row) {
                            var desiredProperties = row.ExtensionProperties.filter(function (value) {
                                return value.Key === "DPNUMBERDOCUMID";
                            });
                            return desiredProperties.length > 0 ? desiredProperties[0].Value.StringValue : TypeExtensions_1.StringExtensions.EMPTY;
                        },
                        ratio: 15,
                        collapseOrder: 1,
                        minWidth: 60
                    }
                ];
            }));
        }
    };
});
//# sourceMappingURL=C:/RetailLocEnviado/SCR-9.57/src/LocalizacionPeru/Pos/ViewExtensions/SearchColumns/CustomerSearch.js.map