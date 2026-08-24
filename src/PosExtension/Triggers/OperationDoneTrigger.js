System.register(["PosApi/Extend/Triggers/OperationTriggers", "./CustomerModalHelper"], function (exports_1, context_1) {
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
    var OperationTriggers_1, CustomerModalHelper_1, OperationDoneTrigger;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (OperationTriggers_1_1) {
                OperationTriggers_1 = OperationTriggers_1_1;
            },
            function (CustomerModalHelper_1_1) {
                CustomerModalHelper_1 = CustomerModalHelper_1_1;
            }
        ],
        execute: function () {
            OperationDoneTrigger = (function (_super) {
                __extends(OperationDoneTrigger, _super);
                function OperationDoneTrigger() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                OperationDoneTrigger.prototype.execute = function (options) {
                    var request = options ? options.operationRequest : null;
                    CustomerModalHelper_1.anotarOperacionTerminada(request ? request.operationId : null);
                    return Promise.resolve();
                };
                return OperationDoneTrigger;
            }(OperationTriggers_1.PostOperationTrigger));
            exports_1("default", OperationDoneTrigger);
        }
    };
});
