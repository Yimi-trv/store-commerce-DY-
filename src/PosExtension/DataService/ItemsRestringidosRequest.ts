import { DataServiceRequest, DataServiceResponse } from "PosApi/Consume/DataService";

/**
 * Lo único que el POS le pregunta al servidor sobre los vales: qué artículos son bebida
 * alcohólica.
 *
 * SI UN VALE ESTÁ RESTRINGIDO NO SE PREGUNTA, SE LEE DEL CÓDIGO (ValeRestringidoRule). Por
 * eso aquí no hay ninguna consulta de "¿qué tipo de vale es este?": esa consulta existió en
 * el primer diseño y se quitó a propósito, porque ataba la caja a que otro sistema estuviera
 * en línea para poder cobrar.
 *
 * SE DECLARA A MANO, no desde DataServiceRequests.g.ts: los generados salen del EDMX, que no
 * conoce estas operaciones hasta que el CRT esté desplegado, y editarlos se perdería en la
 * siguiente regeneración. Mismo criterio que SunatLookupRequest y GeographicRequests.
 */

/** Refleja ItemRestringidoResult del CommerceRuntime. */
export class ItemRestringidoEntity {
    public Id: number;
    public ItemId: string;
    public Categoria: string;

    public constructor(odataObject?: any) {
        const origen: any = odataObject || {};

        this.Id = (origen.Id != null) ? parseInt(origen.Id, 10) : undefined;
        this.ItemId = origen.ItemId;
        this.Categoria = origen.Categoria;
    }
}

export class ItemsRestringidosResponse extends DataServiceResponse {
    public result: ItemRestringidoEntity[];
}

export class ItemsRestringidosRequest<TResponse extends ItemsRestringidosResponse>
    extends DataServiceRequest<TResponse> {

    public constructor() {
        super();

        this._entitySet = "TRU_ValesItems";
        this._entityType = "ItemRestringidoResult";
        this._method = "Restringidos";
        this._parameters = {};
        // GET. Confundir Function con Action da 404.
        this._isAction = false;
        this._returnType = ItemRestringidoEntity;
        this._isReturnTypeCollection = true;
    }
}
