import { DataServiceRequest, DataServiceResponse } from "PosApi/Consume/DataService";

/**
 * Consultas sobre los vales de consumo, contra los endpoints propios del Commerce Runtime.
 *
 * POR QUÉ NO SE LLAMA DIRECTO AL SISTEMA DE VALES
 * La consulta lleva una clave de integración. Desde aquí viajaría en el bundle que se despliega
 * a cada caja, legible con F12 — el mismo error que ya se corrigió con la consulta de RUC/DNI.
 * La llamada la hace el CSU (ValeRestriccionService en el CommerceRuntime).
 *
 * SE DECLARAN A MANO, no desde DataServiceRequests.g.ts: los generados salen del EDMX, que no
 * conoce estas operaciones hasta que el CRT esté desplegado, y editarlos se perdería en la
 * siguiente regeneración. Mismo criterio que SunatLookupRequest y GeographicRequests.
 */

/** Refleja ValeRestriccionResult del CommerceRuntime. */
export class ValeRestriccionEntity {
    public Id: number;
    public Codigo: string;
    public Existe: boolean;
    /** "Nominal" o "AlPortador". */
    public TipoVale: string;
    public PermiteAlcohol: boolean;
    /** True si la consulta no se pudo resolver (sistema de vales caído, sin configurar…). */
    public Indeterminado: boolean;
    /** Redactado para mostrárselo al cajero tal cual. */
    public Mensaje: string;
    /** Solo para el log. */
    public Detalle: string;

    public constructor(odataObject?: any) {
        const origen: any = odataObject || {};

        this.Id = (origen.Id != null) ? parseInt(origen.Id, 10) : undefined;
        this.Codigo = origen.Codigo;
        this.Existe = !!origen.Existe;
        this.TipoVale = origen.TipoVale;
        // Ante un campo ausente se asume que SÍ permite: el lado que no deja a nadie sin cobrar.
        this.PermiteAlcohol = (origen.PermiteAlcohol === undefined) ? true : !!origen.PermiteAlcohol;
        this.Indeterminado = !!origen.Indeterminado;
        this.Mensaje = origen.Mensaje;
        this.Detalle = origen.Detalle;
    }
}

export class ConsultarRestriccionValeResponse extends DataServiceResponse {
    public result: ValeRestriccionEntity[];
}

export class ConsultarRestriccionValeRequest<TResponse extends ConsultarRestriccionValeResponse>
    extends DataServiceRequest<TResponse> {

    public constructor(codigo: string) {
        super();

        this._entitySet = "TRU_Vales";
        this._entityType = "ValeRestriccionResult";
        this._method = "ConsultarRestriccion";
        this._parameters = { codigo: codigo };
        // GET. Confundir Function con Action da 404.
        this._isAction = false;
        this._returnType = ValeRestriccionEntity;
        this._isReturnTypeCollection = true;
    }
}

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
        this._isAction = false;
        this._returnType = ItemRestringidoEntity;
        this._isReturnTypeCollection = true;
    }
}
