using System.Runtime.Serialization;
using Microsoft.Dynamics.Commerce.Runtime.ComponentModel.DataAnnotations;
using Microsoft.Dynamics.Commerce.Runtime.DataModel;

namespace Trujillo.PeruEInvoicing.CommerceRuntime.Entities
{
    /// <summary>
    /// Resultado de resolver el ubigeo SUNAT (nombres de departamento/provincia/distrito)
    /// contra los maestros geográficos del channel DB (LOGISTICSADDRESSSTATE/COUNTY/CITY).
    /// D365 valida las direcciones contra esos maestros: County exige el CÓDIGO (COUNTYID),
    /// no el nombre — causa del rechazo de la dirección automática (UAT 2026-07-10).
    /// </summary>
    [DataContract]
    public class UbigeoResolutionResult : CommerceEntity
    {
        public UbigeoResolutionResult()
            : base("UbigeoResolutionResult")
        {
        }

        [System.ComponentModel.DataAnnotations.Key]
        [DataMember]
        [Column("RECID")]
        public long Id
        {
            get { return (long)this["RECID"]; }
            set { this["RECID"] = value; }
        }

        /// <summary>True solo si departamento, provincia y distrito resolvieron los 3.</summary>
        [DataMember]
        public bool IsValid { get; set; }

        /// <summary>STATEID del maestro (p. ej. "02" para Ancash).</summary>
        [DataMember]
        public string StateId { get; set; }

        /// <summary>COUNTYID del maestro (p. ej. "01" para Huaraz dentro de Ancash). Numerado POR departamento.</summary>
        [DataMember]
        public string CountyId { get; set; }

        /// <summary>NAME de la ciudad tal cual está en el maestro (casing exacto) — el FE resuelve el ubigeo del TXT por este nombre.</summary>
        [DataMember]
        public string CityName { get; set; }

        /// <summary>Detalle de qué resolvió y qué no (para diagnóstico y mensaje al cajero).</summary>
        [DataMember]
        public string Notes { get; set; }
    }
}
