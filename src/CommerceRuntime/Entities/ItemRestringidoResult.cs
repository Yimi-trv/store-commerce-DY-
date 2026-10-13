using System.Runtime.Serialization;
using Microsoft.Dynamics.Commerce.Runtime.ComponentModel.DataAnnotations;
using Microsoft.Dynamics.Commerce.Runtime.DataModel;

namespace Trujillo.PeruEInvoicing.CommerceRuntime.Entities
{
    /// <summary>
    /// Un artículo que un vale restringido no puede pagar. El POS se baja la lista completa
    /// UNA vez al arrancar y la deja en memoria.
    ///
    /// POR QUÉ LA LISTA ENTERA Y NO UNA CONSULTA POR PRODUCTO
    /// La comprobación corre al agregar cada artículo a la venta. Una ida y vuelta al CSU por
    /// producto escaneado le mete latencia a la caja justo donde se nota, con un cliente
    /// delante. Son ~700 artículos (unos 6 KB): se traen de golpe y se consultan en memoria.
    /// </summary>
    [DataContract]
    public class ItemRestringidoResult : CommerceEntity
    {
        public ItemRestringidoResult()
            : base("ItemRestringidoResult")
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

        /// <summary>ItemId de D365, que es con lo que viene la línea del carrito.</summary>
        [DataMember]
        public string ItemId { get; set; }

        /// <summary>Categoría que lo hizo entrar en la lista. Para el mensaje al cajero y el diagnóstico.</summary>
        [DataMember]
        public string Categoria { get; set; }
    }
}
