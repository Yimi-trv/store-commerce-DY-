using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Dynamics.Commerce.Runtime;
using Microsoft.Dynamics.Commerce.Runtime.Data;
using Microsoft.Dynamics.Commerce.Runtime.DataModel;
using Microsoft.Dynamics.Commerce.Runtime.Messages;
using Trujillo.PeruEInvoicing.CommerceRuntime.Entities;
using Trujillo.PeruEInvoicing.CommerceRuntime.Messages;

namespace Trujillo.PeruEInvoicing.CommerceRuntime.Services
{
    /// <summary>
    /// QUÉ ARTÍCULOS NO PUEDE PAGAR UN VALE RESTRINGIDO
    /// ================================================
    ///
    /// Los vales de consumo de Trujillo Market son tarjetas regalo de D365: el código impreso
    /// en el barcode ES el CARDNUMBER. Desde octubre de 2026 un lote se puede emitir con la
    /// restricción "sin alcohol", y entonces sus códigos llevan una letra extra:
    ///
    ///     T173AGO26001    vale normal, compra de todo
    ///     TA174AGO26001   vale restringido, NO paga bebidas alcohólicas
    ///
    /// ESTE SERVICIO RESUELVE UNA SOLA MITAD: qué artículos son alcohol. La otra mitad —si
    /// este vale está restringido— NO se pregunta a nadie: va dentro del código y la lee el
    /// POS (ValeRestringidoRule.ts). Por eso aquí no hay ninguna llamada de red, ninguna URL
    /// y ninguna clave de integración.
    ///
    /// POR QUÉ ESA DIVISIÓN
    /// La restricción viaja impresa en el papel que el cliente tiene en la mano. Si dependiera
    /// de una consulta, dos cosas malas pasarían: la caja necesitaría estar en línea para
    /// cobrar, y un cambio en otro sistema podría hacer que el vale impreso dijera una cosa y
    /// la caja hiciera otra. Lo que está impreso manda, y la caja lo lee sola.
    ///
    /// QUÉ PASA SI ESTA LISTA NO SE PUEDE RESOLVER
    /// Se responde Resuelta=false, y el POS bloquea los vales RESTRINGIDOS (no los demás).
    /// Afecta solo a esos vales y es el lado seguro del error: una lista vacía tratada como
    /// "no hay alcohol en el catálogo" dejaría pasar justo lo que hay que frenar.
    /// </summary>
    public class ItemsRestringidosService : IRequestHandlerAsync
    {
        public IEnumerable<Type> SupportedRequestTypes => new[]
        {
            typeof(ObtenerItemsRestringidosRequest)
        };

        /// <summary>
        /// Categoría raíz del catálogo que agrupa las bebidas alcohólicas. Se busca POR NOMBRE
        /// y no por RecId a propósito: los RecId de UAT y de producción no coinciden, y un id
        /// a mano haría que la regla se aplicara en un entorno y en el otro no.
        ///
        /// Entran la categoría y TODAS sus hijas. Al 2026-10-09 en producción son 23 categorías
        /// y 734 artículos (cervezas, vinos, piscos, rones, whiskies, vodkas…).
        ///
        /// OJO: cuelgan de aquí "LICOR-JARABES DE GOMA" (12 artículos) y "LICOR-OTROS
        /// COMPLEMENTOS DE BEBIDAS" (36), que NO llevan alcohol. Quedan bloqueados porque la
        /// regla acordada fue el subárbol completo. Para excluirlos, agréguelos a
        /// CategoriasExcluidas.
        /// </summary>
        private const string CategoriaRaizAlcohol = "BEBIDAS ALCOHOLICAS";

        /// <summary>Hijas de la categoría raíz que NO deben restringirse. Vacío = ninguna.</summary>
        private static readonly string[] CategoriasExcluidas = new string[0];

        public async Task<Response> Execute(Request request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            if (request is ObtenerItemsRestringidosRequest items)
                return await ItemsRestringidosAsync(items).ConfigureAwait(false);

            throw new NotSupportedException(
                string.Format(CultureInfo.InvariantCulture,
                    "Request '{0}' is not supported.", request.GetType()));
        }

        private async Task<ObtenerItemsRestringidosResponse> ItemsRestringidosAsync(ObtenerItemsRestringidosRequest request)
        {
            var items = new Collection<ItemRestringidoResult>();

            try
            {
                var dataAreaId = request.RequestContext.GetChannelConfiguration().InventLocationDataAreaId;

                /* La categoría se resuelve por NOMBRE dentro de la consulta para que el mismo
                   paquete sirva en UAT y en producción (los RecId no coinciden). Entran la raíz
                   —por si algún día le cuelgan productos directos— y sus hijas.

                   Un solo viaje con JOIN, no un DatabaseContext por fila: el patrón N+1 ya
                   provocó timeouts en este proyecto (gotcha 5 de docs/gotchas.md). */
                var where = new StringBuilder(
                    "i.DATAAREAID = @DATAAREAID AND pc.CATEGORY IN (" +
                    "SELECT r.RECID FROM ECORESCATEGORY r WHERE r.NAME = @CATEGORIA " +
                    "UNION ALL " +
                    "SELECT h.RECID FROM ECORESCATEGORY h " +
                    "JOIN ECORESCATEGORY p ON p.RECID = h.PARENTCATEGORY WHERE p.NAME = @CATEGORIA)");

                var consulta = new SqlPagedQuery(QueryResultSettings.AllRecords)
                {
                    DatabaseSchema = "ax",
                    Select = new ColumnSet(new[] { "i.ITEMID", "c.NAME" }),
                    From = "ECORESPRODUCTCATEGORY pc " +
                           "JOIN ECORESCATEGORY c ON c.RECID = pc.CATEGORY " +
                           "JOIN INVENTTABLE i ON i.PRODUCT = pc.PRODUCT",
                    Where = where.ToString()
                };
                consulta.Parameters["@DATAAREAID"] = dataAreaId;
                consulta.Parameters["@CATEGORIA"] = CategoriaRaizAlcohol;

                using (var db = new DatabaseContext(request.RequestContext))
                {
                    var filas = await db.ReadEntityAsync<ExtensionsEntity>(consulta).ConfigureAwait(false);

                    long contador = 1;
                    var vistos = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                    foreach (ExtensionsEntity fila in filas)
                    {
                        var itemId = Texto(fila, "ITEMID");
                        var categoria = Texto(fila, "NAME");

                        if (string.IsNullOrWhiteSpace(itemId)) continue;
                        if (CategoriasExcluidas.Contains(categoria, StringComparer.OrdinalIgnoreCase)) continue;
                        // Un artículo puede estar en dos categorías del subárbol: basta una vez.
                        if (!vistos.Add(itemId)) continue;

                        items.Add(new ItemRestringidoResult
                        {
                            Id = contador++,
                            ItemId = itemId,
                            Categoria = categoria
                        });
                    }
                }

                if (items.Count == 0)
                {
                    // Una lista vacía casi siempre significa que la categoría se llama distinto
                    // en este entorno, no que no haya licores en el catálogo. Se marca como NO
                    // resuelta para que el POS no la confunda con "no hay nada que bloquear".
                    return new ObtenerItemsRestringidosResponse(items, false,
                        "Ningún artículo bajo la categoría '" + CategoriaRaizAlcohol +
                        "'. Verifique el nombre de la categoría en este entorno.");
                }

                return new ObtenerItemsRestringidosResponse(items, true,
                    items.Count + " artículos restringidos bajo '" + CategoriaRaizAlcohol + "'.");
            }
            catch (Exception excepcion)
            {
                return new ObtenerItemsRestringidosResponse(items, false,
                    "No se pudo resolver la lista de artículos restringidos: " + excepcion.Message);
            }
        }

        private static string Texto(ExtensionsEntity fila, string columna)
        {
            var valor = fila.GetProperty(columna);
            return valor == null ? null : valor.ToString().Trim();
        }
    }
}
