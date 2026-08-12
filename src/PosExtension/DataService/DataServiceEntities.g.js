System.register(["PosApi/Entities"], function (exports_1, context_1) {
    "use strict";
    var Entities_1, Entities;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (Entities_1_1) {
                Entities_1 = Entities_1_1;
            }
        ],
        execute: function () {
            exports_1("ProxyEntities", Entities_1.ProxyEntities);
            (function (Entities) {
                var ElectronicDocumentResult = (function () {
                    function ElectronicDocumentResult(odataObject) {
                        odataObject = odataObject || {};
                        this.Id = (odataObject.Id != null) ? parseInt(odataObject.Id, 10) : undefined;
                        this.TransactionId = odataObject.TransactionId;
                        this.TipoDocumento = odataObject.TipoDocumento;
                        this.NumeroDocumento = odataObject.NumeroDocumento;
                        this.FileContents = odataObject.FileContents;
                        this.FileName = odataObject.FileName;
                        this.Success = odataObject.Success;
                        this.ErrorMessage = odataObject.ErrorMessage;
                        this.TxtContent = odataObject.TxtContent;
                        this.ReceiptId = odataObject.ReceiptId;
                        this.Diagnostics = odataObject.Diagnostics;
                        this.ExtensionProperties = undefined;
                        if (odataObject.ExtensionProperties) {
                            this.ExtensionProperties = [];
                            for (var i = 0; i < odataObject.ExtensionProperties.length; i++) {
                                if (odataObject.ExtensionProperties[i] != null) {
                                    if (odataObject.ExtensionProperties[i]['@odata.type'] != null) {
                                        var className = odataObject.ExtensionProperties[i]['@odata.type'];
                                        className = className.substr(className.lastIndexOf('.') + 1).concat("Class");
                                        this.ExtensionProperties[i] = new Entities_1.ProxyEntities[className](odataObject.ExtensionProperties[i]);
                                    }
                                    else {
                                        this.ExtensionProperties[i] = new Entities_1.ProxyEntities.CommercePropertyClass(odataObject.ExtensionProperties[i]);
                                    }
                                }
                                else {
                                    this.ExtensionProperties[i] = undefined;
                                }
                            }
                        }
                    }
                    return ElectronicDocumentResult;
                }());
                Entities.ElectronicDocumentResult = ElectronicDocumentResult;
                var UbigeoResolutionResult = (function () {
                    function UbigeoResolutionResult(odataObject) {
                        odataObject = odataObject || {};
                        this.Id = (odataObject.Id != null) ? parseInt(odataObject.Id, 10) : undefined;
                        this.IsValid = odataObject.IsValid;
                        this.StateId = odataObject.StateId;
                        this.CountyId = odataObject.CountyId;
                        this.CityName = odataObject.CityName;
                        this.Notes = odataObject.Notes;
                        this.ExtensionProperties = undefined;
                        if (odataObject.ExtensionProperties) {
                            this.ExtensionProperties = [];
                            for (var i = 0; i < odataObject.ExtensionProperties.length; i++) {
                                if (odataObject.ExtensionProperties[i] != null) {
                                    if (odataObject.ExtensionProperties[i]['@odata.type'] != null) {
                                        var className = odataObject.ExtensionProperties[i]['@odata.type'];
                                        className = className.substr(className.lastIndexOf('.') + 1).concat("Class");
                                        this.ExtensionProperties[i] = new Entities_1.ProxyEntities[className](odataObject.ExtensionProperties[i]);
                                    }
                                    else {
                                        this.ExtensionProperties[i] = new Entities_1.ProxyEntities.CommercePropertyClass(odataObject.ExtensionProperties[i]);
                                    }
                                }
                                else {
                                    this.ExtensionProperties[i] = undefined;
                                }
                            }
                        }
                    }
                    return UbigeoResolutionResult;
                }());
                Entities.UbigeoResolutionResult = UbigeoResolutionResult;
                var SalesTransactionItem = (function () {
                    function SalesTransactionItem(odataObject) {
                        odataObject = odataObject || {};
                        this.Id = (odataObject.Id != null) ? parseInt(odataObject.Id, 10) : undefined;
                        this.TransactionId = odataObject.TransactionId;
                        this.TransDate = odataObject.TransDate;
                        this.CreatedDateTime = odataObject.CreatedDateTime;
                        this.CustAccount = odataObject.CustAccount;
                        this.Currency = odataObject.Currency;
                        this.GrossAmount = (odataObject.GrossAmount != null) ? parseFloat(odataObject.GrossAmount) : undefined;
                        this.NetAmount = (odataObject.NetAmount != null) ? parseFloat(odataObject.NetAmount) : undefined;
                        this.NetPrice = (odataObject.NetPrice != null) ? parseFloat(odataObject.NetPrice) : undefined;
                        this.TotalDiscAmount = (odataObject.TotalDiscAmount != null) ? parseFloat(odataObject.TotalDiscAmount) : undefined;
                        this.TotalManualDiscPct = (odataObject.TotalManualDiscPct != null) ? parseFloat(odataObject.TotalManualDiscPct) : undefined;
                        this.TotalManualDiscAmt = (odataObject.TotalManualDiscAmt != null) ? parseFloat(odataObject.TotalManualDiscAmt) : undefined;
                        this.SalesPaymentDifference = (odataObject.SalesPaymentDifference != null) ? parseFloat(odataObject.SalesPaymentDifference) : undefined;
                        this.DiscAmountWithoutTax = (odataObject.DiscAmountWithoutTax != null) ? parseFloat(odataObject.DiscAmountWithoutTax) : undefined;
                        this.Store = odataObject.Store;
                        this.Terminal = odataObject.Terminal;
                        this.Channel = (odataObject.Channel != null) ? parseInt(odataObject.Channel, 10) : undefined;
                        this.DataAreaId = odataObject.DataAreaId;
                        this.ReceiptId = odataObject.ReceiptId;
                        this.CodTypeDocPay = odataObject.CodTypeDocPay;
                        this.CodTipoOpeFE = odataObject.CodTipoOpeFE;
                        this.TipoDocumentoDesc = odataObject.TipoDocumentoDesc;
                        this.TotalVtaExonerada = (odataObject.TotalVtaExonerada != null) ? parseFloat(odataObject.TotalVtaExonerada) : undefined;
                        this.TotalVtaInafecta = (odataObject.TotalVtaInafecta != null) ? parseFloat(odataObject.TotalVtaInafecta) : undefined;
                        this.TotalImpuestoGravada = (odataObject.TotalImpuestoGravada != null) ? parseFloat(odataObject.TotalImpuestoGravada) : undefined;
                        this.TotalLineasIGV = (odataObject.TotalLineasIGV != null) ? parseFloat(odataObject.TotalLineasIGV) : undefined;
                        this.MontoPercepcion = (odataObject.MontoPercepcion != null) ? parseFloat(odataObject.MontoPercepcion) : undefined;
                        this.MontoBaseOtrosImp = (odataObject.MontoBaseOtrosImp != null) ? parseFloat(odataObject.MontoBaseOtrosImp) : undefined;
                        this.CantidadLineas = odataObject.CantidadLineas;
                        this.CantidadPagos = odataObject.CantidadPagos;
                        this.NombreTienda = odataObject.NombreTienda;
                        this.DireccionEmisor = odataObject.DireccionEmisor;
                        this.CodigoEstablecimiento = odataObject.CodigoEstablecimiento;
                        this.ReturnTransactionId = odataObject.ReturnTransactionId;
                        this.MontoVuelto = (odataObject.MontoVuelto != null) ? parseFloat(odataObject.MontoVuelto) : undefined;
                        this.EnrichDiag = odataObject.EnrichDiag;
                        this.LineasDetalle = odataObject.LineasDetalle;
                        this.MediosPago = odataObject.MediosPago;
                        this.ExtensionProperties = undefined;
                        if (odataObject.ExtensionProperties) {
                            this.ExtensionProperties = [];
                            for (var i = 0; i < odataObject.ExtensionProperties.length; i++) {
                                if (odataObject.ExtensionProperties[i] != null) {
                                    if (odataObject.ExtensionProperties[i]['@odata.type'] != null) {
                                        var className = odataObject.ExtensionProperties[i]['@odata.type'];
                                        className = className.substr(className.lastIndexOf('.') + 1).concat("Class");
                                        this.ExtensionProperties[i] = new Entities_1.ProxyEntities[className](odataObject.ExtensionProperties[i]);
                                    }
                                    else {
                                        this.ExtensionProperties[i] = new Entities_1.ProxyEntities.CommercePropertyClass(odataObject.ExtensionProperties[i]);
                                    }
                                }
                                else {
                                    this.ExtensionProperties[i] = undefined;
                                }
                            }
                        }
                    }
                    return SalesTransactionItem;
                }());
                Entities.SalesTransactionItem = SalesTransactionItem;
            })(Entities || (exports_1("Entities", Entities = {})));
        }
    };
});
