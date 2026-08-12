using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Dynamics.Commerce.Runtime.DataModel;
using Microsoft.Dynamics.Commerce.Runtime.Hosting.Contracts;
using Trujillo.PeruEInvoicing.CommerceRuntime.Entities;
using Trujillo.PeruEInvoicing.CommerceRuntime.Messages;

namespace Trujillo.PeruEInvoicing.CommerceRuntime.Controllers
{
    /// <summary>
    /// Resolución de ubigeo SUNAT contra los maestros geográficos del channel DB.
    /// Consumido por el POS (SunatLookupCommand) para armar la dirección automática del
    /// cliente con los códigos que D365 valida (State/County por código, City por nombre).
    /// Solo lee maestros geográficos — sin PII.
    /// </summary>
    [RoutePrefix("TRU_GeographicData")]
    [BindEntity(typeof(UbigeoResolutionResult))]
    public class GeographicDataController : IController
    {
        [HttpGet]
        [Authorization(new string[] { "Employee", "Device", "Application" })]
        public async Task<IEnumerable<UbigeoResolutionResult>> ResolveUbigeo(
            IEndpointContext context,
            string departamento,
            string provincia,
            string distrito,
            QueryResultSettings queryResultSettings)
        {
            var request = new ResolveUbigeoRequest(departamento, provincia, distrito);
            var response = await context.ExecuteAsync<ResolveUbigeoResponse>(request)
                .ConfigureAwait(false);
            return new List<UbigeoResolutionResult> { response.Result };
        }
    }
}
