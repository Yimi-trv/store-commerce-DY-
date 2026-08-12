System.register(["PosApi/Consume/Peripherals"], function (exports_1, context_1) {
    "use strict";
    var Peripherals_1, SaveFileTerminal;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (Peripherals_1_1) {
                Peripherals_1 = Peripherals_1_1;
            }
        ],
        execute: function () {
            SaveFileTerminal = (function () {
                function SaveFileTerminal(extensionContextRuntime) {
                    this.extensionContextRuntime = extensionContextRuntime;
                }
                SaveFileTerminal.prototype.saveToLocal = function (filePath, filePathBackup, fileContents, receiptId, callerContext) {
                    var saveFileRequest = {
                        FileContents: fileContents,
                        FilePath: filePath,
                        FilePathBackup: filePathBackup,
                        ReceiptId: receiptId,
                        DeviceName: SaveFileTerminal.SAVEFILE_DEVICE_NAME,
                        DeviceType: "WINDOWS",
                    };
                    var MakeSaveFileRequest = new Peripherals_1.HardwareStationDeviceActionRequest(SaveFileTerminal.SAVEFILE_DEVICE_NAME, SaveFileTerminal.SAVEFILE_MAKE_PAYMENT_REQUEST_NAME, saveFileRequest);
                    return this.extensionContextRuntime.executeAsync(MakeSaveFileRequest)
                        .then(function (result) {
                        if (result.data.response != null) {
                            return result.data.response;
                        }
                    });
                };
                SaveFileTerminal.SAVEFILE_DEVICE_NAME = "SAVEFILE";
                SaveFileTerminal.SAVEFILE_MAKE_PAYMENT_REQUEST_NAME = "saveToLocal";
                return SaveFileTerminal;
            }());
            exports_1("default", SaveFileTerminal);
        }
    };
});
//# sourceMappingURL=C:/RetailLocEnviado/SCR-9.57/src/LocalizacionPeru/Pos/HardwareStation/SaveFile.js.map