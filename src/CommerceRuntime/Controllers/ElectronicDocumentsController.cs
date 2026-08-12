using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Dynamics.Commerce.Runtime.DataModel;
using Microsoft.Dynamics.Commerce.Runtime.Hosting.Contracts;
using Trujillo.PeruEInvoicing.CommerceRuntime.Entities;
using Trujillo.PeruEInvoicing.CommerceRuntime.Messages;

namespace Trujillo.PeruEInvoicing.CommerceRuntime.Controllers
{
    [RoutePrefix("TRU_ElectronicDocuments")]
    [BindEntity(typeof(ElectronicDocumentResult))]
    public class ElectronicDocumentsController : IController
    {
        [HttpGet]
        [Authorization(new string[] { "Employee", "Device", "Application" })]
        public async Task<IEnumerable<ElectronicDocumentResult>> GetByReceiptId(
            IEndpointContext context,
            string receiptId,
            string storeId,
            QueryResultSettings queryResultSettings)
        {
            var request = new GetElectronicDocumentByReceiptRequest(receiptId, storeId);
            var response = await context.ExecuteAsync<GetElectronicDocumentByReceiptResponse>(request)
                .ConfigureAwait(false);
            return new List<ElectronicDocumentResult> { response.Result };
        }
    }
}
