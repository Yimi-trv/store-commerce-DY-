using System.Runtime.Serialization;
using Microsoft.Dynamics.Commerce.Runtime.Messages;
using Trujillo.PeruEInvoicing.CommerceRuntime.Entities;

namespace Trujillo.PeruEInvoicing.CommerceRuntime.Messages
{
    [DataContract]
    public sealed class ConsultarDocumentoSunatResponse : Response
    {
        [DataMember]
        public SunatCustomerResult Result { get; private set; }

        public ConsultarDocumentoSunatResponse(SunatCustomerResult result)
        {
            Result = result;
        }
    }
}
