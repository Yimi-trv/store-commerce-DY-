import { DataServiceRequest, DataServiceResponse } from "PosApi/Consume/DataService";
import { ProxyEntities } from "PosApi/Entities";

/**
 * Búsqueda de clientes que DEVUELVE los datos, en vez de abrir la pantalla nativa.
 *
 * El SDK del POS no expone ninguna forma de hacer esto: `SelectCustomerClientRequest` siempre
 * navega a SearchView y `GetCustomerClientRequest` solo acepta cuenta exacta. Por eso el modal
 * venía delegando en la pantalla del POS, que es justo lo que se quería evitar.
 *
 * La salida es la acción estándar `Customers/Search` de Retail Server, declarada a mano con el
 * mismo mecanismo que ya funcionó para GetAddressPurposes. Firma tomada del metadata real del
 * entorno (RetailServerEdmxModel.g.xml):
 *
 *   Action Search (IsBound=true)
 *     bindingParameter        => Collection(Customer)
 *     customerSearchCriteria  => CustomerSearchCriteria
 *     returns                 => Collection(GlobalCustomer)
 *
 * GlobalCustomer trae AccountNumber, FullName, FullAddress, Phone, Email y CustomerTypeValue:
 * suficiente para dibujar la tabla de resultados sin una segunda consulta por fila.
 *
 * Es una acción, no una función, así que viaja por POST con el criterio en el cuerpo. Eso evita
 * de raíz el problema de encoding de parámetros en la URL que se le atribuyó —erróneamente— al
 * intento anterior de buscador propio.
 */
export class CustomerSearchResponse extends DataServiceResponse {
    public result: ProxyEntities.GlobalCustomer[];
}

export class CustomerSearchRequest<TResponse extends CustomerSearchResponse> extends DataServiceRequest<TResponse> {
    public constructor(keyword: string, top: number, skip: number) {
        super();

        const criteria: ProxyEntities.CustomerSearchCriteria = new ProxyEntities.CustomerSearchCriteriaClass();
        criteria.Keyword = keyword || "";
        criteria.SearchOnlyCurrentCompany = true;
        // Local: solo el canal actual. Remote sale a buscar a otras tiendas y es notoriamente
        // más lento, algo que en caja se nota.
        criteria.SearchLocationValue = ProxyEntities.SearchLocation.Local;

        this._entitySet = "Customers";
        this._entityType = "GlobalCustomer";
        this._method = "Search";
        this._parameters = { customerSearchCriteria: criteria };
        this._isAction = true;
        this._returnType = ProxyEntities.GlobalCustomerClass;
        this._isReturnTypeCollection = true;

        this.top = top;
        this.skip = skip;
    }
}
