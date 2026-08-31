
/* tslint:disable */
import { ProxyEntities } from "PosApi/Entities";

import { Entities } from "./DataServiceEntities.g";

import { DataServiceRequest, DataServiceResponse } from "PosApi/Consume/DataService";
export { ProxyEntities };

export { Entities };

export namespace TRU_Diagnostics {
  // Entity Set ElectronicDocumentResult
  export class GetByReceiptIdResponse extends DataServiceResponse {
    public result: Entities.ElectronicDocumentResult[];
  }

  export class GetByReceiptIdRequest<TResponse extends GetByReceiptIdResponse> extends DataServiceRequest<TResponse> {
    /**
     * Constructor
     */
      public constructor(receiptId: string, storeId: string) {
        super();

        this._entitySet = "TRU_Diagnostics";
        this._entityType = "ElectronicDocumentResult";
        this._method = "GetByReceiptId";
        this._parameters = { receiptId: receiptId, storeId: storeId };
        this._isAction = false;
        this._returnType = Entities.ElectronicDocumentResult;
        this._isReturnTypeCollection = true;
        
      }
  }

  export class RunResponse extends DataServiceResponse {
    public result: Entities.ElectronicDocumentResult[];
  }

  export class RunRequest<TResponse extends RunResponse> extends DataServiceRequest<TResponse> {
    /**
     * Constructor
     */
      public constructor(mode: string, receiptId: string) {
        super();

        this._entitySet = "TRU_Diagnostics";
        this._entityType = "ElectronicDocumentResult";
        this._method = "Run";
        this._parameters = { mode: mode, receiptId: receiptId };
        this._isAction = false;
        this._returnType = Entities.ElectronicDocumentResult;
        this._isReturnTypeCollection = true;
        
      }
  }

}

export namespace TRU_ElectronicDocuments {
  // Entity Set ElectronicDocumentResult
}

export namespace TRU_GeographicData {
  // Entity Set UbigeoResolutionResult
  export class ResolveUbigeoResponse extends DataServiceResponse {
    public result: Entities.UbigeoResolutionResult[];
  }

  export class ResolveUbigeoRequest<TResponse extends ResolveUbigeoResponse> extends DataServiceRequest<TResponse> {
    /**
     * Constructor
     */
      public constructor(departamento: string, provincia: string, distrito: string) {
        super();

        this._entitySet = "TRU_GeographicData";
        this._entityType = "UbigeoResolutionResult";
        this._method = "ResolveUbigeo";
        this._parameters = { departamento: departamento, provincia: provincia, distrito: distrito };
        this._isAction = false;
        this._returnType = Entities.UbigeoResolutionResult;
        this._isReturnTypeCollection = true;
        
      }
  }

}

export namespace TRU_SalesTransactions {
  // Entity Set SalesTransactionItem
  export class QueryResponse extends DataServiceResponse {
    public result: Entities.SalesTransactionItem[];
  }

  export class QueryRequest<TResponse extends QueryResponse> extends DataServiceRequest<TResponse> {
    /**
     * Constructor
     */
      public constructor(fromDate: string, toDate: string, storeId: string, terminalId: string, receiptId: string, top: string, detail: string, skip: string) {
        super();

        this._entitySet = "TRU_SalesTransactions";
        this._entityType = "SalesTransactionItem";
        this._method = "Query";
        this._parameters = { fromDate: fromDate, toDate: toDate, storeId: storeId, terminalId: terminalId, receiptId: receiptId, top: top, detail: detail, skip: skip };
        this._isAction = false;
        this._returnType = Entities.SalesTransactionItem;
        this._isReturnTypeCollection = true;
        
      }
  }

}

export namespace TRU_Sunat {
  // Entity Set SunatCustomerResult
  export class ConsultarDocumentoResponse extends DataServiceResponse {
    public result: Entities.SunatCustomerResult[];
  }

  export class ConsultarDocumentoRequest<TResponse extends ConsultarDocumentoResponse> extends DataServiceRequest<TResponse> {
    /**
     * Constructor
     */
      public constructor(documento: string) {
        super();

        this._entitySet = "TRU_Sunat";
        this._entityType = "SunatCustomerResult";
        this._method = "ConsultarDocumento";
        this._parameters = { documento: documento };
        this._isAction = false;
        this._returnType = Entities.SunatCustomerResult;
        this._isReturnTypeCollection = true;
        
      }
  }

}
