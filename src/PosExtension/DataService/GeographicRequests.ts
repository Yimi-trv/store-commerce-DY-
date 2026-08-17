import { DataServiceRequest, DataServiceResponse } from "PosApi/Consume/DataService";
import { ProxyEntities } from "PosApi/Entities";

/**
 * Maestros geográficos para los desplegables en cascada de la dirección.
 *
 * PROBLEMA QUE RESUELVEN
 * SUNAT no devuelve dirección para DNI, ni para algunos RUC. En esos casos el cajero escribía
 * departamento, provincia y distrito como texto libre, y `ResolveUbigeo` los cotejaba contra
 * los maestros. Un solo carácter distinto —"Huanuco" por "Huánuco"— y no resolvía, con lo cual
 * la dirección se descartaba sin aviso.
 *
 * Con desplegables alimentados desde los propios maestros no hay nada que tipear mal, y los
 * códigos salen directo de la fuente: no hace falta resolver nada.
 *
 * DE DÓNDE SALEN
 * Retail Server publica la cascada completa. `GetStateProvinces` sí está expuesta en el SDK del
 * POS; `GetCounties` y `GetCities` no, así que se declaran a mano igual que las demás.
 *
 *   GetCounties(countryRegionId, stateProvinceId)            => Collection(CountyInfo)
 *   GetCities(countryRegionId, stateProvinceId, countyId)    => Collection(CityInfo)
 *
 * MAPEO PARA PERÚ (ver GeographicDataService en el CommerceRuntime)
 *   Departamento => State   (StateId,  ej. "15" para Lima)
 *   Provincia    => County  (CountyId, numerado POR departamento)
 *   Distrito     => City    (CityInfo.Name es el CÓDIGO; Description el nombre legible)
 */

const COUNTRY_REGION: string = "PER";

export class GetCountiesResponse extends DataServiceResponse {
    public result: ProxyEntities.CountyInfo[];
}

export class GetCountiesRequest<TResponse extends GetCountiesResponse> extends DataServiceRequest<TResponse> {
    public constructor(stateId: string) {
        super();

        this._entitySet = "";
        this._entityType = "CountyInfo";
        this._method = "GetCounties";
        this._parameters = { countryRegionId: COUNTRY_REGION, stateProvinceId: stateId };
        this._isAction = true;
        this._returnType = ProxyEntities.CountyInfoClass;
        this._isReturnTypeCollection = true;
    }
}

export class GetCitiesResponse extends DataServiceResponse {
    public result: ProxyEntities.CityInfo[];
}

export class GetCitiesRequest<TResponse extends GetCitiesResponse> extends DataServiceRequest<TResponse> {
    public constructor(stateId: string, countyId: string) {
        super();

        this._entitySet = "";
        this._entityType = "CityInfo";
        this._method = "GetCities";
        this._parameters = {
            countryRegionId: COUNTRY_REGION,
            stateProvinceId: stateId,
            countyId: countyId
        };
        this._isAction = true;
        this._returnType = ProxyEntities.CityInfoClass;
        this._isReturnTypeCollection = true;
    }
}
