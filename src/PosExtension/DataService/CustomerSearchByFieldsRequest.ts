import { DataServiceRequest, DataServiceResponse } from "PosApi/Consume/DataService";
import { ProxyEntities } from "PosApi/Entities";

/**
 * Búsqueda de clientes POR CAMPO, y catálogo de campos disponibles en el canal.
 *
 * PROBLEMA QUE RESUELVEN
 * `Customers/Search` busca por palabra clave y no encuentra clientes por número de documento:
 * el documento vive en la propiedad de extensión DPNUMBERDOCUMID_PE de la localización Perú, y
 * la búsqueda por keyword no la cubre. En caja se identifica al cliente por su DNI o RUC, así
 * que esa era la búsqueda más importante y la única que no funcionaba.
 *
 * `Customers/SearchByFields` permite dirigir el término a un campo concreto. Qué campos existen
 * lo decide cada canal: `CustomerSearchFieldType` es una ExtensibleEnumeration —{Name, Value}—
 * y el catálogo se obtiene con `GetCustomerSearchFields()`. Por eso no se pueden cablear valores
 * a mano: hay que preguntarle al canal qué admite.
 *
 * Firmas tomadas del metadata real del entorno (RetailServerEdmxModel.g.xml):
 *
 *   Action SearchByFields (IsBound=true)
 *     CustomerSearchByFieldCriteria => CustomerSearchByFieldCriteria
 *     returns                       => Collection(GlobalCustomer)
 *
 *   Action GetCustomerSearchFields (IsBound=true)
 *     returns => Collection(CustomerSearchField)
 */

export class GetCustomerSearchFieldsResponse extends DataServiceResponse {
    public result: ProxyEntities.CustomerSearchField[];
}

export class GetCustomerSearchFieldsRequest<TResponse extends GetCustomerSearchFieldsResponse> extends DataServiceRequest<TResponse> {
    public constructor() {
        super();

        this._entitySet = "Customers";
        this._entityType = "CustomerSearchField";
        this._method = "GetCustomerSearchFields";
        this._parameters = {};
        this._isAction = true;
        this._returnType = ProxyEntities.CustomerSearchFieldClass;
        this._isReturnTypeCollection = true;
    }
}

export class CustomerSearchByFieldsResponse extends DataServiceResponse {
    public result: ProxyEntities.GlobalCustomer[];
}

export class CustomerSearchByFieldsRequest<TResponse extends CustomerSearchByFieldsResponse> extends DataServiceRequest<TResponse> {
    /**
     * @param searchTerm Lo que escribió el cajero.
     * @param searchField Campo del catálogo del canal al que dirigir el término.
     */
    public constructor(searchTerm: string, searchField: ProxyEntities.CustomerSearchFieldType, top: number, skip: number) {
        super();

        const criterion: ProxyEntities.CustomerSearchByFieldCriterion = {
            SearchTerm: searchTerm || "",
            SearchField: searchField
        };

        const criteria: ProxyEntities.CustomerSearchByFieldCriteria = {
            Criteria: [criterion]
        };

        this._entitySet = "Customers";
        this._entityType = "GlobalCustomer";
        this._method = "SearchByFields";
        // El nombre del parámetro va en mayúscula inicial: así lo declara el metadata, a
        // diferencia de Customers/Search que lo declara en minúscula.
        this._parameters = { CustomerSearchByFieldCriteria: criteria };
        this._isAction = true;
        this._returnType = ProxyEntities.GlobalCustomerClass;
        this._isReturnTypeCollection = true;

        this.top = top;
        this.skip = skip;
    }
}
