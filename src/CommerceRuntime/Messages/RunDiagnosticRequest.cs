using System.Runtime.Serialization;
using Microsoft.Dynamics.Commerce.Runtime.Messages;

namespace Trujillo.PeruEInvoicing.CommerceRuntime.Messages
{
    [DataContract]
    public sealed class RunDiagnosticRequest : Request
    {
        [DataMember]
        public string Mode { get; private set; }

        [DataMember]
        public string ReceiptId { get; private set; }

        public RunDiagnosticRequest(string mode, string receiptId)
        {
            Mode = mode;
            ReceiptId = receiptId;
        }
    }
}
