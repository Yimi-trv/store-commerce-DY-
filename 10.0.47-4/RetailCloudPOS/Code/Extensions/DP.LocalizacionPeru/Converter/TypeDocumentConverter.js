System.register([], function (exports_1, context_1) {
    "use strict";
    var TypeDocumentConverter;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [],
        execute: function () {
            TypeDocumentConverter = (function () {
                function TypeDocumentConverter() {
                }
                TypeDocumentConverter.convertToClientTypeDocument = function (typeDoument) {
                    return {
                        recId: typeDoument.Id,
                        typeDocId: typeDoument.TypeDocId,
                        description: typeDoument.Description,
                        dataAreaId: typeDoument.DataAreaId
                    };
                };
                return TypeDocumentConverter;
            }());
            exports_1("default", TypeDocumentConverter);
        }
    };
});
//# sourceMappingURL=C:/RetailLocEnviado/SCR-9.57/src/LocalizacionPeru/Pos/Converter/TypeDocumentConverter.js.map