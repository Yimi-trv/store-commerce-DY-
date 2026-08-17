System.register(["PosApi/Extend/Triggers/OperationTriggers"], function (exports_1, context_1) {
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
    var OperationTriggers_1, OperationProbeTrigger;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (OperationTriggers_1_1) {
                OperationTriggers_1 = OperationTriggers_1_1;
            }
        ],
        execute: function () {
            OperationProbeTrigger = (function (_super) {
                __extends(OperationProbeTrigger, _super);
                function OperationProbeTrigger() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                OperationProbeTrigger.prototype.execute = function (options) {
                    try {
                        var request = options ? options.operationRequest : null;
                        var operationId = request ? request.operationId : "(sin operationRequest)";
                        var typeName = "";
                        if (request && request.constructor && request.constructor.name) {
                            typeName = request.constructor.name;
                        }
                        var line = "=== OPERACION === id=" + operationId + " | tipo=" + typeName;
                        if (typeof console !== "undefined" && console.log) {
                            console.log(line);
                        }
                        this.context.logger.logInformational(line);
                    }
                    catch (error) {
                    }
                    return Promise.resolve({ canceled: false });
                };
                return OperationProbeTrigger;
            }(OperationTriggers_1.PreOperationTrigger));
            exports_1("default", OperationProbeTrigger);
        }
    };
});
