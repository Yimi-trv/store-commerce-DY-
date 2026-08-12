using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Dynamics.Commerce.Runtime;
using Microsoft.Dynamics.Commerce.Runtime.DataModel;
using Microsoft.Dynamics.Commerce.Runtime.Framework;
using Microsoft.Dynamics.Commerce.Runtime.Messages;
using Trujillo.PeruEInvoicing.CommerceRuntime.Entities;
using Trujillo.PeruEInvoicing.CommerceRuntime.Messages;

namespace Trujillo.PeruEInvoicing.CommerceRuntime.Services
{
    public class ElectronicDocumentService : IRequestHandlerAsync
    {
        public IEnumerable<Type> SupportedRequestTypes => new[]
        {
            typeof(GetElectronicDocumentByReceiptRequest)
        };

        public async Task<Response> Execute(Request request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            if (request is GetElectronicDocumentByReceiptRequest txtRequest)
                return await TryGenerateWithDpEngineAsync(txtRequest).ConfigureAwait(false);

            throw new NotSupportedException(
                string.Format(CultureInfo.InvariantCulture,
                    "Request '{0}' is not supported.", request.GetType()));
        }

        /// <summary>
        /// Dispatches DP's native UpdateDocumentElectronicDataRequest through the CRT
        /// request bus using reflection (no compile-time reference to the DP assembly).
        /// Looks up the transaction via our own Query, builds the DP DataPrintGeneral entity
        /// (IdTransaction=TxnId, FilePath=Terminal, FilePathBackup=Store, FileContents=Channel),
        /// wraps it in DP's request, executes it, and returns DataPrintGeneral.FileContents
        /// (the TXT produced by DP's own engine). Captures every step into Diagnostics.
        /// </summary>
        private async Task<Response> TryGenerateWithDpEngineAsync(GetElectronicDocumentByReceiptRequest request)
        {
            var result = new ElectronicDocumentResult { Id = 1, NumeroDocumento = request.ReceiptId };
            var diag = new StringBuilder();
            try
            {
                // 1. Resolve transaction header (Terminal/Store/Channel) with our own Query.
                string storeFilter = string.IsNullOrWhiteSpace(request.StoreId) ? null : request.StoreId;
                var txnReq = new QuerySalesTransactionsRequest(null, null, storeFilter, null, request.ReceiptId);
                var txnResp = await request.RequestContext.ExecuteAsync<QuerySalesTransactionsResponse>(txnReq).ConfigureAwait(false);
                SalesTransactionItem txn = null;
                foreach (var t in txnResp.Transactions) { txn = t; break; }
                if (txn == null)
                {
                    result.Success = false;
                    result.ErrorMessage = storeFilter != null
                        ? "Transaction not found: " + request.ReceiptId + " (store: " + storeFilter + ")"
                        : "Transaction not found: " + request.ReceiptId;
                    return new GetElectronicDocumentByReceiptResponse(result);
                }
                diag.Append("Txn=" + txn.TransactionId + " Store=" + txn.Store + " Term=" + txn.Terminal + " Chan=" + txn.Channel + "\n");

                // 2. Locate DP types in the loaded assemblies (no compile-time dependency).
                Type dpgType = null, reqType = null;
                foreach (var asm in AppDomain.CurrentDomain.GetAssemblies())
                {
                    if (dpgType == null) dpgType = asm.GetType("DP.CommerceRuntime.DataModel.DataPrintGeneral");
                    if (reqType == null) reqType = asm.GetType("DP.CommerceRuntime.Messages.UpdateDocumentElectronicDataRequest");
                    if (dpgType != null && reqType != null) break;
                }
                if (dpgType == null || reqType == null)
                {
                    result.Success = false;
                    result.ErrorMessage = "DP types not found (DataPrintGeneral=" + (dpgType != null) + ", Request=" + (reqType != null) + "). DP assembly not loaded in this package.";
                    result.Diagnostics = diag.ToString();
                    return new GetElectronicDocumentByReceiptResponse(result);
                }
                diag.Append("DP types resolved OK\n");

                // 3. Build DP's DataPrintGeneral with the POS field mapping.
                object dpg = Activator.CreateInstance(dpgType);
                dpgType.GetProperty("IdTransaction").SetValue(dpg, txn.TransactionId);
                dpgType.GetProperty("FilePath").SetValue(dpg, txn.Terminal);
                dpgType.GetProperty("FilePathBackup").SetValue(dpg, txn.Store);
                dpgType.GetProperty("FileContents").SetValue(dpg, txn.Channel.ToString(CultureInfo.InvariantCulture));
                dpgType.GetProperty("Id").SetValue(dpg, 1L);

                // 4. Wrap in DP's request and dispatch through the CRT bus.
                object dpReq = Activator.CreateInstance(reqType, dpg);
                var resp = await request.RequestContext.ExecuteAsync<Response>((Request)dpReq).ConfigureAwait(false);
                diag.Append("DP request executed, resp=" + (resp != null ? resp.GetType().Name : "null") + "\n");

                // 5. Extract DataPrintGeneral.FileContents from the response.
                object respDpg = resp?.GetType().GetProperty("DataPrintGeneral")?.GetValue(resp);
                string txt = respDpg != null ? (string)dpgType.GetProperty("FileContents").GetValue(respDpg) : null;

                result.Success = !string.IsNullOrEmpty(txt);
                result.TxtContent = txt;
                result.FileName = request.ReceiptId.Replace("-", "") + ".txt";
                result.TipoDocumento = txn.CodTypeDocPay;
                result.Diagnostics = diag.ToString();
                if (!result.Success) result.ErrorMessage = "DP engine returned empty FileContents";
                return new GetElectronicDocumentByReceiptResponse(result);
            }
            catch (Exception ex)
            {
                result.Success = false;
                result.ErrorMessage = "DP engine error: " + ex.GetType().Name + ": " + ex.Message;
                result.Diagnostics = diag.ToString();
                return new GetElectronicDocumentByReceiptResponse(result);
            }
        }
    }
}
