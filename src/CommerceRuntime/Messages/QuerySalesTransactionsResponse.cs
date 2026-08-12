using System.Collections.Generic;
using System.Runtime.Serialization;
using Microsoft.Dynamics.Commerce.Runtime.Messages;
using Trujillo.PeruEInvoicing.CommerceRuntime.Entities;

namespace Trujillo.PeruEInvoicing.CommerceRuntime.Messages
{
    [DataContract]
    public sealed class QuerySalesTransactionsResponse : Response
    {
        [DataMember]
        public IEnumerable<SalesTransactionItem> Transactions { get; private set; }

        public QuerySalesTransactionsResponse(IEnumerable<SalesTransactionItem> transactions)
        {
            Transactions = transactions;
        }
    }
}
