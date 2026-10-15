using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Dynamics.Commerce.Runtime;
using Microsoft.Dynamics.Commerce.Runtime.DataModel;
using Microsoft.Dynamics.Commerce.Runtime.DataServices.Messages;
using Microsoft.Dynamics.Commerce.Runtime.Messages;
using Microsoft.Dynamics.Commerce.Runtime.Services.Messages;
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
    /// POR QUÉ NO HAY SQL A MANO (Y POR QUÉ LO HUBO)
    /// La primera versión resolvía esto con un SELECT sobre ECORESPRODUCTCATEGORY,
    /// ECORESCATEGORY e INVENTTABLE del channel DB. En la caja no devolvió nada: esas tablas
    /// no están en el channel DB con ese nombre, y la consulta ni siquiera llegaba a correr.
    /// Costó un despliegue descubrirlo.
    ///
    /// Ahora lo resuelve el propio Commerce Runtime, con sus peticiones soportadas:
    ///
    ///     GetChannelCategoriesDataRequest  → el árbol de categorías DE ESTE CANAL
    ///     SearchProductsRequest            → los productos de una categoría
    ///
    /// La diferencia de fondo: el esquema del channel DB es asunto de la plataforma, no
    /// nuestro. Estas peticiones saben dónde vive el dato en cada versión; un SELECT escrito
    /// a mano solo sabe lo que supuso quien lo escribió, y se entera en producción.
    ///
    /// QUÉ PASA SI ESTA LISTA NO SE PUEDE RESOLVER
    /// Se responde Resuelta=false, y el POS bloquea los vales RESTRINGIDOS (no los demás).
    /// Afecta solo a esos vales y es el lado seguro del error: una lista vacía tratada como
    /// "no hay alcohol en el catálogo" dejaría pasar justo lo que hay que frenar. El Detalle
    /// dice en qué paso se quedó y con qué canal, para no volver a depurar a ciegas.
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
        /// Entran la categoría y TODAS sus descendientes, a cualquier profundidad. Al
        /// 2026-10-09 en producción son 23 categorías y 734 artículos (cervezas, vinos,
        /// piscos, rones, whiskies, vodkas…).
        ///
        /// OJO: cuelgan de aquí "LICOR-JARABES DE GOMA" (12 artículos) y "LICOR-OTROS
        /// COMPLEMENTOS DE BEBIDAS" (36), que NO llevan alcohol. Quedan bloqueados porque la
        /// regla acordada fue el subárbol completo. Para excluirlos, agréguelos a
        /// CategoriasExcluidas.
        /// </summary>
        private const string CategoriaRaizAlcohol = "BEBIDAS ALCOHOLICAS";

        /// <summary>Categorías del subárbol que NO deben restringirse. Vacío = ninguna.</summary>
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
            var contexto = request.RequestContext;
            long canal = 0;

            try
            {
                canal = contexto.GetPrincipal().ChannelId;

                /* 1. El árbol de categorías de ESTE canal. */
                var categorias = await contexto.ExecuteAsync<EntityDataServiceResponse<Category>>(
                    new GetChannelCategoriesDataRequest(canal, QueryResultSettings.AllRecords))
                    .ConfigureAwait(false);

                var todas = categorias.ToList();
                if (todas.Count == 0)
                {
                    return NoResuelta(items,
                        "El canal " + canal + " no devolvió ninguna categoría. Revise la jerarquía " +
                        "de navegación del canal y la sincronización CDX.");
                }

                /* 2. La raíz por nombre, y de ahí todo el subárbol a cualquier profundidad.
                      La versión anterior bajaba UN solo nivel: una categoría nieta se escapaba. */
                var raices = todas
                    .Where(c => string.Equals((c.Name ?? string.Empty).Trim(), CategoriaRaizAlcohol,
                                              StringComparison.OrdinalIgnoreCase))
                    .ToList();

                if (raices.Count == 0)
                {
                    return NoResuelta(items,
                        "No existe la categoría '" + CategoriaRaizAlcohol + "' en la jerarquía del canal " +
                        canal + " (" + todas.Count + " categorías revisadas). Verifique el nombre en este entorno.");
                }

                var subarbol = Subarbol(todas, raices);

                /* 3. Los productos de cada categoría del subárbol. Se pregunta categoría por
                      categoría —no todas juntas— porque así se sabe CUÁL hizo entrar a cada
                      artículo, y ese nombre es lo que el cajero ve en el aviso. */
                long contador = 1;
                var vistos = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                foreach (Category categoria in subarbol)
                {
                    var nombreCategoria = (categoria.Name ?? string.Empty).Trim();
                    if (CategoriasExcluidas.Contains(nombreCategoria, StringComparer.OrdinalIgnoreCase))
                        continue;

                    var criterio = new ProductSearchCriteria
                    {
                        Context = new ProjectionDomain { ChannelId = canal, CatalogId = 0 },
                        CategoryIds = new List<long> { categoria.RecordId },
                        IncludeProductsFromDescendantCategories = true
                    };

                    var encontrados = await contexto.ExecuteAsync<EntityDataServiceResponse<ProductSearchResult>>(
                        new SearchProductsRequest(criterio, QueryResultSettings.AllRecords))
                        .ConfigureAwait(false);

                    foreach (ProductSearchResult producto in encontrados)
                    {
                        var itemId = (producto.ItemId ?? string.Empty).Trim();
                        // Un maestro de producto puede venir sin ItemId; sus variantes sí lo traen.
                        if (itemId.Length == 0) continue;
                        // El mismo artículo puede estar en dos categorías del subárbol: basta una.
                        if (!vistos.Add(itemId)) continue;

                        items.Add(new ItemRestringidoResult
                        {
                            Id = contador++,
                            ItemId = itemId,
                            Categoria = nombreCategoria.Length > 0 ? nombreCategoria : CategoriaRaizAlcohol
                        });
                    }
                }

                if (items.Count == 0)
                {
                    // Una lista vacía casi siempre significa que los productos no bajaron al canal,
                    // no que no haya licores en el catálogo. Se marca como NO resuelta para que el
                    // POS no la confunda con "no hay nada que bloquear".
                    return NoResuelta(items,
                        "La categoría '" + CategoriaRaizAlcohol + "' existe en el canal " + canal +
                        " con " + subarbol.Count + " categorías en su subárbol, pero ninguna tiene " +
                        "productos asignados en este canal. Revise la jerarquía de navegación y el CDX.");
                }

                return new ObtenerItemsRestringidosResponse(items, true,
                    items.Count + " artículos restringidos en " + subarbol.Count +
                    " categorías bajo '" + CategoriaRaizAlcohol + "' (canal " + canal + ").");
            }
            catch (Exception excepcion)
            {
                return NoResuelta(items,
                    "No se pudo resolver la lista de artículos restringidos (canal " + canal + "): " +
                    excepcion.GetType().Name + ": " + excepcion.Message);
            }
        }

        /// <summary>
        /// La raíz y todas sus descendientes. Itera por niveles en vez de recursión para que una
        /// jerarquía con un ciclo —que no debería existir, pero el dato viene de fuera— no se
        /// lleve la pila por delante.
        /// </summary>
        private static List<Category> Subarbol(List<Category> todas, List<Category> raices)
        {
            var resultado = new List<Category>(raices);
            var dentro = new HashSet<long>(raices.Select(r => r.RecordId));
            var frontera = new List<long>(dentro);

            while (frontera.Count > 0)
            {
                var siguiente = new List<long>();

                foreach (Category c in todas)
                {
                    if (c.ParentCategory == 0) continue;
                    if (!frontera.Contains(c.ParentCategory)) continue;
                    if (!dentro.Add(c.RecordId)) continue;

                    resultado.Add(c);
                    siguiente.Add(c.RecordId);
                }

                frontera = siguiente;
            }

            return resultado;
        }

        private static ObtenerItemsRestringidosResponse NoResuelta(
            Collection<ItemRestringidoResult> items, string detalle)
        {
            return new ObtenerItemsRestringidosResponse(items, false, detalle);
        }
    }
}
