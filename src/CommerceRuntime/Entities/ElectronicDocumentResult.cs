using System.ComponentModel.DataAnnotations;
using System.Runtime.Serialization;
using Microsoft.Dynamics.Commerce.Runtime.ComponentModel.DataAnnotations;
using Microsoft.Dynamics.Commerce.Runtime.DataModel;

namespace Trujillo.PeruEInvoicing.CommerceRuntime.Entities
{
    [DataContract]
    public class ElectronicDocumentResult : CommerceEntity
    {
        private const string IdColumn = "RECID";

        public ElectronicDocumentResult()
            : base("ElectronicDocumentResult")
        {
        }

        [System.ComponentModel.DataAnnotations.Key]
        [DataMember]
        [Column("RECID")]
        public long Id
        {
            get { return (long)this["RECID"]; }
            set { this["RECID"] = value; }
        }

        [DataMember]
        public string TransactionId { get; set; }

        [DataMember]
        public string TipoDocumento { get; set; }

        [DataMember]
        public string NumeroDocumento { get; set; }

        [DataMember]
        public string FileContents { get; set; }

        [DataMember]
        public string FileName { get; set; }

        [DataMember]
        public bool Success { get; set; }

        [DataMember]
        public string ErrorMessage { get; set; }

        [DataMember]
        public string TxtContent { get; set; }

        [DataMember]
        public string ReceiptId { get; set; }

        [DataMember]
        public string Diagnostics { get; set; }
    }
}
