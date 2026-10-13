using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Dynamics.Commerce.Runtime.DataModel;
using Microsoft.Dynamics.Commerce.Runtime.Hosting.Contracts;
using Trujillo.PeruEInvoicing.CommerceRuntime.Entities;
using Trujillo.PeruEInvoicing.CommerceRuntime.Messages;

namespace Trujillo.PeruEInvoicing.CommerceRuntime.Controllers
{
    /// <summary>
    /// Qué se puede comprar con un vale de consumo. Lo llama el POS una vez por vale pasado
    /// por caja, antes de aceptarlo como pago.
    ///
    /// La lista de artículos restringidos vive en OTRO controlador (TRU_ValesItems) y no aquí
    /// porque el binding del Retail Server admite UNA entidad por controlador, y porque las
    /// dos operaciones tienen frecuencias muy distintas: esta corre por vale, aquella una vez
    /// por sesión del POS.
    ///
    /// Requiere token de Employee/Device/Application: NO es alcanzable de forma anónima.
    /// </summary>
    [RoutePrefix("TRU_Vales")]
    [BindEntity(typeof(ValeRestriccionResult))]
    public class ValesController : IController
    {
        /// <summary>
        /// Nunca falla por "no existe": un código que no salió del sistema de vales devuelve
        /// Existe=false y PermiteAlcohol=true, porque hay tarjetas regalo legítimas cargadas
        /// a mano en D365 y rechazarlas dejaría al cajero sin poder cobrar.
        /// </summary>
        [HttpGet]
        [Authorization(new string[] { "Employee", "Device", "Application" })]
        public async Task<IEnumerable<ValeRestriccionResult>> ConsultarRestriccion(
            IEndpointContext context,
            string codigo,
            QueryResultSettings queryResultSettings)
        {
            var request = new ConsultarRestriccionValeRequest(codigo);
            var response = await context.ExecuteAsync<ConsultarRestriccionValeResponse>(request)
                .ConfigureAwait(false);
            return new List<ValeRestriccionResult> { response.Result };
        }
    }
}
