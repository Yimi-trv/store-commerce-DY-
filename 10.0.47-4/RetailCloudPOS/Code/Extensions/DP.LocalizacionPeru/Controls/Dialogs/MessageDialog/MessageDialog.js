System.register(["PosApi/Consume/Dialogs"], function (exports_1, context_1) {
    "use strict";
    var Dialogs_1, MessageDialog;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (Dialogs_1_1) {
                Dialogs_1 = Dialogs_1_1;
            }
        ],
        execute: function () {
            MessageDialog = (function () {
                function MessageDialog() {
                }
                MessageDialog.show = function (context, message) {
                    var promise = new Promise(function (resolve, reject) {
                        var messageDialogOptions = {
                            title: "Datos complementarios",
                            message: message,
                            showCloseX: true,
                            button1: {
                                id: "button1OK",
                                label: "OK",
                                result: "OKResult"
                            }
                        };
                        var dialogRequest = new Dialogs_1.ShowMessageDialogClientRequest(messageDialogOptions);
                        context.runtime.executeAsync(dialogRequest).then(function (result) {
                            if (!result.canceled) {
                                context.logger.logInformational("MessageDialog result: " + result.data.result.dialogResult);
                                resolve(result.data.result.dialogResult);
                            }
                            else {
                                context.logger.logInformational("Request for MessageDialog is canceled.");
                                resolve(null);
                            }
                        }).catch(function (reason) {
                            context.logger.logError(JSON.stringify(reason));
                            reject(reason);
                        });
                    });
                    return promise;
                };
                return MessageDialog;
            }());
            exports_1("default", MessageDialog);
        }
    };
});
//# sourceMappingURL=C:/RetailLocEnviado/SCR-9.57/src/LocalizacionPeru/Pos/Controls/Dialogs/MessageDialog/MessageDialog.js.map