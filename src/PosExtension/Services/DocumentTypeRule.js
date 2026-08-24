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
                DocumentTypeRule.evaluateCurrentCart = function (context) {
                    var correlationId = context.logger.getNewCorrelationId();
                    return context.runtime
                        .executeAsync(new Cart_1.GetCurrentCartClientRequest(correlationId))
                        .then(function (response) {
                        var cart = response && response.data && response.data.result;
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
                        return context.runtime
                            .executeAsync(new Customer_1.GetCustomerClientRequest(accountNumber, correlationId))
                            .then(function (customerResponse) {
                            var customer = customerResponse && customerResponse.data && customerResponse.data.result;
                            return DocumentTypeRule._evaluate(document, customer, accountNumber, context);
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
                DocumentTypeRule._evaluate = function (document, customer, accountNumber, context) {
                    var service = new SunatCustomerService_1.default();
                    var documentNumber = customer ? service.getDocumentNumber(customer) : "";
                    var documentType = service.getDocumentType(documentNumber);
                    var hasRuc = documentType === "RUC";
                    context.logger.logInformational("DocumentTypeRule: comprobante=" + document
                        + " | cuenta=" + accountNumber
                        + " | documento=" + (documentNumber || "(sin documento)")
                        + " | tipo=" + (documentType || "(ninguno)"));
                    if (document === DocumentTypeRule.BOLETA && hasRuc) {
                        return "El cliente " + accountNumber + " tiene RUC " + documentNumber + "."
                            + "\n\nA un cliente con RUC se le emite FACTURA, no boleta."
                            + "\n\nCambie el comprobante a Factura, o asigne a la venta un cliente sin RUC.";
                    }
                    if (document === DocumentTypeRule.FACTURA && !hasRuc) {
                        return "El cliente " + accountNumber
                            + (documentNumber ? " tiene el documento " + documentNumber + ", que no es un RUC." : " no tiene RUC registrado.")
                            + "\n\nLa FACTURA exige un cliente con RUC."
                            + "\n\nCambie el comprobante a Boleta, o asigne a la venta un cliente con RUC.";
                    }
                    return "";
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
                return DocumentTypeRule;
            }());
            exports_1("DocumentTypeRule", DocumentTypeRule);
            exports_1("default", DocumentTypeRule);
        }
    };
});
