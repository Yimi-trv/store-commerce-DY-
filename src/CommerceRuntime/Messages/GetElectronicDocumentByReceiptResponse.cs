using System.Runtime.Serialization;
using Microsoft.Dynamics.Commerce.Runtime.Messages;
using Trujillo.PeruEInvoicing.CommerceRuntime.Entities;

namespace Trujillo.PeruEInvoicing.CommerceRuntime.Messages
{
    [DataContract]
    public sealed class GetElectronicDocumentByReceiptResponse : Response
    {
        [DataMember]
        public ElectronicDocumentResult Result { get; private set; }

        public GetElectronicDocumentByReceiptResponse(ElectronicDocumentResult result)
        {
            Result = result;
        }
    }
}
