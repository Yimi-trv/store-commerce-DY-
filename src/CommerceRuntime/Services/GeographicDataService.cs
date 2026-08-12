using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Dynamics.Commerce.Runtime;
using Microsoft.Dynamics.Commerce.Runtime.Data;
using Microsoft.Dynamics.Commerce.Runtime.Data.Types;
using Microsoft.Dynamics.Commerce.Runtime.DataModel;
using Microsoft.Dynamics.Commerce.Runtime.Framework;
using Microsoft.Dynamics.Commerce.Runtime.Messages;
using Trujillo.PeruEInvoicing.CommerceRuntime.Entities;
using Trujillo.PeruEInvoicing.CommerceRuntime.Messages;

namespace Trujillo.PeruEInvoicing.CommerceRuntime.Services
{
    /// <summary>
    /// Resuelve el ubigeo SUNAT (NOMBRES de departamento/provincia/distrito, tal como los
    /// devuelve api.perudevs.com) contra los maestros geográficos del channel DB, devolviendo
    /// los CÓDIGOS/valores exactos que D365 acepta al validar una dirección:
    ///   - Address.State  = LOGISTICSADDRESSSTATE.STATEID  (ej. Ancash -> "02")
    ///   - Address.County = LOGISTICSADDRESSCOUNTY.COUNTYID (ej. Huaraz -> "01", numerado POR state)
    ///   - Address.City   = LOGISTICSADDRESSCITY.NAME       (casing exacto del maestro; el FE
    ///                      resuelve el ubigeo del TXT por este nombre — vista DPDireccionReceptor)
    ///
    /// La comparación normaliza acentos y mayúsculas en C# (SUNAT manda "JUNIN"/"HUANUCO" sin
    /// tilde; el maestro guarda "Junín"/"Huánuco" — un match SQL directo fallaría con collation
    /// accent-sensitive). Los maestros PER son chicos (25 states, ~20 counties y ~200 cities por
    /// state), así que traer candidatos y matchear en memoria es trivial.
    ///
    /// REGLA DE ORO (aprendida en UAT 2026-07-10): una dirección con componentes que no validan
    /// BLOQUEA el alta del cliente sin salida. Por eso IsValid=true SOLO si resuelven los 3
    /// niveles; ante cualquier duda el POS no agrega la dirección (queda manual).
    /// </summary>
    public class GeographicDataService : IRequestHandlerAsync
    {
        private const string CountryRegion = "PER";

        public IEnumerable<Type> SupportedRequestTypes => new[]
        {
            typeof(ResolveUbigeoRequest)
        };

        public async Task<Response> Execute(Request request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            if (request is ResolveUbigeoRequest resolveRequest)
                return await ResolveAsync(resolveRequest).ConfigureAwait(false);

            throw new NotSupportedException(
                string.Format(CultureInfo.InvariantCulture,
                    "Request '{0}' is not supported.", request.GetType()));
        }

        private async Task<ResolveUbigeoResponse> ResolveAsync(ResolveUbigeoRequest request)
        {
            var result = new UbigeoResolutionResult { Id = 1, IsValid = false };
            var notes = new List<string>();

            string deptNorm = Normalize(request.Departamento);
            string provNorm = Normalize(request.Provincia);
            string distNorm = Normalize(request.Distrito);

            if (deptNorm.Length == 0 || provNorm.Length == 0)
            {
                result.Notes = "departamento/provincia vacios";
                return new ResolveUbigeoResponse(result);
            }

            // 1) Departamento -> STATEID
            var states = await ReadRowsAsync(request.RequestContext, "LOGISTICSADDRESSSTATE",
                "STATEID,NAME", "COUNTRYREGIONID = @CR", "STATEID", 50).ConfigureAwait(false);
            string stateId = MatchByName(states, "NAME", "STATEID", deptNorm);
            if (stateId == null)
            {
                result.Notes = "departamento '" + request.Departamento + "' no encontrado en maestro STATE";
                return new ResolveUbigeoResponse(result);
            }
            result.StateId = stateId;
            notes.Add("state=" + stateId);

            // 2) Provincia -> COUNTYID (numerado por state)
            var counties = await ReadRowsAsync(request.RequestContext, "LOGISTICSADDRESSCOUNTY",
                "COUNTYID,NAME", "COUNTRYREGIONID = @CR AND STATEID = '" + Sanitize(stateId) + "'", "COUNTYID", 100).ConfigureAwait(false);
            string countyId = MatchByName(counties, "NAME", "COUNTYID", provNorm);
            if (countyId == null)
            {
                result.Notes = "provincia '" + request.Provincia + "' no encontrada en maestro COUNTY (state " + stateId + ")";
                return new ResolveUbigeoResponse(result);
            }
            result.CountyId = countyId;
            notes.Add("county=" + countyId);

            // 3) Distrito -> CITY. CONVENCIÓN DEL ENTORNO (evidencia: dirección válida real en UAT,
            // 2026-07-10): Address.City guarda el CÓDIGO ubigeo del distrito (ej. "01"), no el nombre.
            // El maestro CITY tiene filas código (NAME="01", COUNTYID="01") cuyo nombre humano está
            // en DESCRIPTION, y además algunas filas sueltas por nombre (NAME="HUARAZ", sin county).
            // Orden de resolución: (a) DESCRIPTION==distrito con COUNTYID del county resuelto -> NAME
            // (código); (b) DESCRIPTION==distrito en el state -> NAME; (c) fila por nombre
            // NAME==distrito; (d) lo mismo con provincia. Si el maestro no expone DESCRIPTION,
            // se reintenta solo con NAME.
            List<Dictionary<string, string>> cities;
            bool hasDescription = true;
            try
            {
                cities = await ReadRowsAsync(request.RequestContext, "LOGISTICSADDRESSCITY",
                    "NAME,DESCRIPTION,COUNTYID", "COUNTRYREGIONID = @CR AND STATEID = '" + Sanitize(stateId) + "'", "NAME", 2000).ConfigureAwait(false);
            }
            catch
            {
                hasDescription = false;
                cities = await ReadRowsAsync(request.RequestContext, "LOGISTICSADDRESSCITY",
                    "NAME,COUNTYID", "COUNTRYREGIONID = @CR AND STATEID = '" + Sanitize(stateId) + "'", "NAME", 2000).ConfigureAwait(false);
            }

            string cityName = null;
            string[] targets = provNorm.Length > 0 ? new[] { distNorm, provNorm } : new[] { distNorm };
            foreach (string target in targets)
            {
                if (string.IsNullOrEmpty(target) || cityName != null) continue;

                if (hasDescription)
                {
                    // (a) código con county correcto
                    cityName = MatchByNameWithCounty(cities, "DESCRIPTION", "NAME", target, countyId);
                    if (cityName != null) { notes.Add("city via DESCRIPTION+county"); break; }
                    // (b) código dentro del state
                    cityName = MatchByName(cities, "DESCRIPTION", "NAME", target);
                    if (cityName != null) { notes.Add("city via DESCRIPTION"); break; }
                }
                // (c) fila por nombre
                cityName = MatchByName(cities, "NAME", "NAME", target);
                if (cityName != null) { notes.Add("city via NAME"); break; }
            }

            if (cityName == null)
            {
                result.Notes = "distrito '" + request.Distrito + "'/provincia '" + request.Provincia + "' no encontrados en maestro CITY (state " + stateId + (hasDescription ? "" : ", sin DESCRIPTION") + ")";
                return new ResolveUbigeoResponse(result);
            }
            result.CityName = cityName;
            notes.Add("city=" + cityName);

            result.IsValid = true;
            result.Notes = string.Join(" | ", notes);
            return new ResolveUbigeoResponse(result);
        }

        private static async Task<List<Dictionary<string, string>>> ReadRowsAsync(
            RequestContext ctx, string table, string cols, string where, string orderBy, int top)
        {
            var rows = new List<Dictionary<string, string>>();
            var q = new SqlPagedQuery(QueryResultSettings.AllRecords)
            {
                DatabaseSchema = "ax",
                Select = new ColumnSet(cols.Split(',')),
                From = table,
                Where = where,
                OrderBy = orderBy
            };
            q.Parameters["@CR"] = CountryRegion;
            q.Paging.Top = top;

            using (var db = new DatabaseContext(ctx))
            {
                foreach (ExtensionsEntity row in await db.ReadEntityAsync<ExtensionsEntity>(q).ConfigureAwait(false))
                {
                    var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                    foreach (string c in cols.Split(','))
                    {
                        object v = ((ExtensibleObject)row).GetProperty(c);
                        dict[c] = v != null ? v.ToString() : string.Empty;
                    }
                    rows.Add(dict);
                    if (rows.Count >= top) break;
                }
            }
            return rows;
        }

        /// <summary>Devuelve valueCol de la primera fila cuyo nameCol matchea normalizado, o null.</summary>
        private static string MatchByName(List<Dictionary<string, string>> rows, string nameCol, string valueCol, string targetNorm)
        {
            foreach (var row in rows)
            {
                string name;
                if (row.TryGetValue(nameCol, out name) && Normalize(name) == targetNorm)
                {
                    return row[valueCol];
                }
            }
            return null;
        }

        /// <summary>Como MatchByName pero exigiendo además COUNTYID == countyId.</summary>
        private static string MatchByNameWithCounty(List<Dictionary<string, string>> rows, string nameCol, string valueCol, string targetNorm, string countyId)
        {
            foreach (var row in rows)
            {
                string name, county;
                if (row.TryGetValue(nameCol, out name) && Normalize(name) == targetNorm
                    && row.TryGetValue("COUNTYID", out county) && county == countyId)
                {
                    return row[valueCol];
                }
            }
            return null;
        }

        /// <summary>MAYÚSCULAS + sin diacríticos + espacios colapsados ("Junín " == "JUNIN").</summary>
        private static string Normalize(string value)
        {
            if (string.IsNullOrEmpty(value)) return string.Empty;
            string formD = value.Trim().Normalize(NormalizationForm.FormD);
            var sb = new StringBuilder(formD.Length);
            foreach (char c in formD)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                    sb.Append(c);
            }
            string flat = sb.ToString().Normalize(NormalizationForm.FormC).ToUpperInvariant();
            while (flat.Contains("  ")) flat = flat.Replace("  ", " ");
            return flat;
        }

        /// <summary>stateId viene del propio maestro, pero por higiene: solo alfanuméricos.</summary>
        private static string Sanitize(string value)
        {
            if (string.IsNullOrEmpty(value)) return string.Empty;
            var sb = new StringBuilder(value.Length);
            foreach (char c in value)
            {
                if (char.IsLetterOrDigit(c)) sb.Append(c);
            }
            return sb.ToString();
        }
    }
}
