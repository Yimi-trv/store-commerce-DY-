using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Globalization;
using System.Linq;
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
    /// POR QUÉ LA JERARQUÍA DE PRODUCTO Y NO LA DE NAVEGACIÓN DEL CANAL
    /// Hubo una versión que resolvía esto con GetChannelCategoriesDataRequest. Es la petición
    /// soportada… para otra pregunta: devuelve la jerarquía de NAVEGACIÓN del canal, la que
    /// sirve para explorar categorías en pantalla. En estas tiendas nadie navega categorías
    /// —se escanea el código de barras— así que el canal no tiene ninguna asignada y la
    /// petición devolvía CERO categorías. Comprobado en caja: "El canal 5637151326 no
    /// devolvió ninguna categoría".
    ///
    /// La clasificación que importa vive en la jerarquía de CATEGORÍAS DE PRODUCTO
    /// ("Catalogo Ventas"), que sí baja al channel DB en ECORESPRODUCTCATEGORY. Son dos cosas
    /// distintas y la segunda no depende de cómo se navegue el catálogo en caja.
    ///
    /// LAS TABLAS Y COLUMNAS ESTÁN VERIFICADAS CONTRA EL CHANNEL DB, no supuestas: se leyeron
    /// con la sonda TRU_Diagnostics (mode='Columns') sobre el canal real.
    ///
    ///     ax.ECORESPRODUCTCATEGORY   CATEGORY, CATEGORYHIERARCHY, PRODUCT
    ///     ax.ECORESCATEGORY          RECID, CATEGORYHIERARCHY, NAME, NESTEDSETLEFT/RIGHT
    ///     ax.INVENTTABLE             ITEMID, PRODUCT, DATAAREAID
    ///
    /// EL SUBÁRBOL SE RESUELVE CON NESTED SETS, no subiendo padre a padre. ECORESCATEGORY
    /// trae NESTEDSETLEFT y NESTEDSETRIGHT: toda descendiente de una raíz cae dentro de su
    /// intervalo, a cualquier profundidad, en una sola consulta. La primera versión miraba un
    /// único nivel de hijas y se le escapaba cualquier nieta.
    ///
    /// QUÉ PASA SI ESTA LISTA NO SE PUEDE RESOLVER
    /// Se responde Resuelta=false, y el POS bloquea los vales RESTRINGIDOS (no los demás).
    /// Afecta solo a esos vales y es el lado seguro del error: una lista vacía tratada como
    /// "no hay alcohol en el catálogo" dejaría pasar justo lo que hay que frenar. Si no hay
    /// resultados se hace una segunda consulta, solo para el diagnóstico, que distingue "la
    /// categoría no existe en este channel DB" de "existe pero no tiene productos".
    /// </summary>
    public class ItemsRestringidosService : IRequestHandlerAsync
    {
        public IEnumerable<Type> SupportedRequestTypes => new[]
        {
            typeof(ObtenerItemsRestringidosRequest)
        };

        /// <summary>
        /// Categoría raíz que agrupa las bebidas alcohólicas. Se busca POR NOMBRE y no por
        /// RecId a propósito: los RecId de UAT y de producción no coinciden, y un id a mano
        /// haría que la regla se aplicara en un entorno y en el otro no.
        ///
        /// Entran la categoría y TODAS sus descendientes, a cualquier profundidad. Al
        /// 2026-10-09 en producción son 23 categorías y 734 artículos (cervezas, vinos,
        /// piscos, rones, whiskies, vodkas…).
        ///
        /// OJO: cuelgan de aquí "LICOR-JARABES DE GOMA" (12 artículos) y "LICOR-OTROS
        /// COMPLEMENTOS DE BEBIDAS" (36), que NO llevan alcohol. Quedan bloqueados porque la
        /// regla acordada fue el subárbol completo. Para excluirlos, agréguelos a
        /// CategoriasExcluidas.
        ///
        /// El nombre existe en más de una jerarquía ("Catalogo Ventas" y "Catalogo
        /// Mayorista"): entran las dos, porque un artículo restringido lo está en cualquiera.
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
            var dataAreaId = "(sin resolver)";

            try
            {
                dataAreaId = request.RequestContext.GetChannelConfiguration().InventLocationDataAreaId;

                /* Un solo viaje con JOIN, no un DatabaseContext por fila: el patrón N+1 ya
                   provocó timeouts en este proyecto (gotcha 5 de docs/gotchas.md).

                   El JOIN con "raiz" es el subárbol por nested sets: una categoría pertenece
                   al subárbol si su intervalo [LEFT, RIGHT] cae dentro del de la raíz, dentro
                   de la MISMA jerarquía. Incluye a la raíz (>= y <=) por si algún día le
                   cuelgan productos directos. */
                var consulta = new SqlPagedQuery(QueryResultSettings.AllRecords)
                {
                    DatabaseSchema = "ax",
                    Select = new ColumnSet(new[] { "i.ITEMID", "c.NAME" }),
                    From = "ECORESPRODUCTCATEGORY pc " +
                           "JOIN ECORESCATEGORY c ON c.RECID = pc.CATEGORY " +
                           "JOIN ECORESCATEGORY raiz ON raiz.CATEGORYHIERARCHY = c.CATEGORYHIERARCHY " +
                                "AND raiz.NAME = @CATEGORIA " +
                                "AND c.NESTEDSETLEFT >= raiz.NESTEDSETLEFT " +
                                "AND c.NESTEDSETRIGHT <= raiz.NESTEDSETRIGHT " +
                           "JOIN INVENTTABLE i ON i.PRODUCT = pc.PRODUCT",
                    Where = "i.DATAAREAID = @DATAAREAID",
                    OrderBy = "i.ITEMID"
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
                            Categoria = string.IsNullOrWhiteSpace(categoria) ? CategoriaRaizAlcohol : categoria
                        });
                    }

                    if (items.Count == 0)
                    {
                        var porque = await PorQueVaciaAsync(db, dataAreaId).ConfigureAwait(false);
                        return new ObtenerItemsRestringidosResponse(items, false, porque);
                    }
                }

                return new ObtenerItemsRestringidosResponse(items, true,
                    items.Count + " artículos restringidos bajo '" + CategoriaRaizAlcohol +
                    "' (empresa " + dataAreaId + ").");
            }
            catch (Exception excepcion)
            {
                return new ObtenerItemsRestringidosResponse(items, false,
                    "No se pudo resolver la lista de artículos restringidos (empresa " + dataAreaId + "): " +
                    excepcion.GetType().Name + ": " + excepcion.Message);
            }
        }

        /// <summary>
        /// Solo se llama cuando la consulta principal no devolvió nada, y existe para que el
        /// siguiente que mire esto no tenga que adivinar en cuál de los dos pasos se quedó:
        /// la categoría no está en este channel DB, o está pero sin productos asignados.
        /// </summary>
        private static async Task<string> PorQueVaciaAsync(DatabaseContext db, string dataAreaId)
        {
            try
            {
                var consulta = new SqlPagedQuery(QueryResultSettings.AllRecords)
                {
                    DatabaseSchema = "ax",
                    Select = new ColumnSet(new[] { "r.RECID", "r.CATEGORYHIERARCHY" }),
                    From = "ECORESCATEGORY r",
                    Where = "r.NAME = @CATEGORIA",
                    OrderBy = "r.RECID"
                };
                consulta.Parameters["@CATEGORIA"] = CategoriaRaizAlcohol;

                var raices = (await db.ReadEntityAsync<ExtensionsEntity>(consulta).ConfigureAwait(false)).Count();

                return raices == 0
                    ? "La categoría '" + CategoriaRaizAlcohol + "' no existe en el channel DB. " +
                      "Verifique el nombre en este entorno y que la jerarquía de categorías de " +
                      "producto esté sincronizada por CDX."
                    : "La categoría '" + CategoriaRaizAlcohol + "' existe en el channel DB (" + raices +
                      " jerarquía(s)), pero ningún artículo de la empresa " + dataAreaId +
                      " cuelga de ella ni de sus descendientes. Revise la asignación de categorías " +
                      "a productos y la sincronización CDX de ECORESPRODUCTCATEGORY.";
            }
            catch (Exception excepcion)
            {
                return "La consulta principal no devolvió artículos y el diagnóstico tampoco pudo " +
                       "correr (empresa " + dataAreaId + "): " + excepcion.GetType().Name + ": " + excepcion.Message;
            }
        }

        private static string Texto(ExtensionsEntity fila, string columna)
        {
            var valor = fila.GetProperty(columna);
            return valor == null ? null : valor.ToString().Trim();
        }
    }
}
