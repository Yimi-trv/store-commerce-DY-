
  /* tslint:disable */
  import { ProxyEntities } from "PosApi/Entities";
  // @ts-ignore
  import { DateExtensions } from "PosApi/TypeExtensions";
  export { ProxyEntities };

  export namespace Entities {
  
  /**
   * ElectronicDocumentResult entity class.
   */
  export class ElectronicDocumentResult {
      public Id: number;
	  public TransactionId: string;
	  public TipoDocumento: string;
	  public NumeroDocumento: string;
	  public FileContents: string;
	  public FileName: string;
	  public Success: boolean;
	  public ErrorMessage: string;
	  public TxtContent: string;
	  public ReceiptId: string;
	  public Diagnostics: string;
	  public ExtensionProperties: ProxyEntities.CommerceProperty[];
	  
      // Navigation properties names
      
      /**
       * Construct an object from odata response.
       * @param {any} odataObject The odata result object.
       */
      constructor(odataObject?: any) {
          odataObject = odataObject || {};
          
            this.Id = (odataObject.Id != null) ? parseInt(odataObject.Id, 10) : undefined;
              
            this.TransactionId = odataObject.TransactionId;
              
            this.TipoDocumento = odataObject.TipoDocumento;
              
            this.NumeroDocumento = odataObject.NumeroDocumento;
              
            this.FileContents = odataObject.FileContents;
              
            this.FileName = odataObject.FileName;
              
            this.Success = odataObject.Success;
              
            this.ErrorMessage = odataObject.ErrorMessage;
              
            this.TxtContent = odataObject.TxtContent;
              
            this.ReceiptId = odataObject.ReceiptId;
              
            this.Diagnostics = odataObject.Diagnostics;
              
        this.ExtensionProperties = undefined;
        if (odataObject.ExtensionProperties) {
        this.ExtensionProperties = [];
        for (var i = 0; i < odataObject.ExtensionProperties.length; i++) {
        if (odataObject.ExtensionProperties[i] != null) {
        if (odataObject.ExtensionProperties[i]['@odata.type'] != null) {
        var className: string = odataObject.ExtensionProperties[i]['@odata.type'];
        className = className.substr(className.lastIndexOf('.') + 1).concat("Class");
        // @ts-ignore
        this.ExtensionProperties[i] = new ProxyEntities[className](odataObject.ExtensionProperties[i])
        } else {
        this.ExtensionProperties[i] = new ProxyEntities.CommercePropertyClass(odataObject.ExtensionProperties[i]);
        }
                    } else {
        this.ExtensionProperties[i] = undefined;
        }
        }
        }
      
      }
  }

  /**
   * UbigeoResolutionResult entity class.
   */
  export class UbigeoResolutionResult {
      public Id: number;
	  public IsValid: boolean;
	  public StateId: string;
	  public CountyId: string;
	  public CityName: string;
	  public Notes: string;
	  public ExtensionProperties: ProxyEntities.CommerceProperty[];
	  
      // Navigation properties names
      
      /**
       * Construct an object from odata response.
       * @param {any} odataObject The odata result object.
       */
      constructor(odataObject?: any) {
          odataObject = odataObject || {};
          
            this.Id = (odataObject.Id != null) ? parseInt(odataObject.Id, 10) : undefined;
              
            this.IsValid = odataObject.IsValid;
              
            this.StateId = odataObject.StateId;
              
            this.CountyId = odataObject.CountyId;
              
            this.CityName = odataObject.CityName;
              
            this.Notes = odataObject.Notes;
              
        this.ExtensionProperties = undefined;
        if (odataObject.ExtensionProperties) {
        this.ExtensionProperties = [];
        for (var i = 0; i < odataObject.ExtensionProperties.length; i++) {
        if (odataObject.ExtensionProperties[i] != null) {
        if (odataObject.ExtensionProperties[i]['@odata.type'] != null) {
        var className: string = odataObject.ExtensionProperties[i]['@odata.type'];
        className = className.substr(className.lastIndexOf('.') + 1).concat("Class");
        // @ts-ignore
        this.ExtensionProperties[i] = new ProxyEntities[className](odataObject.ExtensionProperties[i])
        } else {
        this.ExtensionProperties[i] = new ProxyEntities.CommercePropertyClass(odataObject.ExtensionProperties[i]);
        }
                    } else {
        this.ExtensionProperties[i] = undefined;
        }
        }
        }
      
      }
  }

  /**
   * SalesTransactionItem entity class.
   */
  export class SalesTransactionItem {
      public Id: number;
	  public TransactionId: string;
	  public TransDate: string;
	  public CreatedDateTime: string;
	  public CustAccount: string;
	  public Currency: string;
	  public GrossAmount: number;
	  public NetAmount: number;
	  public NetPrice: number;
	  public TotalDiscAmount: number;
	  public TotalManualDiscPct: number;
	  public TotalManualDiscAmt: number;
	  public SalesPaymentDifference: number;
	  public DiscAmountWithoutTax: number;
	  public Store: string;
	  public Terminal: string;
	  public Channel: number;
	  public DataAreaId: string;
	  public ReceiptId: string;
	  public CodTypeDocPay: string;
	  public CodTipoOpeFE: string;
	  public TipoDocumentoDesc: string;
	  public TotalVtaExonerada: number;
	  public TotalVtaInafecta: number;
	  public TotalImpuestoGravada: number;
	  public TotalLineasIGV: number;
	  public MontoPercepcion: number;
	  public MontoBaseOtrosImp: number;
	  public CantidadLineas: number;
	  public CantidadPagos: number;
	  public NombreTienda: string;
	  public DireccionEmisor: string;
	  public CodigoEstablecimiento: string;
	  public ReturnTransactionId: string;
	  public MontoVuelto: number;
	  public EnrichDiag: string;
	  public LineasDetalle: string;
	  public MediosPago: string;
	  public ExtensionProperties: ProxyEntities.CommerceProperty[];
	  
      // Navigation properties names
      
      /**
       * Construct an object from odata response.
       * @param {any} odataObject The odata result object.
       */
      constructor(odataObject?: any) {
          odataObject = odataObject || {};
          
            this.Id = (odataObject.Id != null) ? parseInt(odataObject.Id, 10) : undefined;
              
            this.TransactionId = odataObject.TransactionId;
              
            this.TransDate = odataObject.TransDate;
              
            this.CreatedDateTime = odataObject.CreatedDateTime;
              
            this.CustAccount = odataObject.CustAccount;
              
            this.Currency = odataObject.Currency;
              
            this.GrossAmount = (odataObject.GrossAmount != null) ? parseFloat(odataObject.GrossAmount) : undefined;
              
            this.NetAmount = (odataObject.NetAmount != null) ? parseFloat(odataObject.NetAmount) : undefined;
              
            this.NetPrice = (odataObject.NetPrice != null) ? parseFloat(odataObject.NetPrice) : undefined;
              
            this.TotalDiscAmount = (odataObject.TotalDiscAmount != null) ? parseFloat(odataObject.TotalDiscAmount) : undefined;
              
            this.TotalManualDiscPct = (odataObject.TotalManualDiscPct != null) ? parseFloat(odataObject.TotalManualDiscPct) : undefined;
              
            this.TotalManualDiscAmt = (odataObject.TotalManualDiscAmt != null) ? parseFloat(odataObject.TotalManualDiscAmt) : undefined;
              
            this.SalesPaymentDifference = (odataObject.SalesPaymentDifference != null) ? parseFloat(odataObject.SalesPaymentDifference) : undefined;
              
            this.DiscAmountWithoutTax = (odataObject.DiscAmountWithoutTax != null) ? parseFloat(odataObject.DiscAmountWithoutTax) : undefined;
              
            this.Store = odataObject.Store;
              
            this.Terminal = odataObject.Terminal;
              
            this.Channel = (odataObject.Channel != null) ? parseInt(odataObject.Channel, 10) : undefined;
              
            this.DataAreaId = odataObject.DataAreaId;
              
            this.ReceiptId = odataObject.ReceiptId;
              
            this.CodTypeDocPay = odataObject.CodTypeDocPay;
              
            this.CodTipoOpeFE = odataObject.CodTipoOpeFE;
              
            this.TipoDocumentoDesc = odataObject.TipoDocumentoDesc;
              
            this.TotalVtaExonerada = (odataObject.TotalVtaExonerada != null) ? parseFloat(odataObject.TotalVtaExonerada) : undefined;
              
            this.TotalVtaInafecta = (odataObject.TotalVtaInafecta != null) ? parseFloat(odataObject.TotalVtaInafecta) : undefined;
              
            this.TotalImpuestoGravada = (odataObject.TotalImpuestoGravada != null) ? parseFloat(odataObject.TotalImpuestoGravada) : undefined;
              
            this.TotalLineasIGV = (odataObject.TotalLineasIGV != null) ? parseFloat(odataObject.TotalLineasIGV) : undefined;
              
            this.MontoPercepcion = (odataObject.MontoPercepcion != null) ? parseFloat(odataObject.MontoPercepcion) : undefined;
              
            this.MontoBaseOtrosImp = (odataObject.MontoBaseOtrosImp != null) ? parseFloat(odataObject.MontoBaseOtrosImp) : undefined;
              
            this.CantidadLineas = odataObject.CantidadLineas;
              
            this.CantidadPagos = odataObject.CantidadPagos;
              
            this.NombreTienda = odataObject.NombreTienda;
              
            this.DireccionEmisor = odataObject.DireccionEmisor;
              
            this.CodigoEstablecimiento = odataObject.CodigoEstablecimiento;
              
            this.ReturnTransactionId = odataObject.ReturnTransactionId;
              
            this.MontoVuelto = (odataObject.MontoVuelto != null) ? parseFloat(odataObject.MontoVuelto) : undefined;
              
            this.EnrichDiag = odataObject.EnrichDiag;
              
            this.LineasDetalle = odataObject.LineasDetalle;
              
            this.MediosPago = odataObject.MediosPago;
              
        this.ExtensionProperties = undefined;
        if (odataObject.ExtensionProperties) {
        this.ExtensionProperties = [];
        for (var i = 0; i < odataObject.ExtensionProperties.length; i++) {
        if (odataObject.ExtensionProperties[i] != null) {
        if (odataObject.ExtensionProperties[i]['@odata.type'] != null) {
        var className: string = odataObject.ExtensionProperties[i]['@odata.type'];
        className = className.substr(className.lastIndexOf('.') + 1).concat("Class");
        // @ts-ignore
        this.ExtensionProperties[i] = new ProxyEntities[className](odataObject.ExtensionProperties[i])
        } else {
        this.ExtensionProperties[i] = new ProxyEntities.CommercePropertyClass(odataObject.ExtensionProperties[i]);
        }
                    } else {
        this.ExtensionProperties[i] = undefined;
        }
        }
        }
      
      }
  }

  /**
   * SunatCustomerResult entity class.
   */
  export class SunatCustomerResult {
      public Id: number;
	  public Found: boolean;
	  public Message: string;
	  public Provider: string;
	  public DocumentNumber: string;
	  public DocumentType: string;
	  public Name: string;
	  public FirstName: string;
	  public LastName: string;
	  public TaxpayerStatus: string;
	  public TaxpayerCondition: string;
	  public Address: string;
	  public Department: string;
	  public Province: string;
	  public District: string;
	  public UbigeoSunat: string;
	  public PadronesText: string;
	  public IsRetentionAgent: boolean;
	  public IsPerceptionAgent: boolean;
	  public IsGoodTaxpayer: boolean;
	  public ExtensionProperties: ProxyEntities.CommerceProperty[];
	  
      // Navigation properties names
      
      /**
       * Construct an object from odata response.
       * @param {any} odataObject The odata result object.
       */
      constructor(odataObject?: any) {
          odataObject = odataObject || {};
          
            this.Id = (odataObject.Id != null) ? parseInt(odataObject.Id, 10) : undefined;
              
            this.Found = odataObject.Found;
              
            this.Message = odataObject.Message;
              
            this.Provider = odataObject.Provider;
              
            this.DocumentNumber = odataObject.DocumentNumber;
              
            this.DocumentType = odataObject.DocumentType;
              
            this.Name = odataObject.Name;
              
            this.FirstName = odataObject.FirstName;
              
            this.LastName = odataObject.LastName;
              
            this.TaxpayerStatus = odataObject.TaxpayerStatus;
              
            this.TaxpayerCondition = odataObject.TaxpayerCondition;
              
            this.Address = odataObject.Address;
              
            this.Department = odataObject.Department;
              
            this.Province = odataObject.Province;
              
            this.District = odataObject.District;
              
            this.UbigeoSunat = odataObject.UbigeoSunat;
              
            this.PadronesText = odataObject.PadronesText;
              
            this.IsRetentionAgent = odataObject.IsRetentionAgent;
              
            this.IsPerceptionAgent = odataObject.IsPerceptionAgent;
              
            this.IsGoodTaxpayer = odataObject.IsGoodTaxpayer;
              
        this.ExtensionProperties = undefined;
        if (odataObject.ExtensionProperties) {
        this.ExtensionProperties = [];
        for (var i = 0; i < odataObject.ExtensionProperties.length; i++) {
        if (odataObject.ExtensionProperties[i] != null) {
        if (odataObject.ExtensionProperties[i]['@odata.type'] != null) {
        var className: string = odataObject.ExtensionProperties[i]['@odata.type'];
        className = className.substr(className.lastIndexOf('.') + 1).concat("Class");
        // @ts-ignore
        this.ExtensionProperties[i] = new ProxyEntities[className](odataObject.ExtensionProperties[i])
        } else {
        this.ExtensionProperties[i] = new ProxyEntities.CommercePropertyClass(odataObject.ExtensionProperties[i]);
        }
                    } else {
        this.ExtensionProperties[i] = undefined;
        }
        }
        }
      
      }
  }

}
