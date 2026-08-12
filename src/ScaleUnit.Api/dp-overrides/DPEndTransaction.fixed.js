System.register(["PosApi/TypeExtensions", "PosApi/Extend/Triggers/TransactionTriggers"], function (exports_1, context_1) {
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
    var TypeExtensions_1, Triggers, DPEndTransaction;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (TypeExtensions_1_1) {
                TypeExtensions_1 = TypeExtensions_1_1;
            },
            function (Triggers_1) {
                Triggers = Triggers_1;
            }
        ],
        execute: function () {
            // ---------------------------------------------------------------------------
            // OVERRIDE Terranova del trigger del DP. Dos correcciones sobre el original:
            //
            // 1) NULL-CHECK de DPIsDocRetorno: el original hace
            //    dpIsDocRetornoExtensionProperty.Value.StringValue sin validar y revienta
            //    (sin descargar el TXT) cuando la propiedad no viene.
            //
            // 2) GUARD DE IDEMPOTENCIA (2026-07-12): en varias cajas el trigger se ejecuta
            //    DOS veces por venta y el TXT se descarga duplicado. Evidencia: en el kiosko
            //    Linux/Chromium se ven dos descargas del mismo comprobante con 1-3 ms de
            //    diferencia (la segunda queda como "B011-000000XX (1).txt"); en producción
            //    (Windows) el agente registra esos "(1)" como comprobantes UNKNOWN/ERROR.
            //    Ocurre en PROD (10.0.48, ext 2.7.0) y UAT (10.0.47, ext 2.9.0) por igual, y
            //    es previo a la extensión POS de clientes → no es de nuestro paquete ni del
            //    navegador: el handler se invoca dos veces en runtime.
            //    Este guard descarta la segunda descarga del MISMO comprobante dentro de una
            //    ventana corta. El registro vive en window (NO a nivel de módulo) a propósito:
            //    si el bundle del DP quedara cargado dos veces, cada copia tendría su propio
            //    estado de módulo y el guard no serviría; en window lo comparten.
            //    No afecta la descarga manual desde el diario (otro módulo: DownloadDocumentElectronic).
            // ---------------------------------------------------------------------------
            var DUPLICATE_WINDOW_MS = 120000; // 2 min: cubre el doble disparo sin bloquear reemisiones legítimas
            var REGISTRY_KEY = "__TRV_DP_TXT_DOWNLOADS__";
            var INSTANCE_SEQ_KEY = "__TRV_DP_TRIGGER_SEQ__";

            function getGlobalState(key, initial) {
                var w = window;
                if (TypeExtensions_1.ObjectExtensions.isNullOrUndefined(w[key])) {
                    w[key] = initial;
                }
                return w[key];
            }

            /**
             * Id de instancia del trigger. Sirve para distinguir las dos causas posibles de la
             * doble descarga cuando se lea el log:
             *   - dos instancias distintas ejecutando el mismo evento => el trigger quedó
             *     REGISTRADO DOS VECES (problema de carga/registro de la extensión);
             *   - la MISMA instancia ejecutada dos veces => la PLATAFORMA invoca dos veces.
             * El contador vive en window para que sea único aunque el bundle se cargue dos veces.
             */
            function getInstanceId(trigger) {
                if (TypeExtensions_1.ObjectExtensions.isNullOrUndefined(trigger.__trvInstanceId)) {
                    var w = window;
                    getGlobalState(INSTANCE_SEQ_KEY, 0);
                    w[INSTANCE_SEQ_KEY] = w[INSTANCE_SEQ_KEY] + 1;
                    trigger.__trvInstanceId = w[INSTANCE_SEQ_KEY];
                }
                return trigger.__trvInstanceId;
            }

            /**
             * Firma compacta del lote de recibos de la invocación: cantidad + tipos + ids.
             * Sirve para diagnosticar la causa raíz: si las DOS invocaciones traen lotes de
             * recibos DISTINTOS (p. ej. recibo de venta y luego voucher/copia), la plataforma
             * está invocando el trigger una vez por trabajo de recibos — y eso explicaría que
             * solo dupliquen algunas ventas (las que generan más de un juego de recibos).
             */
            function receiptsSignature(receipts) {
                try {
                    var types = [];
                    for (var i = 0; i < receipts.length; i++) {
                        var t = receipts[i].ReceiptTypeValue;
                        types.push(TypeExtensions_1.ObjectExtensions.isNullOrUndefined(t) ? "?" : t);
                    }
                    return receipts.length + "[" + types.join(",") + "]";
                }
                catch (e) {
                    return "?";
                }
            }

            /**
             * Devuelve null si corresponde descargar, o un objeto con el detalle del duplicado
             * (delta en ms, instancia y firma de recibos de la primera descarga) si hay que omitirlo.
             */
            function checkDuplicate(fileName, instanceId, receiptsSig) {
                var registry = getGlobalState(REGISTRY_KEY, {});
                var now = new Date().getTime();
                // Poda de entradas viejas para que el registro no crezca en cajas de todo el día.
                for (var key in registry) {
                    if (Object.prototype.hasOwnProperty.call(registry, key) && (now - registry[key].t) > DUPLICATE_WINDOW_MS) {
                        delete registry[key];
                    }
                }
                var previous = registry[fileName];
                if (!TypeExtensions_1.ObjectExtensions.isNullOrUndefined(previous) && (now - previous.t) <= DUPLICATE_WINDOW_MS) {
                    return { deltaMs: now - previous.t, firstInstanceId: previous.i, firstReceiptsSig: previous.r };
                }
                registry[fileName] = { t: now, i: instanceId, r: receiptsSig };
                return null;
            }

            DPEndTransaction = (function (_super) {
                __extends(DPEndTransaction, _super);
                function DPEndTransaction() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                DPEndTransaction.prototype.execute = function (options) {
                    if (options.receipts.length > 0) {
                        var filePathExtensionProperty = Commerce.ArrayExtensions.firstOrUndefined(options.receipts[0].ExtensionProperties, function (property) {
                            return property.Key === "DPFilePath";
                        });
                        var filePathBackupExtensionProperty = Commerce.ArrayExtensions.firstOrUndefined(options.receipts[0].ExtensionProperties, function (property) {
                            return property.Key === "DPFilePathBackup";
                        });
                        var fileContentsExtensionProperty = Commerce.ArrayExtensions.firstOrUndefined(options.receipts[0].ExtensionProperties, function (property) {
                            return property.Key === "DPFileContents";
                        });
                        var dpIsDocRetornoExtensionProperty = Commerce.ArrayExtensions.firstOrUndefined(options.receipts[0].ExtensionProperties, function (property) {
                            return property.Key === "DPIsDocRetorno";
                        });
                        if (!TypeExtensions_1.ObjectExtensions.isNullOrUndefined(filePathExtensionProperty) && !TypeExtensions_1.ObjectExtensions.isNullOrUndefined(filePathExtensionProperty.Value) &&
                            !TypeExtensions_1.ObjectExtensions.isNullOrUndefined(fileContentsExtensionProperty) && !TypeExtensions_1.ObjectExtensions.isNullOrUndefined(fileContentsExtensionProperty.Value)) {
                            if (TypeExtensions_1.ObjectExtensions.isNullOrUndefined(filePathBackupExtensionProperty) || TypeExtensions_1.ObjectExtensions.isNullOrUndefined(filePathBackupExtensionProperty.Value)) {
                                filePathBackupExtensionProperty = "";
                            }
                            var isRetorno = !TypeExtensions_1.ObjectExtensions.isNullOrUndefined(dpIsDocRetornoExtensionProperty)
                                && !TypeExtensions_1.ObjectExtensions.isNullOrUndefined(dpIsDocRetornoExtensionProperty.Value)
                                && !TypeExtensions_1.ObjectExtensions.isNullOrUndefined(dpIsDocRetornoExtensionProperty.Value.StringValue);
                            if (!isRetorno) {
                                var fileName = options.receipts[0].ReceiptId + ".txt";
                                var instanceId = getInstanceId(this);
                                var receiptsSig = receiptsSignature(options.receipts);
                                var duplicate = checkDuplicate(fileName, instanceId, receiptsSig);
                                if (!TypeExtensions_1.ObjectExtensions.isNullOrUndefined(duplicate)) {
                                    // Segunda ejecución para el mismo comprobante: se omite y se
                                    // deja traza con los datos que identifican la causa raíz.
                                    var detail = "TRV-DUP DPEndTransaction: descarga duplicada omitida"
                                        + " | archivo=" + fileName
                                        + " | deltaMs=" + duplicate.deltaMs
                                        + " | instanciaActual=" + instanceId
                                        + " | instanciaPrimera=" + duplicate.firstInstanceId
                                        + " | recibosActual=" + receiptsSig
                                        + " | recibosPrimera=" + duplicate.firstReceiptsSig
                                        + " | causa=" + (duplicate.firstInstanceId === instanceId
                                            ? (receiptsSig !== duplicate.firstReceiptsSig
                                                ? "MISMA instancia con lotes de recibos DISTINTOS (plataforma invoca por cada trabajo de recibos)"
                                                : "MISMA instancia (la plataforma invoca 2 veces)")
                                            : "OTRA instancia (trigger REGISTRADO 2 veces)");
                                    try {
                                        this.context.logger.logInformational(detail);
                                    }
                                    catch (e) { /* el logger no siempre está disponible */ }
                                    try {
                                        console.warn(detail);
                                    }
                                    catch (e2) { /* consola no disponible */ }
                                    return Promise.resolve();
                                }
                                this.saveTextAsFile(fileContentsExtensionProperty.Value.StringValue, fileName, "text/plain");
                            }
                        }
                    }
                    return Promise.resolve();
                };
                DPEndTransaction.prototype.saveTextAsFile = function (textToWrite, fileNameToSaveAs, fileType) {
                    var textFileAsBlob = new Blob([textToWrite], { type: fileType });
                    var urlFactory = (window.webkitURL != null) ? window.webkitURL : window.URL;
                    var objectUrl = urlFactory.createObjectURL(textFileAsBlob);
                    var downloadLink = document.createElement('a');
                    downloadLink.download = fileNameToSaveAs;
                    downloadLink.innerHTML = 'Download File';
                    downloadLink.href = objectUrl;
                    downloadLink.style.display = 'none';
                    document.body.appendChild(downloadLink);
                    downloadLink.click();
                    // El original nunca liberaba el object URL ni quitaba el <a> del DOM: en cajas
                    // que operan todo el día eso acumula blobs y nodos. Se limpia tras la descarga.
                    setTimeout(function () {
                        try {
                            if (downloadLink.parentNode) {
                                downloadLink.parentNode.removeChild(downloadLink);
                            }
                            urlFactory.revokeObjectURL(objectUrl);
                        }
                        catch (e) { /* limpieza best-effort */ }
                    }, 30000);
                };
                return DPEndTransaction;
            }(Triggers.PostEndTransactionTrigger));
            exports_1("default", DPEndTransaction);
        }
    };
});
