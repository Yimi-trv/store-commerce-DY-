import { DataServiceRequest, DataServiceResponse } from "PosApi/Consume/DataService";

/**
 * Consulta de DNI y RUC contra el endpoint propio del Commerce Runtime.
 *
 * POR QUÉ NO SE LLAMA DIRECTO A LA API
 * Antes el POS llamaba a api.perudevs.com desde el navegador, con la clave escrita en este
 * mismo TypeScript: cualquiera con F12 en una caja podía leerla. Ahora la consulta la hace el
 * CSU (ver SunatLookupService en el CommerceRuntime), que además decide entre Factiliza y su
 * respaldo sin que el POS sepa ni tenga que enterarse.
 *
 * Efecto secundario que vale: cambiar de proveedor o corregir un mapeo pasa a ser un despliegue
 * del CSU, no un reempaquetado del POS a todas las cajas.
 *
 * SE DECLARA A MANO, no desde DataServiceRequests.g.ts. Los generados salen del EDMX, y el EDMX
 * no conoce esta operación hasta que el CRT esté desplegado; editarlos además se perdería en la
 * siguiente regeneración. Mismo criterio que GeographicRequests.
 */

/** Lo que devuelve el servidor. Refleja SunatCustomerResult del CommerceRuntime. */
export class SunatCustomerResultEntity {
    public Id: number;
    public Found: boolean;
    public Message: string;
    /** "factiliza" o "perudevs". Solo para el log. */
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

    public constructor(odataObject?: any) {
        const origen: any = odataObject || {};

        this.Id = (origen.Id != null) ? parseInt(origen.Id, 10) : undefined;
        this.Found = !!origen.Found;
        this.Message = origen.Message;
        this.Provider = origen.Provider;
        this.DocumentNumber = origen.DocumentNumber;
        this.DocumentType = origen.DocumentType;
        this.Name = origen.Name;
        this.FirstName = origen.FirstName;
        this.LastName = origen.LastName;
        this.TaxpayerStatus = origen.TaxpayerStatus;
        this.TaxpayerCondition = origen.TaxpayerCondition;
        this.Address = origen.Address;
        this.Department = origen.Department;
        this.Province = origen.Province;
        this.District = origen.District;
        this.UbigeoSunat = origen.UbigeoSunat;
        this.PadronesText = origen.PadronesText;
        this.IsRetentionAgent = !!origen.IsRetentionAgent;
        this.IsPerceptionAgent = !!origen.IsPerceptionAgent;
        this.IsGoodTaxpayer = !!origen.IsGoodTaxpayer;
    }
}

export class ConsultarDocumentoSunatResponse extends DataServiceResponse {
    public result: SunatCustomerResultEntity[];
}

export class ConsultarDocumentoSunatRequest<TResponse extends ConsultarDocumentoSunatResponse>
    extends DataServiceRequest<TResponse> {

    public constructor(documento: string) {
        super();

        this._entitySet = "TRU_Sunat";
        this._entityType = "SunatCustomerResult";
        this._method = "ConsultarDocumento";
        this._parameters = { documento: documento };
        // GET, igual que ResolveUbigeo. Confundir Function con Action da 404.
        this._isAction = false;
        this._returnType = SunatCustomerResultEntity;
        this._isReturnTypeCollection = true;
    }
}
