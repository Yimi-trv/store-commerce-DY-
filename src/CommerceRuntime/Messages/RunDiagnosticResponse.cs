using System.Runtime.Serialization;
using Microsoft.Dynamics.Commerce.Runtime.Messages;
using Trujillo.PeruEInvoicing.CommerceRuntime.Entities;

namespace Trujillo.PeruEInvoicing.CommerceRuntime.Messages
{
    [DataContract]
    public sealed class RunDiagnosticResponse : Response
    {
        [DataMember]
        public ElectronicDocumentResult Result { get; private set; }

        public RunDiagnosticResponse(ElectronicDocumentResult result)
        {
            Result = result;
        }
    }
}
