using System.Collections.ObjectModel;
using System.Runtime.Serialization;
using Microsoft.Dynamics.Commerce.Runtime.Messages;
using Trujillo.PeruEInvoicing.CommerceRuntime.Entities;

namespace Trujillo.PeruEInvoicing.CommerceRuntime.Messages
{
    [DataContract]
    public sealed class ObtenerItemsRestringidosResponse : Response
    {
        /// <summary>
        /// Collection&lt;T&gt; y no List&lt;T&gt;: la plataforma lo exige en las respuestas
        /// (gotcha 6 de docs/gotchas.md).
        /// </summary>
        [DataMember]
        public Collection<ItemRestringidoResult> Items { get; private set; }

        /// <summary>
        /// False si la lista no se pudo resolver. El POS NO puede tratar una lista vacía
        /// como "no hay alcohol en el catálogo": sería dejar pasar justo lo que debe frenar.
        /// </summary>
        [DataMember]
        public bool Resuelta { get; private set; }

        [DataMember]
        public string Detalle { get; private set; }

        public ObtenerItemsRestringidosResponse(Collection<ItemRestringidoResult> items, bool resuelta, string detalle)
        {
            Items = items;
            Resuelta = resuelta;
            Detalle = detalle;
        }
    }
}
