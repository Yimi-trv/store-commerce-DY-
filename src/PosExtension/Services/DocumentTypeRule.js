System.register(["PosApi/Consume/Cart", "PosApi/Consume/Customer", "PosApi/Consume/Dialogs", "./SunatCustomerService"], function (exports_1, context_1) {
    "use strict";
    var Cart_1, Customer_1, Dialogs_1, SunatCustomerService_1, DocumentTypeRule;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (Cart_1_1) {
                Cart_1 = Cart_1_1;
            },
            function (Customer_1_1) {
                Customer_1 = Customer_1_1;
            },
            function (Dialogs_1_1) {
                Dialogs_1 = Dialogs_1_1;
            },
            function (SunatCustomerService_1_1) {
                SunatCustomerService_1 = SunatCustomerService_1_1;
            }
        ],
        execute: function () {
            DocumentTypeRule = (function () {
                function DocumentTypeRule() {
                }
                DocumentTypeRule.evaluateCart = function (context, cartFromTrigger) {
                    var correlationId = context.logger.getNewCorrelationId();
                    var cartPromise = cartFromTrigger
                        ? Promise.resolve(cartFromTrigger)
                        : context.runtime
                            .executeAsync(new Cart_1.GetCurrentCartClientRequest(correlationId))
                            .then(function (response) { return response && response.data && response.data.result; });
                    return cartPromise
                        .then(function (cart) {
                        if (!cart) {
                            return Promise.resolve("");
                        }
                        var document = DocumentTypeRule._readSelectedOption(cart);
                        if (!document) {
                            return Promise.resolve("");
                        }
                        var accountNumber = cart.CustomerId || "";
                        if (!accountNumber) {
                            return Promise.resolve(document === DocumentTypeRule.FACTURA
                                ? "La venta no tiene cliente asignado y la FACTURA exige un cliente con RUC."
                                : "");
                        }
                        var cached = DocumentTypeRule._documentCache[accountNumber];
                        if (typeof cached === "string") {
                            return Promise.resolve(DocumentTypeRule._evaluateDocument(document, cached, accountNumber, context));
                        }
                        return context.runtime
                            .executeAsync(new Customer_1.GetCustomerClientRequest(accountNumber, correlationId))
                            .then(function (customerResponse) {
                            var customer = customerResponse && customerResponse.data && customerResponse.data.result;
                            var service = new SunatCustomerService_1.default();
                            var documentNumber = customer ? service.getDocumentNumber(customer) : "";
                            DocumentTypeRule._documentCache[accountNumber] = documentNumber;
                            return DocumentTypeRule._evaluateDocument(document, documentNumber, accountNumber, context);
                        });
                    })
                        .catch(function (reason) {
                        var detail = "";
                        try {
                            detail = JSON.stringify(reason);
                        }
                        catch (error) {
                            detail = String(reason);
                        }
                        context.logger.logError("DocumentTypeRule: no se pudo validar el comprobante: " + detail);
                        return "";
                    });
                };
                DocumentTypeRule._evaluateDocument = function (document, documentNumber, accountNumber, context) {
                    var service = new SunatCustomerService_1.default();
                    var documentType = service.getDocumentType(documentNumber);
                    var hasRuc = documentType === "RUC";
                    var esEmpresa = service.isOrganizationDocument(documentNumber);
                    context.logger.logInformational("DocumentTypeRule: comprobante=" + document
                        + " | cuenta=" + accountNumber
                        + " | documento=" + (documentNumber || "(sin documento)")
                        + " | tipo=" + (documentType || "(ninguno)")
                        + " | empresa=" + esEmpresa);
                    if (document === DocumentTypeRule.BOLETA && esEmpresa) {
                        return "El cliente " + accountNumber + " es una empresa: su RUC " + documentNumber
                            + " empieza en 20."
                            + "\n\nA una empresa se le emite FACTURA, no boleta."
                            + "\n\nCambie el comprobante a Factura, o asigne a la venta un cliente que no sea"
                            + " una empresa.";
                    }
                    if (document === DocumentTypeRule.FACTURA && !hasRuc) {
                        return "El cliente " + accountNumber
                            + (documentNumber ? " tiene el documento " + documentNumber + ", que no es un RUC." : " no tiene RUC registrado.")
                            + "\n\nLa FACTURA exige un cliente con RUC."
                            + "\n\nCambie el comprobante a Boleta, o asigne a la venta un cliente con RUC.";
                    }
                    return "";
                };
                DocumentTypeRule.forget = function (accountNumber) {
                    if (accountNumber && DocumentTypeRule._documentCache.hasOwnProperty(accountNumber)) {
                        delete DocumentTypeRule._documentCache[accountNumber];
                    }
                };
                DocumentTypeRule._readSelectedOption = function (cart) {
                    var properties = (cart && cart.ExtensionProperties) || [];
                    for (var i = 0; i < properties.length; i++) {
                        var property = properties[i];
                        if (property && property.Key === "SelectedOption" && property.Value) {
                            return (property.Value.StringValue || "").toString().toUpperCase().trim();
                        }
                    }
                    return "";
                };
                DocumentTypeRule.showBlockedDialog = function (context, reason) {
                    var options = {
                        title: "Comprobante no válido para este cliente",
                        message: reason,
                        showCloseX: false,
                        button1: { id: "understood", label: "Entendido", isPrimary: true, result: "ok" }
                    };
                    return context.runtime
                        .executeAsync(new Dialogs_1.ShowMessageDialogClientRequest(options, context.logger.getNewCorrelationId()))
                        .then(function () { return; })
                        .catch(function () {
                        context.logger.logError("DocumentTypeRule: no se pudo mostrar el aviso de bloqueo.");
                    });
                };
                DocumentTypeRule.BOLETA = "BOLETA";
                DocumentTypeRule.FACTURA = "FACTURA";
                DocumentTypeRule._documentCache = {};
                return DocumentTypeRule;
            }());
            exports_1("DocumentTypeRule", DocumentTypeRule);
            exports_1("default", DocumentTypeRule);
        }
    };
});
