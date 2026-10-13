using System.Runtime.Serialization;
using Microsoft.Dynamics.Commerce.Runtime.Messages;

namespace Trujillo.PeruEInvoicing.CommerceRuntime.Messages
{
    /// <summary>
    /// Pide los artículos que un vale restringido no puede pagar (las bebidas alcohólicas
    /// del catálogo). Sin parámetros: la lista es la misma para todo el canal.
    /// </summary>
    [DataContract]
    public sealed class ObtenerItemsRestringidosRequest : Request
    {
    }
}
