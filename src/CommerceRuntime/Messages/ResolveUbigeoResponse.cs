using System.Runtime.Serialization;
using Microsoft.Dynamics.Commerce.Runtime.Messages;
using Trujillo.PeruEInvoicing.CommerceRuntime.Entities;

namespace Trujillo.PeruEInvoicing.CommerceRuntime.Messages
{
    [DataContract]
    public sealed class ResolveUbigeoResponse : Response
    {
        [DataMember]
        public UbigeoResolutionResult Result { get; private set; }

        public ResolveUbigeoResponse(UbigeoResolutionResult result)
        {
            Result = result;
        }
    }
}
