import { DataServiceRequest, DataServiceResponse } from "PosApi/Consume/DataService";
import { ProxyEntities } from "PosApi/Entities";

/**
 * Grupos de clientes configurados en el canal.
 *
 * El SDK del POS no expone ninguna petición que los devuelva — solo la entidad CustomerGroup —
 * pero Retail Server sí publica la operación estándar `GetCustomerGroups()`. Se declara a mano
 * con el mismo mecanismo que ya funcionó para GetAddressPurposes: operación sin entidad
 * asociada, así que el entity set va vacío.
 *
 * Si Retail Server la rechaza, el modal deja el grupo vacío y `_applyChannelDefaults` lo
 * resuelve como hasta ahora, copiándolo del cliente que la venta ya tiene asignado.
 */
export class GetCustomerGroupsResponse extends DataServiceResponse {
    public result: ProxyEntities.CustomerGroup[];
}

export class GetCustomerGroupsRequest<TResponse extends GetCustomerGroupsResponse> extends DataServiceRequest<TResponse> {
    public constructor() {
        super();

        this._entitySet = "";
        this._entityType = "CustomerGroup";
        this._method = "GetCustomerGroups";
        this._parameters = {};
        this._isAction = false;
        this._returnType = ProxyEntities.CustomerGroupClass;
        this._isReturnTypeCollection = true;
    }
}
