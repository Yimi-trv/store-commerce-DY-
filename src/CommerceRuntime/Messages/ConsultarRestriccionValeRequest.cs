using System.Runtime.Serialization;
using Microsoft.Dynamics.Commerce.Runtime.Messages;

namespace Trujillo.PeruEInvoicing.CommerceRuntime.Messages
{
    /// <summary>
    /// Pregunta al sistema de vales qué se puede comprar con un código de tarjeta regalo.
    /// El código llega tal como lo pasó el cajero; aquí se normaliza.
    /// </summary>
    [DataContract]
    public sealed class ConsultarRestriccionValeRequest : Request
    {
        [DataMember]
        public string Codigo { get; private set; }

        public ConsultarRestriccionValeRequest(string codigo)
        {
            Codigo = codigo;
        }
    }
}
