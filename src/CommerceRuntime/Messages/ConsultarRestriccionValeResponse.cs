using System.Runtime.Serialization;
using Microsoft.Dynamics.Commerce.Runtime.Messages;
using Trujillo.PeruEInvoicing.CommerceRuntime.Entities;

namespace Trujillo.PeruEInvoicing.CommerceRuntime.Messages
{
    [DataContract]
    public sealed class ConsultarRestriccionValeResponse : Response
    {
        [DataMember]
        public ValeRestriccionResult Result { get; private set; }

        public ConsultarRestriccionValeResponse(ValeRestriccionResult result)
        {
            Result = result;
        }
    }
}
