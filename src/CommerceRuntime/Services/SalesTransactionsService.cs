using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Globalization;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Dynamics.Commerce.Runtime;
using Microsoft.Dynamics.Commerce.Runtime.Data;
using Microsoft.Dynamics.Commerce.Runtime.Data.Types;
using Microsoft.Dynamics.Commerce.Runtime.DataModel;
using Microsoft.Dynamics.Commerce.Runtime.Framework;
using Microsoft.Dynamics.Commerce.Runtime.Messages;
using Trujillo.PeruEInvoicing.CommerceRuntime.Entities;
using Trujillo.PeruEInvoicing.CommerceRuntime.Messages;

namespace Trujillo.PeruEInvoicing.CommerceRuntime.Services
{
    public class SalesTransactionsService : IRequestHandlerAsync
    {
        public IEnumerable<Type> SupportedRequestTypes => new[]
        {
            typeof(QuerySalesTransactionsRequest)
        };

        public async Task<Response> Execute(Request request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            if (request is QuerySalesTransactionsRequest listRequest)
                return await GetTransactionsAsync(listRequest).ConfigureAwait(false);

            throw new NotSupportedException(
                string.Format(CultureInfo.InvariantCulture,
                    "Request '{0}' is not supported.", request.GetType()));
        }

        private async Task<Response> GetTransactionsAsync(QuerySalesTransactionsRequest request)
        {
            ThrowIf.Null(request, nameof(request));

            string dataAreaId = RequestContextExtensions.GetChannelConfiguration(request.RequestContext)
                .InventLocationDataAreaId;

            var transactions = await GetTransactionHeaders(request, dataAreaId).ConfigureAwait(false);

            // Enriquecimiento pesado (N+1: ~13 queries por transaccion) SOLO bajo demanda.
            // En modo listado (detail=false) se devuelven solo las cabeceras => 1 query total.
            if (request.Detail)
            {
                foreach (var txn in transactions)
                {
                    var diag = new List<string>();
                    diag.Add(await SafeEnrich("Tax", () => EnrichWithTaxData(request.RequestContext, txn, dataAreaId)));
                    diag.Add(await SafeEnrich("Lines", () => EnrichWithLines(request.RequestContext, txn, dataAreaId)));
                    diag.Add(await SafeEnrich("Pay", () => EnrichWithPayments(request.RequestContext, txn, dataAreaId)));
                    diag.Add(await SafeEnrich("Store", () => EnrichWithStoreData(request.RequestContext, txn, dataAreaId)));
                    diag.Add(await SafeEnrich("Ret", () => EnrichWithReturnData(request.RequestContext, txn, dataAreaId)));
                    diag.Add(await SafeEnrich("Vuelto", () => EnrichWithVuelto(request.RequestContext, txn, dataAreaId)));
                    diag.Add(await SafeEnrich("Percep", () => EnrichWithPercepcion(request.RequestContext, txn, dataAreaId)));
                    txn.EnrichDiag = string.Join(" | ", diag);
                }
            }

            return new QuerySalesTransactionsResponse(transactions);
        }

        private static async Task<string> SafeEnrich(string name, Func<Task> action)
        {
            try
            {
                await action().ConfigureAwait(false);
                return name + ":OK";
            }
            catch (Exception ex)
            {
                return name + ":ERR=" + ex.Message.Substring(0, Math.Min(80, ex.Message.Length));
            }
        }

        private async Task<Collection<SalesTransactionItem>> GetTransactionHeaders(
            QuerySalesTransactionsRequest request, string dataAreaId)
        {
            var transactions = new Collection<SalesTransactionItem>();

            var whereParts = new List<string> { "t.DATAAREAID = @DATAAREAID" };
            if (!string.IsNullOrEmpty(request.FromDate))
                whereParts.Add("t.TRANSDATE >= @FROMDATE");
            if (!string.IsNullOrEmpty(request.ToDate))
                whereParts.Add("t.TRANSDATE <= @TODATE");
            if (!string.IsNullOrEmpty(request.StoreId))
                whereParts.Add("t.STORE = @STORE");
            if (!string.IsNullOrEmpty(request.TerminalId))
                whereParts.Add("t.TERMINAL = @TERMINAL");
            if (!string.IsNullOrEmpty(request.ReceiptId))
                whereParts.Add("e.RECEIPTID = @RECEIPTID");

            var query = new SqlPagedQuery(QueryResultSettings.AllRecords)
            {
                DatabaseSchema = "ax",
                Select = new ColumnSet(new[]
                {
                    "t.TRANSACTIONID", "t.CUSTACCOUNT", "t.TRANSDATE", "t.CREATEDDATETIME",
                    "t.CURRENCY", "t.GROSSAMOUNT", "t.NETAMOUNT", "t.NETPRICE",
                    "t.TOTALDISCAMOUNT", "t.TOTALMANUALDISCOUNTPERCENTAGE",
                    "t.TOTALMANUALDISCOUNTAMOUNT", "t.SALESPAYMENTDIFFERENCE",
                    "t.DISCAMOUNTWITHOUTTAX", "t.STORE", "t.TERMINAL", "t.CHANNEL",
                    "t.DATAAREAID",
                    "e.RECEIPTID", "e.DPCODTYPEDOCPAY_PE", "e.DPCodTipoOpeFE_PE"
                }),
                From = "RETAILTRANSACTIONTABLE t LEFT JOIN ext.DPRETAILTRANSACTIONTABLE_PE e " +
                       "ON t.TRANSACTIONID = e.TRANSACTIONID AND t.STORE = e.STORE " +
                       "AND t.TERMINAL = e.TERMINAL AND t.CHANNEL = e.CHANNEL " +
                       "AND t.DATAAREAID = e.DATAAREAID",
                Where = string.Join(" AND ", whereParts),
                OrderBy = "t.CREATEDDATETIME DESC"
            };
            query.Paging.Top = request.Top;
            query.Paging.Skip = request.Skip;

            query.Parameters["@DATAAREAID"] = dataAreaId;
            if (!string.IsNullOrEmpty(request.FromDate))
                query.Parameters["@FROMDATE"] = request.FromDate;
            if (!string.IsNullOrEmpty(request.ToDate))
                query.Parameters["@TODATE"] = request.ToDate;
            if (!string.IsNullOrEmpty(request.StoreId))
                query.Parameters["@STORE"] = request.StoreId;
            if (!string.IsNullOrEmpty(request.TerminalId))
                query.Parameters["@TERMINAL"] = request.TerminalId;
            if (!string.IsNullOrEmpty(request.ReceiptId))
                query.Parameters["@RECEIPTID"] = request.ReceiptId;

            using (var db = new DatabaseContext(request.RequestContext))
            {
                var results = await db.ReadEntityAsync<ExtensionsEntity>(query).ConfigureAwait(false);
                long counter = 1;

                foreach (ExtensionsEntity row in results)
                {
                    string codType = GetStr(row, "DPCODTYPEDOCPAY_PE");
                    string tipoDesc;
                    switch (codType)
                    {
                        case "01": tipoDesc = "Factura"; break;
                        case "03": tipoDesc = "Boleta"; break;
                        case "07": tipoDesc = "Nota de Crédito"; break;
                        default: tipoDesc = string.IsNullOrEmpty(codType) ? "Sin documento" : codType; break;
                    }

                    transactions.Add(new SalesTransactionItem
                    {
                        Id = counter++,
                        TransactionId = GetStr(row, "TRANSACTIONID"),
                        TransDate = GetStr(row, "TRANSDATE"),
                        CreatedDateTime = GetStr(row, "CREATEDDATETIME"),
                        CustAccount = GetStr(row, "CUSTACCOUNT"),
                        Currency = GetStr(row, "CURRENCY"),
                        GrossAmount = GetDec(row, "GROSSAMOUNT"),
                        NetAmount = GetDec(row, "NETAMOUNT"),
                        NetPrice = GetDec(row, "NETPRICE"),
                        TotalDiscAmount = GetDec(row, "TOTALDISCAMOUNT"),
                        TotalManualDiscPct = GetDec(row, "TOTALMANUALDISCOUNTPERCENTAGE"),
                        TotalManualDiscAmt = GetDec(row, "TOTALMANUALDISCOUNTAMOUNT"),
                        SalesPaymentDifference = GetDec(row, "SALESPAYMENTDIFFERENCE"),
                        DiscAmountWithoutTax = GetDec(row, "DISCAMOUNTWITHOUTTAX"),
                        Store = GetStr(row, "STORE"),
                        Terminal = GetStr(row, "TERMINAL"),
                        Channel = GetLong(row, "CHANNEL"),
                        DataAreaId = GetStr(row, "DATAAREAID"),
                        ReceiptId = GetStr(row, "RECEIPTID"),
                        CodTypeDocPay = codType,
                        CodTipoOpeFE = GetStr(row, "DPCodTipoOpeFE_PE"),
                        TipoDocumentoDesc = tipoDesc
                    });
                }
            }

            return transactions;
        }

        private async Task EnrichWithTaxData(RequestContext ctx, SalesTransactionItem txn, string da)
        {
            txn.TotalVtaExonerada = await RunScalar(ctx, "ext", "NETPRICE",
                "DPTotalValorVtaEEIIGVCLASIFEXO_PEVIEW",
                "DATAAREAID = @DA AND TRANSACTIONID = @TID", da, txn.TransactionId).ConfigureAwait(false);

            txn.TotalVtaInafecta = await RunScalar(ctx, "ext", "NETPRICE",
                "DPTotalValorVtaEEIIGVCLASIFINA_PEVIEW",
                "DATAAREAID = @DA AND TRANSACTIONID = @TID", da, txn.TransactionId).ConfigureAwait(false);

            txn.TotalImpuestoGravada = await RunScalar(ctx, "ext", "TAXAMOUNT",
                "DPTotalValorVtaGravadas_PEVIEW",
                "DATAAREAID = @DA AND TRANSACTIONID = @TID", da, txn.TransactionId).ConfigureAwait(false);

            txn.TotalLineasIGV = await RunScalar(ctx, "ext", "TOTALPRICE",
                "DPTotalLineasIGV_PEVIEW",
                "DATAAREAID = @DA AND TRANSACTIONID = @TID", da, txn.TransactionId).ConfigureAwait(false);
        }

        private async Task EnrichWithLines(RequestContext ctx, SalesTransactionItem txn, string da)
        {
            var query = new SqlPagedQuery(QueryResultSettings.AllRecords)
            {
                DatabaseSchema = "ax",
                Select = new ColumnSet(new[]
                {
                    "LINENUM", "ITEMID", "QTY", "PRICE",
                    "NETAMOUNT", "NETAMOUNTINCLTAX", "TAXAMOUNT",
                    "TOTALDISCAMOUNT", "UNIT", "STORE", "TERMINALID"
                }),
                From = "RETAILTRANSACTIONSALESTRANS",
                Where = "DATAAREAID = @DA AND TRANSACTIONID = @TID"
            };
            query.Parameters["@DA"] = da;
            query.Parameters["@TID"] = txn.TransactionId;

            var sb = new StringBuilder("[");
            int count = 0;

            using (var db = new DatabaseContext(ctx))
            {
                var results = await db.ReadEntityAsync<ExtensionsEntity>(query).ConfigureAwait(false);
                foreach (ExtensionsEntity row in results)
                {
                    if (count > 0) sb.Append(",");
                    sb.Append("{");
                    sb.AppendFormat("\"lineNum\":{0}", GetDec(row, "LINENUM").ToString(CultureInfo.InvariantCulture));
                    sb.AppendFormat(",\"itemId\":\"{0}\"", Esc(GetStr(row, "ITEMID")));
                    sb.AppendFormat(",\"qty\":{0}", GetDec(row, "QTY").ToString(CultureInfo.InvariantCulture));
                    sb.AppendFormat(",\"price\":{0}", GetDec(row, "PRICE").ToString(CultureInfo.InvariantCulture));
                    sb.AppendFormat(",\"netAmount\":{0}", GetDec(row, "NETAMOUNT").ToString(CultureInfo.InvariantCulture));
                    sb.AppendFormat(",\"netAmountInclTax\":{0}", GetDec(row, "NETAMOUNTINCLTAX").ToString(CultureInfo.InvariantCulture));
                    sb.AppendFormat(",\"taxAmount\":{0}", GetDec(row, "TAXAMOUNT").ToString(CultureInfo.InvariantCulture));
                    sb.AppendFormat(",\"totalDiscAmount\":{0}", GetDec(row, "TOTALDISCAMOUNT").ToString(CultureInfo.InvariantCulture));
                    sb.AppendFormat(",\"unit\":\"{0}\"", Esc(GetStr(row, "UNIT")));
                    sb.AppendFormat(",\"store\":\"{0}\"", Esc(GetStr(row, "STORE")));
                    sb.AppendFormat(",\"terminalId\":\"{0}\"", Esc(GetStr(row, "TERMINALID")));
                    sb.Append("}");
                    count++;
                }
            }
            sb.Append("]");

            txn.CantidadLineas = count;
            txn.LineasDetalle = sb.ToString();
        }

        private async Task EnrichWithPayments(RequestContext ctx, SalesTransactionItem txn, string da)
        {
            var sb = new StringBuilder("[");
            int count = 0;

            try
            {
                var query = new SqlPagedQuery(QueryResultSettings.AllRecords)
                {
                    DatabaseSchema = "ext",
                    Select = new ColumnSet(new[] { "TENDERTYPE", "NAME", "AMOUNTCUR", "POSOPERATION" }),
                    From = "DPPAYMENTTRANSTYPE_PEVIEW",
                    Where = "DATAAREAID = @DA AND TRANSACTIONID = @TID AND CHANNEL = @CH"
                };
                query.Parameters["@DA"] = da;
                query.Parameters["@TID"] = txn.TransactionId;
                query.Parameters["@CH"] = txn.Channel;

                using (var db = new DatabaseContext(ctx))
                {
                    var results = await db.ReadEntityAsync<ExtensionsEntity>(query).ConfigureAwait(false);
                    foreach (ExtensionsEntity row in results)
                    {
                        if (count > 0) sb.Append(",");
                        sb.Append("{");
                        sb.AppendFormat("\"tenderType\":\"{0}\"", Esc(GetStr(row, "TENDERTYPE")));
                        sb.AppendFormat(",\"name\":\"{0}\"", Esc(GetStr(row, "NAME")));
                        sb.AppendFormat(",\"amountCur\":{0}", GetDec(row, "AMOUNTCUR").ToString(CultureInfo.InvariantCulture));
                        sb.AppendFormat(",\"posOperation\":\"{0}\"", GetStr(row, "POSOPERATION"));
                        sb.Append("}");
                        count++;
                    }
                }
            }
            catch { }

            if (count == 0)
            {
                try
                {
                    var query2 = new SqlPagedQuery(QueryResultSettings.AllRecords)
                    {
                        DatabaseSchema = "ax",
                        Select = new ColumnSet(new[] { "TENDERTYPE", "AMOUNTCUR", "AMOUNTTENDERED" }),
                        From = "RETAILTRANSACTIONPAYMENTTRANS",
                        Where = "DATAAREAID = @DA AND TRANSACTIONID = @TID"
                    };
                    query2.Parameters["@DA"] = da;
                    query2.Parameters["@TID"] = txn.TransactionId;

                    using (var db = new DatabaseContext(ctx))
                    {
                        var results = await db.ReadEntityAsync<ExtensionsEntity>(query2).ConfigureAwait(false);
                        foreach (ExtensionsEntity row in results)
                        {
                            if (count > 0) sb.Append(",");
                            sb.Append("{");
                            sb.AppendFormat("\"tenderType\":\"{0}\"", Esc(GetStr(row, "TENDERTYPE")));
                            sb.AppendFormat(",\"name\":\"\"");
                            sb.AppendFormat(",\"amountCur\":{0}", GetDec(row, "AMOUNTCUR").ToString(CultureInfo.InvariantCulture));
                            sb.AppendFormat(",\"amountTendered\":{0}", GetDec(row, "AMOUNTTENDERED").ToString(CultureInfo.InvariantCulture));
                            sb.Append("}");
                            count++;
                        }
                    }
                }
                catch { }
            }

            sb.Append("]");
            txn.CantidadPagos = count;
            txn.MediosPago = sb.ToString();
        }

        private async Task EnrichWithStoreData(RequestContext ctx, SalesTransactionItem txn, string da)
        {
            try
            {
                using (var db = new DatabaseContext(ctx))
                {
                    var q = new SqlPagedQuery(QueryResultSettings.SingleRecord)
                    {
                        DatabaseSchema = "ext",
                        Select = new ColumnSet(new[] { "NAME" }),
                        From = "DPNombreTienda_PEVIEW",
                        Where = "STORENUMBER = @STORE"
                    };
                    q.Parameters["@STORE"] = txn.Store;
                    q.Paging.Top = 1;

                    var results = await db.ReadEntityAsync<ExtensionsEntity>(q).ConfigureAwait(false);
                    foreach (ExtensionsEntity r in results)
                    {
                        object v = ((ExtensibleObject)r).GetProperty("NAME");
                        if (v != null) txn.NombreTienda = v.ToString();
                        break;
                    }
                }
            }
            catch { }

            try
            {
                using (var db = new DatabaseContext(ctx))
                {
                    var q = new SqlPagedQuery(QueryResultSettings.SingleRecord)
                    {
                        DatabaseSchema = "ext",
                        Select = new ColumnSet(new[] { "DIRECCION" }),
                        From = "DPDireccionEmisor_PEVIEW",
                        Where = "DataArea = @DA"
                    };
                    q.Parameters["@DA"] = da;
                    q.Paging.Top = 1;

                    var results = await db.ReadEntityAsync<ExtensionsEntity>(q).ConfigureAwait(false);
                    foreach (ExtensionsEntity r in results)
                    {
                        object v = ((ExtensibleObject)r).GetProperty("DIRECCION");
                        if (v != null) txn.DireccionEmisor = v.ToString();
                        break;
                    }
                }
            }
            catch { }

            try
            {
                using (var db = new DatabaseContext(ctx))
                {
                    var q = new SqlPagedQuery(QueryResultSettings.SingleRecord)
                    {
                        DatabaseSchema = "ext",
                        Select = new ColumnSet(new[] { "DPCodeEstablishment_PE" }),
                        From = "DPCodeEstable_PEVIEW",
                        Where = "STORENUMBER = @STORE AND DATAAREAID = @DA"
                    };
                    q.Parameters["@STORE"] = txn.Store;
                    q.Parameters["@DA"] = da;
                    q.Paging.Top = 1;

                    var results = await db.ReadEntityAsync<ExtensionsEntity>(q).ConfigureAwait(false);
                    foreach (ExtensionsEntity r in results)
                    {
                        object v = ((ExtensibleObject)r).GetProperty("DPCodeEstablishment_PE");
                        if (v != null) txn.CodigoEstablecimiento = v.ToString();
                        break;
                    }
                }
            }
            catch { }
        }

        private async Task EnrichWithReturnData(RequestContext ctx, SalesTransactionItem txn, string da)
        {
            try
            {
                using (var db = new DatabaseContext(ctx))
                {
                    var q = new SqlPagedQuery(QueryResultSettings.SingleRecord)
                    {
                        DatabaseSchema = "ax",
                        Select = new ColumnSet(new[] { "RETURNTRANSACTIONID" }),
                        From = "RETAILTRANSACTIONSALESTRANS",
                        Where = "DATAAREAID = @DA AND TRANSACTIONID = @TID AND RETURNTRANSACTIONID <> ''"
                    };
                    q.Parameters["@DA"] = da;
                    q.Parameters["@TID"] = txn.TransactionId;
                    q.Paging.Top = 1;

                    var results = await db.ReadEntityAsync<ExtensionsEntity>(q).ConfigureAwait(false);
                    foreach (ExtensionsEntity r in results)
                    {
                        object v = ((ExtensibleObject)r).GetProperty("RETURNTRANSACTIONID");
                        if (v != null) txn.ReturnTransactionId = v.ToString();
                        break;
                    }
                }
            }
            catch { }
        }

        private async Task EnrichWithVuelto(RequestContext ctx, SalesTransactionItem txn, string da)
        {
            txn.MontoVuelto = await RunScalar(ctx, "ext", "AMOUNTCUR",
                "DPMontoVueltoTransac_PEVIEW",
                "DATAAREAID = @DA AND TRANSACTIONID = @TID", da, txn.TransactionId).ConfigureAwait(false);
        }

        private async Task EnrichWithPercepcion(RequestContext ctx, SalesTransactionItem txn, string da)
        {
            txn.MontoPercepcion = await RunScalar(ctx, "ext", "CALCULATEDAMOUNT",
                "DPAmountChargeCodePerception_PEVIEW",
                "DATAAREAID = @DA AND TRANSACTIONID = @TID", da, txn.TransactionId).ConfigureAwait(false);

            txn.MontoBaseOtrosImp = await RunScalar(ctx, "ext", "AmountBase",
                "DPMontoBaseOtrosImp_PEVIEW",
                "DATAAREAID = @DA AND TRANSACTIONID = @TID", da, txn.TransactionId).ConfigureAwait(false);
        }

        #region Helpers

        private static async Task<decimal> RunScalar(RequestContext ctx,
            string schema, string column, string from, string where,
            string dataAreaId, string transactionId)
        {
            try
            {
                using (var db = new DatabaseContext(ctx))
                {
                    var q = new SqlPagedQuery(QueryResultSettings.SingleRecord)
                    {
                        DatabaseSchema = schema,
                        Select = new ColumnSet(new[] { column }),
                        From = from,
                        Where = where
                    };
                    q.Parameters["@DA"] = dataAreaId;
                    q.Parameters["@TID"] = transactionId;
                    q.Paging.Top = 1;

                    var results = await db.ReadEntityAsync<ExtensionsEntity>(q).ConfigureAwait(false);
                    foreach (ExtensionsEntity row in results)
                    {
                        object v = ((ExtensibleObject)row).GetProperty(column);
                        if (v != null && decimal.TryParse(v.ToString(), out decimal d))
                            return Math.Abs(d);
                    }
                }
            }
            catch { }
            return 0;
        }

        private static string GetStr(ExtensionsEntity row, string prop)
        {
            object v = ((ExtensibleObject)row).GetProperty(prop);
            return v != null ? v.ToString() : "";
        }

        private static decimal GetDec(ExtensionsEntity row, string prop)
        {
            object v = ((ExtensibleObject)row).GetProperty(prop);
            if (v != null && decimal.TryParse(v.ToString(), out decimal d)) return d;
            return 0;
        }

        private static long GetLong(ExtensionsEntity row, string prop)
        {
            object v = ((ExtensibleObject)row).GetProperty(prop);
            if (v != null && long.TryParse(v.ToString(), out long l)) return l;
            return 0;
        }

        private static string Esc(string s)
        {
            if (string.IsNullOrEmpty(s)) return "";
            return s.Replace("\\", "\\\\").Replace("\"", "\\\"")
                    .Replace("\n", "\\n").Replace("\r", "\\r").Replace("\t", "\\t");
        }

        #endregion
    }
}
