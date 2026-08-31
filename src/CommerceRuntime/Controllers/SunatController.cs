using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Dynamics.Commerce.Runtime.DataModel;
using Microsoft.Dynamics.Commerce.Runtime.Hosting.Contracts;
using Trujillo.PeruEInvoicing.CommerceRuntime.Entities;
using Trujillo.PeruEInvoicing.CommerceRuntime.Messages;

namespace Trujillo.PeruEInvoicing.CommerceRuntime.Controllers
{
    /// <summary>
    /// Consulta de DNI y RUC contra los proveedores externos (Factiliza, con PeruDevs de
    /// respaldo). Consumido por el modal de cliente del POS.
    ///
    /// EXISTE PARA QUE LAS CLAVES NO VIAJEN A LA CAJA. Antes el POS llamaba a la API con la
    /// clave escrita en su propio TypeScript, legible con F12 en cualquier terminal.
    ///
    /// Requiere token de Employee/Device/Application: NO es alcanzable de forma anónima.
    /// </summary>
    [RoutePrefix("TRU_Sunat")]
    [BindEntity(typeof(SunatCustomerResult))]
    public class SunatController : IController
    {
        [HttpGet]
        [Authorization(new string[] { "Employee", "Device", "Application" })]
        public async Task<IEnumerable<SunatCustomerResult>> ConsultarDocumento(
            IEndpointContext context,
            string documento,
            QueryResultSettings queryResultSettings)
        {
            var request = new ConsultarDocumentoSunatRequest(documento);
            var response = await context.ExecuteAsync<ConsultarDocumentoSunatResponse>(request)
                .ConfigureAwait(false);
            return new List<SunatCustomerResult> { response.Result };
        }
    }
}
