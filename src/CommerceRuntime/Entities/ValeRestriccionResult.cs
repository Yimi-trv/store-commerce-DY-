using System.Runtime.Serialization;
using Microsoft.Dynamics.Commerce.Runtime.ComponentModel.DataAnnotations;
using Microsoft.Dynamics.Commerce.Runtime.DataModel;

namespace Trujillo.PeruEInvoicing.CommerceRuntime.Entities
{
    /// <summary>
    /// Qué se puede comprar con un vale. Lo pide el POS cada vez que un cajero pasa una
    /// tarjeta regalo, y de esta respuesta sale el bloqueo del alcohol.
    ///
    /// POR QUÉ PASA POR EL CRT Y NO LLAMA EL POS DIRECTO
    /// La consulta va al sistema de vales (Trujillo Market) con una clave de integración.
    /// Si el POS llamara por su cuenta, esa clave viajaría en el TypeScript que se despliega
    /// a cada caja y cualquiera la leería con F12 — el mismo error que ya se corrigió con la
    /// consulta de RUC/DNI (ver SunatLookupService). Desde aquí no sale del CSU.
    ///
    /// ADEMÁS, LA REGLA QUEDA EN UN SOLO LUGAR. Cambiar qué cuenta como alcohol, o apagar la
    /// restricción, no exige reempaquetar y desplegar a las once tiendas.
    /// </summary>
    [DataContract]
    public class ValeRestriccionResult : CommerceEntity
    {
        public ValeRestriccionResult()
            : base("ValeRestriccionResult")
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

        /// <summary>El código consultado, normalizado (mayúsculas, sin espacios).</summary>
        [DataMember]
        public string Codigo { get; set; }

        /// <summary>
        /// False si el código no corresponde a un vale emitido por el sistema de vales.
        /// NO es un error: hay tarjetas regalo en D365 cargadas a mano que son legítimas.
        /// </summary>
        [DataMember]
        public bool Existe { get; set; }

        /// <summary>"Nominal" o "AlPortador".</summary>
        [DataMember]
        public string TipoVale { get; set; }

        /// <summary>
        /// Lo único que el POS necesita decidir. True para los vales de siempre y para
        /// cualquier tarjeta que este sistema no conozca.
        /// </summary>
        [DataMember]
        public bool PermiteAlcohol { get; set; }

        /// <summary>
        /// True cuando la consulta NO se pudo resolver (sistema de vales caído, sin clave
        /// configurada, tiempo agotado). El POS lo usa para decidir si bloquea o deja pasar:
        /// una caída no puede impedir cobrar con tarjetas regalo normales.
        /// </summary>
        [DataMember]
        public bool Indeterminado { get; set; }

        /// <summary>Lo que se le muestra al cajero. Ya viene redactado para mostrarse tal cual.</summary>
        [DataMember]
        public string Mensaje { get; set; }

        /// <summary>Para el log y el diagnóstico; el POS no lo muestra.</summary>
        [DataMember]
        public string Detalle { get; set; }
    }
}
