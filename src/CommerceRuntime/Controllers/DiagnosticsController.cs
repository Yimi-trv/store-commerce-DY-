using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Dynamics.Commerce.Runtime.DataModel;
using Microsoft.Dynamics.Commerce.Runtime.Hosting.Contracts;
using Trujillo.PeruEInvoicing.CommerceRuntime.Entities;
using Trujillo.PeruEInvoicing.CommerceRuntime.Messages;

namespace Trujillo.PeruEInvoicing.CommerceRuntime.Controllers
{
    // NOTE: Diagnostic endpoint intentionally kept ENABLED in production for targeted
    // support cases (inspecting channel DB views/tables when an issue only reproduces
    // in a specific environment). Access is gated by [Authorization] below — a valid
    // Employee/Device/Application token is required; it is NOT anonymously reachable.
    // Guardrail: do NOT add modes that dump customer/PII or transactional data without
    // revisiting this access policy first.
    [RoutePrefix("TRU_Diagnostics")]
    [BindEntity(typeof(ElectronicDocumentResult))]
    public class DiagnosticsController : IController
    {
        [HttpGet]
        [Authorization(new string[] { "Employee", "Device", "Application" })]
        public async Task<IEnumerable<ElectronicDocumentResult>> Run(
            IEndpointContext context,
            string mode,
            string receiptId,
            QueryResultSettings queryResultSettings)
        {
            var request = new RunDiagnosticRequest(mode, receiptId);
            var response = await context.ExecuteAsync<RunDiagnosticResponse>(request)
                .ConfigureAwait(false);
            return new List<ElectronicDocumentResult> { response.Result };
        }
    }
}
