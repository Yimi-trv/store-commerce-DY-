using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Runtime.Serialization;
using System.Runtime.Serialization.Json;
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
    /// VALE AL PORTADOR: QUÉ ES Y POR QUÉ NO COMPRA ALCOHOL
    /// =====================================================
    ///
    /// Los vales de consumo de Trujillo Market son tarjetas regalo de D365: el código impreso
    /// en el barcode ES el CARDNUMBER. Desde octubre de 2026 hay dos tipos, y el tipo vive en
    /// el sistema de vales, no en D365:
    ///
    ///   Nominal     — el de siempre, a nombre de una persona. Compra de todo.
    ///   AlPortador  — transferible, se imprime sin nombre ni DNI. NO compra alcohol.
    ///
    /// Este servicio resuelve las dos mitades de esa regla:
    ///
    ///   1. QUÉ TIPO DE VALE ES  → se le pregunta al sistema de vales por HTTP.
    ///   2. QUÉ ES ALCOHOL       → sale del channel DB: los artículos de la categoría
    ///                             BEBIDAS ALCOHOLICAS y sus hijas.
    ///
    /// POR QUÉ LA CONSULTA VIVE EN EL CSU Y NO EN EL POS
    /// La llamada al sistema de vales lleva una clave de integración. En el POS viajaría
    /// dentro del TypeScript que se despliega a cada caja, legible con F12 — exactamente el
    /// error que ya se corrigió con la consulta de RUC/DNI. Desde aquí no sale del CSU.
    ///
    /// QUÉ PASA CUANDO ALGO NO RESPONDE (decidido a propósito, no por omisión)
    ///   · No se sabe el tipo del vale  → se trata como Nominal y se deja cobrar.
    ///     Bloquear todas las tarjetas regalo porque un servicio auxiliar está caído pararía
    ///     la caja; la enorme mayoría de los vales son nominales y no tienen restricción.
    ///   · Se sabe que es AL PORTADOR pero no se puede resolver qué es alcohol
    ///     → el POS bloquea ese vale. Afecta solo a los vales restringidos, que son pocos,
    ///     y es el lado seguro del error.
    /// El POS decide eso con las banderas Indeterminado y Resuelta; aquí solo se informan.
    /// </summary>
    public class ValeRestriccionService : IRequestHandlerAsync
    {
        public IEnumerable<Type> SupportedRequestTypes => new[]
        {
            typeof(ConsultarRestriccionValeRequest),
            typeof(ObtenerItemsRestringidosRequest)
        };

        // ─────────────────────────────────────────────────────────────────────────────
        //  CONFIGURACIÓN
        // ─────────────────────────────────────────────────────────────────────────────

        /// <summary>
        /// Raíz del sistema de vales, sin barra final. P. ej. "https://vales.trujillomarket.pe".
        ///
        /// VACÍO = LA RESTRICCIÓN NO SE APLICA y el CSU no sale a internet: todos los vales se
        /// tratan como nominales. Es deliberado — así este paquete se puede desplegar antes de
        /// que el sistema de vales esté publicado, sin cambiar en nada el comportamiento de las
        /// cajas y sin dejar a nadie sin cobrar.
        /// </summary>
        private const string ValesBaseUrl = "";

        /// <summary>
        /// Clave de integración del sistema de vales (su variable CANJE_API_KEY). Viaja en la
        /// cabecera X-Canje-Key. Vacía = igual que sin URL: la restricción no se aplica.
        /// </summary>
        private const string ValesApiKey = "";

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

        /// <summary>
        /// Al otro lado hay un cajero con un cliente delante. Cinco segundos es el mismo techo
        /// que usa la consulta de RUC/DNI.
        /// </summary>
        private static readonly TimeSpan TiempoLimite = TimeSpan.FromSeconds(5);

        /// <summary>
        /// Uno solo para todo el proceso. Un HttpClient por llamada agota los sockets del
        /// servidor: quedan en TIME_WAIT y bajo carga el CSU se queda sin puertos.
        /// </summary>
        private static readonly HttpClient Cliente = new HttpClient { Timeout = TiempoLimite };

        // ─────────────────────────────────────────────────────────────────────────────

        public async Task<Response> Execute(Request request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            if (request is ConsultarRestriccionValeRequest consulta)
                return await ConsultarAsync(consulta).ConfigureAwait(false);

            if (request is ObtenerItemsRestringidosRequest items)
                return await ItemsRestringidosAsync(items).ConfigureAwait(false);

            throw new NotSupportedException(
                string.Format(CultureInfo.InvariantCulture,
                    "Request '{0}' is not supported.", request.GetType()));
        }

        /* ------------------------------------------------- 1. Tipo del vale */

        private async Task<ConsultarRestriccionValeResponse> ConsultarAsync(ConsultarRestriccionValeRequest request)
        {
            var codigo = (request.Codigo ?? string.Empty).Trim().ToUpperInvariant();

            if (codigo.Length == 0)
                return Responder(SinRestriccion(codigo, true, "Código vacío."));

            if (string.IsNullOrWhiteSpace(ValesBaseUrl) || string.IsNullOrWhiteSpace(ValesApiKey))
            {
                // Sin configurar no se sale a internet ni se bloquea nada: el paquete se puede
                // desplegar antes que el sistema de vales.
                return Responder(SinRestriccion(codigo, false,
                    "Integración con el sistema de vales no configurada (ValesBaseUrl/ValesApiKey)."));
            }

            try
            {
                var url = ValesBaseUrl.TrimEnd('/') + "/api/canje/vales/" + Uri.EscapeDataString(codigo);
                using (var peticion = new HttpRequestMessage(HttpMethod.Get, url))
                {
                    peticion.Headers.Add("X-Canje-Key", ValesApiKey);

                    using (var respuesta = await Cliente.SendAsync(peticion).ConfigureAwait(false))
                    {
                        if (respuesta.StatusCode == HttpStatusCode.NotFound)
                        {
                            // 404 = el endpoint no existe en ese servidor (clave sin definir del
                            // otro lado). No es "el vale no existe": eso vuelve 200 con existe=false.
                            return Responder(SinRestriccion(codigo, true,
                                "El sistema de vales no expone la consulta de canje (404)."));
                        }

                        if (!respuesta.IsSuccessStatusCode)
                        {
                            return Responder(SinRestriccion(codigo, true,
                                "El sistema de vales respondió " + (int)respuesta.StatusCode + "."));
                        }

                        var cuerpo = await respuesta.Content.ReadAsStringAsync().ConfigureAwait(false);
                        var dto = Deserializar<RespuestaVale>(cuerpo);

                        if (dto == null)
                        {
                            return Responder(SinRestriccion(codigo, true,
                                "Respuesta ilegible del sistema de vales."));
                        }

                        var permite = dto.PermiteAlcohol;
                        return Responder(new ValeRestriccionResult
                        {
                            Id = 1,
                            Codigo = string.IsNullOrEmpty(dto.Codigo) ? codigo : dto.Codigo,
                            Existe = dto.Existe,
                            TipoVale = string.IsNullOrEmpty(dto.TipoVale) ? "Nominal" : dto.TipoVale,
                            PermiteAlcohol = permite,
                            Indeterminado = false,
                            Mensaje = permite
                                ? null
                                : (string.IsNullOrWhiteSpace(dto.Mensaje)
                                    ? "Vale AL PORTADOR: no puede usarse para pagar bebidas alcohólicas."
                                    : dto.Mensaje),
                            Detalle = "estado=" + dto.Estado
                        });
                    }
                }
            }
            catch (Exception excepcion)
            {
                // Incluye el timeout (TaskCanceledException). Una caída del sistema de vales no
                // puede dejar sin cobrar: se informa y el POS decide.
                return Responder(SinRestriccion(codigo, true,
                    "No se pudo consultar el sistema de vales: " + excepcion.Message));
            }
        }

        /// <summary>Resultado "no sé / no aplica": deja pasar y dice por qué.</summary>
        private static ValeRestriccionResult SinRestriccion(string codigo, bool indeterminado, string detalle)
        {
            return new ValeRestriccionResult
            {
                Id = 1,
                Codigo = codigo,
                Existe = false,
                TipoVale = "Nominal",
                PermiteAlcohol = true,
                Indeterminado = indeterminado,
                Mensaje = null,
                Detalle = detalle
            };
        }

        private static ConsultarRestriccionValeResponse Responder(ValeRestriccionResult resultado)
        {
            return new ConsultarRestriccionValeResponse(resultado);
        }

        /* ------------------------------------------- 2. Qué artículos son alcohol */

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

        /* ------------------------------------------------------------- JSON */

        private static T Deserializar<T>(string json) where T : class
        {
            if (string.IsNullOrWhiteSpace(json)) return null;
            using (var flujo = new MemoryStream(Encoding.UTF8.GetBytes(json)))
            {
                return (T)new DataContractJsonSerializer(typeof(T)).ReadObject(flujo);
            }
        }

        /// <summary>
        /// Lo que devuelve GET /api/canje/vales/{codigo} del sistema de vales. Sin nombre ni
        /// DNI del beneficiario: la caja no los necesita y son datos personales de un tercero.
        /// </summary>
        [DataContract]
        private sealed class RespuestaVale
        {
            [DataMember(Name = "codigo")]
            public string Codigo { get; set; }

            [DataMember(Name = "existe")]
            public bool Existe { get; set; }

            [DataMember(Name = "tipoVale")]
            public string TipoVale { get; set; }

            [DataMember(Name = "permiteAlcohol")]
            public bool PermiteAlcohol { get; set; }

            [DataMember(Name = "estado")]
            public string Estado { get; set; }

            [DataMember(Name = "mensaje")]
            public string Mensaje { get; set; }
        }
    }
}
