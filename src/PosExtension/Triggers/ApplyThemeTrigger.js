System.register(["PosApi/Extend/Triggers/ApplicationTriggers", "../Theme/ThemeEngine"], function (exports_1, context_1) {
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
    var ApplicationTriggers_1, ThemeEngine_1, ApplyThemeTrigger;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (ApplicationTriggers_1_1) {
                ApplicationTriggers_1 = ApplicationTriggers_1_1;
            },
            function (ThemeEngine_1_1) {
                ThemeEngine_1 = ThemeEngine_1_1;
            }
        ],
        execute: function () {
            ApplyThemeTrigger = (function (_super) {
                __extends(ApplyThemeTrigger, _super);
                function ApplyThemeTrigger() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                ApplyThemeTrigger.prototype.execute = function (options) {
                    ThemeEngine_1.ThemeEngine.iniciar();
                    return Promise.resolve();
                };
                return ApplyThemeTrigger;
            }(ApplicationTriggers_1.ApplicationStartTrigger));
            exports_1("default", ApplyThemeTrigger);
        }
    };
});
