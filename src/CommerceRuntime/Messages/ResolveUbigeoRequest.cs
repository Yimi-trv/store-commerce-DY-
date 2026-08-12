using System.Runtime.Serialization;
using Microsoft.Dynamics.Commerce.Runtime.Messages;

namespace Trujillo.PeruEInvoicing.CommerceRuntime.Messages
{
    [DataContract]
    public sealed class ResolveUbigeoRequest : Request
    {
        [DataMember]
        public string Departamento { get; private set; }

        [DataMember]
        public string Provincia { get; private set; }

        [DataMember]
        public string Distrito { get; private set; }

        public ResolveUbigeoRequest(string departamento, string provincia, string distrito)
        {
            Departamento = departamento;
            Provincia = provincia;
            Distrito = distrito;
        }
    }
}
