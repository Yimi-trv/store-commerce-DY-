using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Dynamics.Commerce.Runtime.DataModel;
using Microsoft.Dynamics.Commerce.Runtime.Hosting.Contracts;
using Trujillo.PeruEInvoicing.CommerceRuntime.Entities;
using Trujillo.PeruEInvoicing.CommerceRuntime.Messages;

namespace Trujillo.PeruEInvoicing.CommerceRuntime.Controllers
{
    /// <summary>
    /// Los artículos que un vale al portador no puede pagar (las bebidas alcohólicas del
    /// catálogo). El POS se la baja UNA vez por sesión y la deja en memoria.
    ///
    /// POR QUÉ LA LISTA ENTERA Y NO UNA CONSULTA POR PRODUCTO
    /// La comprobación corre al agregar cada artículo a la venta. Una ida y vuelta al CSU por
    /// producto escaneado se nota en la caja, con un cliente delante. Son ~730 artículos
    /// (unos 6 KB).
    ///
    /// Va en su propio controlador porque el binding del Retail Server admite una sola
    /// entidad por controlador.
    /// </summary>
    [RoutePrefix("TRU_ValesItems")]
    [BindEntity(typeof(ItemRestringidoResult))]
    public class ValesItemsController : IController
    {
        /// <summary>
        /// ItemId imposible (ningún artículo de D365 empieza con '*') que marca "la lista no
        /// se pudo resolver". Tiene que coincidir con la constante del POS (ValePortadorRule.ts).
        ///
        /// EXISTE PORQUE UNA LISTA VACÍA ES AMBIGUA: puede significar "no hay licores en el
        /// catálogo" o "la consulta falló". Leer lo segundo como lo primero dejaría pasar
        /// justo lo que hay que frenar, así que la diferencia viaja explícita.
        /// </summary>
        public const string Centinela = "*NO-RESUELTO*";

        [HttpGet]
        [Authorization(new string[] { "Employee", "Device", "Application" })]
        public async Task<IEnumerable<ItemRestringidoResult>> Restringidos(
            IEndpointContext context,
            QueryResultSettings queryResultSettings)
        {
            var response = await context.ExecuteAsync<ObtenerItemsRestringidosResponse>(
                new ObtenerItemsRestringidosRequest()).ConfigureAwait(false);

            if (!response.Resuelta)
            {
                return new List<ItemRestringidoResult>
                {
                    new ItemRestringidoResult
                    {
                        Id = 0,
                        ItemId = Centinela,
                        Categoria = response.Detalle
                    }
                };
            }

            return response.Items.ToList();
        }
    }
}
