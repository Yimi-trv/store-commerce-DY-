using System.Runtime.Serialization;
using Microsoft.Dynamics.Commerce.Runtime.Messages;

namespace Trujillo.PeruEInvoicing.CommerceRuntime.Messages
{
    [DataContract]
    public sealed class GetElectronicDocumentByReceiptRequest : Request
    {
        [DataMember]
        public string ReceiptId { get; private set; }

        [DataMember]
        public string StoreId { get; private set; }

        public GetElectronicDocumentByReceiptRequest(string receiptId, string storeId)
        {
            ReceiptId = receiptId;
            StoreId = storeId;
        }
    }
}
