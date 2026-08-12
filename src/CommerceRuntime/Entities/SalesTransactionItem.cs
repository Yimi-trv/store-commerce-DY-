using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Runtime.Serialization;
using Microsoft.Dynamics.Commerce.Runtime.ComponentModel.DataAnnotations;
using Microsoft.Dynamics.Commerce.Runtime.DataModel;

namespace Trujillo.PeruEInvoicing.CommerceRuntime.Entities
{
    [DataContract]
    public class SalesTransactionItem : CommerceEntity
    {
        public SalesTransactionItem()
            : base("SalesTransactionItem")
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

        // === CABECERA TRANSACCION (ax.RETAILTRANSACTIONTABLE) ===
        [DataMember] public string TransactionId { get; set; }
        [DataMember] public string TransDate { get; set; }
        [DataMember] public string CreatedDateTime { get; set; }
        [DataMember] public string CustAccount { get; set; }
        [DataMember] public string Currency { get; set; }
        [DataMember] public decimal GrossAmount { get; set; }
        [DataMember] public decimal NetAmount { get; set; }
        [DataMember] public decimal NetPrice { get; set; }
        [DataMember] public decimal TotalDiscAmount { get; set; }
        [DataMember] public decimal TotalManualDiscPct { get; set; }
        [DataMember] public decimal TotalManualDiscAmt { get; set; }
        [DataMember] public decimal SalesPaymentDifference { get; set; }
        [DataMember] public decimal DiscAmountWithoutTax { get; set; }
        [DataMember] public string Store { get; set; }
        [DataMember] public string Terminal { get; set; }
        [DataMember] public long Channel { get; set; }
        [DataMember] public string DataAreaId { get; set; }

        // === EXTENSION FE (ext.DPRETAILTRANSACTIONTABLE_PE) ===
        [DataMember] public string ReceiptId { get; set; }
        [DataMember] public string CodTypeDocPay { get; set; }
        [DataMember] public string CodTipoOpeFE { get; set; }
        [DataMember] public string TipoDocumentoDesc { get; set; }

        // === IMPUESTOS CONSOLIDADOS ===
        [DataMember] public decimal TotalVtaExonerada { get; set; }
        [DataMember] public decimal TotalVtaInafecta { get; set; }
        [DataMember] public decimal TotalImpuestoGravada { get; set; }
        [DataMember] public decimal TotalLineasIGV { get; set; }

        // === PERCEPCION ===
        [DataMember] public decimal MontoPercepcion { get; set; }
        [DataMember] public decimal MontoBaseOtrosImp { get; set; }

        // === CONTEO DE LINEAS Y PAGOS ===
        [DataMember] public int CantidadLineas { get; set; }
        [DataMember] public int CantidadPagos { get; set; }

        // === DATOS TIENDA/EMISOR ===
        [DataMember] public string NombreTienda { get; set; }
        [DataMember] public string DireccionEmisor { get; set; }
        [DataMember] public string CodigoEstablecimiento { get; set; }

        // === RETORNO / NC ===
        [DataMember] public string ReturnTransactionId { get; set; }

        // === VUELTO ===
        [DataMember] public decimal MontoVuelto { get; set; }

        // === DIAGNOSTICO ===
        [DataMember] public string EnrichDiag { get; set; }

        // === LINEAS DE DETALLE (serializado como JSON string) ===
        [DataMember] public string LineasDetalle { get; set; }

        // === PAGOS (serializado como JSON string) ===
        [DataMember] public string MediosPago { get; set; }
    }
}
