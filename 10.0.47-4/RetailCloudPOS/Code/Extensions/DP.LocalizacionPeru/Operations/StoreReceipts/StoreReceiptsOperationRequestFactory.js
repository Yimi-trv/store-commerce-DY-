System.register(["./StoreReceiptsOperationRequest"], function (exports_1, context_1) {
    "use strict";
    var StoreReceiptsOperationRequest_1, getOperationRequest;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (StoreReceiptsOperationRequest_1_1) {
                StoreReceiptsOperationRequest_1 = StoreReceiptsOperationRequest_1_1;
            }
        ],
        execute: function () {
            getOperationRequest = function (context, operationId, actionParameters, correlationId) {
                var operationRequest = new StoreReceiptsOperationRequest_1.default(correlationId);
                return Promise.resolve({
                    canceled: false,
                    data: operationRequest
                });
            };
            exports_1("default", getOperationRequest);
        }
    };
});
//# sourceMappingURL=C:/RetailLocEnviado/SCR-9.57/src/LocalizacionPeru/Pos/Operations/StoreReceipts/StoreReceiptsOperationRequestFactory.js.map