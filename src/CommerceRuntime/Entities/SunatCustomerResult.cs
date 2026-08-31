using System.Runtime.Serialization;
using Microsoft.Dynamics.Commerce.Runtime.ComponentModel.DataAnnotations;
using Microsoft.Dynamics.Commerce.Runtime.DataModel;

namespace Trujillo.PeruEInvoicing.CommerceRuntime.Entities
{
    /// <summary>
    /// Datos de un contribuyente (RUC) o una persona (DNI), ya normalizados.
    ///
    /// Es la MISMA forma que el POS venía armando en TypeScript (ISunatCustomerData). Al mover
    /// la consulta al CRT, el mapeo de cada proveedor se hace aquí y el POS recibe siempre esta
    /// estructura, sepa o no de dónde salió.
    ///
    /// POR QUÉ ESTO VIVE EN EL SERVIDOR
    /// La clave del proveedor iba escrita en el TypeScript que se despliega a cada caja:
    /// cualquiera con F12 podía leerla. Desde aquí no sale del CSU. Y de paso, cambiar de
    /// proveedor o corregir un mapeo deja de exigir reempaquetar y desplegar a todas las cajas.
    /// </summary>
    [DataContract]
    public class SunatCustomerResult : CommerceEntity
    {
        public SunatCustomerResult()
            : base("SunatCustomerResult")
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

        /// <summary>False si ningún proveedor lo encontró, o si todos fallaron.</summary>
        [DataMember]
        public bool Found { get; set; }

        /// <summary>Qué decirle al cajero cuando Found es false.</summary>
        [DataMember]
        public string Message { get; set; }

        /// <summary>Quién respondió: "factiliza" o "perudevs". Para diagnóstico en el log.</summary>
        [DataMember]
        public string Provider { get; set; }

        [DataMember]
        public string DocumentNumber { get; set; }

        /// <summary>"RUC" o "DNI".</summary>
        [DataMember]
        public string DocumentType { get; set; }

        /// <summary>Razón social (RUC) o nombre completo (DNI).</summary>
        [DataMember]
        public string Name { get; set; }

        [DataMember]
        public string FirstName { get; set; }

        [DataMember]
        public string LastName { get; set; }

        /// <summary>ACTIVO, BAJA DEFINITIVA, SUSPENSION TEMPORAL... Solo RUC.</summary>
        [DataMember]
        public string TaxpayerStatus { get; set; }

        /// <summary>HABIDO, NO HABIDO, NO HALLADO... Solo RUC.</summary>
        [DataMember]
        public string TaxpayerCondition { get; set; }

        /// <summary>Dirección sin el ubigeo pegado al final.</summary>
        [DataMember]
        public string Address { get; set; }

        // El ubigeo viaja como TEXTO, que es lo que el modal muestra y lo que
        // GeographicDataService sabe resolver contra los maestros del canal.
        [DataMember]
        public string Department { get; set; }

        [DataMember]
        public string Province { get; set; }

        [DataMember]
        public string District { get; set; }

        /// <summary>
        /// Ubigeo SUNAT de 6 dígitos, cuando el proveedor lo trae (Factiliza sí, PeruDevs no).
        ///
        /// NO reemplaza a la resolución por nombres: D365 no quiere estos dígitos tal cual —el
        /// County se numera POR departamento y el City va por nombre—. Viaja como comprobación
        /// y por si más adelante conviene usarlo para preseleccionar la cascada.
        /// </summary>
        [DataMember]
        public string UbigeoSunat { get; set; }

        [DataMember]
        public string PadronesText { get; set; }

        [DataMember]
        public bool IsRetentionAgent { get; set; }

        [DataMember]
        public bool IsPerceptionAgent { get; set; }

        [DataMember]
        public bool IsGoodTaxpayer { get; set; }
    }
}
