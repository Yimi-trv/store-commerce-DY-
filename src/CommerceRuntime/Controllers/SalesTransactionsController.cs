using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Dynamics.Commerce.Runtime.DataModel;
using Microsoft.Dynamics.Commerce.Runtime.Hosting.Contracts;
using Trujillo.PeruEInvoicing.CommerceRuntime.Entities;
using Trujillo.PeruEInvoicing.CommerceRuntime.Messages;

namespace Trujillo.PeruEInvoicing.CommerceRuntime.Controllers
{
    [RoutePrefix("TRU_SalesTransactions")]
    [BindEntity(typeof(SalesTransactionItem))]
    public class SalesTransactionsController : IController
    {
        [HttpGet]
        [Authorization(new string[] { "Employee", "Device", "Application" })]
        public async Task<IEnumerable<SalesTransactionItem>> Query(
            IEndpointContext context,
            string fromDate,
            string toDate,
            string storeId,
            string terminalId,
            string receiptId,
            string top,
            string detail,
            string skip,
            QueryResultSettings queryResultSettings)
        {
            int topN = 100;
            if (!string.IsNullOrEmpty(top) && int.TryParse(top, out int parsed) && parsed > 0)
                topN = parsed;
            int skipN = 0;
            if (!string.IsNullOrEmpty(skip) && int.TryParse(skip, out int parsedSkip) && parsedSkip > 0)
                skipN = parsedSkip;
            bool detailFlag = detail == "1" || detail == "true" || detail == "True";
            var request = new QuerySalesTransactionsRequest(fromDate, toDate, storeId, terminalId, receiptId, topN, detailFlag, skipN);
            var response = await context.ExecuteAsync<QuerySalesTransactionsResponse>(request)
                .ConfigureAwait(false);
            return response.Transactions;
        }
    }
}
