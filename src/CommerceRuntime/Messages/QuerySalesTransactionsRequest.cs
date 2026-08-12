using System.Runtime.Serialization;
using Microsoft.Dynamics.Commerce.Runtime.Messages;

namespace Trujillo.PeruEInvoicing.CommerceRuntime.Messages
{
    [DataContract]
    public sealed class QuerySalesTransactionsRequest : Request
    {
        [DataMember]
        public string FromDate { get; private set; }

        [DataMember]
        public string ToDate { get; private set; }

        [DataMember]
        public string StoreId { get; private set; }

        [DataMember]
        public string TerminalId { get; private set; }

        [DataMember]
        public string ReceiptId { get; private set; }

        [DataMember]
        public int Top { get; private set; }

        [DataMember]
        public bool Detail { get; private set; }

        [DataMember]
        public int Skip { get; private set; }

        public QuerySalesTransactionsRequest(string fromDate, string toDate, string storeId, string terminalId, string receiptId, int top = 100, bool detail = false, int skip = 0)
        {
            FromDate = fromDate;
            ToDate = toDate;
            StoreId = storeId;
            TerminalId = terminalId;
            ReceiptId = receiptId;
            Top = top > 0 ? top : 100;
            Detail = detail;
            Skip = skip > 0 ? skip : 0;
        }
    }
}
