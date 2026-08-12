System.register(["PosApi/Create/Operations", "./StoreReceiptsOperationResponse", "./StoreReceiptsOperationRequest"], function (exports_1, context_1) {
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
    var Operations_1, StoreReceiptsOperationResponse_1, StoreReceiptsOperationRequest_1, StoreReceiptsOperationRequestHandler;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (Operations_1_1) {
                Operations_1 = Operations_1_1;
            },
            function (StoreReceiptsOperationResponse_1_1) {
                StoreReceiptsOperationResponse_1 = StoreReceiptsOperationResponse_1_1;
            },
            function (StoreReceiptsOperationRequest_1_1) {
                StoreReceiptsOperationRequest_1 = StoreReceiptsOperationRequest_1_1;
            }
        ],
        execute: function () {
            StoreReceiptsOperationRequestHandler = (function (_super) {
                __extends(StoreReceiptsOperationRequestHandler, _super);
                function StoreReceiptsOperationRequestHandler() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                StoreReceiptsOperationRequestHandler.prototype.supportedRequestType = function () {
                    return StoreReceiptsOperationRequest_1.default;
                };
                StoreReceiptsOperationRequestHandler.prototype.executeAsync = function (request) {
                    var _this = this;
                    this.context.logger.logInformational("Log message from StoreReceiptsOperationRequestHandler executeAsync().", this.context.logger.getNewCorrelationId());
                    var messageToPrint = "Message from PrintOperationRequestHandler: " + request.messageToPrint;
                    var response = new StoreReceiptsOperationResponse_1.default(messageToPrint);
                    return new Promise(function (resolve) {
                        setTimeout(resolve, 2000);
                    }).then(function () {
                        _this.context.navigator.navigate("StoreReceiptView");
                        return {
                            canceled: false,
                            data: response
                        };
                    });
                };
                return StoreReceiptsOperationRequestHandler;
            }(Operations_1.ExtensionOperationRequestHandlerBase));
            exports_1("default", StoreReceiptsOperationRequestHandler);
        }
    };
});
//# sourceMappingURL=C:/RetailLocEnviado/SCR-9.57/src/LocalizacionPeru/Pos/Operations/StoreReceipts/StoreReceiptsOperationRequestHandler.js.map