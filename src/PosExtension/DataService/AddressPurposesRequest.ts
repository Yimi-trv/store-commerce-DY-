import { DataServiceRequest, DataServiceResponse } from "PosApi/Consume/DataService";
import { ProxyEntities } from "PosApi/Entities";

/**
 * Propósitos de dirección configurados en el canal.
 *
 * El SDK del POS no expone ninguna petición que los devuelva — solo la entidad AddressPurpose —
 * pero Retail Server sí publica la operación estándar `GetAddressPurposes()`, que es la que usa
 * la pantalla nativa de clientes. Se declara a mano contra ese endpoint con el mismo mecanismo
 * que el proxy generado usa para los endpoints propios (TRU_*).
 *
 * Es una operación sin entidad asociada, así que el entity set va vacío. Si Retail Server la
 * rechaza por esa razón, el modal cae a la lista construida desde el enum AddressType, que
 * lleva los mismos valores numéricos que D365 espera.
 */
export class GetAddressPurposesResponse extends DataServiceResponse {
    public result: ProxyEntities.AddressPurpose[];
}

export class GetAddressPurposesRequest<TResponse extends GetAddressPurposesResponse> extends DataServiceRequest<TResponse> {
    public constructor() {
        super();

        this._entitySet = "";
        this._entityType = "AddressPurpose";
        this._method = "GetAddressPurposes";
        this._parameters = {};
        this._isAction = false;
        this._returnType = ProxyEntities.AddressPurposeClass;
        this._isReturnTypeCollection = true;
    }
}
