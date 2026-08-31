using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Runtime.Serialization;
using System.Runtime.Serialization.Json;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Dynamics.Commerce.Runtime;
using Microsoft.Dynamics.Commerce.Runtime.Messages;
using Trujillo.PeruEInvoicing.CommerceRuntime.Entities;
using Trujillo.PeruEInvoicing.CommerceRuntime.Messages;

namespace Trujillo.PeruEInvoicing.CommerceRuntime.Services
{
    /// <summary>
    /// CONSULTA DE DNI Y RUC, CON PROVEEDOR PRINCIPAL Y RESPALDO
    /// =========================================================
    ///
    /// Factiliza primero, PeruDevs de respaldo. Devuelve siempre la misma forma
    /// (SunatCustomerResult), sepa o no el POS de dónde salió el dato.
    ///
    /// POR QUÉ ESTO ESTÁ EN EL SERVIDOR Y NO EN EL POS
    /// La clave del proveedor iba escrita en el TypeScript que se despliega a cada caja:
    /// cualquiera con F12 podía leerla. Desde aquí no sale del CSU. Y cambiar de proveedor o
    /// corregir un mapeo deja de exigir reempaquetar y desplegar a todas las cajas.
    ///
    /// CADA PROVEEDOR TRAE SU PROPIO MAPEO, Y ES A PROPÓSITO
    /// Las dos APIs no solo usan nombres distintos: usan el MISMO nombre para cosas distintas.
    /// En PeruDevs `estado` es un booleano que dice si la consulta salió bien; en Factiliza
    /// `estado` es el estado del contribuyente ("ACTIVO"). Un mapeo compartido daría por buena
    /// una respuesta de Factiliza leyendo "ACTIVO" como "sí, salió bien".
    /// </summary>
    public class SunatLookupService : IRequestHandlerAsync
    {
        public IEnumerable<Type> SupportedRequestTypes => new[]
        {
            typeof(ConsultarDocumentoSunatRequest)
        };

        // ─────────────────────────────────────────────────────────────────────────────
        //  CONFIGURACIÓN
        // ─────────────────────────────────────────────────────────────────────────────

        /// <summary>
        /// Token de Factiliza. VACÍO = Factiliza se salta y se consulta solo PeruDevs.
        ///
        /// Eso es deliberado: mientras no haya token el comportamiento es exactamente el de
        /// antes, así que esto se puede desplegar sin esperar a la credencial y sin romper nada.
        /// </summary>
        private const string FactilizaToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MTk0NiJ9.APE9LknLx5FnryA60c0hnfqpfiPPNoiGpiOqvmaJbHU";

        /// <summary>Clave de PeruDevs. Estaba en el TypeScript del POS, a la vista de cualquiera.</summary>
        private const string PeruDevsKey =
            "cGVydWRldnMucHJvZHVjdGlvbi5maXRjb2RlcnMuNjgxY2IzYzE5ZmE0MTczZjYxMzIwYWVh";

        /// <summary>
        /// Por proveedor. Con dos en serie el peor caso es el doble, y al otro lado hay un
        /// cajero con un cliente delante: 5 s cada uno deja el techo en 10.
        /// </summary>
        private static readonly TimeSpan TiempoLimite = TimeSpan.FromSeconds(5);

        /// <summary>
        /// Uno solo para todo el proceso. Crear un HttpClient por llamada agota los sockets del
        /// servidor: quedan en TIME_WAIT y bajo carga el CSU se queda sin puertos.
        /// </summary>
        private static readonly HttpClient Cliente = new HttpClient { Timeout = TiempoLimite };

        // ─────────────────────────────────────────────────────────────────────────────

        public async Task<Response> Execute(Request request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            if (request is ConsultarDocumentoSunatRequest consulta)
                return await ConsultarAsync(consulta).ConfigureAwait(false);

            throw new NotSupportedException(
                string.Format(CultureInfo.InvariantCulture,
                    "Request '{0}' is not supported.", request.GetType()));
        }

        private async Task<ConsultarDocumentoSunatResponse> ConsultarAsync(ConsultarDocumentoSunatRequest request)
        {
            var documento = new string((request.Documento ?? string.Empty).Where(char.IsDigit).ToArray());
            var esRuc = documento.Length == 11;

            if (!esRuc && documento.Length != 8)
            {
                return Responder(NoValido("Ingrese un DNI de 8 digitos o un RUC de 11 digitos."));
            }

            var motivos = new List<string>();

            foreach (var proveedor in Proveedores())
            {
                ResultadoProveedor resultado;

                try
                {
                    resultado = await proveedor.ConsultarAsync(documento, esRuc).ConfigureAwait(false);
                }
                catch (Exception excepcion)
                {
                    // Un proveedor que revienta no puede tumbar la consulta entera: se anota y
                    // se prueba el siguiente.
                    motivos.Add(proveedor.Nombre + ": " + excepcion.Message);
                    continue;
                }

                if (resultado.Estado == EstadoConsulta.Encontrado)
                {
                    resultado.Datos.Provider = proveedor.Nombre;
                    return Responder(resultado.Datos);
                }

                if (resultado.Estado == EstadoConsulta.NoExiste)
                {
                    // NO SE CAE AL RESPALDO. "No existe" es una respuesta válida, no un fallo:
                    // preguntarle al segundo proveedor gastaría su cuota y duplicaría la espera
                    // del cajero para llegar a la misma conclusión.
                    return Responder(NoValido(resultado.Mensaje ?? "No se encontro el documento."));
                }

                motivos.Add(proveedor.Nombre + ": " + (resultado.Mensaje ?? "fallo tecnico"));
            }

            return Responder(NoValido(
                "No se pudo consultar el documento. " + string.Join(" | ", motivos)));
        }

        /// <summary>En orden de preferencia. Factiliza no entra si no hay token.</summary>
        private static IEnumerable<IProveedorConsulta> Proveedores()
        {
            if (!string.IsNullOrWhiteSpace(FactilizaToken))
            {
                yield return new ProveedorFactiliza();
            }

            yield return new ProveedorPeruDevs();
        }

        private static ConsultarDocumentoSunatResponse Responder(SunatCustomerResult resultado)
        {
            resultado.Id = 1;
            return new ConsultarDocumentoSunatResponse(resultado);
        }

        private static SunatCustomerResult NoValido(string mensaje)
        {
            return new SunatCustomerResult { Found = false, Message = mensaje };
        }

        // ═════════════════════════════════════════════════════════════════════════════
        //  PROVEEDORES
        // ═════════════════════════════════════════════════════════════════════════════

        private enum EstadoConsulta
        {
            /// <summary>Vino el dato.</summary>
            Encontrado,

            /// <summary>El proveedor respondió bien y dice que ese documento no existe.</summary>
            NoExiste,

            /// <summary>Red, timeout, 5xx, clave rechazada, respuesta ilegible. Se prueba el siguiente.</summary>
            FalloTecnico
        }

        private sealed class ResultadoProveedor
        {
            public EstadoConsulta Estado { get; set; }
            public SunatCustomerResult Datos { get; set; }
            public string Mensaje { get; set; }
        }

        private interface IProveedorConsulta
        {
            string Nombre { get; }
            Task<ResultadoProveedor> ConsultarAsync(string documento, bool esRuc);
        }

        /// <summary>
        /// Lee el cuerpo y lo convierte. Sin Newtonsoft a propósito: no está entre las
        /// dependencias del SDK y meterlo arriesga el conflicto de doble carga de assembly que
        /// ya obligó a quitar la referencia a DP.LocalizacionPeru.
        /// </summary>
        private static T Deserializar<T>(string json)
        {
            using (var flujo = new MemoryStream(Encoding.UTF8.GetBytes(json)))
            {
                return (T)new DataContractJsonSerializer(typeof(T)).ReadObject(flujo);
            }
        }

        /// <summary>
        /// Recorta y, si hace falta, repara el texto doblemente codificado.
        ///
        /// TODO LO QUE MAPEA UN PROVEEDOR PASA POR AQUÍ, y es a propósito: es el único embudo,
        /// así que ningún campo se queda sin reparar por olvido.
        ///
        /// EL PROBLEMA, VERIFICADO CONTRA LA API REAL
        /// Factiliza sirve el texto con los acentos codificados DOS veces. En el DNI 00000001 la
        /// dirección llega como "AV.SAENZ PE\u00C3\u0091A 924": esos dos caracteres son los
        /// bytes UTF-8 de la "Ñ" (C3 91) leídos como si fueran Latin-1. Y no es cosa nuestra —el
        /// servidor declara charset=utf-8 y leerlo a mano da exactamente lo mismo—: el dato ya
        /// sale corrupto de su lado.
        ///
        /// Importa porque "PEÑA", "MUÑOZ" o "GARCÍA" son apellidos corrientes en Perú, y ese
        /// texto termina impreso en un comprobante.
        ///
        /// LA DETECCIÓN TIENE QUE SER LA SEGURA, NO LA OBVIA
        /// "Todos los caracteres caben en un byte y alguno pasa de 0x7F" parece suficiente, pero
        /// un "MUÑOZ" correcto también cumple eso, y reinterpretarlo lo DESTRUYE ("MU?OZ"). Por
        /// eso solo se repara si al reinterpretar sale UTF-8 válido: si aparece el carácter de
        /// reemplazo, el texto ya estaba bien y se devuelve intacto.
        ///
        /// Así vale para los dos proveedores: PeruDevs manda UTF-8 correcto y no se toca.
        /// </summary>
        private static string Texto(string valor)
        {
            var limpio = (valor ?? string.Empty).Trim();

            if (limpio.Length == 0)
            {
                return limpio;
            }

            var sospechoso = false;

            foreach (var caracter in limpio)
            {
                if (caracter > 0xFF)
                {
                    // Hay algo que no cabe en un byte: no puede ser una cadena mal reinterpretada.
                    return limpio;
                }

                if (caracter > 0x7F)
                {
                    sospechoso = true;
                }
            }

            if (!sospechoso)
            {
                return limpio;
            }

            // 28591 = ISO-8859-1. No se usa Encoding.Latin1: no existe en netstandard2.0.
            var reinterpretado = Encoding.UTF8.GetString(Encoding.GetEncoding(28591).GetBytes(limpio));

            return reinterpretado.IndexOf('\uFFFD') >= 0 ? limpio : reinterpretado;
        }

        // ─────────────────────────── FACTILIZA (principal) ───────────────────────────

        private sealed class ProveedorFactiliza : IProveedorConsulta
        {
            public string Nombre => "factiliza";

            public async Task<ResultadoProveedor> ConsultarAsync(string documento, bool esRuc)
            {
                var url = "https://api.factiliza.com/v1/" + (esRuc ? "ruc" : "dni") + "/info/" + documento;

                using (var peticion = new HttpRequestMessage(HttpMethod.Get, url))
                {
                    peticion.Headers.TryAddWithoutValidation("Authorization", "Bearer " + FactilizaToken);

                    using (var respuesta = await Cliente.SendAsync(peticion).ConfigureAwait(false))
                    {
                        var cuerpo = await respuesta.Content.ReadAsStringAsync().ConfigureAwait(false);

                        if (!respuesta.IsSuccessStatusCode)
                        {
                            // 404 y 422 son "ese documento no existe", no una avería: caer al
                            // respaldo por eso gastaría su cuota para llegar a lo mismo.
                            var codigo = (int)respuesta.StatusCode;

                            if (codigo == 404 || codigo == 422)
                            {
                                return new ResultadoProveedor
                                {
                                    Estado = EstadoConsulta.NoExiste,
                                    Mensaje = "No se encontro el documento."
                                };
                            }

                            return new ResultadoProveedor
                            {
                                Estado = EstadoConsulta.FalloTecnico,
                                Mensaje = "HTTP " + codigo
                            };
                        }

                        FactilizaRespuesta parseada;

                        try
                        {
                            parseada = Deserializar<FactilizaRespuesta>(cuerpo);
                        }
                        catch (Exception)
                        {
                            return new ResultadoProveedor
                            {
                                Estado = EstadoConsulta.FalloTecnico,
                                Mensaje = "respuesta ilegible"
                            };
                        }

                        if (parseada == null || !parseada.Success || parseada.Data == null)
                        {
                            return new ResultadoProveedor
                            {
                                Estado = EstadoConsulta.NoExiste,
                                Mensaje = Texto(parseada?.Message) != string.Empty
                                    ? parseada.Message
                                    : "No se encontro el documento."
                            };
                        }

                        return new ResultadoProveedor
                        {
                            Estado = EstadoConsulta.Encontrado,
                            Datos = Mapear(parseada.Data, documento, esRuc)
                        };
                    }
                }
            }

            /// <summary>Forma de Factiliza -> forma común. Nadie más lee estos nombres.</summary>
            private static SunatCustomerResult Mapear(FactilizaData data, string documento, bool esRuc)
            {
                var resultado = new SunatCustomerResult
                {
                    Found = true,
                    DocumentNumber = documento,
                    DocumentType = esRuc ? "RUC" : "DNI",
                    Department = Texto(data.Departamento),
                    Province = Texto(data.Provincia),
                    District = Texto(data.Distrito),
                    Address = Texto(data.Direccion),
                    UbigeoSunat = Texto(data.UbigeoSunat)
                };

                if (esRuc)
                {
                    resultado.Name = Texto(data.NombreORazonSocial);
                    resultado.TaxpayerStatus = Texto(data.Estado);
                    resultado.TaxpayerCondition = Texto(data.Condicion);
                    resultado.IsRetentionAgent = EsSi(data.EsAgenteDeRetencion);
                    resultado.IsPerceptionAgent = EsSi(data.EsAgenteDePercepcion);
                    resultado.IsGoodTaxpayer = EsSi(data.EsBuenContribuyente);
                    resultado.PadronesText = ArmarPadrones(data);
                    return resultado;
                }

                // DNI. LOS DOS APELLIDOS VAN JUNTOS. D365 compone el nombre de una persona como
                // FirstName + MiddleName + LastName; poner el materno en MiddleName sacaba los
                // apellidos al revés en el comprobante ("DANILO MELGAREJO MARCHENA").
                resultado.Name = Texto(data.NombreCompleto) != string.Empty
                    ? Texto(data.NombreCompleto)
                    : Unir(data.ApellidoPaterno, data.ApellidoMaterno, data.Nombres);
                resultado.FirstName = Texto(data.Nombres);
                resultado.LastName = Unir(data.ApellidoPaterno, data.ApellidoMaterno);
                return resultado;
            }

            /// <summary>Factiliza los da sueltos como "SI"/"NO"; el modal los muestra como texto.</summary>
            private static string ArmarPadrones(FactilizaData data)
            {
                var padrones = new List<string>();

                if (EsSi(data.EsAgenteDeRetencion)) padrones.Add("Agente de retencion");
                if (EsSi(data.EsAgenteDePercepcion)) padrones.Add("Agente de percepcion");
                if (EsSi(data.EsAgenteDePercepcionCombustible)) padrones.Add("Agente de percepcion combustible");
                if (EsSi(data.EsBuenContribuyente)) padrones.Add("Buen contribuyente");

                return string.Join(", ", padrones);
            }

            private static bool EsSi(string valor)
            {
                return string.Equals(Texto(valor), "SI", StringComparison.OrdinalIgnoreCase);
            }

            private static string Unir(params string[] partes)
            {
                return string.Join(" ", partes.Select(Texto).Where(p => p != string.Empty));
            }
        }

        [DataContract]
        private sealed class FactilizaRespuesta
        {
            [DataMember(Name = "success")] public bool Success { get; set; }
            [DataMember(Name = "message")] public string Message { get; set; }
            [DataMember(Name = "data")] public FactilizaData Data { get; set; }
        }

        [DataContract]
        private sealed class FactilizaData
        {
            [DataMember(Name = "numero")] public string Numero { get; set; }

            // RUC
            [DataMember(Name = "nombre_o_razon_social")] public string NombreORazonSocial { get; set; }

            /// <summary>OJO: aquí `estado` es el estado del CONTRIBUYENTE ("ACTIVO"), no si la consulta salió bien.</summary>
            [DataMember(Name = "estado")] public string Estado { get; set; }
            [DataMember(Name = "condicion")] public string Condicion { get; set; }
            [DataMember(Name = "es_agente_de_retencion")] public string EsAgenteDeRetencion { get; set; }
            [DataMember(Name = "es_agente_de_percepcion")] public string EsAgenteDePercepcion { get; set; }
            [DataMember(Name = "es_agente_de_percepcion_combustible")] public string EsAgenteDePercepcionCombustible { get; set; }
            [DataMember(Name = "es_buen_contribuyente")] public string EsBuenContribuyente { get; set; }

            // DNI
            [DataMember(Name = "nombres")] public string Nombres { get; set; }
            [DataMember(Name = "apellido_paterno")] public string ApellidoPaterno { get; set; }
            [DataMember(Name = "apellido_materno")] public string ApellidoMaterno { get; set; }
            [DataMember(Name = "nombre_completo")] public string NombreCompleto { get; set; }

            // Comunes
            [DataMember(Name = "departamento")] public string Departamento { get; set; }
            [DataMember(Name = "provincia")] public string Provincia { get; set; }
            [DataMember(Name = "distrito")] public string Distrito { get; set; }
            [DataMember(Name = "direccion")] public string Direccion { get; set; }

            /// <summary>
            /// El de SUNAT, NO el de RENIEC. En un mismo DNI difieren (020105 vs 020102) y el
            /// sistema trabaja con el de SUNAT: tomar el otro metería un distrito equivocado.
            /// </summary>
            [DataMember(Name = "ubigeo_sunat")] public string UbigeoSunat { get; set; }
        }

        // ─────────────────────────── PERUDEVS (respaldo) ───────────────────────────

        private sealed class ProveedorPeruDevs : IProveedorConsulta
        {
            public string Nombre => "perudevs";

            public async Task<ResultadoProveedor> ConsultarAsync(string documento, bool esRuc)
            {
                var url = esRuc
                    ? "https://api.perudevs.com/api/v1/ruc?document=" + documento + "&key=" + PeruDevsKey
                    : "https://api.perudevs.com/api/v1/dni/complete?document=" + documento + "&key=" + PeruDevsKey;

                using (var respuesta = await Cliente.GetAsync(url).ConfigureAwait(false))
                {
                    var cuerpo = await respuesta.Content.ReadAsStringAsync().ConfigureAwait(false);

                    if (!respuesta.IsSuccessStatusCode)
                    {
                        return new ResultadoProveedor
                        {
                            Estado = EstadoConsulta.FalloTecnico,
                            Mensaje = "HTTP " + (int)respuesta.StatusCode
                        };
                    }

                    PeruDevsRespuesta parseada;

                    try
                    {
                        parseada = Deserializar<PeruDevsRespuesta>(cuerpo);
                    }
                    catch (Exception)
                    {
                        return new ResultadoProveedor
                        {
                            Estado = EstadoConsulta.FalloTecnico,
                            Mensaje = "respuesta ilegible"
                        };
                    }

                    if (parseada == null || !parseada.Estado || parseada.Resultado == null)
                    {
                        return new ResultadoProveedor
                        {
                            Estado = EstadoConsulta.NoExiste,
                            Mensaje = Texto(parseada?.Mensaje) != string.Empty
                                ? parseada.Mensaje
                                : "No se encontro el documento."
                        };
                    }

                    return new ResultadoProveedor
                    {
                        Estado = EstadoConsulta.Encontrado,
                        Datos = Mapear(parseada.Resultado, documento, esRuc)
                    };
                }
            }

            private static SunatCustomerResult Mapear(PeruDevsResultado resultado, string documento, bool esRuc)
            {
                var salida = new SunatCustomerResult
                {
                    Found = true,
                    DocumentNumber = documento,
                    DocumentType = esRuc ? "RUC" : "DNI"
                };

                if (esRuc)
                {
                    var padrones = string.Join(", ", (resultado.Padrones ?? new string[0]).Select(Texto));

                    salida.Name = Texto(resultado.RazonSocial);
                    salida.TaxpayerStatus = Texto(resultado.Estado);
                    salida.TaxpayerCondition = Texto(resultado.Condicion);
                    salida.Department = Texto(resultado.Departamento);
                    salida.Province = Texto(resultado.Provincia);
                    salida.District = Texto(resultado.Distrito);
                    salida.Address = Texto(resultado.Direccion);
                    salida.PadronesText = padrones;
                    salida.IsRetentionAgent = padrones.IndexOf("etenci", StringComparison.OrdinalIgnoreCase) >= 0;
                    salida.IsPerceptionAgent = padrones.IndexOf("ercepci", StringComparison.OrdinalIgnoreCase) >= 0;
                    return salida;
                }

                // Con DNI, PeruDevs no trae dirección ni ubigeo: por eso Factiliza va primero.
                salida.Name = Texto(resultado.NombreCompleto) != string.Empty
                    ? Texto(resultado.NombreCompleto)
                    : string.Join(" ", new[] { resultado.ApellidoPaterno, resultado.ApellidoMaterno, resultado.Nombres }
                        .Select(Texto).Where(p => p != string.Empty));
                salida.FirstName = Texto(resultado.Nombres);
                salida.LastName = string.Join(" ", new[] { resultado.ApellidoPaterno, resultado.ApellidoMaterno }
                    .Select(Texto).Where(p => p != string.Empty));
                return salida;
            }
        }

        [DataContract]
        private sealed class PeruDevsRespuesta
        {
            /// <summary>OJO: aquí `estado` SÍ es "la consulta salió bien". En Factiliza no.</summary>
            [DataMember(Name = "estado")] public bool Estado { get; set; }
            [DataMember(Name = "mensaje")] public string Mensaje { get; set; }
            [DataMember(Name = "resultado")] public PeruDevsResultado Resultado { get; set; }
        }

        [DataContract]
        private sealed class PeruDevsResultado
        {
            [DataMember(Name = "razon_social")] public string RazonSocial { get; set; }
            [DataMember(Name = "estado")] public string Estado { get; set; }
            [DataMember(Name = "condicion")] public string Condicion { get; set; }
            [DataMember(Name = "padrones")] public string[] Padrones { get; set; }
            [DataMember(Name = "departamento")] public string Departamento { get; set; }
            [DataMember(Name = "provincia")] public string Provincia { get; set; }
            [DataMember(Name = "distrito")] public string Distrito { get; set; }
            [DataMember(Name = "direccion")] public string Direccion { get; set; }
            [DataMember(Name = "nombres")] public string Nombres { get; set; }
            [DataMember(Name = "apellido_paterno")] public string ApellidoPaterno { get; set; }
            [DataMember(Name = "apellido_materno")] public string ApellidoMaterno { get; set; }
            [DataMember(Name = "nombre_completo")] public string NombreCompleto { get; set; }
        }
    }
}
