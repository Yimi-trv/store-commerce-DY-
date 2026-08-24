System.register(["PosApi/Consume/Cart", "PosApi/Consume/Customer", "PosApi/Consume/Dialogs", "./SunatCustomerService", "../DataService/CustomerGroupsRequest"], function (exports_1, context_1) {
    "use strict";
    var Cart_1, Customer_1, Dialogs_1, SunatCustomerService_1, CustomerGroupsRequest_1, DocumentTypeRule;
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
            },
            function (CustomerGroupsRequest_1_1) {
                CustomerGroupsRequest_1 = CustomerGroupsRequest_1_1;
            }
        ],
        execute: function () {
            DocumentTypeRule = (function () {
                function DocumentTypeRule() {
                }
                DocumentTypeRule.evaluateCart = function (context, cartFromTrigger, esPagoACuentaDeCliente) {
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
                        if (cached) {
                            return DocumentTypeRule._evaluateDocument(document, cached, accountNumber, context, esPagoACuentaDeCliente);
                        }
                        return context.runtime
                            .executeAsync(new Customer_1.GetCustomerClientRequest(accountNumber, correlationId))
                            .then(function (customerResponse) {
                            var customer = customerResponse && customerResponse.data && customerResponse.data.result;
                            var service = new SunatCustomerService_1.default();
                            var datos = {
                                documento: customer ? service.getDocumentNumber(customer) : "",
                                grupo: (customer && customer.CustomerGroup) || ""
                            };
                            DocumentTypeRule._documentCache[accountNumber] = datos;
                            return DocumentTypeRule._evaluateDocument(document, datos, accountNumber, context, esPagoACuentaDeCliente);
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
                DocumentTypeRule._evaluateDocument = function (document, datos, accountNumber, context, esPagoACuentaDeCliente) {
                    var service = new SunatCustomerService_1.default();
                    var documentNumber = datos.documento;
                    var documentType = service.getDocumentType(documentNumber);
                    var hasRuc = documentType === "RUC";
                    context.logger.logInformational("DocumentTypeRule: comprobante=" + document
                        + " | cuenta=" + accountNumber
                        + " | documento=" + (documentNumber || "(sin documento)")
                        + " | tipo=" + (documentType || "(ninguno)")
                        + " | grupo=" + (datos.grupo || "(sin grupo)")
                        + " | a cuenta de cliente=" + esPagoACuentaDeCliente);
                    if (document === DocumentTypeRule.BOLETA && hasRuc) {
                        var bloqueo_1 = "El cliente " + accountNumber + " tiene RUC " + documentNumber + "."
                            + "\n\nA un cliente con RUC se le emite FACTURA, no boleta."
                            + "\n\nCambie el comprobante a Factura, o asigne a la venta un cliente sin RUC.";
                        if (!esPagoACuentaDeCliente) {
                            return Promise.resolve(bloqueo_1);
                        }
                        return DocumentTypeRule._esEmpleadoPorHonorarios(context, datos.grupo)
                            .then(function (esEmpleado) {
                            if (!esEmpleado) {
                                return bloqueo_1;
                            }
                            context.logger.logInformational("DocumentTypeRule: " + accountNumber + " es empleado por Recibo por Honorarios"
                                + " (grupo " + datos.grupo + ") y se cobra a su cuenta: la boleta con RUC se admite.");
                            return "";
                        });
                    }
                    if (document === DocumentTypeRule.FACTURA && !hasRuc) {
                        return Promise.resolve("El cliente " + accountNumber
                            + (documentNumber ? " tiene el documento " + documentNumber + ", que no es un RUC." : " no tiene RUC registrado.")
                            + "\n\nLa FACTURA exige un cliente con RUC."
                            + "\n\nCambie el comprobante a Boleta, o asigne a la venta un cliente con RUC.");
                    }
                    return Promise.resolve("");
                };
                DocumentTypeRule._esEmpleadoPorHonorarios = function (context, grupo) {
                    if (!grupo) {
                        return Promise.resolve(false);
                    }
                    return DocumentTypeRule._cargarGruposDeHonorarios(context)
                        .then(function (grupos) { return grupos.indexOf(grupo.toString()) >= 0; });
                };
                DocumentTypeRule._cargarGruposDeHonorarios = function (context) {
                    if (DocumentTypeRule._gruposDeHonorarios) {
                        return Promise.resolve(DocumentTypeRule._gruposDeHonorarios);
                    }
                    return context.runtime
                        .executeAsync(new CustomerGroupsRequest_1.GetCustomerGroupsRequest())
                        .then(function (response) {
                        var grupos = (response && response.data && response.data.result) || [];
                        var encontrados = [];
                        for (var i = 0; i < grupos.length; i++) {
                            var nombre = DocumentTypeRule._sinAcentos(grupos[i].CustomerGroupName || "");
                            if (nombre.indexOf("HONORARIO") >= 0) {
                                encontrados.push((grupos[i].CustomerGroupNumber || "").toString());
                            }
                        }
                        DocumentTypeRule._gruposDeHonorarios = encontrados;
                        context.logger.logInformational("DocumentTypeRule: grupos de Recibo por Honorarios del canal: "
                            + (encontrados.join(", ") || "(ninguno)"));
                        return encontrados;
                    })
                        .catch(function (reason) {
                        context.logger.logError("DocumentTypeRule: no se pudieron leer los grupos de cliente; la excepcion de"
                            + " empleados no se aplica esta vez: " + String(reason));
                        return [];
                    });
                };
                DocumentTypeRule._sinAcentos = function (texto) {
                    var con = "ÁÀÄÂÉÈËÊÍÌÏÎÓÒÖÔÚÙÜÛÑáàäâéèëêíìïîóòöôúùüûñ";
                    var sin = "AAAAEEEEIIIIOOOOUUUUNAAAAEEEEIIIIOOOOUUUUN";
                    var salida = "";
                    for (var i = 0; i < texto.length; i++) {
                        var pos = con.indexOf(texto.charAt(i));
                        salida += pos >= 0 ? sin.charAt(pos) : texto.charAt(i);
                    }
                    return salida.toUpperCase();
                };
                DocumentTypeRule.recordarMedioDeCuentaDeCliente = function (tenderTypeId) {
                    if (tenderTypeId) {
                        DocumentTypeRule._medioDeCuentaDeCliente = tenderTypeId.toString();
                    }
                };
                DocumentTypeRule.carritoPagaACuentaDeCliente = function (cart) {
                    var lineas = (cart && cart.TenderLines) || [];
                    for (var i = 0; i < lineas.length; i++) {
                        var linea = lineas[i];
                        if (!linea || linea.IsVoided) {
                            continue;
                        }
                        if (DocumentTypeRule._medioDeCuentaDeCliente
                            && (linea.TenderTypeId || "").toString() === DocumentTypeRule._medioDeCuentaDeCliente) {
                            return true;
                        }
                        if (linea.CustomerId) {
                            return true;
                        }
                    }
                    return false;
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
                DocumentTypeRule._gruposDeHonorarios = null;
                DocumentTypeRule._medioDeCuentaDeCliente = "";
                return DocumentTypeRule;
            }());
            exports_1("DocumentTypeRule", DocumentTypeRule);
            exports_1("default", DocumentTypeRule);
        }
    };
});
