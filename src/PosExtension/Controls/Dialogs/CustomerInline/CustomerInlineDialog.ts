/**
 * MODAL DE CLIENTE EN VENTAS
 * ==========================
 *
 * Permite buscar, crear y editar clientes sin salir de la pantalla de venta. Lo abren los
 * triggers PreCustomerSearch / PreCustomerAdd / PreCustomerEdit.
 *
 * ---------------------------------------------------------------------------------------
 * DECISIONES NO OBVIAS — leer antes de modificar. Cada una viene de un bug verificado en UAT.
 * ---------------------------------------------------------------------------------------
 *
 * 1. `_applyChannelDefaults` NO es opcional.
 *    Un Customer construido con `new CustomerClass({})` deja AccountNumber, CustomerGroup y
 *    CurrencyCode en undefined, y Retail Server responde HTTP 400 con "Server exception is not
 *    in expected format" — una excepción .NET no manejada, no un error de validación.
 *    AccountNumber es el ÚNICO campo no opcional de la entidad Customer.
 *    CustomerGroup no viaja en la configuración del canal: se copia del cliente que el carrito
 *    ya tiene asignado.
 *
 * 2. `_ensureAddressPersisted` existe porque el alta asíncrona descarta la dirección.
 *    Con RetailEnhancedAsyncCustCreationFeature activo el cliente recibe cuenta GUID y la
 *    dirección se pierde, aunque viaje completa y con los códigos de ubigeo correctos.
 *    Se relee el cliente y se reintenta por UpdateCustomerServiceRequest, que no pasa por el
 *    camino asíncrono. Verificado: Addresses=0 tras el alta, Addresses=1 tras el reintento.
 *
 * 3. La asignación al carrito ocurre ANTES de cerrar el diálogo.
 *    Un executeAsync lanzado desde un diálogo ya cerrado corre sobre un contexto destruido y
 *    su .catch escribe en un DOM desconectado: el fallo se vuelve invisible.
 *
 * 4. Los propósitos de dirección son el enum ProxyEntities.AddressType, NO una numeración
 *    propia. El código llegó a tener los cuatro valores equivocados con comentarios que decían
 *    lo correcto. Referenciar SIEMPRE el enum por nombre.
 *
 * 5. Tres peticiones se declaran a mano contra operaciones ESTÁNDAR de Retail Server, porque
 *    el SDK del POS no las expone: GetAddressPurposes, GetCustomerGroups y Customers/Search.
 *    Ver los archivos en ../../../DataService/. Todas tienen fallback: si Retail Server las
 *    rechaza, el modal sigue funcionando con el comportamiento anterior.
 *
 * 6. `__diag:` en el campo de búsqueda ejecuta diagnósticos en vez de buscar.
 *    Es una vía de soporte para entornos donde solo se puede operar el POS y no lanzar
 *    peticiones a Retail Server. Sin interfaz propia a propósito. TEMPORAL: eliminar cuando
 *    ya no haga falta.
 *
 * ---------------------------------------------------------------------------------------
 * TRAMPA DE EMPAQUETADO
 * ---------------------------------------------------------------------------------------
 * El repositorio versiona tanto los .ts como los .js compilados. Editar SOLO el .js funciona
 * hasta que alguien compila, y ahí se pierde. Si se agrega un archivo nuevo hace falta
 * `/t:Clean` antes de `/t:Build`, o el módulo no entra al ZIP y SystemJS rompe toda la
 * extensión sin ningún error de build. Verificar siempre el contenido del ZIP antes de subir.
 */

import {
    ExtensionTemplatedDialogBase,
    ITemplatedDialogOptions
} from "PosApi/Create/Dialogs";
import {
    CreateCustomerServiceRequest,
    GetCustomerClientRequest,
    GetCustomerClientResponse,
    UpdateCustomerServiceRequest,
} from "PosApi/Consume/Customer";
import {
    GetCurrentCartClientRequest,
    GetCurrentCartClientResponse,
    SetCustomerOnCartOperationRequest,
    SetCustomerOnCartOperationResponse
} from "PosApi/Consume/Cart";
import {
    GetChannelConfigurationClientRequest,
    GetChannelConfigurationClientResponse
} from "PosApi/Consume/Device";
import { ProxyEntities } from "PosApi/Entities";
import SunatCustomerService, { ISunatCustomerData } from "../../../Services/SunatCustomerService";
import { TRU_Diagnostics, TRU_GeographicData, Entities } from "../../../DataService/DataServiceRequests.g";
import { GetAddressPurposesRequest, GetAddressPurposesResponse } from "../../../DataService/AddressPurposesRequest";
import { GetCustomerGroupsRequest, GetCustomerGroupsResponse } from "../../../DataService/CustomerGroupsRequest";
import { CustomerSearchRequest, CustomerSearchResponse } from "../../../DataService/CustomerSearchRequest";
import {
    GetCitiesRequest,
    GetCitiesResponse,
    GetCountiesRequest,
    GetCountiesResponse
} from "../../../DataService/GeographicRequests";
import { GetStateProvincesServiceRequest } from "PosApi/Consume/StoreOperations";

const GUARD_KEY: string = "__customerInlineDialogActive";

/**
 * Prefijo de soporte. Escribirlo en el campo de búsqueda ejecuta un diagnóstico de esquema
 * en vez de una búsqueda: `__diag:CUST` lista las columnas de los objetos del channel DB que
 * contienen "CUST". Es la única vía para inspeccionar el esquema en entornos donde no se
 * pueden lanzar peticiones a Retail Server a mano.
 *
 * Deliberadamente sin UI propia: no debe aparecerle al cajero. Eliminar cuando la búsqueda
 * de clientes dentro del modal esté terminada.
 */
const DIAG_PREFIX: string = "__diag:";

export type CustomerInlineDialogMode = "search" | "create" | "edit";

export interface ICustomerInlineDialogResult {
    mode: CustomerInlineDialogMode;
    action: string;
    customerAccountNumber?: string;
    /** Texto que el cajero escribió en la pestaña Buscar; lo consume el trigger que abrió el modal. */
    searchText?: string;
}

export default class CustomerInlineDialog extends ExtensionTemplatedDialogBase {
    private _mode: CustomerInlineDialogMode;
    private _resolve: ((result: ICustomerInlineDialogResult | null) => void) | null;
    private _currentCustomer: ProxyEntities.Customer | null;
    private _initialSearchText: string;
    private readonly _sunatService: SunatCustomerService;
    private _lastSunatData: ISunatCustomerData | null;
    // 25 en vez de 50: el cajero no revisa 50 filas, y menos payload es menos render.
    private readonly _searchTop: number = 25;
    private _searchSkip: number = 0;
    private _searchInFlight: boolean = false;

    /**
     * Resultados por término de búsqueda, compartidos entre aperturas del modal — que crea una
     * instancia nueva cada vez. Vive en memoria y se pierde al recargar el POS.
     */
    private static _searchCache: { [key: string]: any[] } = {};

    constructor() {
        super();
        this._mode = "search";
        this._resolve = null;
        this._currentCustomer = null;
        this._initialSearchText = "";
        this._sunatService = new SunatCustomerService();
        this._lastSunatData = null;
    }

    public open(
        mode: string,
        customer?: ProxyEntities.Customer | null,
        initialSearchText?: string
    ): Promise<ICustomerInlineDialogResult | null> {
        this._mode = mode as CustomerInlineDialogMode;
        if (["search", "create", "edit"].indexOf(this._mode) === -1) {
            this._mode = "search";
        }
        
        this._currentCustomer = customer || null;
        this._initialSearchText = initialSearchText || "";

        return new Promise((resolve: (result: ICustomerInlineDialogResult | null) => void) => {
            this._resolve = resolve;

            const dialogOptions: ITemplatedDialogOptions = {
                title: "Cliente",
                button1: {
                    id: "customerInlineClose",
                    label: "Cerrar",
                    isPrimary: true,
                    onClick: this._closeClickHandler.bind(this)
                },
                onCloseX: this._closeClickHandler.bind(this)
            };

            this.openDialog(dialogOptions);
        });
    }

    public onReady(element: HTMLElement): void {
        this._bindTab(element, "search", "customerInlineTabSearch");
        this._bindTab(element, "create", "customerInlineTabCreate");
        this._bindTab(element, "edit", "customerInlineTabEdit");

        const searchBtn: HTMLElement = element.querySelector("#customerInlineSearchBtn");
        if (searchBtn) {
            searchBtn.onclick = () => {
                this._executeSearch(element, false);
            };
        }

        const nativeSearchBtn: HTMLElement = element.querySelector("#customerInlineSearchNativeBtn");
        if (nativeSearchBtn) {
            nativeSearchBtn.onclick = () => {
                this._openNativeSearch(element);
            };
        }

        // Enter en el campo de búsqueda dispara la búsqueda: en caja se teclea, no se apunta.
        const searchInput: HTMLInputElement =
            element.querySelector("#customerInlineSearchText") as HTMLInputElement;
        if (searchInput) {
            searchInput.onkeydown = (event: KeyboardEvent): void => {
                if (event.keyCode === 13) {
                    event.preventDefault();
                    this._executeSearch(element, false);
                }
            };
        }

        this._bindAction(element, "customerInlineCreateSunatButton", this._lookupSunatForCreate.bind(this));
        this._bindAction(element, "customerInlineCreateButton", this._executeCreate.bind(this));
        this._bindAction(element, "customerInlineEditSunatButton", this._lookupSunatForEdit.bind(this));
        this._bindAction(element, "customerInlineEditButton", this._updateCustomer.bind(this));

        if (!this._currentCustomer) {
            const editTab: HTMLElement = element.querySelector("#customerInlineTabEdit") as HTMLElement;
            if (editTab) {
                editTab.style.display = "none";
            }
        }

        this._widenHostDialog(element);
        this._prefillInitialValues(element);
        this._setMode(element, this._mode);
        this._loadAddressPurposes(element);
        this._loadCustomerGroups(element);
        this._loadDepartments(element);

        // Cascada: cada nivel repuebla el siguiente.
        const departmentSelect: HTMLSelectElement =
            element.querySelector("#customerInlineCreateDepartment") as HTMLSelectElement;
        if (departmentSelect) {
            departmentSelect.onchange = (): void => {
                this._loadProvinces(element, departmentSelect.value);
            };
        }

        const provinceSelect: HTMLSelectElement =
            element.querySelector("#customerInlineCreateProvince") as HTMLSelectElement;
        if (provinceSelect) {
            provinceSelect.onchange = (): void => {
                this._loadDistricts(element, departmentSelect ? departmentSelect.value : "", provinceSelect.value);
            };
        }
    }

    /**
     * Ensancha el contenedor del diálogo del POS.
     *
     * Poner un ancho grande en el CSS propio NO sirve: el contenedor del POS tiene ancho fijo
     * y el contenido simplemente se desborda y queda cortado — verificado en UAT, la tabla de
     * resultados salía recortada por la derecha. Hay que subir por el DOM y ensanchar el
     * contenedor real.
     *
     * Se recorren varios ancestros porque la estructura del diálogo cambia entre versiones del
     * POS: se ensancha el primero que ya tenga un ancho acotado. Si no se encuentra ninguno,
     * el modal queda angosto pero funcional — nunca se rompe por esto.
     */
    /**
     * Ensancha el diálogo del POS identificando sus contenedores POR CLASE.
     *
     * El primer intento medía `offsetWidth` y solo tocaba los contenedores acotados. No sirvió:
     * `onReady` corre ANTES de que el POS dibuje el diálogo, así que todos los ancestros
     * reportaban 0px y quedaban descartados. Verificado en UAT con el volcado de la cadena.
     *
     * Estructura real del diálogo (de fuera hacia dentro):
     *   .extensionTemplatedDialog   <- la ventana; position:fixed. Aquí va el ancho.
     *   .dialogContainer            <- centrado vertical
     *   .dialogContainer2           <- fila
     *   ...
     *   .ExtensionTemplateDialogContentPlaceholder  <- donde vive nuestro HTML
     *
     * Se reaplica tras el render porque el POS ajusta medidas después de `onReady`.
     * No se toca `position` ni `left`: el diálogo ya viene centrado y moverlo lo rompería.
     */
    private _widenHostDialog(element: HTMLElement): void {
        // El POS fija el ancho del diálogo cuando lo muestra, y lo hace DESPUÉS de onReady.
        // Aplicarlo una sola vez no alcanza: verificado en UAT, la primera apertura salía ancha
        // y la segunda volvía al tamaño por defecto, porque con el contenido ya en caché el POS
        // termina antes y su valor pisa el nuestro.
        //
        // Por eso se reaplica a lo largo de ~1 segundo. Cada pasada es idempotente y barata:
        // solo escribe estilos en línea sobre tres contenedores.
        const attempts: number[] = [0, 60, 150, 300, 550, 900];

        this._applyDialogWidth(element);
        for (let i: number = 0; i < attempts.length; i++) {
            setTimeout((): void => { this._applyDialogWidth(element); }, attempts[i]);
        }

        // Se reporta al final, cuando el POS ya midió: antes todo daba 0px y no servía de nada.
        setTimeout((): void => { this._reportDialogWidth(element); }, 950);
    }

    private _applyDialogWidth(element: HTMLElement): void {
        // El viewport de caja puede ser 1024px, no 1920: el ancho se calcula contra la pantalla
        // real en vez de fijar un número que desborde.
        //
        // 800px es el techo. Con 960 el modal tapaba casi toda la venta —el cajero pierde de
        // vista las líneas y los totales—, y con 1024 de viewport eso son 94% de la pantalla.
        // A 800 quedan ~220px de la transacción visibles, que es el punto donde la tabla de
        // resultados sigue entrando cómoda sin ocultar el contexto de la venta.
        const viewport: number = (typeof window !== "undefined" && window.innerWidth) ? window.innerWidth : 1024;
        const targetWidth: number = Math.max(520, Math.min(800, Math.floor(viewport * 0.82)));

        let node: HTMLElement = element.parentElement;
        for (let depth: number = 0; node && depth < 10; depth++) {
            const cls: string = typeof node.className === "string" ? node.className : "";

            if (cls.indexOf("extensionTemplatedDialog") >= 0) {
                node.style.width = targetWidth + "px";
                node.style.maxWidth = "96vw";
                break;
            }

            if (cls.indexOf("dialogContainer") >= 0
                || cls.indexOf("ExtensionTemplateDialogContentPlaceholder") >= 0) {
                node.style.width = "100%";
                node.style.maxWidth = "100%";
                node.style.boxSizing = "border-box";
            }

            node = node.parentElement;
        }
    }

    private _reportDialogWidth(element: HTMLElement): void {
        const TARGET_WIDTH: number = 900;
        const report: string[] = [];

        // Se registra la cadena COMPLETA de ancestros con sus medidas, se ensanche o no. Si el
        // resultado en pantalla no es el esperado, este volcado dice exactamente qué contenedor
        // manda y con qué reglas, sin tener que adivinar en otra iteración.
        let node: HTMLElement = element.parentElement;
        for (let depth: number = 0; node && depth < 8; depth++) {
            const width: number = node.offsetWidth;
            const tag: string = node.tagName;
            const cls: string = node.className || "(sin clase)";

            let cssWidth: string = "";
            let cssMaxWidth: string = "";
            let cssPosition: string = "";
            let cssOverflow: string = "";
            if (typeof window !== "undefined" && window.getComputedStyle) {
                const computed: CSSStyleDeclaration = window.getComputedStyle(node);
                cssWidth = computed.width;
                cssMaxWidth = computed.maxWidth;
                cssPosition = computed.position;
                cssOverflow = computed.overflowX;
            }

            report.push(
                depth + ") " + tag + "." + cls
                + " | offsetWidth=" + width
                + " | css width=" + cssWidth
                + " max-width=" + cssMaxWidth
                + " position=" + cssPosition
                + " overflow-x=" + cssOverflow);

            node = node.parentElement;
        }

        report.push("--- ancho final del contenido: " + element.offsetWidth + "px (objetivo " + TARGET_WIDTH + ") ---");
        report.push("--- viewport: " + (typeof window !== "undefined" ? window.innerWidth : "?") + "px ---");

        this._logChunked("=== Ancho del dialogo ===", report.join("\n"));
    }

    /**
     * Llena el combo de grupo de clientes con los grupos configurados en el canal, igual que
     * hace la pantalla estándar. Si Retail Server no responde, queda una sola opción con valor
     * vacío y el grupo lo resuelve `_applyChannelDefaults` copiándolo del cliente que la venta
     * ya tiene asignado — que es el comportamiento que ya venía funcionando.
     */
    private _loadCustomerGroups(element: HTMLElement): Promise<void> {
        return this.context.runtime
            .executeAsync(new GetCustomerGroupsRequest<GetCustomerGroupsResponse>())
            .then((response: any): void => {
                const groups: any[] = (response && response.data && response.data.result) || [];

                if (groups.length === 0) {
                    this._logChunked("=== Grupos de cliente ===", "el canal no devolvio ninguno; se usa el del canal por defecto");
                    this._fillGroupSelect(element, []);
                    return;
                }

                const options: Array<{ value: string; label: string }> = [];
                for (let i: number = 0; i < groups.length; i++) {
                    const group: any = groups[i];
                    const number: string = group.CustomerGroupNumber || "";
                    const name: string = group.CustomerGroupName || number;
                    options.push({ value: number, label: name });
                }

                this._logChunked("=== Grupos de cliente (del canal) ===", this._stringify(options));
                this._fillGroupSelect(element, options);
            })
            .catch((reason: any): void => {
                this._logChunked("=== Grupos de cliente ===",
                    "GetCustomerGroups fallo, se usa el del canal por defecto: " + this._getErrorMessage(reason));
                this._fillGroupSelect(element, []);
            });
    }

    // ---------------------------------------------------------------------------------------
    // CASCADA GEOGRÁFICA — Departamento -> Provincia -> Distrito
    //
    // Alimentada desde los maestros de D365, no escrita a mano. Antes eran tres campos de texto
    // libre y un solo carácter distinto ("Huanuco" por "Huánuco") hacía que ResolveUbigeo no
    // encontrara nada y la dirección se descartara sin aviso.
    //
    // Los códigos salen directo del maestro, así que para el camino manual no hace falta
    // resolver nada. ResolveUbigeo se sigue usando solo para preseleccionar la cascada cuando
    // SUNAT devuelve los nombres.
    // ---------------------------------------------------------------------------------------

    /**
     * SUNAT entrega los nombres del ubigeo; la cascada trabaja con códigos. ResolveUbigeo hace
     * de puente una sola vez, al momento de la consulta. A partir de ahí manda la cascada.
     *
     * Para DNI no hay ubigeo que resolver: la cascada queda vacía y el cajero la completa.
     */
    private _preselectGeographyFromSunat(element: HTMLElement, sunatData: ISunatCustomerData): Promise<void> {
        if (!sunatData.department && !sunatData.province && !sunatData.district) {
            return Promise.resolve();
        }

        const request: TRU_GeographicData.ResolveUbigeoRequest<TRU_GeographicData.ResolveUbigeoResponse> =
            new TRU_GeographicData.ResolveUbigeoRequest(
                sunatData.department || "", sunatData.province || "", sunatData.district || "");

        return this.context.runtime.executeAsync(request)
            .then((response: any): Promise<void> => {
                const resolved: any = response && response.data && response.data.result && response.data.result[0];

                if (!resolved || !resolved.IsValid) {
                    this._logChunked("=== Cascada geografica ===",
                        "el ubigeo de SUNAT no resolvio; el cajero debe elegirlo del desplegable. "
                        + (resolved ? resolved.Notes || "" : ""));
                    return Promise.resolve();
                }

                return this._preselectGeography(element, resolved.StateId, resolved.CountyId, resolved.CityName);
            })
            .catch((reason: any): void => {
                this._logError("Preseleccion de ubigeo fallo: " + this._stringify(reason));
            });
    }

    private _loadDepartments(element: HTMLElement): Promise<void> {
        return this.context.runtime
            .executeAsync(new GetStateProvincesServiceRequest(this._getCorrelationId(), "PER"))
            .then((response: any): void => {
                const states: any[] = (response && response.data && response.data.stateProvinces) || [];
                const options: Array<{ value: string; label: string }> = [];

                for (let i: number = 0; i < states.length; i++) {
                    options.push({
                        value: states[i].StateId || "",
                        label: states[i].StateName || states[i].StateId || ""
                    });
                }

                this._fillGeoSelect(element, "customerInlineCreateDepartment", options, "Seleccione departamento");
                this._logChunked("=== Departamentos ===", options.length + " cargados");
            })
            .catch((reason: any): void => {
                this._logChunked("=== Departamentos ===", "no se pudieron cargar: " + this._getErrorMessage(reason));
            });
    }

    private _loadProvinces(element: HTMLElement, stateId: string): Promise<void> {
        this._fillGeoSelect(element, "customerInlineCreateProvince", [], "Seleccione provincia");
        this._fillGeoSelect(element, "customerInlineCreateDistrict", [], "Seleccione distrito");

        if (!stateId) {
            return Promise.resolve();
        }

        return this.context.runtime
            .executeAsync(new GetCountiesRequest<GetCountiesResponse>(stateId))
            .then((response: any): void => {
                const counties: any[] = (response && response.data && response.data.result) || [];
                const options: Array<{ value: string; label: string }> = [];

                for (let i: number = 0; i < counties.length; i++) {
                    options.push({
                        value: counties[i].CountyId || "",
                        label: counties[i].Name || counties[i].CountyId || ""
                    });
                }

                this._fillGeoSelect(element, "customerInlineCreateProvince", options, "Seleccione provincia");
            })
            .catch((reason: any): void => {
                this._logChunked("=== Provincias ===", "no se pudieron cargar: " + this._getErrorMessage(reason));
            });
    }

    private _loadDistricts(element: HTMLElement, stateId: string, countyId: string): Promise<void> {
        this._fillGeoSelect(element, "customerInlineCreateDistrict", [], "Seleccione distrito");

        if (!stateId || !countyId) {
            return Promise.resolve();
        }

        return this.context.runtime
            .executeAsync(new GetCitiesRequest<GetCitiesResponse>(stateId, countyId))
            .then((response: any): void => {
                const cities: any[] = (response && response.data && response.data.result) || [];
                const options: Array<{ value: string; label: string }> = [];

                for (let i: number = 0; i < cities.length; i++) {
                    // Convención del entorno: Name es el CÓDIGO de ciudad y Description el
                    // nombre legible. Ver GeographicDataService en el CommerceRuntime.
                    options.push({
                        value: cities[i].Name || "",
                        label: cities[i].Description || cities[i].Name || ""
                    });
                }

                this._fillGeoSelect(element, "customerInlineCreateDistrict", options, "Seleccione distrito");
            })
            .catch((reason: any): void => {
                this._logChunked("=== Distritos ===", "no se pudieron cargar: " + this._getErrorMessage(reason));
            });
    }

    private _fillGeoSelect(
        element: HTMLElement,
        id: string,
        options: Array<{ value: string; label: string }>,
        placeholder: string
    ): void {
        const select: HTMLSelectElement = element.querySelector("#" + id) as HTMLSelectElement;
        if (!select) {
            return;
        }

        select.innerHTML = "";

        const empty: HTMLOptionElement = document.createElement("option");
        empty.value = "";
        empty.text = options.length > 0 ? placeholder : "(sin opciones)";
        select.appendChild(empty);

        for (let i: number = 0; i < options.length; i++) {
            const option: HTMLOptionElement = document.createElement("option");
            option.value = options[i].value;
            option.text = options[i].label;
            select.appendChild(option);
        }

        select.disabled = options.length === 0;
    }

    /** Selecciona por valor si existe. Devuelve si lo encontró, para poder registrar el fallo. */
    private _trySelectByValue(element: HTMLElement, id: string, value: string): boolean {
        const select: HTMLSelectElement = element.querySelector("#" + id) as HTMLSelectElement;
        if (!select || !value) {
            return false;
        }

        for (let i: number = 0; i < select.options.length; i++) {
            if (select.options[i].value === value) {
                select.selectedIndex = i;
                return true;
            }
        }
        return false;
    }

    /**
     * Deja la cascada posicionada en los códigos que devolvió ResolveUbigeo tras una consulta
     * SUNAT. Si alguno no está en el maestro, el cajero lo completa a mano desde el desplegable
     * — que es exactamente el caso que antes se perdía en silencio.
     */
    private _preselectGeography(element: HTMLElement, stateId: string, countyId: string, cityCode: string): Promise<void> {
        if (!this._trySelectByValue(element, "customerInlineCreateDepartment", stateId)) {
            this._logChunked("=== Cascada geografica ===", "departamento " + stateId + " no esta en el maestro");
            return Promise.resolve();
        }

        return this._loadProvinces(element, stateId)
            .then((): Promise<void> => {
                if (!this._trySelectByValue(element, "customerInlineCreateProvince", countyId)) {
                    this._logChunked("=== Cascada geografica ===", "provincia " + countyId + " no esta en el maestro");
                    return Promise.resolve();
                }
                return this._loadDistricts(element, stateId, countyId)
                    .then((): void => {
                        this._trySelectByValue(element, "customerInlineCreateDistrict", cityCode);
                    });
            });
    }

    private _fillGroupSelect(element: HTMLElement, options: Array<{ value: string; label: string }>): void {
        const select: HTMLSelectElement =
            element.querySelector("#customerInlineCreateCustomerGroup") as HTMLSelectElement;
        if (!select) {
            return;
        }

        select.innerHTML = "";

        // Valor vacío = dejar que el canal decida. Va siempre disponible como salida.
        const fallbackOption: HTMLOptionElement = document.createElement("option");
        fallbackOption.value = "";
        fallbackOption.text = "(Por defecto del canal)";
        select.appendChild(fallbackOption);

        for (let i: number = 0; i < options.length; i++) {
            const option: HTMLOptionElement = document.createElement("option");
            option.value = options[i].value;
            option.text = options[i].label;
            select.appendChild(option);
        }
    }

    /**
     * Llena el combo de propósito de dirección. Primero intenta los propósitos configurados en
     * el canal (los mismos que muestra la pantalla nativa); si Retail Server no responde, cae a
     * la lista del enum AddressType de D365.
     *
     * En ambos casos el value de cada opción es el AddressType numérico, así que la dirección
     * nunca viaja con un propósito inventado.
     */
    private _loadAddressPurposes(element: HTMLElement): Promise<void> {
        const fallback: Array<{ value: number; label: string }> = [
            { value: ProxyEntities.AddressType.Business, label: "Negocio" },
            { value: ProxyEntities.AddressType.Delivery, label: "Entrega" },
            { value: ProxyEntities.AddressType.Invoice, label: "Factura" },
            { value: ProxyEntities.AddressType.Home, label: "Casa" },
            { value: ProxyEntities.AddressType.Other, label: "Otros" }
        ];

        return this.context.runtime
            .executeAsync(new GetAddressPurposesRequest<GetAddressPurposesResponse>())
            .then((response: any): void => {
                const purposes: any[] = (response && response.data && response.data.result) || [];

                if (purposes.length === 0) {
                    this._logChunked("=== Propositos de direccion ===", "el canal no devolvio ninguno; se usa el enum AddressType");
                    this._fillPurposeSelect(element, fallback);
                    return;
                }

                const fromChannel: Array<{ value: number; label: string }> = [];
                for (let i: number = 0; i < purposes.length; i++) {
                    const purpose: any = purposes[i];
                    fromChannel.push({
                        value: purpose.AddressType,
                        label: purpose.Description || purpose.Name || String(purpose.AddressType)
                    });
                }

                this._logChunked("=== Propositos de direccion (del canal) ===", this._stringify(fromChannel));
                this._fillPurposeSelect(element, fromChannel);
            })
            .catch((reason: any): void => {
                this._logChunked("=== Propositos de direccion ===",
                    "GetAddressPurposes fallo, se usa el enum AddressType: " + this._getErrorMessage(reason));
                this._fillPurposeSelect(element, fallback);
            });
    }

    /**
     * Preselecciona el tipo de dirección según el documento, siguiendo el criterio funcional
     * de Terranova: RUC (organización) va a Negocio y DNI (persona) va a Inicio.
     *
     * Sin esto el combo se quedaba en la primera opción que devuelve el canal —"Factura"— y las
     * empresas quedaban con la dirección clasificada como factura en vez de negocio.
     */
    private _resolveAddressName(documentType: string, purposeValue: number, purposeLabel: string): string {
        if (documentType === "RUC" && purposeValue === ProxyEntities.AddressType.Business) {
            return "OFICINA";
        }
        if (documentType !== "RUC" && purposeValue === ProxyEntities.AddressType.Home) {
            return "DOMICILIO";
        }
        return purposeLabel;
    }

    private _selectPurposeForDocumentType(element: HTMLElement, documentType: string): void {
        const select: HTMLSelectElement =
            element.querySelector("#customerInlineCreateAddressPurpose") as HTMLSelectElement;
        if (!select) {
            return;
        }

        const wanted: number = documentType === "RUC"
            ? ProxyEntities.AddressType.Business
            : ProxyEntities.AddressType.Home;

        for (let i: number = 0; i < select.options.length; i++) {
            if (parseInt(select.options[i].value, 10) === wanted) {
                select.selectedIndex = i;
                return;
            }
        }
    }

    private _fillPurposeSelect(element: HTMLElement, options: Array<{ value: number; label: string }>): void {
        const select: HTMLSelectElement = element.querySelector("#customerInlineCreateAddressPurpose") as HTMLSelectElement;
        if (!select) {
            return;
        }

        select.innerHTML = "";
        for (let i: number = 0; i < options.length; i++) {
            const option: HTMLOptionElement = document.createElement("option");
            option.value = String(options[i].value);
            option.text = options[i].label;
            select.appendChild(option);
        }
    }

    private _bindTab(element: HTMLElement, mode: CustomerInlineDialogMode, buttonId: string): void {
        const button: HTMLElement = element.querySelector("#" + buttonId) as HTMLElement;
        if (button) {
            button.onclick = (): void => {
                this._setMode(element, mode);
            };
        }
    }

    private _bindAction(element: HTMLElement, buttonId: string, action: (element: HTMLElement) => Promise<void>): void {
        const button: HTMLButtonElement = element.querySelector("#" + buttonId) as HTMLButtonElement;
        if (!button) {
            return;
        }

        button.onclick = (): void => {
            button.disabled = true;
            action(element).then((): void => {
                button.disabled = false;
            }).catch((reason: any): void => {
                button.disabled = false;
                this._logError(buttonId + " error: " + this._stringify(reason));
                this._showMessage(element, this._getErrorMessage(reason));
            });
        };
    }

    private _prefillInitialValues(element: HTMLElement): void {
        if (this._initialSearchText) {
            this._setValue(element, "customerInlineSearchText", this._initialSearchText);
            this._setValue(element, "customerInlineCreateDocument", this._initialSearchText);
        }

        if (this._currentCustomer) {
            this._setValue(element, "customerInlineEditAccount", this._currentCustomer.AccountNumber || "");
            this._setValue(element, "customerInlineEditDocument", this._sunatService.getDocumentNumber(this._currentCustomer) || "");
            this._setValue(element, "customerInlineEditName", this._currentCustomer.Name || "");
            this._setValue(element, "customerInlineEditPhone", this._currentCustomer.Phone || "");
            this._setValue(element, "customerInlineEditEmail", this._currentCustomer.Email || "");
            this._showTextResult(element, "customerInlineEditResult", this._formatCustomerSummary(this._currentCustomer));
        }
    }

    /**
     * Busca clientes y dibuja los resultados DENTRO del modal, que es el criterio funcional
     * que se venía persiguiendo. Usa la acción estándar `Customers/Search` de Retail Server
     * declarada a mano — ver CustomerSearchRequest para por qué no alcanza el SDK del POS.
     */
    private _executeSearch(element: HTMLElement, isPagination: boolean = false): Promise<void> {
        const searchText: string = this._getValue(element, "customerInlineSearchText") || this._initialSearchText;

        if (searchText.indexOf(DIAG_PREFIX) === 0) {
            return this._runSchemaDiagnostic(element, searchText.substring(DIAG_PREFIX.length));
        }

        if (!searchText) {
            this._showMessage(element, "Escriba un nombre, cuenta o número de documento.");
            return Promise.resolve();
        }

        if (!isPagination) {
            this._searchSkip = 0;
        }

        // Retail Server tarda ~3 s en esta consulta — el buscador nativo del POS tarda lo mismo,
        // así que es del servidor. Repetir el mismo término es habitual en caja (el cajero
        // vuelve atrás y busca de nuevo), y ahí la caché sí ahorra la espera completa.
        const cacheKey: string = searchText.toUpperCase() + "#" + this._searchSkip;
        const cachedResults: any[] = CustomerInlineDialog._searchCache[cacheKey];
        if (cachedResults) {
            this._renderSearchResults(element, cachedResults);
            this._showMessage(element, cachedResults.length + " resultado(s) (de la última búsqueda). Toque uno para asignarlo.");
            return Promise.resolve();
        }

        // Sin esto, tocar el botón dos veces lanza dos consultas de 3 s en paralelo.
        if (this._searchInFlight) {
            return Promise.resolve();
        }
        this._searchInFlight = true;
        this._setSearchBusy(element, true);
        this._showMessage(element, "Buscando en el sistema... puede tardar unos segundos.");

        return this.context.runtime
            .executeAsync(new CustomerSearchRequest<CustomerSearchResponse>(searchText, this._searchTop, this._searchSkip))
            .then((response: any): void => {
                const results: any[] = (response && response.data && response.data.result) || [];
                CustomerInlineDialog._searchCache[cacheKey] = results;

                this._renderSearchResults(element, results);

                if (results.length === 0) {
                    this._showMessage(element, this._searchSkip > 0
                        ? "No hay más resultados."
                        : "Sin coincidencias para \"" + searchText + "\".");
                } else {
                    this._showMessage(element, results.length + " resultado(s). Toque uno para asignarlo a la venta.");
                }
            })
            .catch((reason: any): void => {
                this._logError("Busqueda de clientes fallo: " + this._stringify(reason));
                this._renderSearchResults(element, []);
                this._showMessage(element,
                    "No se pudo buscar: " + this._getErrorMessage(reason)
                    + " Puede usar el buscador del POS.");
            })
            .then((): void => {
                this._searchInFlight = false;
                this._setSearchBusy(element, false);
            });
    }

    private _setSearchBusy(element: HTMLElement, busy: boolean): void {
        const button: HTMLButtonElement =
            element.querySelector("#customerInlineSearchBtn") as HTMLButtonElement;
        if (button) {
            button.disabled = busy;
            button.textContent = busy ? "Buscando..." : "Buscar";
        }
    }

    /**
     * `GlobalCustomer` ya trae nombre, cuenta y dirección, así que la tabla se dibuja sin una
     * segunda consulta por fila.
     */
    private _renderSearchResults(element: HTMLElement, results: any[]): void {
        const container: HTMLElement = element.querySelector("#customerInlineSearchResults") as HTMLElement;
        if (!container) {
            return;
        }

        container.innerHTML = "";
        if (results.length === 0) {
            return;
        }

        const table: HTMLTableElement = document.createElement("table");
        const head: HTMLTableRowElement = table.createTHead().insertRow();
        const columns: string[] = ["Cuenta", "Nombre", "Dirección", "Teléfono"];
        for (let c: number = 0; c < columns.length; c++) {
            const th: HTMLElement = document.createElement("th");
            th.textContent = columns[c];
            head.appendChild(th);
        }

        const body: HTMLTableSectionElement = table.createTBody();
        for (let i: number = 0; i < results.length; i++) {
            const customer: any = results[i];
            const row: HTMLTableRowElement = body.insertRow();
            const values: string[] = [
                customer.AccountNumber || "",
                customer.FullName || "",
                customer.FullAddress || "",
                customer.Phone || ""
            ];
            for (let v: number = 0; v < values.length; v++) {
                const cell: HTMLTableCellElement = row.insertCell();
                cell.textContent = values[v];
                // Las celdas recortan con puntos suspensivos; el título deja ver el valor
                // completo al pasar el mouse sin necesidad de ensanchar la columna.
                cell.title = values[v];
            }

            // El accountNumber se captura por closure: en ES5 `customer` es de la iteración
            // actual porque se declara dentro del for, pero se guarda explícito por claridad.
            const accountNumber: string = customer.AccountNumber || "";
            row.onclick = (): void => {
                this._selectCustomerFromSearch(element, accountNumber);
            };
        }

        container.appendChild(table);
    }

    private _selectCustomerFromSearch(element: HTMLElement, accountNumber: string): void {
        if (!accountNumber) {
            this._showMessage(element, "Ese resultado no tiene número de cuenta.");
            return;
        }

        this._showMessage(element, "Asignando " + accountNumber + " a la venta...");

        this._setCustomerOnCart(accountNumber)
            .then((): void => {
                this._complete({
                    mode: "search",
                    action: "searchAndSetCustomerOnCart",
                    customerAccountNumber: accountNumber
                });
            })
            .catch((reason: any): void => {
                this._logError("SetCustomerOnCart desde busqueda fallo: " + this._stringify(reason));
                this._showMessage(element, "No se pudo asignar el cliente: " + this._getErrorMessage(reason));
            });
    }

    /** Salida de emergencia: delega en la pantalla nativa como hacía antes. */
    private _openNativeSearch(element: HTMLElement): Promise<void> {
        const searchText: string = this._getValue(element, "customerInlineSearchText") || this._initialSearchText;

        this.closeDialog();
        if (this._resolve) {
            this._resolve({
                mode: "search",
                action: "native_search",
                searchText: searchText
            });
            this._resolve = null;
        }
        return Promise.resolve();
    }

    /**
     * Ejecuta un modo del endpoint TRU_Diagnostics y vuelca el resultado en la consola del
     * navegador, que es de donde el soporte puede copiarlo cuando no hay acceso para lanzar
     * peticiones contra Retail Server.
     *
     * Sintaxis: `__diag:CUST` (modo Columns, patrón CUST) o `__diag:Views|` (modo explícito,
     * parámetro tras la barra).
     *
     * La salida se parte en bloques: el logger del POS trunca a 8192 caracteres y el listado
     * de columnas del channel DB los supera con holgura.
     */
    private _runSchemaDiagnostic(element: HTMLElement, argument: string): Promise<void> {
        let mode: string = "Columns";
        let parameter: string = argument;

        const separatorIndex: number = argument.indexOf("|");
        if (separatorIndex >= 0) {
            mode = argument.substring(0, separatorIndex) || "Columns";
            parameter = argument.substring(separatorIndex + 1);
        }

        this._showMessage(element, "Ejecutando diagnóstico " + mode + " (" + parameter + ")...");
        this._showTextResult(element, "customerInlineSearchResult", "");

        const request: TRU_Diagnostics.RunRequest<TRU_Diagnostics.RunResponse> =
            new TRU_Diagnostics.RunRequest(mode, parameter);

        return this.context.runtime.executeAsync(request)
            .then((response: any): void => {
                const rows: any[] = (response && response.data && response.data.result) || [];
                const first: any = rows.length > 0 ? rows[0] : null;
                const text: string = (first && (first.TxtContent || first.ErrorMessage)) || "(sin contenido)";
                const header: string = "=== TRU_Diagnostics " + mode + " '" + parameter + "' ===";

                this._logChunked(header, text);
                this._showTextResult(element, "customerInlineSearchResult", text);
                this._showMessage(element, "Diagnóstico listo. Copie el bloque desde la consola (F12).");
            })
            .catch((reason: any): void => {
                const message: string = this._getErrorMessage(reason);
                this._logChunked("=== TRU_Diagnostics " + mode + " FALLÓ ===", message);
                this._showTextResult(element, "customerInlineSearchResult", message);
                this._showMessage(element, "El diagnóstico falló: " + message);
            });
    }

    private _logChunked(header: string, body: string): void {
        const CHUNK_SIZE: number = 3000;
        const logger: any = this.context && this.context.logger;

        if (typeof console !== "undefined" && console.log) {
            console.log(header + "\n" + body);
        }

        for (let start: number = 0, part: number = 1; start < body.length; start += CHUNK_SIZE, part++) {
            const chunk: string = header + " [" + part + "] " + body.substring(start, start + CHUNK_SIZE);
            if (logger && logger.logInformational) {
                logger.logInformational(chunk);
            }
        }
    }

    private _lookupSunatForCreate(element: HTMLElement): Promise<void> {
        let rawDocument: string = this._getValue(element, "customerInlineCreateDocument");
        let documentNumber: string = this._sunatService.normalizeDocument(rawDocument);

        if (!this._sunatService.getDocumentType(documentNumber)) {
            this._showMessage(element, "Ingrese un DNI de 8 dígitos o RUC de 11 dígitos válido.");
            return Promise.resolve();
        }

        this._showMessage(element, "Consultando SUNAT...");
        this._showTextResult(element, "customerInlineCreateResult", "");
        
        return this._sunatService.lookup(documentNumber)
            .then((sunatData: ISunatCustomerData): void => {
                this._lastSunatData = sunatData;
                this._setValue(element, "customerInlineCreateName", sunatData.name || "");
                this._setValue(element, "customerInlineCreateAddress", sunatData.address || "");
                this._setValue(element, "customerInlineCreateCondition", (sunatData.raw && sunatData.raw.condicion) || "");
                this._setChecked(element, "customerInlineCreateRetention", sunatData.isRetentionAgent);
                this._setChecked(element, "customerInlineCreatePerception", sunatData.isPerceptionAgent);
                this._setChecked(element, "customerInlineCreatePublicSector", sunatData.isPublicSector);
                this._setChecked(element, "customerInlineCreateEmergencyZone", sunatData.isEmergencyZone);
                this._setChecked(element, "customerInlineCreateExoneratedPerception", sunatData.isExoneratedPerception);
                this._setChecked(element, "customerInlineCreateFinalConsumer", sunatData.isFinalConsumer);
                this._setChecked(element, "customerInlineCreateOthers", sunatData.isOthers);
                this._setChecked(element, "customerInlineCreateNotDomiciled", sunatData.isNotDomiciled);
                // SUNAT devuelve NOMBRES de ubigeo; la cascada trabaja con CÓDIGOS. Se resuelven
                // una vez y se deja la cascada posicionada. Si algún nivel no está en el maestro,
                // el cajero lo elige del desplegable — el caso que antes se perdía en silencio.
                this._preselectGeographyFromSunat(element, sunatData);
                this._selectPurposeForDocumentType(element, sunatData.documentType);
                // RUC 20 es organización; DNI y demás documentos de persona son Persona.
                this._setValue(element, "customerInlineCreateCustomerType",
                    String(sunatData.documentType === "RUC"
                        ? ProxyEntities.CustomerType.Organization
                        : ProxyEntities.CustomerType.Person));
                this._showTextResult(element, "customerInlineCreateResult", this._formatSunatSummary(sunatData));
                this._showMessage(element, "Datos obtenidos. Complete si falta algo y presione Crear en Sistema.");
            });
    }

    /**
     * Busca un cliente ya registrado con ese documento, para no crear duplicados.
     *
     * `GlobalCustomer` —lo que devuelve la búsqueda— NO trae el número de documento, así que un
     * resultado por sí solo no prueba nada: hay que traer el cliente completo y comparar contra
     * DPNUMBERDOCUMID_PE. Por eso se revisan como máximo tres candidatos; cada uno cuesta una
     * petición y en caja la espera se nota.
     *
     * LÍMITE CONOCIDO: si el buscador del canal no indexa el documento, la búsqueda no devuelve
     * al cliente y esta comprobación no lo detecta. Es una red de seguridad, no una garantía:
     * por eso ante la duda deja crear en vez de bloquear una venta legítima.
     */
    private _findExistingByDocument(documentNumber: string): Promise<ProxyEntities.Customer | null> {
        if (!documentNumber) {
            return Promise.resolve(null);
        }

        return this.context.runtime
            .executeAsync(new CustomerSearchRequest<CustomerSearchResponse>(documentNumber, 5, 0))
            .then((response: any): Promise<ProxyEntities.Customer | null> => {
                const candidates: any[] = (response && response.data && response.data.result) || [];
                if (candidates.length === 0) {
                    return Promise.resolve(null);
                }

                const accounts: string[] = [];
                for (let i: number = 0; i < candidates.length && accounts.length < 3; i++) {
                    if (candidates[i].AccountNumber) {
                        accounts.push(candidates[i].AccountNumber);
                    }
                }

                // Se revisan en cadena y se corta al primer acierto, para no gastar peticiones.
                const checkNext: (index: number) => Promise<ProxyEntities.Customer | null> =
                    (index: number): Promise<ProxyEntities.Customer | null> => {
                        if (index >= accounts.length) {
                            return Promise.resolve(null);
                        }
                        return this._getCustomerByAccount(accounts[index])
                            .then((customer: ProxyEntities.Customer | null): Promise<ProxyEntities.Customer | null> => {
                                if (customer && this._sunatService.getDocumentNumber(customer) === documentNumber) {
                                    return Promise.resolve(customer);
                                }
                                return checkNext(index + 1);
                            });
                    };

                return checkNext(0);
            })
            .catch((reason: any): ProxyEntities.Customer | null => {
                // Ante un fallo de la comprobación NO se bloquea el alta: es peor impedir una
                // venta legítima que permitir un duplicado que después se depura.
                this._logError("Comprobacion de duplicado fallo: " + this._stringify(reason));
                return null;
            });
    }

    private _executeCreate(element: HTMLElement): Promise<void> {
        let rawDocument: string = this._getValue(element, "customerInlineCreateDocument");
        let documentNumber: string = this._sunatService.normalizeDocument(rawDocument);

        if (!this._sunatService.getDocumentType(documentNumber)) {
            this._showMessage(element, "Ingrese un documento válido.");
            return Promise.resolve();
        }

        const name: string = this._getValue(element, "customerInlineCreateName");
        if (!name) {
            this._showMessage(element, "El nombre/razón social es obligatorio.");
            return Promise.resolve();
        }

        this._showMessage(element, "Verificando que el documento no esté ya registrado...");

        return this._findExistingByDocument(documentNumber)
            .then((existing: ProxyEntities.Customer | null): Promise<void> => {
                if (existing) {
                    return this._blockDuplicate(element, existing, documentNumber);
                }
                return this._continueCreate(element, documentNumber, name);
            });
    }

    /**
     * Ante un duplicado no se crea nada, pero tampoco se deja al cajero sin salida: se ofrece
     * asignar el cliente que ya existe, que es lo que iba a necesitar de todas formas.
     */
    private _blockDuplicate(element: HTMLElement, existing: ProxyEntities.Customer, documentNumber: string): Promise<void> {
        const account: string = existing.AccountNumber || "";
        const name: string = existing.Name || this._formatCustomerSummary(existing);

        this._showTextResult(element, "customerInlineCreateResult",
            "Ya existe un cliente con el documento " + documentNumber + ":\n\n"
            + "Cuenta: " + account + "\n"
            + "Nombre: " + name + "\n\n"
            + "No se creó uno nuevo para no duplicarlo.");

        this._showMessage(element, "Documento ya registrado. Puede asignar el cliente existente.");

        const useExistingButton: HTMLButtonElement =
            element.querySelector("#customerInlineUseExistingBtn") as HTMLButtonElement;
        if (useExistingButton) {
            useExistingButton.style.display = "";
            useExistingButton.onclick = (): void => {
                this._showMessage(element, "Asignando " + account + " a la venta...");
                this._setCustomerOnCart(account)
                    .then((): void => {
                        this._complete({
                            mode: "create",
                            action: "assignedExistingCustomer",
                            customerAccountNumber: account
                        });
                    })
                    .catch((reason: any): void => {
                        this._logError("Asignar cliente existente fallo: " + this._stringify(reason));
                        this._showMessage(element, "No se pudo asignar: " + this._getErrorMessage(reason));
                    });
            };
        }

        this._logChunked("=== Duplicado evitado ===",
            "documento=" + documentNumber + " ya pertenece a la cuenta " + account);

        return Promise.resolve();
    }

    /**
     * `name` viaja como parámetro y no se lee del ámbito exterior: en JavaScript un `name`
     * suelto resuelve a `window.name`, que es una cadena válida — el alta habría salido con un
     * nombre incorrecto sin que nada fallara.
     */
    private _continueCreate(element: HTMLElement, documentNumber: string, name: string): Promise<void> {
        this._showMessage(element, "Paso 1: Resolviendo dirección (Ubigeo)...");

        const sunatDataToUse: ISunatCustomerData = this._lastSunatData || {
            documentNumber: documentNumber,
            documentType: this._sunatService.getDocumentType(documentNumber) as string,
            name: name
        } as ISunatCustomerData;

        sunatDataToUse.isRetentionAgent = this._getChecked(element, "customerInlineCreateRetention");
        sunatDataToUse.isPerceptionAgent = this._getChecked(element, "customerInlineCreatePerception");
        sunatDataToUse.isPublicSector = this._getChecked(element, "customerInlineCreatePublicSector");
        sunatDataToUse.isEmergencyZone = this._getChecked(element, "customerInlineCreateEmergencyZone");
        sunatDataToUse.isExoneratedPerception = this._getChecked(element, "customerInlineCreateExoneratedPerception");
        sunatDataToUse.isFinalConsumer = this._getChecked(element, "customerInlineCreateFinalConsumer");
        sunatDataToUse.isOthers = this._getChecked(element, "customerInlineCreateOthers");
        sunatDataToUse.isNotDomiciled = this._getChecked(element, "customerInlineCreateNotDomiciled");
        sunatDataToUse.address = this._getValue(element, "customerInlineCreateAddress");
        sunatDataToUse.department = this._getValue(element, "customerInlineCreateDepartment");
        sunatDataToUse.province = this._getValue(element, "customerInlineCreateProvince");
        sunatDataToUse.district = this._getValue(element, "customerInlineCreateDistrict");

        return this._resolveAndCreateCustomer(element, sunatDataToUse, name, this._getValue(element, "customerInlineCreatePhone"), this._getValue(element, "customerInlineCreateEmail"));
    }

    private _resolveAndCreateCustomer(element: HTMLElement, sunatData: ISunatCustomerData, overrideName: string, phone: string, email: string): Promise<void> {
        const customer: ProxyEntities.Customer = new ProxyEntities.CustomerClass({});
        this._sunatService.applySunatIdentity(customer, sunatData);

        customer.Name = overrideName || customer.Name;
        customer.Phone = phone || "";
        customer.Email = email || "";

        // Lo que el cajero eligió en los combos manda sobre lo que dedujo la consulta SUNAT.
        // Va después de applySunatIdentity, que fija CustomerTypeValue por su cuenta.
        const selectedType: string = this._getValue(element, "customerInlineCreateCustomerType");
        if (selectedType) {
            customer.CustomerTypeValue = parseInt(selectedType, 10);
        }

        // Vacío significa "que lo resuelva el canal": se deja sin asignar para que
        // _applyChannelDefaults lo copie del cliente que la venta ya tiene.
        const selectedGroup: string = this._getValue(element, "customerInlineCreateCustomerGroup");
        if (selectedGroup) {
            customer.CustomerGroup = selectedGroup;
        }

        this._logChunked("=== Identidad del cliente ===",
            "CustomerTypeValue=" + customer.CustomerTypeValue
            + " | CustomerGroup=" + (customer.CustomerGroup || "(lo resuelve el canal)"));
        
        let resolvePromise: Promise<Entities.UbigeoResolutionResult | null> = Promise.resolve(null);

        if (sunatData.department || sunatData.province || sunatData.district) {
            const request: TRU_GeographicData.ResolveUbigeoRequest<TRU_GeographicData.ResolveUbigeoResponse> =
                new TRU_GeographicData.ResolveUbigeoRequest(sunatData.department || "", sunatData.province || "", sunatData.district || "");
            
            resolvePromise = this.context.runtime.executeAsync(request)
                .then((response: any): Entities.UbigeoResolutionResult | null => {
                    if (response && response.data && response.data.result && response.data.result.length > 0) {
                        return response.data.result[0];
                    }
                    return null;
                })
                .catch((error: any): Entities.UbigeoResolutionResult | null => {
                    this._logError("ResolveUbigeo error: " + this._stringify(error));
                    return null;
                });
        }

        return resolvePromise.then((u: Entities.UbigeoResolutionResult | null): Promise<void> => {
            let addressStreet = this._getValue(element, "customerInlineCreateAddress");

            // ResolveUbigeo devuelve 200 tanto si resolvió como si no: IsValid es el único dato
            // que distingue una dirección completa de una que D365 descartará en silencio por
            // no traer State/County/City. Se registra siempre para no tener que adivinar.
            this._logChunked("=== ResolveUbigeo ===", u
                ? "IsValid=" + u.IsValid
                + " | StateId=" + (u.StateId || "(vacio)")
                + " | CountyId=" + (u.CountyId || "(vacio)")
                + " | CityName=" + (u.CityName || "(vacio)")
                + " | Notes=" + (u.Notes || "")
                : "sin resultado (no se consultó o falló)");

            if ((u && u.IsValid) || addressStreet) {
                // El combo ya trae el AddressType numérico como value: no hay que traducir
                // etiquetas, que es donde estaban los cuatro valores equivocados.
                const purposeSelect: HTMLSelectElement =
                    element.querySelector("#customerInlineCreateAddressPurpose") as HTMLSelectElement;
                const purposeValue: number = purposeSelect && purposeSelect.value
                    ? parseInt(purposeSelect.value, 10)
                    : ProxyEntities.AddressType.Business;
                const purposeLabel: string = purposeSelect && purposeSelect.selectedIndex >= 0
                    ? purposeSelect.options[purposeSelect.selectedIndex].text
                    : "Negocio";

                const address: ProxyEntities.Address = new ProxyEntities.AddressClass();
                address.ThreeLetterISORegionName = "PER";
                // Criterio funcional de Terranova para "info de contacto": OFICINA en empresas,
                // DOMICILIO en personas. Si el cajero eligió un propósito distinto al que
                // corresponde al documento, manda su elección.
                address.Name = this._resolveAddressName(sunatData.documentType, purposeValue, purposeLabel);
                address.Street = addressStreet;
                address.AddressTypeValue = purposeValue;
                address.IsPrimary = this._getChecked(element, "customerInlineCreateAddressPrimary");
                // Construido a mano: los numéricos se fijan explícitamente para no viajar como
                // undefined, que es lo que hacía reventar el alta del cliente.
                address.RecordId = 0;
                address.Deactivate = false;

                address.ExtensionProperties = [];
                
                // Los códigos salen de la cascada, no de ResolveUbigeo: el desplegable los tomó
                // del maestro, así que no hay nada que resolver ni que pueda venir mal escrito.
                // ResolveUbigeo solo sirvió para dejar la cascada preseleccionada.
                const stateId: string = this._getValue(element, "customerInlineCreateDepartment");
                const countyId: string = this._getValue(element, "customerInlineCreateProvince");
                const cityCode: string = this._getValue(element, "customerInlineCreateDistrict");

                if (stateId && countyId && cityCode) {
                    address.State = stateId;
                    address.County = countyId;
                    address.City = cityCode;
                    address.DistrictName = this._getSelectedLabel(element, "customerInlineCreateDistrict");
                } else if (u && u.IsValid) {
                    // Respaldo: la cascada no llegó a completarse pero el ubigeo sí resolvió.
                    address.State = u.StateId;
                    address.County = u.CountyId;
                    address.City = u.CityName;
                    address.DistrictName = sunatData.district || "";
                } else {
                    this._logChunked("=== Direccion sin ubigeo ===",
                        "se envia solo la calle; complete departamento, provincia y distrito para que quede completa");
                }
                
                customer.Addresses = [address];

                this._logChunked("=== Address enviada ===", this._stringify(address));
            } else {
                this._logChunked("=== Address NO enviada ===",
                    "ubigeo invalido y calle vacia — el cliente se crea sin direccion");
            }

            this._showMessage(element, "Paso 2: Aplicando valores por defecto del canal...");

            return this._applyChannelDefaults(customer).then((): Promise<void> => {
                this._showMessage(element, "Paso 3: Registrando cliente en D365...");
                const createRequest: CreateCustomerServiceRequest = new CreateCustomerServiceRequest(this._getCorrelationId(), customer);

                return this.context.runtime.executeAsync(createRequest)
                    .then((response: any): Promise<void> => {
                        if (response.canceled || !response.data || !response.data.customer) {
                            this._showMessage(element, "La creación del cliente falló o fue cancelada por el sistema.");
                            return Promise.resolve();
                        }

                        const createdCustomer: ProxyEntities.Customer = response.data.customer;
                        const accountNumber: string = createdCustomer.AccountNumber || "";

                        // Si el servidor aceptó el alta pero descartó la dirección, aquí se ve:
                        // el cliente vuelve con Addresses vacío.
                        const savedAddresses: any[] = createdCustomer.Addresses || [];
                        this._logChunked("=== Cliente creado ===",
                            "AccountNumber=" + accountNumber
                            + " | CustomerGroup=" + (createdCustomer.CustomerGroup || "(vacio)")
                            + " | CurrencyCode=" + (createdCustomer.CurrencyCode || "(vacio)")
                            + " | Addresses devueltas=" + savedAddresses.length
                            + (savedAddresses.length > 0 ? "\n" + this._stringify(savedAddresses) : ""));

                        if (!accountNumber) {
                            this._showMessage(element, "Cliente creado pero sin número de cuenta.");
                            return Promise.resolve();
                        }

                        return this._ensureAddressPersisted(element, accountNumber, customer.Addresses || [])
                            .then((): Promise<void> => {
                                // El cliente se asigna al carrito ANTES de cerrar el diálogo. Si se cierra
                                // primero, este request corre sobre un diálogo destruido y cualquier fallo
                                // se pierde en silencio (el cliente queda creado pero no asignado).
                                this._showMessage(element, "Paso 4: Asignando nuevo cliente a la venta...");
                                return this._setCustomerOnCartAndClose(element, accountNumber);
                            });
                    });
            });
        });
    }

    /**
     * Con la creación asíncrona de clientes activa (RetailEnhancedAsyncCustCreationFeature),
     * Retail Server responde 201 al alta pero devuelve el cliente sin direcciones, aunque la
     * dirección viaje completa y con los códigos de ubigeo correctos (verificado en UAT: el
     * cliente queda con "Agregar dirección" en el POS).
     *
     * El cliente ya existe en ese punto, así que se reintenta la dirección por la vía de
     * actualización, que sigue el camino normal y no el asíncrono.
     *
     * Nunca bloquea la venta: si el reintento falla, se registra y el cajero puede cargar la
     * dirección a mano.
     */
    private _ensureAddressPersisted(
        element: HTMLElement,
        accountNumber: string,
        intendedAddresses: ProxyEntities.Address[]
    ): Promise<void> {
        if (!intendedAddresses || intendedAddresses.length === 0) {
            return Promise.resolve();
        }

        return this._getCustomerByAccount(accountNumber)
            .then((persisted: ProxyEntities.Customer | null): Promise<void> => {
                const existing: any[] = (persisted && persisted.Addresses) || [];

                this._logChunked("=== Direccion tras releer el cliente ===",
                    "Addresses=" + existing.length
                    + (existing.length > 0 ? "\n" + this._stringify(existing) : ""));

                // Si el alta sí guardó la dirección y el 0 anterior era solo que la respuesta
                // no la devolvía, no hay nada que reintentar.
                if (!persisted || existing.length > 0) {
                    return Promise.resolve();
                }

                this._showMessage(element, "La dirección no quedó en el alta; reintentando...");

                const retryCustomer: ProxyEntities.Customer = this._cloneCustomer(persisted);
                retryCustomer.Addresses = intendedAddresses;

                const updateRequest: UpdateCustomerServiceRequest =
                    new UpdateCustomerServiceRequest(this._getCorrelationId(), retryCustomer);

                return this.context.runtime.executeAsync(updateRequest)
                    .then((response: any): void => {
                        const updated: any = response && response.data && response.data.customer;
                        const after: any[] = (updated && updated.Addresses) || [];

                        this._logChunked("=== Reintento de direccion ===",
                            "Addresses=" + after.length
                            + (after.length > 0 ? "\n" + this._stringify(after) : " (el reintento tampoco la guardó)"));
                    });
            })
            .catch((reason: any): void => {
                this._logError("_ensureAddressPersisted error: " + this._stringify(reason));
                this._logChunked("=== Reintento de direccion FALLO ===", this._getErrorMessage(reason));
            });
    }

    private _setCustomerOnCartAndClose(element: HTMLElement, accountNumber: string): Promise<void> {
        return this._setCustomerOnCart(accountNumber)
            .then((): void => {
                this._complete({
                    mode: "create",
                    action: "createAndSetCustomerOnCart",
                    customerAccountNumber: accountNumber
                });
            })
            .catch((reason: any): void => {
                this._logError("SetCustomerOnCart error: " + this._stringify(reason));
                this._showMessage(
                    element,
                    "Cliente " + accountNumber + " creado, pero no se pudo asignar a la venta: "
                    + this._getErrorMessage(reason));
            });
    }

    /**
     * Rellena los campos que la pantalla estándar CustomerAddEditView completa desde la
     * configuración del canal antes de guardar. Un Customer construido a mano con
     * `new CustomerClass({})` los deja en undefined y Retail Server revienta con una
     * excepción no manejada (HTTP 400 + "Server exception is not in expected format",
     * string_29274) en lugar de un error de validación legible.
     *
     * AccountNumber es el único campo NO opcional de la entidad Customer: para un alta
     * debe viajar como cadena vacía, nunca ausente.
     *
     * Best-effort: si alguna consulta de configuración falla, se continúa con lo que se
     * haya podido resolver — el alta con datos incompletos es preferible a bloquear la venta.
     */
    private _applyChannelDefaults(customer: ProxyEntities.Customer): Promise<void> {
        if (!customer.AccountNumber) {
            customer.AccountNumber = "";
        }

        const channelPromise: Promise<void> = this.context.runtime
            .executeAsync(new GetChannelConfigurationClientRequest<GetChannelConfigurationClientResponse>(this._getCorrelationId()))
            .then((response: any): void => {
                const config: any = response && response.data && response.data.result;
                if (!config) {
                    return;
                }
                if (!customer.CurrencyCode && config.Currency) {
                    customer.CurrencyCode = config.Currency;
                }
                if (!customer.Language && config.DefaultLanguageId) {
                    customer.Language = config.DefaultLanguageId;
                }
                if (!customer.ReceiptSettings && config.ReceiptSettingsValue) {
                    customer.ReceiptSettings = config.ReceiptSettingsValue;
                }
            })
            .catch((reason: any): void => {
                this._logError("GetChannelConfiguration error: " + this._stringify(reason));
            });

        // CustomerGroup no viaja en ChannelConfiguration. Se toma del cliente que la venta
        // ya tiene asignado (el cliente por defecto del canal cuando el cajero no eligió otro),
        // que por definición es un cliente válido de este canal.
        return channelPromise
            .then((): Promise<ProxyEntities.Customer | null> => {
                if (customer.CustomerGroup) {
                    return Promise.resolve(null);
                }
                return this.context.runtime
                    .executeAsync(new GetCurrentCartClientRequest<GetCurrentCartClientResponse>(this._getCorrelationId()))
                    .then((response: any): Promise<ProxyEntities.Customer | null> => {
                        const cart: any = response && response.data && response.data.result;
                        const templateAccount: string = (cart && cart.CustomerId) || "";
                        if (!templateAccount) {
                            return Promise.resolve(null);
                        }
                        return this._getCustomerByAccount(templateAccount);
                    });
            })
            .then((template: ProxyEntities.Customer | null): void => {
                if (!template) {
                    return;
                }
                if (!customer.CustomerGroup && template.CustomerGroup) {
                    customer.CustomerGroup = template.CustomerGroup;
                }
                if (!customer.CurrencyCode && template.CurrencyCode) {
                    customer.CurrencyCode = template.CurrencyCode;
                }
                if (!customer.Language && template.Language) {
                    customer.Language = template.Language;
                }
            })
            .catch((reason: any): void => {
                this._logError("Channel defaults (template customer) error: " + this._stringify(reason));
            });
    }

    private _lookupSunatForEdit(element: HTMLElement): Promise<void> {
        const documentNumber: string = this._sunatService.normalizeDocument(this._getValue(element, "customerInlineEditDocument"));

        if (!this._sunatService.getDocumentType(documentNumber)) {
            this._showMessage(element, "Ingrese un DNI de 8 dígitos o RUC de 11 dígitos.");
            return Promise.resolve();
        }

        this._showMessage(element, "Consultando SUNAT para comparar antes de editar...");

        return this._sunatService.lookup(documentNumber)
            .then((sunatData: ISunatCustomerData): void => {
                if (!this._getValue(element, "customerInlineEditName")) {
                    this._setValue(element, "customerInlineEditName", sunatData.name || "");
                }

                const differences: string[] = this._currentCustomer ? this._sunatService.compareWithCustomer(this._currentCustomer, sunatData) : [];

                this._showTextResult(element, "customerInlineEditResult", this._formatSunatSummary(sunatData) + "\n" + differences.join("\n"));
                this._showMessage(element, "SUNAT consultado. Revise diferencias y confirme Guardar.");
            });
    }

    private _updateCustomer(element: HTMLElement): Promise<void> {
        return this._loadCustomerForEdit(element)
            .then((customer: ProxyEntities.Customer): Promise<void> => {
                const documentNumber: string = this._sunatService.normalizeDocument(this._getValue(element, "customerInlineEditDocument"));

                this._applyEditableFields(customer, this._getValue(element, "customerInlineEditName"), this._getValue(element, "customerInlineEditPhone"), this._getValue(element, "customerInlineEditEmail"));

                const updateWithCustomer: (customerToUpdate: ProxyEntities.Customer) => Promise<void> =
                    (customerToUpdate: ProxyEntities.Customer): Promise<void> => {
                        const request: UpdateCustomerServiceRequest =
                            new UpdateCustomerServiceRequest(this._getCorrelationId(), customerToUpdate);

                        return this.context.runtime.executeAsync(request)
                            .then((response: any): Promise<void> => {
                                if (response.canceled || !response.data || !response.data.customer) {
                                    this._showMessage(element, "La actualización fue cancelada.");
                                    return Promise.resolve();
                                }

                                const updatedCustomer: ProxyEntities.Customer = response.data.customer;
                                const accountNumber: string = updatedCustomer.AccountNumber || this._getValue(element, "customerInlineEditAccount");

                                return this._setCustomerOnCart(accountNumber)
                                    .then((): void => {
                                        this._complete({
                                            mode: "edit",
                                            action: "updateAndSetCustomerOnCart",
                                            customerAccountNumber: accountNumber
                                        });
                                    })
                                    .catch((reason: any): void => {
                                        this._logError("SetCustomerOnCart error: " + this._stringify(reason));
                                        this._showMessage(
                                            element,
                                            "Cliente actualizado, pero no se pudo asignar a la venta: "
                                            + this._getErrorMessage(reason));
                                    });
                            });
                    };

                if (!documentNumber) {
                    return updateWithCustomer(customer);
                }

                if (!this._sunatService.getDocumentType(documentNumber)) {
                    this._showMessage(element, "El documento debe ser válido.");
                    return Promise.resolve();
                }

                this._showMessage(element, "Validando SUNAT antes de guardar cambios...");

                return this._sunatService.lookup(documentNumber)
                    .then((sunatData: ISunatCustomerData): Promise<void> => {
                        this._sunatService.applySunatMetadata(customer, sunatData);
                        return updateWithCustomer(customer);
                    });
            });
    }

    private _setCustomerOnCart(accountNumber: string): Promise<void> {
        const request: SetCustomerOnCartOperationRequest<SetCustomerOnCartOperationResponse> =
            new SetCustomerOnCartOperationRequest(this._getCorrelationId(), accountNumber);

        return this.context.runtime.executeAsync(request)
            .then((response: any): void => {
                if (response.canceled) {
                    throw new Error("La asignación del cliente a la venta fue cancelada.");
                }
            });
    }

    private _getCustomerByAccount(accountNumber: string): Promise<ProxyEntities.Customer | null> {
        const request: GetCustomerClientRequest<GetCustomerClientResponse> =
            new GetCustomerClientRequest(accountNumber, this._getCorrelationId());

        return this.context.runtime.executeAsync(request)
            .then((response: any): ProxyEntities.Customer | null => {
                if (response.canceled || !response.data || !response.data.result) {
                    return null;
                }
                return response.data.result;
            });
    }

    private _loadCustomerForEdit(element: HTMLElement): Promise<ProxyEntities.Customer> {
        if (this._currentCustomer) {
            return Promise.resolve(this._cloneCustomer(this._currentCustomer));
        }

        const accountNumber: string = this._getValue(element, "customerInlineEditAccount");
        if (!accountNumber) {
            return Promise.reject(new Error("Ingrese la cuenta del cliente a editar."));
        }

        return this._getCustomerByAccount(accountNumber)
            .then((customer: ProxyEntities.Customer | null): ProxyEntities.Customer => {
                if (!customer) throw new Error("No se encontro el cliente en el sistema.");
                return this._cloneCustomer(customer);
            });
    }

    private _cloneCustomer(customer: ProxyEntities.Customer): ProxyEntities.Customer {
        let customerCopy: any = {};
        try {
            customerCopy = JSON.parse(JSON.stringify(customer || {}));
        } catch (error) {
            customerCopy = customer || {};
        }
        return new ProxyEntities.CustomerClass(customerCopy);
    }

    private _applyEditableFields(customer: ProxyEntities.Customer, name: string, phone: string, email: string): void {
        customer.Name = name || customer.Name || "";
        customer.Phone = phone || "";
        customer.Email = email || "";
    }

    private _setMode(element: HTMLElement, mode: CustomerInlineDialogMode): void {
        this._mode = mode;

        this._toggle(element, "customerInlineTabSearch", mode === "search");
        this._toggle(element, "customerInlineTabCreate", mode === "create");
        this._toggle(element, "customerInlineTabEdit", mode === "edit");
        this._toggle(element, "customerInlinePanelSearch", mode === "search");
        this._toggle(element, "customerInlinePanelCreate", mode === "create");
        this._toggle(element, "customerInlinePanelEdit", mode === "edit");

        if (mode === "search") {
            this._showMessage(element, "Busque clientes existentes por documento, nombre o cuenta.");
        } else if (mode === "create") {
            this._showMessage(element, "El cliente será creado directamente validando la data desde SUNAT.");
        } else {
            this._showMessage(element, "Edite el cliente actual.");
        }
    }

    private _toggle(element: HTMLElement, id: string, active: boolean): void {
        const target: HTMLElement = element.querySelector("#" + id) as HTMLElement;
        if (!target) return;
        if (active) target.classList.add("is-active");
        else target.classList.remove("is-active");
    }

    private _showMessage(element: HTMLElement, message: string): void {
        const messageElement: HTMLElement = element.querySelector("#customerInlineMessage") as HTMLElement;
        if (messageElement) messageElement.textContent = message;
    }

    private _showTextResult(element: HTMLElement, id: string, message: string): void {
        const target: HTMLElement = element.querySelector("#" + id) as HTMLElement;
        if (target) target.textContent = message || "";
    }

    private _getValue(element: HTMLElement, id: string): string {
        const target: HTMLInputElement = element.querySelector("#" + id) as HTMLInputElement;
        return target && target.value ? target.value.trim() : "";
    }

    private _setValue(element: HTMLElement, id: string, value: string): void {
        const target: HTMLInputElement = element.querySelector("#" + id) as HTMLInputElement;
        if (target) target.value = value || "";
    }

    private _getSelectedLabel(element: HTMLElement, id: string): string {
        const select: HTMLSelectElement = element.querySelector("#" + id) as HTMLSelectElement;
        if (!select || select.selectedIndex < 0) {
            return "";
        }
        return select.options[select.selectedIndex].text || "";
    }

    private _getChecked(element: HTMLElement, id: string): boolean {
        const target: HTMLInputElement = element.querySelector("#" + id) as HTMLInputElement;
        return target ? target.checked : false;
    }

    private _setChecked(element: HTMLElement, id: string, value: boolean): void {
        const target: HTMLInputElement = element.querySelector("#" + id) as HTMLInputElement;
        if (target) target.checked = value || false;
    }

    private _formatCustomerSummary(customer: ProxyEntities.Customer): string {
        if (!customer) return "";
        return [
            "Cliente del sistema",
            "Cuenta: " + (customer.AccountNumber || ""),
            "Nombre: " + (customer.Name || ""),
            "Documento fiscal: " + (this._sunatService.getDocumentNumber(customer) || "Sin documento")
        ].join("\n");
    }

    private _formatSunatSummary(sunatData: ISunatCustomerData): string {
        const lines: string[] = [
            "SUNAT " + sunatData.documentType + ": " + sunatData.documentNumber,
            "Nombre: " + (sunatData.name || "")
        ];
        if (sunatData.padronesText) lines.push("Padrones: " + sunatData.padronesText);
        return lines.join("\n");
    }

    private _getCorrelationId(): string {
        const logger: any = this.context && this.context.logger;
        if (logger && logger.getNewCorrelationId) return logger.getNewCorrelationId();
        return "customer-inline-" + new Date().getTime().toString();
    }

    private _complete(result: ICustomerInlineDialogResult): void {
        (window as any)[GUARD_KEY] = false;
        if (this._resolve) {
            this._resolve(result);
            this._resolve = null;
        }
        this.closeDialog();
    }

    private _closeClickHandler(): boolean {
        (window as any)[GUARD_KEY] = false;
        if (this._resolve) {
            this._resolve(null);
            this._resolve = null;
        }
        return true;
    }

    private _getErrorMessage(reason: any): string {
        try {
            if (typeof reason === "string") return reason;
            if (Array.isArray(reason) && reason.length > 0) {
                const first = reason[0];
                if (first && first.message) return first.message;
                if (first && first.ErrorCode) return "Error Code: " + first.ErrorCode;
                return JSON.stringify(reason);
            }
            if (reason && reason.message) return reason.message;
            if (reason && reason.ErrorCode) return "Error Code: " + reason.ErrorCode;
            if (reason) return JSON.stringify(reason);
        } catch (e) {
            // ignore
        }
        return "Error desconocido. Revise F12.";
    }

    /**
     * `JSON.stringify` de un Error devuelve `{}` porque message y stack no son enumerables.
     * Por eso los fallos llegaban al log como "error: {}", sin nada accionable — que fue
     * exactamente lo que pasó cuando el proveedor SUNAT devolvió 502.
     */
    private _stringify(value: any): string {
        if (value === null || value === undefined) {
            return "";
        }

        if (value instanceof Error) {
            return value.name + ": " + value.message + (value.stack ? "\n" + value.stack : "");
        }

        // El POS suele entregar los errores como arreglo de CommerceError.
        if (Array.isArray(value)) {
            const parts: string[] = [];
            for (let i: number = 0; i < value.length; i++) {
                parts.push(this._stringify(value[i]));
            }
            return parts.join(" | ");
        }

        try {
            const serialized: string = JSON.stringify(value);
            if (serialized && serialized !== "{}") {
                return serialized;
            }
        } catch (error) {
            // sigue a los fallbacks
        }

        if (value.message) {
            return String(value.message);
        }

        return value.toString ? value.toString() : "";
    }

    private _logError(message: string): void {
        if (this.context && this.context.logger) this.context.logger.logError(message);
    }
}
