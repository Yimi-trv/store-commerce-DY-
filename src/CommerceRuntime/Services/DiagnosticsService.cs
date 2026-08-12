using System;
using System.Collections.Generic;
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
    public class DiagnosticsService : IRequestHandlerAsync
    {
        public IEnumerable<Type> SupportedRequestTypes => new[]
        {
            typeof(RunDiagnosticRequest)
        };

        public async Task<Response> Execute(Request request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            if (request is RunDiagnosticRequest diagRequest)
                return await RunAsync(diagRequest).ConfigureAwait(false);

            throw new NotSupportedException(
                string.Format(System.Globalization.CultureInfo.InvariantCulture,
                    "Request '{0}' is not supported.", request.GetType()));
        }

        private async Task<RunDiagnosticResponse> RunAsync(RunDiagnosticRequest request)
        {
            string dataAreaId = RequestContextExtensions.GetChannelConfiguration(request.RequestContext)
                .InventLocationDataAreaId;

            string mode = (request.Mode ?? string.Empty).Trim();

            ElectronicDocumentResult result;

            if (mode.Equals("Views", StringComparison.OrdinalIgnoreCase))
            {
                result = await RunViewsAsync(request, dataAreaId).ConfigureAwait(false);
            }
            else if (mode.Equals("ProbeTables", StringComparison.OrdinalIgnoreCase))
            {
                result = await RunProbeTablesAsync(request).ConfigureAwait(false);
            }
            else if (mode.Equals("Inventory", StringComparison.OrdinalIgnoreCase))
            {
                result = await RunInventoryAsync(request).ConfigureAwait(false);
            }
            else if (mode.Equals("AddressDiag", StringComparison.OrdinalIgnoreCase))
            {
                result = await RunAddressDiagAsync(request).ConfigureAwait(false);
            }
            else if (mode.Equals("ViewDef", StringComparison.OrdinalIgnoreCase))
            {
                result = await RunViewDefAsync(request).ConfigureAwait(false);
            }
            else if (mode.Equals("GeoMasters", StringComparison.OrdinalIgnoreCase))
            {
                result = await RunGeoMastersAsync(request).ConfigureAwait(false);
            }
            else
            {
                result = new ElectronicDocumentResult { Id = 1 };
                result.Success = false;
                result.ErrorMessage = "Unknown mode '" + mode + "'. Valid: Views | ProbeTables | Inventory | AddressDiag | ViewDef | GeoMasters.";
            }

            return new RunDiagnosticResponse(result);
        }

        private async Task<ElectronicDocumentResult> RunViewsAsync(RunDiagnosticRequest request, string dataAreaId)
        {
            var result = new ElectronicDocumentResult { Id = 1 };
            var diag = new StringBuilder();
            diag.Append("=== SQL VIEWS DIAGNOSTIC (10.0.47) ===\n");
            diag.Append("DataAreaId: " + dataAreaId + "\n");
            diag.Append("ReceiptId: " + request.ReceiptId + "\n\n");

            string[][] views = new[] {
                new[] { "ext", "DPCUSTOMERSVIEWV2_PEVIEW", "NAME", "1=1", "@DA", dataAreaId },
                new[] { "ext", "DPDireccionReceptor_PEVIEW", "DIRECCION", "1=1", "@DA", dataAreaId },
                new[] { "ext", "DPDireccionReceptorAsync_PEVIEW", "DIRECCION", "1=1", "@DA", dataAreaId },
                new[] { "ext", "DPNombreTienda_PEVIEW", "NAME", "DATAAREAID = @DA", "@DA", dataAreaId },
                new[] { "ext", "DPRetailSalesTaxOverride_PEVIEW", "CODE,SOURCETAXGROUP", "DATAAREAID = @DA", "@DA", dataAreaId },
                new[] { "ext", "DPLOGISTICSELECTRONICADDRESS_PEVIEW", "ACCOUNTNUM,TYPE,LOCATOR", "DATAAREAID = @DA", "@DA", dataAreaId },
                new[] { "ext", "DPRETAILTRANSACTIONSALESTRANS_PEVIEW", "LINENUM,ITEMID,NAMEALIAS", "DATAAREAID = @DA AND TRANSACTIONID = @P2", "@DA", dataAreaId },
                new[] { "ext", "DPPARAMETERSGENERAL_PE", "NUMBERDOCUMID,COMPANYNAME", "DATAAREAID = @DA", "@DA", dataAreaId },
                new[] { "ext", "DPCUSTTABLEVIEW", "ACCOUNTNUM,DPTYPEDOCID_PE,DPNUMBERDOCUMID_PE", "DATAAREAID = @DA", "@DA", dataAreaId },
                new[] { "ext", "DPPAYMENTTRANSTYPE_PEVIEW", "TENDERTYPE,AMOUNTCUR", "DATAAREAID = @DA AND TRANSACTIONID = @P2", "@DA", dataAreaId },
                new[] { "ext", "DPCURRENCY_PEVIEW", "CURRENCYCODE,TXT", "CURRENCYCODE = @DA", "@DA", "PEN" },
                new[] { "ext", "DPDatosContactoEmisor_PEVIEW", "WEB,TELEFONO", "DATAAREAID = @DA", "@DA", dataAreaId },
                new[] { "ext", "DPMarkupTable_PEVIEW", "MARKUPCODE,VALUE", "DATAAREAID = @DA", "@DA", dataAreaId },
                new[] { "ext", "DPFactorCargoPercep_PEVIEW", "MARKUPCODE,VALUE", "DATAAREAID = @DA AND TRANSACTIONID = @P2", "@DA", dataAreaId },
            };

            foreach (var v in views)
            {
                string schema = v[0], table = v[1], cols = v[2], where = v[3], pName = v[4], pVal = v[5];
                try
                {
                    var q = new SqlPagedQuery(QueryResultSettings.SingleRecord)
                    {
                        DatabaseSchema = schema,
                        Select = new ColumnSet(cols.Split(',')),
                        From = table,
                        Where = where
                    };
                    if (where.Contains("@DA")) q.Parameters[pName] = pVal;
                    if (where.Contains("@P2"))
                        q.Parameters["@P2"] = request.ReceiptId;

                    int count = 0;
                    string sample = "";
                    using (var db = new DatabaseContext(request.RequestContext))
                    {
                        foreach (ExtensionsEntity row in await db.ReadEntityAsync<ExtensionsEntity>(q).ConfigureAwait(false))
                        {
                            count++;
                            if (count == 1)
                            {
                                var parts = new List<string>();
                                foreach (string col in cols.Split(','))
                                {
                                    try { var val = ((ExtensibleObject)row).GetProperty(col); parts.Add(col + "=" + (val ?? "NULL")); }
                                    catch { parts.Add(col + "=ERR"); }
                                }
                                sample = string.Join(" | ", parts);
                            }
                            break;
                        }
                    }
                    diag.Append(schema + "." + table + " => " + (count > 0 ? "OK: " + sample : "EMPTY") + "\n");
                }
                catch (Exception ex)
                {
                    diag.Append(schema + "." + table + " => FAIL: " + DeepError(ex) + "\n");
                }
            }

            result.TxtContent = diag.ToString();
            result.Success = true;
            result.FileName = "diagnostic-views.txt";
            return result;
        }

        private async Task<ElectronicDocumentResult> RunProbeTablesAsync(RunDiagnosticRequest request)
        {
            var result = new ElectronicDocumentResult { Id = 1 };
            var pb = new StringBuilder();
            pb.Append("=== CHANNEL DB TABLE PROBE ===\n");
            string[][] tables = new[] {
                new[] { "ax", "DIRPARTYTABLE", "RECID" },
                new[] { "ax", "DIRPARTYLOCATION", "RECID" },
                new[] { "ax", "DIRPERSONNAME", "RECID" },
                new[] { "ax", "DIRPERSON", "RECID" },
                new[] { "ax", "LOGISTICSPOSTALADDRESS", "RECID" },
                new[] { "ax", "LOGISTICSELECTRONICADDRESS", "RECID" },
                new[] { "ax", "LOGISTICSADDRESSCITY", "RECID" },
                new[] { "ax", "LOGISTICSADDRESSSTATE", "STATEID" },
                new[] { "ax", "LOGISTICSADDRESSCOUNTY", "COUNTYID" },
                new[] { "ax", "COMPANYINFO", "RECID" },
                new[] { "ax", "OMINTERNALORGANIZATION", "RECID" },
                new[] { "ax", "MARKUPTABLE", "MARKUPCODE" },
                new[] { "ax", "TAXDATA", "TAXCODE" },
                new[] { "ax", "MCRCUSTTABLE", "RECID" },
                new[] { "ax", "RETAILMEDIARESOURCE", "RECID" },
                new[] { "ax", "CUSTTABLE", "ACCOUNTNUM" },
                new[] { "ax", "RETAILCUSTTABLE", "ACCOUNTNUM" },
                new[] { "ax", "RETAILSTORETABLE", "STORENUMBER" },
                new[] { "ax", "RETAILCHANNELTABLE", "RECID" },
                new[] { "ax", "INVENTTABLE", "ITEMID" },
                new[] { "ax", "RETAILTRANSACTIONTABLE", "TRANSACTIONID" },
                new[] { "ax", "RETAILASYNCCUSTOMER", "RECID" },
                new[] { "ax", "RETAILASYNCCUSTOMERV2", "RECID" },
                new[] { "ax", "RETAILASYNCADDRESS", "RECID" },
                new[] { "ax", "RETAILASYNCADDRESSV2", "RECID" },
                new[] { "ax", "LOGISTICSLOCATION", "RECID" },
                new[] { "ax", "OMOPERATINGUNIT", "RECID" },
                new[] { "ax", "RETAILSALESTAXOVERRIDEGROUP", "RECID" },
                new[] { "ax", "RETAILSALESTAXOVERRIDE", "CODE" },
                new[] { "ext", "DPPARAMETERSGENERAL_PE", "NUMBERDOCUMID" },
                new[] { "ext", "DPCUSTTABLE_PE", "RECID" },
                new[] { "ext", "CUSTTABLE", "ACCOUNTNUM" },
                new[] { "ext", "TAXTABLE", "TAXCODE" },
                new[] { "ext", "MARKUPTABLE", "MARKUPCODE" },
                new[] { "ext", "INVENTTABLE", "ITEMID" },
                new[] { "ext", "UNITOFMEASURE", "SYMBOL" },
                new[] { "ext", "DPTYPEDOCUMIDENT_PE", "RECID" },
                new[] { "ext", "DPRETAILTRANSACTIONTABLE_PE", "TRANSACTIONID" },
            };
            foreach (var t in tables)
            {
                string schema = t[0], table = t[1], col = t[2];
                try
                {
                    var q = new SqlPagedQuery(QueryResultSettings.SingleRecord)
                    {
                        DatabaseSchema = schema,
                        Select = new ColumnSet(new[] { col }),
                        From = table,
                        Where = "1=1"
                    };
                    int cnt = 0;
                    using (var db = new DatabaseContext(request.RequestContext))
                    {
                        foreach (ExtensionsEntity row in await db.ReadEntityAsync<ExtensionsEntity>(q).ConfigureAwait(false))
                        { cnt++; break; }
                    }
                    pb.Append(schema + "." + table + " => " + (cnt > 0 ? "EXISTS+DATA" : "EXISTS(empty)") + "\n");
                }
                catch (Exception ex) { pb.Append(schema + "." + table + " => FAIL: " + DeepError(ex) + "\n"); }
            }
            result.TxtContent = pb.ToString();
            result.Success = true;
            result.FileName = "table-probe.txt";
            return result;
        }

        private async Task<ElectronicDocumentResult> RunInventoryAsync(RunDiagnosticRequest request)
        {
            var result = new ElectronicDocumentResult { Id = 1 };
            var tb = new StringBuilder();
            tb.Append("=== CHANNEL DB INVENTORY ===\n\n");

            try
            {
                var q = new SqlPagedQuery(QueryResultSettings.AllRecords)
                {
                    DatabaseSchema = "sys",
                    Select = new ColumnSet(new[] { "name", "object_id", "type_desc", "schema_id" }),
                    From = "objects",
                    Where = "type IN ('U','V') AND schema_id IN (SCHEMA_ID('ax'), SCHEMA_ID('ext'), SCHEMA_ID('crt'), SCHEMA_ID('dbo'))"
                };
                q.Paging.Top = 2000;

                using (var db = new DatabaseContext(request.RequestContext))
                {
                    foreach (ExtensionsEntity row in await db.ReadEntityAsync<ExtensionsEntity>(q).ConfigureAwait(false))
                    {
                        string name = GetStr(row, "name");
                        string typeDesc = GetStr(row, "type_desc");
                        string schemaId = GetStr(row, "schema_id");
                        tb.Append(schemaId + "|" + name + "|" + typeDesc + "\n");
                    }
                }
            }
            catch (Exception ex)
            {
                tb.Append("sys.objects failed: " + ex.Message.Substring(0, Math.Min(ex.Message.Length, 200)) + "\n\n");

                // Fallback: INFORMATION_SCHEMA
                tb.Append("Trying INFORMATION_SCHEMA...\n");
                try
                {
                    var q2 = new SqlPagedQuery(QueryResultSettings.AllRecords)
                    {
                        DatabaseSchema = "INFORMATION_SCHEMA",
                        Select = new ColumnSet(new[] { "TABLE_SCHEMA", "TABLE_NAME", "TABLE_TYPE" }),
                        From = "TABLES",
                        Where = "1=1"
                    };
                    q2.Paging.Top = 2000;

                    using (var db = new DatabaseContext(request.RequestContext))
                    {
                        foreach (ExtensionsEntity row in await db.ReadEntityAsync<ExtensionsEntity>(q2).ConfigureAwait(false))
                        {
                            string schema = GetStr(row, "TABLE_SCHEMA");
                            string name = GetStr(row, "TABLE_NAME");
                            string type = GetStr(row, "TABLE_TYPE");
                            tb.Append(schema + "|" + name + "|" + type + "\n");
                        }
                    }
                }
                catch (Exception ex2)
                {
                    tb.Append("INFORMATION_SCHEMA also failed: " + ex2.Message.Substring(0, Math.Min(ex2.Message.Length, 200)) + "\n");
                }
            }

            result.TxtContent = tb.ToString();
            result.Success = true;
            result.FileName = "channel-db-inventory.txt";
            return result;
        }

        private async Task<ElectronicDocumentResult> RunAddressDiagAsync(RunDiagnosticRequest request)
        {
            var result = new ElectronicDocumentResult { Id = 1 };
            var ctx = request.RequestContext;
            var sb = new StringBuilder();
            sb.Append("=== ADDRESS JOIN DIAGNOSTIC ===\n\n");
            sb.Append("[1] DIRPARTYLOCATION any IsPrimary=1  => " + await Probe(ctx, "ax", "RECID", "DIRPARTYLOCATION", "ISPRIMARY = 1") + "\n");
            sb.Append("[2] LogisticsPostalAddress sample     => " + await Sample(ctx, "ax", "LOCATION,VALIDFROM,VALIDTO", "LOGISTICSPOSTALADDRESS", "1=1") + "\n");
            sb.Append("[3] DIRPARTYLOCATION sample           => " + await Sample(ctx, "ax", "LOCATION,ISPRIMARY", "DIRPARTYLOCATION", "1=1") + "\n");
            sb.Append("[4] JOIN by Location only             => " + await Probe(ctx, "ax", "pl.RECID", "DIRPARTYLOCATION pl INNER JOIN ax.LogisticsPostalAddress pa ON pl.Location = pa.Location", "1=1") + "\n");
            sb.Append("[5] JOIN + IsPrimary=1                => " + await Probe(ctx, "ax", "pl.RECID", "DIRPARTYLOCATION pl INNER JOIN ax.LogisticsPostalAddress pa ON pl.Location = pa.Location AND pl.IsPrimary = 1", "1=1") + "\n");
            sb.Append("[6] JOIN + IsPrimary + date window    => " + await Probe(ctx, "ax", "pl.RECID", "DIRPARTYLOCATION pl INNER JOIN ax.LogisticsPostalAddress pa ON pl.Location = pa.Location AND pl.IsPrimary = 1 AND (GETUTCDATE() BETWEEN pa.VALIDFROM AND pa.VALIDTO)", "1=1") + "\n");
            result.TxtContent = sb.ToString();
            result.Success = true;
            result.FileName = "address-diag.txt";
            return result;
        }

        private async Task<ElectronicDocumentResult> RunViewDefAsync(RunDiagnosticRequest request)
        {
            var result = new ElectronicDocumentResult { Id = 1 };
            var ctx = request.RequestContext;
            var sb = new StringBuilder();
            sb.Append("=== DEFINICION REAL de ext.DPDireccionReceptor_PEVIEW ===\n\n");
            sb.Append(await Sample(ctx, "sys", "definition", "sql_modules", "object_id = OBJECT_ID('ext.DPDireccionReceptor_PEVIEW')"));
            sb.Append("\n\n(contiene 'WHERE 1=0' / 'CAST(0 AS BIGINT)' => STUB)\n");
            sb.Append("(contiene 'DIRPARTYLOCATION' / 'LogisticsPostalAddress' => vista REAL)\n");
            result.TxtContent = sb.ToString();
            result.Success = true;
            result.FileName = "viewdef.txt";
            return result;
        }

        /// <summary>
        /// Recon de maestros geográficos (Fase F1: dirección SUNAT válida).
        /// Muestra CÓMO están registrados departamento (State), provincia (County), distrito
        /// (City/District) y ZIP en el channel DB, usando HUARAZ/ANCASH como caso de prueba
        /// (el mismo del RUC de test). Con esto se diseña el armado de Address que valide.
        /// ReceiptId (opcional) permite sondear otro nombre: se usa como filtro NAME LIKE.
        /// </summary>
        private async Task<ElectronicDocumentResult> RunGeoMastersAsync(RunDiagnosticRequest request)
        {
            var result = new ElectronicDocumentResult { Id = 1 };
            var ctx = request.RequestContext;
            string probeName = string.IsNullOrEmpty(request.ReceiptId) ? "HUARAZ" : request.ReceiptId.Trim().ToUpperInvariant().Replace("'", "").Replace(";", "");
            var sb = new StringBuilder();
            sb.Append("=== GEO MASTERS RECON (F1 direccion SUNAT) === probe: " + probeName + "\n\n");

            sb.Append("[STATE count PER]    => " + await Probe(ctx, "ax", "STATEID", "LOGISTICSADDRESSSTATE", "COUNTRYREGIONID = 'PER'") + "\n");
            sb.Append("[STATE sample PER]   => " + await Sample(ctx, "ax", "STATEID,NAME,COUNTRYREGIONID", "LOGISTICSADDRESSSTATE", "COUNTRYREGIONID = 'PER'") + "\n");
            sb.Append("[STATE '02']         => " + await Sample(ctx, "ax", "STATEID,NAME", "LOGISTICSADDRESSSTATE", "COUNTRYREGIONID = 'PER' AND STATEID = '02'") + "\n");
            sb.Append("[STATE ANCASH]       => " + await Sample(ctx, "ax", "STATEID,NAME", "LOGISTICSADDRESSSTATE", "COUNTRYREGIONID = 'PER' AND NAME LIKE '%ANCASH%'") + "\n\n");

            sb.Append("[COUNTY count PER]   => " + await Probe(ctx, "ax", "COUNTYID", "LOGISTICSADDRESSCOUNTY", "COUNTRYREGIONID = 'PER'") + "\n");
            sb.Append("[COUNTY sample PER]  => " + await Sample(ctx, "ax", "COUNTYID,NAME,STATEID,COUNTRYREGIONID", "LOGISTICSADDRESSCOUNTY", "COUNTRYREGIONID = 'PER'") + "\n");
            sb.Append("[COUNTY ~" + probeName + "] => " + await Sample(ctx, "ax", "COUNTYID,NAME,STATEID", "LOGISTICSADDRESSCOUNTY", "COUNTRYREGIONID = 'PER' AND NAME LIKE '%" + probeName + "%'") + "\n\n");

            sb.Append("[CITY count PER]     => " + await Probe(ctx, "ax", "NAME", "LOGISTICSADDRESSCITY", "COUNTRYREGIONID = 'PER'") + "\n");
            sb.Append("[CITY sample PER]    => " + await Sample(ctx, "ax", "NAME,COUNTYID,STATEID,COUNTRYREGIONID", "LOGISTICSADDRESSCITY", "COUNTRYREGIONID = 'PER'") + "\n");
            sb.Append("[CITY = " + probeName + "]  => " + await Sample(ctx, "ax", "NAME,COUNTYID,STATEID", "LOGISTICSADDRESSCITY", "COUNTRYREGIONID = 'PER' AND NAME = '" + probeName + "'") + "\n");
            // Convención del entorno: City guarda el CÓDIGO ubigeo (filas NAME numérico) y el nombre
            // humano estaría en DESCRIPTION. Confirmación para el resolver F1:
            sb.Append("[CITY cols]          =>\n  " + await SampleMany(ctx, "INFORMATION_SCHEMA", "COLUMN_NAME", "COLUMNS", "TABLE_NAME = 'LOGISTICSADDRESSCITY'", 30) + "\n");
            sb.Append("[CITY state02 +DESC] =>\n  " + await SampleMany(ctx, "ax", "NAME,DESCRIPTION,COUNTYID,STATEID", "LOGISTICSADDRESSCITY", "COUNTRYREGIONID = 'PER' AND STATEID = '02'", 8) + "\n");
            sb.Append("[CITY state02 -DESC] =>\n  " + await SampleMany(ctx, "ax", "NAME,COUNTYID,STATEID", "LOGISTICSADDRESSCITY", "COUNTRYREGIONID = 'PER' AND STATEID = '02'", 8) + "\n\n");

            // Columnas reales de las tablas cuyo schema difiere del estandar (descubierto en la
            // corrida 2026-07-10: DISTRICT/ZIP no tienen COUNTRYREGIONID/STATEID/COUNTYID).
            sb.Append("[DISTRICT cols]      =>\n  " + await SampleMany(ctx, "INFORMATION_SCHEMA", "COLUMN_NAME", "COLUMNS", "TABLE_NAME = 'LOGISTICSADDRESSDISTRICT'", 40) + "\n");
            sb.Append("[ZIP cols]           =>\n  " + await SampleMany(ctx, "INFORMATION_SCHEMA", "COLUMN_NAME", "COLUMNS", "TABLE_NAME = 'LOGISTICSADDRESSZIPCODE'", 40) + "\n");
            sb.Append("[DISTRICT sample]    => " + await Sample(ctx, "ax", "NAME", "LOGISTICSADDRESSDISTRICT", "1=1") + "\n\n");

            sb.Append("[ZIP count PER]      => " + await Probe(ctx, "ax", "ZIPCODE", "LOGISTICSADDRESSZIPCODE", "COUNTRYREGIONID = 'PER'") + "\n");
            sb.Append("[ZIP sample]         => " + await Sample(ctx, "ax", "ZIPCODE,CITY", "LOGISTICSADDRESSZIPCODE", "1=1") + "\n\n");

            // LOGISTICSPOSTALADDRESS: la columna de provincia es COUNTY (no COUNTYID).
            sb.Append("[ADDR real " + probeName + "]   =>\n  " + await SampleMany(ctx, "ax", "CITY,COUNTY,STATE,DISTRICTNAME,ZIPCODE,COUNTRYREGIONID", "LOGISTICSPOSTALADDRESS", "CITY LIKE '%" + probeName + "%'", 3) + "\n");
            sb.Append("(ADDR real: asi guarda D365 una direccion valida existente => copiar ese formato)\n");

            result.TxtContent = sb.ToString();
            result.Success = true;
            result.FileName = "geo-masters.txt";
            return result;
        }

        private static async Task<string> Probe(RequestContext ctx, string schema, string col, string from, string where)
        {
            try
            {
                var q = new SqlPagedQuery(QueryResultSettings.SingleRecord)
                { DatabaseSchema = schema, Select = new ColumnSet(col.Split(',')), From = from, Where = where };
                using (var db = new DatabaseContext(ctx))
                {
                    foreach (ExtensionsEntity r in await db.ReadEntityAsync<ExtensionsEntity>(q).ConfigureAwait(false))
                        return "EXISTS+DATA";
                }
                return "EMPTY";
            }
            catch (Exception ex) { return "FAIL: " + DeepError(ex); }
        }

        private static async Task<string> Sample(RequestContext ctx, string schema, string cols, string from, string where)
        {
            try
            {
                var q = new SqlPagedQuery(QueryResultSettings.SingleRecord)
                { DatabaseSchema = schema, Select = new ColumnSet(cols.Split(',')), From = from, Where = where };
                using (var db = new DatabaseContext(ctx))
                {
                    foreach (ExtensionsEntity r in await db.ReadEntityAsync<ExtensionsEntity>(q).ConfigureAwait(false))
                    {
                        var parts = new List<string>();
                        foreach (string c in cols.Split(','))
                        {
                            string cn = c.Contains(".") ? c.Substring(c.IndexOf('.') + 1) : c;
                            try { var v = ((ExtensibleObject)r).GetProperty(cn); parts.Add(cn + "=" + (v ?? "NULL")); }
                            catch { parts.Add(cn + "=ERR"); }
                        }
                        return string.Join(", ", parts);
                    }
                }
                return "EMPTY";
            }
            catch (Exception ex) { return "FAIL: " + DeepError(ex); }
        }

        /// <summary>Como Sample pero devuelve hasta 'top' filas (una por linea).</summary>
        private static async Task<string> SampleMany(RequestContext ctx, string schema, string cols, string from, string where, int top)
        {
            try
            {
                var q = new SqlPagedQuery(QueryResultSettings.AllRecords)
                { DatabaseSchema = schema, Select = new ColumnSet(cols.Split(',')), From = from, Where = where };
                // SqlPagedQuery con Paging.Top exige OrderBy (aprendido en UAT: "OrderBy has to be
                // defined for paged query"). Ordenamos por la primera columna pedida.
                q.OrderBy = cols.Split(',')[0].Trim();
                q.Paging.Top = top;
                var lines = new List<string>();
                using (var db = new DatabaseContext(ctx))
                {
                    foreach (ExtensionsEntity r in await db.ReadEntityAsync<ExtensionsEntity>(q).ConfigureAwait(false))
                    {
                        var parts = new List<string>();
                        foreach (string c in cols.Split(','))
                        {
                            string cn = c.Contains(".") ? c.Substring(c.IndexOf('.') + 1) : c;
                            try { var v = ((ExtensibleObject)r).GetProperty(cn); parts.Add(cn + "=" + (v ?? "NULL")); }
                            catch { parts.Add(cn + "=ERR"); }
                        }
                        lines.Add(string.Join(", ", parts));
                        if (lines.Count >= top) break;
                    }
                }
                return lines.Count > 0 ? string.Join("\n  ", lines) : "EMPTY";
            }
            catch (Exception ex) { return "FAIL: " + DeepError(ex); }
        }

        private static string DeepError(Exception ex)
        {
            var sb = new StringBuilder();
            var cur = ex;
            int depth = 0;
            while (cur != null && depth < 5)
            {
                if (sb.Length > 0) sb.Append(" <-- ");
                sb.Append(cur.GetType().Name + ": " + cur.Message);
                cur = cur.InnerException;
                depth++;
            }
            string s = sb.ToString();
            return s.Substring(0, Math.Min(s.Length, 400));
        }

        private static string GetStr(ExtensionsEntity row, string prop)
        {
            object v = ((ExtensibleObject)row).GetProperty(prop);
            return v != null ? v.ToString() : "";
        }
    }
}
