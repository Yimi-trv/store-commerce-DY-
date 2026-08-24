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
    CustomerSearchByFieldsRequest,
    CustomerSearchByFieldsResponse,
    GetCustomerSearchFieldsRequest,
    GetCustomerSearchFieldsResponse
} from "../../../DataService/CustomerSearchByFieldsRequest";
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
     * RecordId de la dirección que se está editando. Sin él D365 agrega una dirección nueva en
     * vez de actualizar la existente, y el cliente termina con duplicados.
     */
    private _editingAddressRecordId: number = 0;

    /**
     * Resultados por término de búsqueda, compartidos entre aperturas del modal — que crea una
     * instancia nueva cada vez. Vive en memoria y se pierde al recargar el POS.
     */
    // Paleta del tema Trujillo Market (Theme/ThemeAssets.ts). Duplicarla aquí es deliberado:
    // ThemeAssets exporta hojas de estilo completas, no colores sueltos, y el chrome del
    // diálogo se pinta nodo por nodo desde JavaScript. Si el tema cambia, estos dos valores y
    // los del <style> de la plantilla se cambian a mano.
    /**
     * Resolver de la alerta que está en pantalla, si hay alguna.
     *
     * Existe porque una promesa que solo resuelve con un click del usuario es un punto de
     * cuelgue: `_bindAction` deshabilita el botón hasta que la acción resuelve, así que una
     * alerta que quede huérfana deja el botón muerto y el modal "sin responder" —sin ningún
     * error a la vista. Al abrir una alerta nueva se cierra la anterior con este resolver.
     */
    private _pendingAlertResolve: ((accepted: boolean) => void) | null = null;

    private static _hostStyleId: string = "customerInlineHostStyle";
    private static _colorSurface: string = "#1B1A19";
    private static _colorText: string = "#E8E6E3";

    private static _searchCache: { [key: string]: any[] } = {};

    /** Campo de documento del canal, resuelto una sola vez por sesión. */
    private static _documentSearchField: any = null;
    private static _documentSearchFieldResolved: boolean = false;

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

            // ANTES de abrir, no en onReady: en la PRIMERA apertura el POS todavia no ha
            // cargado la plantilla, asi que dibuja el dialogo con su ancho por defecto y el
            // <style> de la plantilla —que es donde vivian estas reglas— aun no existe. De ahi
            // que el parpadeo se viera solo la primera vez y no en las siguientes, con la
            // plantilla ya en cache.
            CustomerInlineDialog._ensureHostStyle();
            CustomerInlineDialog._markBody(true);

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

        // Por si una alerta quedó visible al cerrar el modal la vez anterior: el POS conserva
        // el DOM de la plantilla entre aperturas.
        this._resetAlert(element);

        this._widenHostDialog(element);
        this._prefillInitialValues(element);
        this._setMode(element, this._mode);
        this._loadAddressPurposes(element);
        this._loadCustomerGroups(element);
        this._loadDepartments(element);

        // Cambiar el tipo a mano muestra u oculta apellidos y nombres al instante.
        const customerTypeSelect: HTMLSelectElement =
            element.querySelector("#customerInlineCreateCustomerType") as HTMLSelectElement;
        if (customerTypeSelect) {
            customerTypeSelect.onchange = (): void => {
                this._togglePersonNameFields(
                    element,
                    parseInt(customerTypeSelect.value, 10) !== ProxyEntities.CustomerType.Organization);
            };
        }

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

        // Lo que se escribe o se pega a mano también se separa, no solo lo que trae SUNAT: el
        // cajero copia la dirección de un documento y viene igual de concatenada.
        const streetInput: HTMLInputElement =
            element.querySelector("#customerInlineCreateAddress") as HTMLInputElement;
        if (streetInput) {
            streetInput.onblur = (): void => {
                this._splitStreetOnBlur(element);
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
    /**
     * Inyecta UNA VEZ las reglas del contenedor que el POS monta alrededor del modal.
     *
     * POR QUE NO ESTAN EN EL <style> DE LA PLANTILLA
     * Ahi estaban, y el parpadeo se seguia viendo en la PRIMERA apertura y no en las
     * siguientes. El motivo: la primera vez el POS aun no ha cargado la plantilla, dibuja el
     * dialogo con su ancho por defecto, y el <style> —que viaja dentro de esa misma
     * plantilla— todavia no existe. Al reabrirlo, con la plantilla en cache, la regla ya
     * estaba y por eso no parpadeaba.
     *
     * Inyectadas en el <head> desde `open()`, las reglas existen antes de que el POS cree
     * nada, tambien la primera vez.
     *
     * POR QUE SE MARCA EL <body>
     * En `open()` todavia no hay contenedor al que ponerle una clase —el POS lo crea
     * despues—, asi que el selector no puede depender de el. La marca va en el <body>, que
     * si existe, y acota la regla a mientras nuestro modal esta abierto: `extensionTemplatedDialog`
     * es la clase de CUALQUIER dialogo de extension y no queremos tocar los ajenos.
     *
     * La clase que _applyDialogWidth pone sobre el contenedor se mantiene por si la marca del
     * body se limpiara antes de tiempo; las dos reglas dicen lo mismo.
     */
    private static _ensureHostStyle(): void {
        if (typeof document === "undefined" || document.getElementById(CustomerInlineDialog._hostStyleId)) {
            return;
        }

        const rules: string = [
            // El ancho con clamp() se adapta solo al viewport de la caja —que puede ser 1024px,
            // no 1920— sin calcularlo en JavaScript ni recalcularlo si la ventana cambia:
            //   minimo 520px  para que la tabla de resultados entre
            //   ideal  82vw
            //   maximo 800px  con 960 el modal tapaba casi toda la venta y el cajero perdia de
            //                 vista las lineas y los totales; a 800 quedan ~220px visibles.
            "body.customerInlineDialogOpen .extensionTemplatedDialog,",
            ".customerInlineHostDialog {",
            "    width: clamp(520px, 82vw, 800px) !important;",
            "    max-width: 96vw !important;",
            "    background-color: " + CustomerInlineDialog._colorSurface + " !important;",
            "    color: " + CustomerInlineDialog._colorText + " !important;",
            "}",
            "body.customerInlineDialogOpen .dialogContainer,",
            "body.customerInlineDialogOpen .ExtensionTemplateDialogContentPlaceholder,",
            ".customerInlineHostContainer {",
            "    width: 100% !important;",
            "    max-width: 100% !important;",
            "    box-sizing: border-box !important;",
            "}",
            // Sin esto el modal salia BLANCO un instante y despues oscuro: pintar solo el
            // contenedor exterior no basta, porque los contenedores que el POS mete dentro
            // traen su propio fondo claro y tapan el de atras. Se vuelven transparentes para
            // que se vea el fondo oscuro del contenedor, en el primer pintado y sin JavaScript.
            //
            // _applyDialogTheme sigue existiendo y hace lo mismo recorriendo el DOM, pero solo
            // puede correr en onReady —con la plantilla ya cargada—, que es justo despues del
            // instante en que se veia el blanco.
            //
            // Los <button> quedan fuera a proposito: el boton Cerrar es rojo por el tema y
            // volverlo transparente lo dejaria invisible.
            "body.customerInlineDialogOpen .extensionTemplatedDialog div,",
            "body.customerInlineDialogOpen .extensionTemplatedDialog section,",
            "body.customerInlineDialogOpen .extensionTemplatedDialog header,",
            "body.customerInlineDialogOpen .extensionTemplatedDialog footer,",
            "body.customerInlineDialogOpen .extensionTemplatedDialog span {",
            "    background-color: transparent !important;",
            "}",
            // Texto claro sobre el fondo ya oscuro. Las reglas propias del modal usan tres
            // clases y le ganan a estas dos, asi que las etiquetas, el recuadro de resultado y
            // la alerta conservan sus colores.
            "body.customerInlineDialogOpen .extensionTemplatedDialog,",
            "body.customerInlineDialogOpen .extensionTemplatedDialog div,",
            "body.customerInlineDialogOpen .extensionTemplatedDialog span,",
            "body.customerInlineDialogOpen .extensionTemplatedDialog h1,",
            "body.customerInlineDialogOpen .extensionTemplatedDialog h2,",
            "body.customerInlineDialogOpen .extensionTemplatedDialog h3,",
            "body.customerInlineDialogOpen .extensionTemplatedDialog h4 {",
            "    color: " + CustomerInlineDialog._colorText + " !important;",
            "}"
        ].join("\n");

        const style: HTMLStyleElement = document.createElement("style");
        style.id = CustomerInlineDialog._hostStyleId;
        style.appendChild(document.createTextNode(rules));
        (document.head || document.getElementsByTagName("head")[0]).appendChild(style);
    }

    /** Marca el <body> mientras el modal esta abierto, para acotar las reglas de arriba. */
    private static _markBody(open: boolean): void {
        if (typeof document === "undefined" || !document.body) {
            return;
        }

        const marker: string = "customerInlineDialogOpen";
        const current: string = typeof document.body.className === "string" ? document.body.className : "";
        const has: boolean = (" " + current + " ").indexOf(" " + marker + " ") >= 0;

        if (open && !has) {
            document.body.className = current ? current + " " + marker : marker;
        } else if (!open && has) {
            document.body.className = (" " + current + " ").split(" " + marker + " ").join(" ").replace(/\s+/g, " ").replace(/^ | $/g, "");
        }
    }

    private _widenHostDialog(element: HTMLElement): void {
        // El ancho YA NO se reaplica: sale de una regla !important de la plantilla y el POS no
        // puede pisarla. Lo unico que hace falta es poner la clase en cuanto el contenedor
        // exista. Antes esto era una carrera contra el POS que se ganaba tarde, y el modal se
        // veia estrecho medio segundo antes de ensancharse a la vista del cajero.
        //
        // Quedan unos pocos reintentos, ya cortos, por dos motivos: el contenedor puede no
        // estar montado en el primer onReady, y el POS repinta su chrome despues, que es lo
        // que _applyDialogTheme tiene que volver a oscurecer. Cada pasada es idempotente:
        // _addClass no duplica la clase y el recorrido solo reescribe colores.
        const attempts: number[] = [0, 60, 150, 350];

        this._applyDialogWidth(element);
        this._applyDialogTheme(element);
        for (let i: number = 0; i < attempts.length; i++) {
            setTimeout((): void => {
                this._applyDialogWidth(element);
                // El tema va en la misma tanda que el ancho y por el mismo motivo: el POS
                // termina de montar el diálogo después de onReady y repinta su chrome.
                this._applyDialogTheme(element);
            }, attempts[i]);
        }

        // Se reporta al final, cuando el POS ya midió: antes todo daba 0px y no servía de nada.
        setTimeout((): void => { this._reportDialogWidth(element); }, 950);
    }

    /**
     * Oscurece el chrome del diálogo del POS: la cabecera "Cliente", la X de cerrar y la barra
     * del botón Cerrar.
     *
     * POR QUÉ ES CÓDIGO Y NO CSS
     * Esas tres piezas NO están dentro de la plantilla —el POS las monta alrededor— así que el
     * `<style>` del template no las alcanza. Y sus clases no aparecen en los typings ni en el
     * SDK, o sea que no hay un selector estable al que apuntar aunque se escribiera una regla
     * global. Se recorre el DOM y se pinta lo que hay: no hace falta saber cómo se llama nada.
     *
     * REGLAS DEL RECORRIDO
     * - Lo que está DENTRO de la plantilla se salta: ya lo estiliza el CSS del template, y
     *   pisarlo desde aquí borraría el fondo de los campos y de la alerta.
     * - A los `<button>` solo se les cambia el color del texto. El botón Cerrar es rojo por el
     *   tema Trujillo Market; volverlo transparente lo dejaría en un rectángulo invisible.
     * - Se usa `setProperty(..., "important")` porque los estilos del POS vienen con
     *   `!important` y un estilo en línea normal no les gana.
     */
    private _applyDialogTheme(element: HTMLElement): void {
        const host: HTMLElement = this._findHostDialog(element);

        if (!host) {
            return;
        }

        host.style.setProperty("background-color", CustomerInlineDialog._colorSurface, "important");
        host.style.setProperty("color", CustomerInlineDialog._colorText, "important");

        const nodes: NodeListOf<Element> = host.querySelectorAll("*");

        for (let i: number = 0; i < nodes.length; i++) {
            const node: HTMLElement = nodes[i] as HTMLElement;

            // `contains` incluye al propio elemento, así que esto salta la plantilla entera.
            if (element === node || element.contains(node)) {
                continue;
            }

            node.style.setProperty("color", CustomerInlineDialog._colorText, "important");

            if (node.tagName !== "BUTTON") {
                node.style.setProperty("background-color", "transparent", "important");
            }
        }
    }

    /** Contenedor que el POS monta alrededor de la plantilla. Null si no aparece. */
    private _findHostDialog(element: HTMLElement): HTMLElement {
        let node: HTMLElement = element.parentElement;

        for (let depth: number = 0; node && depth < 10; depth++) {
            const cls: string = typeof node.className === "string" ? node.className : "";

            if (cls.indexOf("extensionTemplatedDialog") >= 0) {
                return node;
            }

            node = node.parentElement;
        }

        return null;
    }

    /**
     * Marca los contenedores del POS para que el CSS de la plantilla les de el ancho.
     *
     * POR QUE UNA CLASE Y NO UN ESTILO EN LINEA
     * Antes esto escribia `node.style.width` directamente. El POS fija SU ancho tambien en
     * linea y lo hace DESPUES de onReady, asi que la ultima escritura ganaba: el modal se veia
     * estrecho medio segundo y se ensanchaba de golpe cuando uno de los reintentos volvia a
     * pisarlo. Era una carrera que se ganaba tarde y a la vista del cajero.
     *
     * Con una clase, el ancho sale de una regla `!important` del `<style>` de la plantilla, y
     * un estilo en linea NO le gana a un !important de hoja de estilos. El POS puede escribir
     * su ancho las veces que quiera: ya no cambia nada. Ademas la regla esta activa desde que
     * se parsea la plantilla, o sea antes de que el POS mida.
     *
     * El ancho concreto tambien vive en el CSS, con clamp(): se adapta solo al viewport de la
     * caja sin tener que calcularlo en JavaScript ni recalcularlo si la ventana cambia.
     */
    private _applyDialogWidth(element: HTMLElement): void {
        let node: HTMLElement = element.parentElement;

        for (let depth: number = 0; node && depth < 10; depth++) {
            const cls: string = typeof node.className === "string" ? node.className : "";

            if (cls.indexOf("extensionTemplatedDialog") >= 0) {
                this._addClass(node, "customerInlineHostDialog");
                break;
            }

            if (cls.indexOf("dialogContainer") >= 0
                || cls.indexOf("ExtensionTemplateDialogContentPlaceholder") >= 0) {
                this._addClass(node, "customerInlineHostContainer");
            }

            node = node.parentElement;
        }
    }

    /** `classList` no existe en el target ES5 del proyecto, y repetir la clase rompe el CSS. */
    private _addClass(node: HTMLElement, className: string): void {
        const current: string = typeof node.className === "string" ? node.className : "";

        if ((" " + current + " ").indexOf(" " + className + " ") === -1) {
            node.className = current ? current + " " + className : className;
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

    /**
     * Posiciona el combo de tipo de cliente y muestra u oculta los campos de apellidos y
     * nombres, que solo aplican a persona. Para organización D365 usa la razón social.
     */
    private _applyCustomerType(element: HTMLElement, customerTypeValue: number): void {
        const select: HTMLSelectElement =
            element.querySelector("#customerInlineCreateCustomerType") as HTMLSelectElement;
        if (select) {
            select.value = String(customerTypeValue);
        }
        this._togglePersonNameFields(element, customerTypeValue !== ProxyEntities.CustomerType.Organization);
    }

    private _togglePersonNameFields(element: HTMLElement, isPerson: boolean): void {
        const ids: string[] = ["customerInlineCreateLastNameField", "customerInlineCreateFirstNameField"];
        for (let i: number = 0; i < ids.length; i++) {
            const field: HTMLElement = element.querySelector("#" + ids[i]) as HTMLElement;
            if (field) {
                field.style.display = isPerson ? "" : "none";
            }
        }
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

            this._logCustomerIdentity("desde el trigger", this._currentCustomer);

            // El cliente que entrega el trigger viene INCOMPLETO: puede llegar sin direcciones y
            // sin propiedades de extensión —o sea, sin el documento—. Se relee por cuenta cuando
            // falte cualquiera de las dos cosas; si no, el formulario sale vacío y el cajero
            // termina creando una dirección nueva o perdiendo el documento sin darse cuenta.
            const addresses: any[] = this._currentCustomer.Addresses || [];
            const hasDocument: boolean = !!this._sunatService.getDocumentNumber(this._currentCustomer);

            if (addresses.length > 0) {
                this._prefillAddressFromCustomer(element, this._currentCustomer);
            }

            if ((addresses.length === 0 || !hasDocument) && this._currentCustomer.AccountNumber) {
                this._getCustomerByAccount(this._currentCustomer.AccountNumber)
                    .then((full: ProxyEntities.Customer | null): void => {
                        if (!full) {
                            return;
                        }

                        this._currentCustomer = full;
                        this._logCustomerIdentity("releído por cuenta", full);

                        // Solo se completa lo que faltaba: si el trigger ya trajo el documento,
                        // no se pisa.
                        if (!this._getValue(element, "customerInlineEditDocument")) {
                            this._setValue(element, "customerInlineEditDocument",
                                this._sunatService.getDocumentNumber(full) || "");
                        }

                        if ((full.Addresses || []).length > 0) {
                            this._prefillAddressFromCustomer(element, full);
                        }
                    })
                    .catch((reason: any): void => {
                        this._logError("No se pudo releer el cliente para editar: " + this._stringify(reason));
                    });
            }
        }
    }

    /**
     * Vuelca qué identificadores trae realmente el cliente.
     *
     * Hizo falta porque el formulario de edición mostraba el PartyNumber como documento y no
     * había forma de saber, desde fuera, si el problema era que la propiedad de extensión venía
     * vacía o que se estaba leyendo la equivocada. Se listan los NOMBRES de todas las
     * propiedades de extensión: cuáles llegan al POS no está documentado en ningún sitio.
     */
    private _logCustomerIdentity(origen: string, customer: ProxyEntities.Customer): void {
        const properties: any[] = (customer && customer.ExtensionProperties) || [];
        const lines: string[] = [];

        for (let i: number = 0; i < properties.length; i++) {
            const property: any = properties[i];
            const value: any = property && property.Value;
            lines.push("  " + (property && property.Key)
                + " = " + this._stringify(value && (value.StringValue || value.IntegerValue || value)));
        }

        this._logChunked("=== Identidad del cliente (" + origen + ") ===",
            "AccountNumber=" + ((customer && customer.AccountNumber) || "(vacio)")
            + " | PartyNumber=" + ((customer && customer.PartyNumber) || "(vacio)")
            + " | IdentificationNumber=" + ((customer && customer.IdentificationNumber) || "(vacio)")
            + " | documento resuelto=" + (this._sunatService.getDocumentNumber(customer) || "(vacio)")
            + "\nExtensionProperties (" + properties.length + "):\n"
            + (lines.length > 0 ? lines.join("\n") : "  (ninguna)"));
    }

    /**
     * Carga la dirección actual del cliente en la sección compartida, para que editar sea
     * modificar lo que hay y no volver a escribirlo todo.
     *
     * Se prefiere la dirección marcada como principal; si ninguna lo está, la primera.
     */
    private _prefillAddressFromCustomer(element: HTMLElement, customer: ProxyEntities.Customer): void {
        const addresses: any[] = (customer && customer.Addresses) || [];
        if (addresses.length === 0) {
            this._logChunked("=== Direccion actual del cliente ===", "el cliente no tiene direcciones cargadas");
            return;
        }

        let address: any = addresses[0];
        for (let i: number = 0; i < addresses.length; i++) {
            if (addresses[i].IsPrimary) {
                address = addresses[i];
                break;
            }
        }

        if (address.StreetNumber || address.BuildingCompliment) {
            this._setValue(element, "customerInlineCreateAddress", address.Street || "");
            this._setValue(element, "customerInlineCreateStreetNumber", address.StreetNumber || "");
            this._setValue(element, "customerInlineCreateBuildingCompliment", address.BuildingCompliment || "");
        } else {
            // Los clientes creados antes de separar estos campos traen todo dentro de Street. Se
            // parte al editarlos, para que al guardar queden bien repartidos sin retipear nada.
            this._applyAddressParts(element, address.Street || "");
        }

        this._setChecked(element, "customerInlineCreateAddressPrimary", address.IsPrimary !== false);

        const purposeSelect: HTMLSelectElement =
            element.querySelector("#customerInlineCreateAddressPurpose") as HTMLSelectElement;
        if (purposeSelect && address.AddressTypeValue) {
            purposeSelect.value = String(address.AddressTypeValue);
        }

        this._logChunked("=== Direccion actual del cliente ===",
            "Street=" + (address.Street || "")
            + " | State=" + (address.State || "") + " County=" + (address.County || "")
            + " City=" + (address.City || "") + " | AddressType=" + (address.AddressTypeValue || ""));

        // La cascada se posiciona con los códigos que ya tiene la dirección guardada: no hay
        // nada que resolver, salen del maestro.
        this._preselectGeography(element, address.State || "", address.County || "", address.City || "");

        // RecordId identifica la dirección existente: sin él, D365 agrega una nueva en vez de
        // actualizar la que el cajero está editando.
        this._editingAddressRecordId = address.RecordId || 0;
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

        return this._runSearch(searchText)
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

    /**
     * Elige cómo buscar según lo que escribió el cajero.
     *
     * Si el término es un DNI (8 dígitos) o un RUC (11), se dirige a un campo concreto con
     * `SearchByFields`. La búsqueda por palabra clave NO encuentra por número de documento: ese
     * dato vive en la propiedad de extensión DPNUMBERDOCUMID_PE y el keyword no la cubre — que
     * era justamente la búsqueda más usada en caja y la única que fallaba.
     *
     * Qué campos admite el canal lo dice `GetCustomerSearchFields()`; no se pueden cablear
     * porque son una enumeración extensible que cada implantación define.
     */
    /**
     * Ejecuta la busqueda y ADEMAS informa por que via fue.
     *
     * `byDocument` distingue una busqueda dirigida al campo de documento del canal de una por
     * palabra clave. La comprobacion de duplicados lo necesita: si el propio servidor filtro
     * por documento, los resultados ya coinciden y no hay nada que verificar. Sin ese dato
     * habia que releer cada candidato entero solo para comparar su documento.
     */
    private _runSearchDetailed(searchText: string): Promise<{ response: any; byDocument: boolean }> {
        const asDocument: string = this._sunatService.normalizeDocument(searchText);
        const looksLikeDocument: boolean = asDocument === searchText.trim()
            && (asDocument.length === 8 || asDocument.length === 11);

        if (!looksLikeDocument) {
            return this.context.runtime.executeAsync(
                new CustomerSearchRequest<CustomerSearchResponse>(searchText, this._searchTop, this._searchSkip))
                .then((response: any): { response: any; byDocument: boolean } => {
                    return { response: response, byDocument: false };
                });
        }

        return this._getDocumentSearchField()
            .then((field: any): Promise<{ response: any; byDocument: boolean }> => {
                if (!field) {
                    // El canal no expone un campo de documento: se busca por palabra clave, que
                    // puede no encontrarlo. Queda registrado para saber si hay que resolverlo
                    // con un endpoint propio en el CRT contra DPNUMBERDOCUMID_PE.
                    this._logChunked("=== Busqueda por documento ===",
                        "el canal no expone un campo de documento; se usa palabra clave");
                    return this.context.runtime.executeAsync(
                        new CustomerSearchRequest<CustomerSearchResponse>(searchText, this._searchTop, this._searchSkip))
                        .then((response: any): { response: any; byDocument: boolean } => {
                            return { response: response, byDocument: false };
                        });
                }

                this._logChunked("=== Busqueda por documento ===",
                    "campo elegido: " + (field.Name || "?") + " (valor " + (field.Value || "?") + ")");

                return this.context.runtime.executeAsync(
                    new CustomerSearchByFieldsRequest<CustomerSearchByFieldsResponse>(
                        searchText, field, this._searchTop, this._searchSkip))
                    .then((response: any): { response: any; byDocument: boolean } => {
                        return { response: response, byDocument: true };
                    });
            });
    }

    private _runSearch(searchText: string): Promise<any> {
        return this._runSearchDetailed(searchText)
            .then((outcome: { response: any; byDocument: boolean }): any => outcome.response);
    }

    /**
     * Busca en el catálogo de campos del canal cuál corresponde al número de documento.
     *
     * El catálogo se consulta una sola vez por sesión y se registra completo: si ninguno encaja,
     * ese volcado dice qué campos hay realmente y evita adivinar en la siguiente iteración.
     */
    private _getDocumentSearchField(): Promise<any> {
        if (CustomerInlineDialog._documentSearchFieldResolved) {
            return Promise.resolve(CustomerInlineDialog._documentSearchField);
        }

        return this.context.runtime
            .executeAsync(new GetCustomerSearchFieldsRequest<GetCustomerSearchFieldsResponse>())
            .then((response: any): any => {
                const fields: any[] = (response && response.data && response.data.result) || [];

                const summary: string[] = [];
                for (let i: number = 0; i < fields.length; i++) {
                    const sf: any = fields[i].SearchField || {};
                    summary.push((sf.Name || "?") + "=" + (sf.Value || "?")
                        + " [" + (fields[i].DisplayName || "") + "]");
                }
                this._logChunked("=== Campos de busqueda del canal ===", summary.join("\n"));

                // Se busca por nombre técnico o por etiqueta: la localización Perú puede haber
                // agregado el suyo y no hay una convención garantizada.
                const pattern: RegExp = /doc|identif|tax|ruc|dni|nif/i;
                for (let i: number = 0; i < fields.length; i++) {
                    const sf: any = fields[i].SearchField || {};
                    const haystack: string = (sf.Name || "") + " " + (fields[i].DisplayName || "");
                    if (pattern.test(haystack)) {
                        CustomerInlineDialog._documentSearchField = sf;
                        break;
                    }
                }

                CustomerInlineDialog._documentSearchFieldResolved = true;
                return CustomerInlineDialog._documentSearchField;
            })
            .catch((reason: any): any => {
                this._logChunked("=== Campos de busqueda del canal ===",
                    "GetCustomerSearchFields fallo: " + this._getErrorMessage(reason));
                CustomerInlineDialog._documentSearchFieldResolved = true;
                return null;
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
                // SUNAT entrega la dirección en una sola cadena ("CAL. LORETO NRO. 208") y D365
                // la guarda en tres campos. Si se vuelca entera en la calle, el número y el
                // piso/interior se pierden.
                this._applyAddressParts(element, sunatData.address || "");
                this._setValue(element, "customerInlineCreateCondition",
                    ((sunatData.raw && sunatData.raw.condicion) || "")
                    + (sunatData.taxpayerStatus && sunatData.taxpayerStatus.toUpperCase() !== "ACTIVO"
                        ? " — " + sunatData.taxpayerStatus : ""));
                this._warnInvoiceEligibility(element, sunatData);
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
                this._setValue(element, "customerInlineCreateLastName", sunatData.lastName || "");
                this._setValue(element, "customerInlineCreateFirstName", sunatData.firstName || "");
                this._applyCustomerType(element, sunatData.customerTypeValue);

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

        // Usa la misma vía que la búsqueda del modal: por palabra clave el documento no se
        // encuentra, así que la comprobación de duplicados tampoco lo detectaba.
        return this._runSearchDetailed(documentNumber)
            .then((outcome: { response: any; byDocument: boolean }): Promise<ProxyEntities.Customer | null> => {
                const candidates: any[] = (outcome.response && outcome.response.data && outcome.response.data.result) || [];
                if (candidates.length === 0) {
                    return Promise.resolve(null);
                }

                // ATAJO: si la búsqueda fue DIRIGIDA al campo de documento del canal, el
                // servidor ya filtró por ese campo y el primer resultado ES el cliente que
                // tiene el documento. Releerlo entero solo para volver a comparar el número
                // costaba una petición de ida y vuelta que no aportaba nada.
                if (outcome.byDocument) {
                    for (let i: number = 0; i < candidates.length; i++) {
                        if (candidates[i].AccountNumber) {
                            return Promise.resolve(candidates[i] as ProxyEntities.Customer);
                        }
                    }
                    return Promise.resolve(null);
                }

                const accounts: string[] = [];
                for (let i: number = 0; i < candidates.length && accounts.length < 3; i++) {
                    if (candidates[i].AccountNumber) {
                        accounts.push(candidates[i].AccountNumber);
                    }
                }

                // Búsqueda por palabra clave: aquí SÍ hay que releer cada candidato, porque el
                // documento no viene en el resultado. Van EN PARALELO —antes se encadenaban y
                // el cajero pagaba las tres esperas seguidas—; con tres como máximo, lanzarlas
                // juntas cuesta una sola ida y vuelta en vez de tres.
                const lookups: Promise<ProxyEntities.Customer | null>[] = [];
                for (let i: number = 0; i < accounts.length; i++) {
                    lookups.push(this._getCustomerByAccount(accounts[i])
                        .catch((): ProxyEntities.Customer | null => null));
                }

                return Promise.all(lookups)
                    .then((customers: (ProxyEntities.Customer | null)[]): ProxyEntities.Customer | null => {
                        for (let i: number = 0; i < customers.length; i++) {
                            const customer: ProxyEntities.Customer = customers[i];
                            if (customer && this._sunatService.getDocumentNumber(customer) === documentNumber) {
                                return customer;
                            }
                        }
                        return null;
                    });
            })
            .catch((reason: any): ProxyEntities.Customer | null => {
                // Ante un fallo de la comprobación NO se bloquea el alta: es peor impedir una
                // venta legítima que permitir un duplicado que después se depura.
                this._logError("Comprobacion de duplicado fallo: " + this._stringify(reason));
                return null;
            });
    }

    /**
     * Detecta el rechazo por documento duplicado que devuelve el propio servidor.
     *
     * La comprobación previa depende de la búsqueda por documento, que hoy no encuentra nada:
     * la búsqueda por palabra clave no cubre DPNUMBERDOCUMID_PE. Pero la localización Perú SÍ
     * valida el duplicado al crear y en el error incluye la cuenta del cliente que ya lo tiene:
     *
     *   "El tipo: 1 y número: 71289964 de documento, ya existe para el cliente: TRV-061687"
     *   errorCode Microsoft_Dynamics_Commerce_30104
     *
     * Esa es la fuente autoritativa. Se aprovecha para mostrar la misma alerta que la
     * comprobación previa, en vez de dejar al cajero con un error crudo.
     */
    private _isDuplicateDocumentError(reason: any): boolean {
        const text: string = this._stringify(reason);
        return text.indexOf("30104") >= 0
            || /ya existe para el cliente/i.test(text)
            || /ya existe.*documento|documento.*ya (existe|est[áa] registrado)/i.test(text);
    }

    /**
     * La cuenta puede no venir: la detección y la extracción están separadas a propósito para
     * que un mensaje sin cuenta siga mostrando la alerta en vez de pasar por "no es duplicado".
     */
    private _extractDuplicateAccount(reason: any): string {
        const text: string = this._stringify(reason);
        const match: RegExpMatchArray = text.match(/ya existe para el cliente:?\s*([A-Za-z0-9\-]+)/i);
        return match && match[1] ? match[1] : "";
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

        const direccionIncompleta: string = this._validateAddressCompleteness(element);
        if (direccionIncompleta) {
            return this._showAlert(element, "Dirección incompleta", direccionIncompleta, "Entendido", "")
                .then((): void => {
                    this._showMessage(element, "Complete la dirección o déjela vacía para continuar.");
                });
        }

        this._showMessage(element, "Verificando la situación del documento en SUNAT...");

        // El veto a observados corre SIEMPRE al crear, no solo al consultar: sin esto bastaba
        // llenar los campos a mano para saltarse la regla. La consulta sale de la caché si ya
        // se hizo. Si el proveedor está caído NO se bloquea: sin dato no se detiene una venta.
        return this._sunatService.lookup(documentNumber)
            .then((sunatData: ISunatCustomerData): boolean | Promise<boolean> =>
                this._warnInvoiceEligibility(element, sunatData))
            .catch((): boolean => true)
            .then((eligible: boolean): Promise<void> => {
                if (!eligible) {
                    return Promise.resolve();
                }

                this._showMessage(element, "Verificando que el documento no esté ya registrado...");

                return this._runCreateAfterEligibility(element, documentNumber, name);
            });
    }

    private _runCreateAfterEligibility(element: HTMLElement, documentNumber: string, name: string): Promise<void> {
        return this._findExistingByDocument(documentNumber)
            .then((existing: ProxyEntities.Customer | null): Promise<void> => {
                if (existing) {
                    return this._blockDuplicate(element, existing, documentNumber);
                }
                return this._continueCreate(element, documentNumber, name);
            })
            // Red de seguridad real: la comprobación previa depende de la búsqueda por documento,
            // que hoy no encuentra nada. El servidor sí valida el duplicado y en el error informa
            // la cuenta del cliente que ya lo tiene, así que se aprovecha para mostrar la misma
            // alerta en vez de dejar al cajero con un error crudo.
            .catch((reason: any): Promise<void> => {
                const handled: Promise<void> | null = this._handleServerDuplicate(element, reason, documentNumber);
                return handled ? handled : Promise.reject(reason);
            });
    }

    /**
     * Muestra la alerta si `reason` es el rechazo por documento duplicado. Devuelve null si no
     * lo es, para que quien llama siga tratándolo como el error que sea.
     *
     * Se llama desde DOS sitios y hace falta en los dos: el rechazo del alta llega unas veces
     * como promesa rechazada y otras como respuesta con `canceled`, según por dónde lo capture
     * el POS. Cubriendo solo uno, la mitad de los duplicados seguía sin avisar.
     */
    private _handleServerDuplicate(element: HTMLElement, reason: any, documentNumber: string): Promise<void> | null {
        if (!this._isDuplicateDocumentError(reason)) {
            return null;
        }

        const duplicateAccount: string = this._extractDuplicateAccount(reason);

        this._logChunked("=== Duplicado detectado por el servidor ===",
            "documento=" + documentNumber
            + " | cuenta existente=" + (duplicateAccount || "(no vino en el mensaje)"));

        if (!duplicateAccount) {
            // Sin cuenta no se puede asignar nada, pero el aviso igual tiene que salir.
            return this._blockDuplicate(
                element,
                { AccountNumber: "", Name: "" } as ProxyEntities.Customer,
                documentNumber);
        }

        // La alerta sale YA, con la cuenta que vino en el mensaje del servidor. Antes se
        // esperaba a releer el cliente solo para poder mostrar su nombre, y esa ida y vuelta
        // se sumaba entera al tiempo que el cajero pasa mirando una pantalla quieta.
        // El nombre no hace falta para decidir —la cuenta y el documento ya identifican al
        // cliente— asi que se busca EN PARALELO y se inyecta en el texto si llega a tiempo.
        const alert: Promise<void> = this._blockDuplicate(
            element,
            { AccountNumber: duplicateAccount, Name: "" } as ProxyEntities.Customer,
            documentNumber);

        this._getCustomerByAccount(duplicateAccount)
            .then((existing: ProxyEntities.Customer | null): void => {
                if (existing && existing.Name) {
                    this._setAlertBody(element, this._duplicateAlertBody(
                        duplicateAccount, existing.Name, documentNumber));
                }
            })
            .catch((): void => {
                // Que no se pueda releer el cliente no cambia nada: la alerta ya esta en
                // pantalla y el nombre era un adorno.
            });

        return alert;
    }

    /**
     * Ante un duplicado no se crea nada, pero tampoco se deja al cajero sin salida: se ofrece
     * asignar el cliente que ya existe, que es lo que iba a necesitar de todas formas.
     *
     * POR QUÉ LA ALERTA ES PROPIA Y NO LA DEL POS
     * La primera versión usaba `ShowMessageDialogClientRequest`. No se veía nada: el POS no apila
     * un diálogo de mensaje sobre un templated dialog que ya está abierto —que es justo nuestro
     * caso—, así que la petición fallaba y el aviso moría en el `.catch`. La alerta se pinta
     * ahora en el DOM del propio modal (overlay `position: fixed`), donde no depende de la pila
     * de diálogos del POS.
     */
    private _blockDuplicate(element: HTMLElement, existing: ProxyEntities.Customer, documentNumber: string): Promise<void> {
        const account: string = existing.AccountNumber || "";
        const name: string = existing.Name || this._formatCustomerSummary(existing);

        this._logChunked("=== Duplicado evitado ===",
            "documento=" + documentNumber + " ya pertenece a la cuenta " + account);

        const body: string = this._duplicateAlertBody(account, name, documentNumber);

        return this._showAlert(
            element,
            "El cliente ya existe",
            body,
            account ? "Aceptar y usar este cliente" : "Aceptar",
            account ? "Cancelar" : "")
            .then((accepted: boolean): Promise<void> => {
                if (!accepted || !account) {
                    // Canceló: se queda en el formulario con los datos que ya cargó, por si
                    // quiere revisarlos antes de decidir.
                    this._showMessage(element, "El documento ya está registrado"
                        + (account ? " en la cuenta " + account : "") + ".");
                    return Promise.resolve();
                }

                this._showMessage(element, "Asignando " + account + " a la venta...");

                return this._setCustomerOnCart(account)
                    .then((): void => {
                        // Cierra el modal y deja al cliente existente puesto en la venta, que es
                        // lo que el cajero necesitaba desde el principio.
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
            });
    }

    /**
     * Advierte si al contribuyente NO se le puede emitir factura (estado distinto de ACTIVO o
     * condición distinta de HABIDO). Resuelve al cerrar la alerta; sin motivos, de inmediato.
     *
     * DECISIÓN DEL NEGOCIO (2026-08-20): a estos clientes NO SE LES VENDE y NO SE LES CREA
     * ficha. La primera versión solo advertía y permitía la boleta; se endureció a pedido
     * expreso para no depender de que el cajero recuerde la regla al elegir el comprobante.
     * Devuelve true si es apto; con motivos, muestra la alerta y devuelve false.
     *
     * El veto real está en _executeCreate, que reconsulta antes de crear: esta alerta en la
     * consulta es el aviso temprano, pero el cajero podría llenar los campos a mano sin
     * consultar y el botón de crear tiene que negarse igual.
     */
    private _warnInvoiceEligibility(element: HTMLElement, sunatData: ISunatCustomerData): Promise<boolean> {
        const reasons: string[] = this._sunatService.getInvoiceBlockReasons(sunatData);

        if (reasons.length === 0) {
            return Promise.resolve(true);
        }

        this._logChunked("=== Contribuyente observado en SUNAT ===",
            "documento=" + sunatData.documentNumber + " | " + reasons.join(" | "));

        const body: string = "SUNAT reporta lo siguiente para el RUC " + sunatData.documentNumber + ":\n\n"
            + reasons.join("\n") + "\n\n"
            + "A este cliente NO se le puede vender ni registrar en el sistema.\n\n"
            + "Debe regularizar su situación en SUNAT antes de poder comprarnos.";

        return this._showAlert(element, "Cliente observado en SUNAT — venta no permitida", body, "Entendido", "")
            .then((): boolean => {
                this._showMessage(element,
                    "⛔ RUC observado en SUNAT (" + reasons.join("; ") + "). No se le puede vender ni crear.");
                return false;
            });
    }

    /** Texto de la alerta de duplicado. Vive aparte porque se recalcula si el nombre llega tarde. */
    private _duplicateAlertBody(account: string, name: string, documentNumber: string): string {
        if (!account) {
            return "El documento " + documentNumber + " ya está registrado en otro cliente.\n\n"
                + "No se creó un cliente nuevo para no duplicarlo. "
                + "Búsquelo en la pestaña Buscar Cliente.";
        }

        return "El documento " + documentNumber + " ya pertenece a la cuenta " + account
            + (name ? " (" + name + ")" : "") + ".\n\n"
            + "No se creó un cliente nuevo para no duplicarlo.\n\n"
            + "Al aceptar, ese cliente se asigna a esta venta.";
    }

    /** Reescribe el texto de la alerta que ya está en pantalla. No hace nada si se cerró. */
    private _setAlertBody(element: HTMLElement, body: string): void {
        const overlay: HTMLElement = element.querySelector("#customerInlineAlertOverlay") as HTMLElement;
        const bodyNode: HTMLElement = element.querySelector("#customerInlineAlertBody") as HTMLElement;

        if (overlay && bodyNode && overlay.style.display !== "none") {
            bodyNode.textContent = body;
        }
    }

    /**
     * Alerta flotante propia. Resuelve true si el cajero aceptó y false si canceló.
     *
     * Nunca rechaza: un fallo al mostrar el aviso no debe convertirse en un error suelto que
     * tape el motivo real. Si el overlay no está en el DOM —plantilla vieja en caché— cae al
     * recuadro de resultado, que siempre existe.
     */
    private _showAlert(
        element: HTMLElement,
        title: string,
        body: string,
        acceptLabel: string,
        cancelLabel: string): Promise<boolean> {
        const overlay: HTMLElement = element.querySelector("#customerInlineAlertOverlay") as HTMLElement;
        const titleNode: HTMLElement = element.querySelector("#customerInlineAlertTitle") as HTMLElement;
        const bodyNode: HTMLElement = element.querySelector("#customerInlineAlertBody") as HTMLElement;
        const acceptButton: HTMLButtonElement = element.querySelector("#customerInlineAlertAccept") as HTMLButtonElement;
        const cancelButton: HTMLButtonElement = element.querySelector("#customerInlineAlertCancel") as HTMLButtonElement;

        if (!overlay || !acceptButton || !cancelButton) {
            this._logError("Alerta flotante no disponible en la plantilla; se muestra en el recuadro.");
            this._showTextResult(element, "customerInlineCreateResult", title + "\n\n" + body);
            return Promise.resolve(false);
        }

        // Si quedó una alerta sin responder, se cierra AQUÍ. Sin esto su promesa quedaba
        // huérfana para siempre y el botón que la esperaba no se volvía a habilitar: el modal
        // se veía "sin responder" y sin ningún error que lo explicara.
        this._dismissPendingAlert("se abre una alerta nueva");

        if (titleNode) { titleNode.textContent = title; }
        if (bodyNode) { bodyNode.textContent = body; }
        acceptButton.textContent = acceptLabel;
        // Sin etiqueta de cancelar el aviso es de una sola salida: se oculta el botón en vez de
        // ofrecer dos que hacen lo mismo.
        cancelButton.textContent = cancelLabel || "Cancelar";
        cancelButton.style.display = cancelLabel ? "" : "none";

        overlay.style.display = "flex";

        return new Promise<boolean>((resolve: (value: boolean) => void): void => {
            const close = (accepted: boolean): void => {
                overlay.style.display = "none";
                // Se desenganchan los manejadores: el modal se reutiliza entre aperturas y si
                // no, cada alerta sumaba un listener sobre los mismos botones.
                acceptButton.onclick = null;
                cancelButton.onclick = null;
                overlay.onclick = null;
                overlay.onkeydown = null;
                this._pendingAlertResolve = null;
                resolve(accepted);
            };

            this._pendingAlertResolve = close;

            acceptButton.onclick = (): void => { close(true); };
            cancelButton.onclick = (): void => { close(false); };

            // DOS SALIDAS MÁS, a propósito. El overlay tapa el modal entero, así que si por lo
            // que sea los botones no respondieran, el cajero quedaría encerrado sin poder hacer
            // nada. Tocar fuera de la tarjeta o pulsar Escape equivale a cancelar.
            overlay.onclick = (event: Event): void => {
                if (event && event.target === overlay) {
                    close(false);
                }
            };

            overlay.onkeydown = (event: KeyboardEvent): void => {
                // `keyCode` y no `key`: el target del proyecto es ES5 y el POS corre en un
                // WebView donde conviene no depender de lo más nuevo.
                if (event && (event.keyCode === 27)) {
                    close(false);
                }
            };
        });
    }

    /**
     * Cierra la alerta en pantalla resolviéndola como cancelada. No hace nada si no hay
     * ninguna. Se llama al abrir otra alerta y al abrir el modal.
     */
    private _dismissPendingAlert(motivo: string): void {
        const pending: ((accepted: boolean) => void) | null = this._pendingAlertResolve;

        if (!pending) {
            return;
        }

        this._logChunked("=== Alerta pendiente cerrada ===", motivo);
        this._pendingAlertResolve = null;
        pending(false);
    }

    /**
     * Deja el overlay oculto al abrir el modal.
     *
     * El POS conserva el DOM de la plantilla entre aperturas: si una alerta quedó visible al
     * cerrar el modal, al reabrirlo aparecería tapándolo todo con los manejadores de la
     * instancia anterior, que ya no responden.
     */
    private _resetAlert(element: HTMLElement): void {
        const overlay: HTMLElement = element.querySelector("#customerInlineAlertOverlay") as HTMLElement;

        this._pendingAlertResolve = null;

        if (overlay) {
            overlay.style.display = "none";
            overlay.onclick = null;
            overlay.onkeydown = null;
        }
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

        // En una PERSONA, D365 exige apellidos y nombres: sin ellos rechaza el alta con
        // "Los campos de nombre son campos obligatorios". Eso pasaba con los RUC 10, que el
        // código trataba como organización aunque son personas naturales con RUC.
        // Va DESPUÉS de fijar CustomerTypeValue desde el combo, porque depende de él.
        if (customer.CustomerTypeValue !== ProxyEntities.CustomerType.Organization) {
            const lastName: string = this._getValue(element, "customerInlineCreateLastName");
            const firstName: string = this._getValue(element, "customerInlineCreateFirstName");

            if (lastName) { customer.LastName = lastName; }
            if (firstName) { customer.FirstName = firstName; }

            // Último recurso: si los campos quedaron vacíos, se parten del nombre completo en
            // vez de dejar que el servidor rechace el alta.
            if (!customer.LastName && !customer.FirstName && customer.Name) {
                const split: { firstName: string; lastName: string } =
                    this._sunatService.splitPersonName(customer.Name);
                customer.LastName = split.lastName;
                customer.FirstName = split.firstName;
            }

            this._logChunked("=== Cliente persona ===",
                "LastName=" + (customer.LastName || "(vacio)")
                + " | FirstName=" + (customer.FirstName || "(vacio)")
                + " | Name=" + (customer.Name || "(vacio)"));
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

            // Se arma con el MISMO método que usa la edición. Antes cada flujo la construía por
            // su cuenta y ya se habían separado: los campos de número de calle y complemento
            // llegaron solo a uno de los dos.
            const address: ProxyEntities.Address | null = this._buildAddressFromForm(element, 0);

            if (address) {
                // "Info de contacto" según el criterio funcional: OFICINA en empresas, DOMICILIO
                // en personas. Si el cajero eligió otro propósito, manda su elección.
                address.Name = this._resolveAddressName(
                    sunatData.documentType,
                    address.AddressTypeValue,
                    address.Name);

                // Respaldo: si la cascada no se completó pero el ubigeo de SUNAT sí resolvió, se
                // usan esos códigos en vez de dejar la dirección sin ubigeo.
                if (!address.State && u && u.IsValid) {
                    address.State = u.StateId;
                    address.County = u.CountyId;
                    address.City = u.CityName;
                    address.DistrictName = sunatData.district || "";
                }

                if (!address.State) {
                    this._logChunked("=== Direccion sin ubigeo ===",
                        "se envia solo la calle; complete departamento, provincia y distrito para que quede completa");
                }

                customer.Addresses = [address];
                this._logChunked("=== Address enviada ===", this._stringify(address));
            } else {
                this._logChunked("=== Address NO enviada ===",
                    "sin calle ni departamento — el cliente se crea sin direccion");
            }

            this._showMessage(element, "Paso 2: Aplicando valores por defecto del canal...");

            return this._applyChannelDefaults(customer).then((): Promise<void> => {
                this._showMessage(element, "Paso 3: Registrando cliente en D365...");

                // Volcado del cliente EXACTO que se envía. Crear como persona falla con "datos
                // incompletos" mientras que como organización funciona, así que hay que ver qué
                // campo difiere en lugar de suponerlo.
                this._logChunked("=== Cliente que se envia ===", this._stringify({
                    AccountNumber: customer.AccountNumber,
                    CustomerTypeValue: customer.CustomerTypeValue,
                    Name: customer.Name,
                    FirstName: customer.FirstName,
                    MiddleName: customer.MiddleName,
                    LastName: customer.LastName,
                    CustomerGroup: customer.CustomerGroup,
                    CurrencyCode: customer.CurrencyCode,
                    Language: customer.Language,
                    ReceiptSettings: customer.ReceiptSettings,
                    IdentificationNumber: customer.IdentificationNumber,
                    Phone: customer.Phone,
                    Email: customer.Email,
                    Addresses: (customer.Addresses || []).length,
                    ExtensionProperties: (customer.ExtensionProperties || []).length
                }));

                const createRequest: CreateCustomerServiceRequest = new CreateCustomerServiceRequest(this._getCorrelationId(), customer);

                return this.context.runtime.executeAsync(createRequest)
                    .then((response: any): Promise<void> => {
                        if (response.canceled || !response.data || !response.data.customer) {
                            // El motivo suele venir en la respuesta y hasta ahora se descartaba,
                            // dejando al cajero con un mensaje genérico.
                            this._logChunked("=== Alta cancelada por el sistema ===", this._stringify(response));

                            // El rechazo por duplicado llega por aquí cuando el POS lo convierte
                            // en respuesta cancelada en vez de rechazar la promesa. Sin esto, el
                            // cajero veía "revise la consola" en lugar de la alerta.
                            const handled: Promise<void> | null = this._handleServerDuplicate(
                                element, response, sunatData.documentNumber || "");
                            if (handled) {
                                return handled;
                            }

                            this._showMessage(element,
                                "La creación del cliente falló o fue cancelada por el sistema. "
                                + "Revise la consola (F12) para el detalle.");
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
            .then((sunatData: ISunatCustomerData): Promise<void> => {
                if (!this._getValue(element, "customerInlineEditName")) {
                    this._setValue(element, "customerInlineEditName", sunatData.name || "");
                }

                const differences: string[] = this._currentCustomer ? this._sunatService.compareWithCustomer(this._currentCustomer, sunatData) : [];

                this._showTextResult(element, "customerInlineEditResult", this._formatSunatSummary(sunatData) + "\n" + differences.join("\n"));
                this._showMessage(element, "SUNAT consultado. Revise diferencias y confirme Guardar.");

                // La advertencia va ANTES de tocar la dirección: si el RUC está observado,
                // eso pesa más que cualquier dato que se vaya a copiar.
                //
                // Despues, la direccion de SUNAT se OFRECE, no se impone: por requerimiento
                // del negocio (2026-08-20) el cajero puede ponerle cualquier direccion al
                // editar. La alerta pregunta y solo rellena si acepta.
                return this._warnInvoiceEligibility(element, sunatData)
                    .then((eligible: boolean): Promise<void> => {
                        if (!eligible) {
                            return Promise.resolve();
                        }

                        return this._offerSunatAddress(element, sunatData);
                    });
            });
    }

    /**
     * Ofrece rellenar el formulario con la direccion registrada en SUNAT. PREGUNTA, NO PISA:
     * por requerimiento del negocio (2026-08-20) la direccion al editar es libre — el cliente
     * puede usar una direccion distinta a su ficha RUC. Si el cajero acepta, se rellenan los
     * tres campos y la cascada de ubigeo; si no, el formulario queda tal cual.
     *
     * Si SUNAT no trae direccion, o la del formulario ya es la misma (comparadas solo por
     * letras y numeros, sin acentos ni puntuacion), no se pregunta nada.
     */
    private _offerSunatAddress(element: HTMLElement, sunatData: ISunatCustomerData): Promise<void> {
        const fromSunat: string = ((sunatData && sunatData.address) || "").replace(/\s+/g, " ").trim();

        if (!fromSunat) {
            return Promise.resolve();
        }

        const normalize = (value: string): string =>
            (value || "").toUpperCase()
                .replace(/[ÁÀÄÂ]/g, "A").replace(/[ÉÈËÊ]/g, "E")
                .replace(/[ÍÌÏÎ]/g, "I").replace(/[ÓÒÖÔ]/g, "O")
                .replace(/[ÚÙÜÛ]/g, "U")
                .replace(/[^A-Z0-9Ñ]/g, "");

        const current: string = normalize([
            this._getValue(element, "customerInlineCreateAddress"),
            this._getValue(element, "customerInlineCreateStreetNumber"),
            this._getValue(element, "customerInlineCreateBuildingCompliment")
        ].join(" "));

        if (current === normalize(fromSunat)) {
            this._showMessage(element, "SUNAT validado: la direccion coincide con la ficha RUC.");
            return Promise.resolve();
        }

        const sunatUbigeo: string = [sunatData.department || "", sunatData.province || "", sunatData.district || ""]
            .filter((part: string): boolean => !!part).join(" / ");

        const body: string = "SUNAT tiene registrada esta direccion fiscal:\n\n"
            + fromSunat
            + (sunatUbigeo ? "\nUbigeo: " + sunatUbigeo : "") + "\n\n"
            + "La del formulario es distinta. Puede conservarla: la direccion al editar es libre.\n\n"
            + "¿Reemplazarla por la de SUNAT?";

        return this._showAlert(element, "Direccion segun SUNAT", body, "Si, usar la de SUNAT", "No, dejar la actual")
            .then((accepted: boolean): void => {
                if (!accepted) {
                    this._showMessage(element, "Se conserva la direccion del formulario.");
                    return;
                }

                this._applyAddressParts(element, fromSunat);
                this._preselectGeographyFromSunat(element, sunatData);
                this._showMessage(element, "Direccion de SUNAT cargada. Revise el ubigeo y confirme Guardar.");
            });
    }

    private _updateCustomer(element: HTMLElement): Promise<void> {
        // Misma regla que al crear: o la dirección va entera, o no va.
        const direccionIncompleta: string = this._validateAddressCompleteness(element);
        if (direccionIncompleta) {
            return this._showAlert(element, "Dirección incompleta", direccionIncompleta, "Entendido", "")
                .then((): void => {
                    this._showMessage(element, "Complete la dirección o déjela vacía para guardar.");
                });
        }

        return this._loadCustomerForEdit(element)
            .then((customer: ProxyEntities.Customer): Promise<void> => {
                const documentNumber: string = this._sunatService.normalizeDocument(this._getValue(element, "customerInlineEditDocument"));

                this._applyEditableFields(customer, this._getValue(element, "customerInlineEditName"), this._getValue(element, "customerInlineEditPhone"), this._getValue(element, "customerInlineEditEmail"));

                // La dirección es lo que más cambia en un cliente, y hasta ahora editar no la
                // tocaba. Se reemplaza la que se estaba editando conservando su RecordId, y se
                // dejan intactas las demás direcciones del cliente.
                const editedAddress: ProxyEntities.Address | null =
                    this._buildAddressFromForm(element, this._editingAddressRecordId);

                if (editedAddress) {
                    const existingAddresses: any[] = (customer.Addresses || []).slice();
                    let replaced: boolean = false;

                    for (let i: number = 0; i < existingAddresses.length; i++) {
                        if (this._editingAddressRecordId && existingAddresses[i].RecordId === this._editingAddressRecordId) {
                            existingAddresses[i] = editedAddress;
                            replaced = true;
                            break;
                        }
                    }

                    if (!replaced) {
                        existingAddresses.push(editedAddress);
                    }

                    customer.Addresses = existingAddresses;

                    this._logChunked("=== Direccion que se guarda ===",
                        (replaced ? "actualiza RecordId=" + this._editingAddressRecordId : "agrega una nueva")
                        + "\n" + this._stringify(editedAddress));
                }

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
                        // REQUERIMIENTO (2026-08-20, mismo dia que se habia impuesto lo
                        // contrario): al editar, la direccion es LIBRE. La imposicion de la
                        // direccion de SUNAT se retiro a pedido del negocio; queda solo como
                        // ayuda opcional en Validar con SUNAT, que PREGUNTA antes de rellenar.
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

    /**
     * Reparte una dirección de una sola línea entre calle, número y complemento.
     *
     * El corte lo hace SunatCustomerService; aquí solo se vuelca al formulario. Si no hubo nada
     * que separar, el número y el complemento se dejan vacíos en vez de conservar lo anterior:
     * si no, al consultar un segundo RUC quedaba el número del primero pegado al nuevo.
     */
    private _applyAddressParts(element: HTMLElement, fullAddress: string): void {
        const parts: { street: string; streetNumber: string; compliment: string } =
            this._sunatService.parseAddressParts(fullAddress);

        this._setValue(element, "customerInlineCreateAddress", parts.street);
        this._setValue(element, "customerInlineCreateStreetNumber", parts.streetNumber);
        this._setValue(element, "customerInlineCreateBuildingCompliment", parts.compliment);

        this._logChunked("=== Direccion separada ===",
            "origen=" + (fullAddress || "(vacio)")
            + "\ncalle=" + (parts.street || "(vacio)")
            + " | numero=" + (parts.streetNumber || "(vacio)")
            + " | complemento=" + (parts.compliment || "(vacio)"));
    }

    /**
     * Separa lo que el cajero escribió o pegó en el campo de calle, al salir de él.
     *
     * Solo actúa si el número está vacío: si ya lo llenó a mano, mandan sus datos. Y solo si de
     * verdad había algo que separar, para no vaciar lo que acaba de escribir.
     */
    private _splitStreetOnBlur(element: HTMLElement): void {
        if (this._getValue(element, "customerInlineCreateStreetNumber")) {
            return;
        }

        const typed: string = this._getValue(element, "customerInlineCreateAddress");
        const parts: { street: string; streetNumber: string; compliment: string } =
            this._sunatService.parseAddressParts(typed);

        if (!parts.streetNumber) {
            return;
        }

        this._applyAddressParts(element, typed);
    }

    /**
     * Comprueba que la dirección esté completa. Devuelve el motivo, o "" si se puede continuar.
     *
     * LA DIRECCIÓN ES OPCIONAL, PERO A MEDIAS NO SIRVE. D365 valida el ubigeo contra sus
     * maestros y descarta en silencio una dirección sin State/County/City: el cliente se creaba
     * "con dirección" y en la ficha aparecía incompleta o vacía, sin que nadie se enterara
     * hasta emitir el comprobante.
     *
     * Por eso: o no se pone dirección, o se pone entera. Si hay calle pero falta algún nivel
     * del ubigeo —el caso real es olvidar el último desplegable— se detiene y se dice
     * exactamente qué falta.
     */
    private _validateAddressCompleteness(element: HTMLElement): string {
        const street: string = this._getValue(element, "customerInlineCreateAddress");
        const streetNumber: string = this._getValue(element, "customerInlineCreateStreetNumber");
        const compliment: string = this._getValue(element, "customerInlineCreateBuildingCompliment");
        const stateId: string = this._getValue(element, "customerInlineCreateDepartment");
        const countyId: string = this._getValue(element, "customerInlineCreateProvince");
        const cityCode: string = this._getValue(element, "customerInlineCreateDistrict");

        const tieneAlgo: boolean = !!(street || streetNumber || compliment || stateId || countyId || cityCode);

        // Sin ningún dato, el cliente simplemente no tendrá dirección. Es válido.
        if (!tieneAlgo) {
            return "";
        }

        const faltan: string[] = [];
        if (!street) { faltan.push("Calle / Dirección fiscal"); }
        if (!stateId) { faltan.push("Departamento"); }
        if (!countyId) { faltan.push("Provincia"); }
        if (!cityCode) { faltan.push("Distrito"); }

        if (faltan.length === 0) {
            return "";
        }

        return "Para registrar la dirección falta completar:\n\n"
            + "\u2022 " + faltan.join("\n\u2022 ") + "\n\n"
            + "Complete esos campos, o borre los datos de dirección si este cliente no va a "
            + "tener una: una dirección a medias no se guarda.";
    }

    /**
     * Arma la dirección desde la sección compartida. Devuelve null si no hay nada que guardar.
     *
     * `recordId` distingue los dos casos: 0 crea una dirección nueva, y el RecordId de una
     * existente la actualiza. Sin eso, editar una dirección dejaba al cliente con dos.
     */
    private _buildAddressFromForm(element: HTMLElement, recordId: number): ProxyEntities.Address | null {
        const street: string = this._getValue(element, "customerInlineCreateAddress");
        const stateId: string = this._getValue(element, "customerInlineCreateDepartment");
        const countyId: string = this._getValue(element, "customerInlineCreateProvince");
        const cityCode: string = this._getValue(element, "customerInlineCreateDistrict");

        if (!street && !stateId) {
            return null;
        }

        const purposeSelect: HTMLSelectElement =
            element.querySelector("#customerInlineCreateAddressPurpose") as HTMLSelectElement;
        const purposeValue: number = purposeSelect && purposeSelect.value
            ? parseInt(purposeSelect.value, 10)
            : ProxyEntities.AddressType.Business;

        const address: ProxyEntities.Address = new ProxyEntities.AddressClass();
        address.RecordId = recordId || 0;
        address.ThreeLetterISORegionName = "PER";
        address.Name = purposeSelect && purposeSelect.selectedIndex >= 0
            ? purposeSelect.options[purposeSelect.selectedIndex].text
            : "Negocio";
        address.Street = street;
        // La pantalla estándar manda estos dos por separado; el modal los enviaba vacíos y la
        // dirección quedaba sin número ni piso/interior.
        address.StreetNumber = this._getValue(element, "customerInlineCreateStreetNumber");
        address.BuildingCompliment = this._getValue(element, "customerInlineCreateBuildingCompliment");
        address.AddressTypeValue = purposeValue;
        address.IsPrimary = this._getChecked(element, "customerInlineCreateAddressPrimary");
        address.Deactivate = false;
        address.ExtensionProperties = [];

        if (stateId && countyId && cityCode) {
            address.State = stateId;
            address.County = countyId;
            address.City = cityCode;
            address.DistrictName = this._getSelectedLabel(element, "customerInlineCreateDistrict");
        }

        return address;
    }

    private _setMode(element: HTMLElement, mode: CustomerInlineDialogMode): void {
        this._mode = mode;

        this._toggle(element, "customerInlineTabSearch", mode === "search");
        this._toggle(element, "customerInlineTabCreate", mode === "create");
        this._toggle(element, "customerInlineTabEdit", mode === "edit");
        this._toggle(element, "customerInlinePanelSearch", mode === "search");
        this._toggle(element, "customerInlinePanelCreate", mode === "create");
        this._toggle(element, "customerInlinePanelEdit", mode === "edit");

        // La sección de dirección, las acciones y los resultados viven fuera de los paneles para
        // quedar SIEMPRE al final. Se muestran según el modo.
        const blocks: Array<{ id: string; visible: boolean }> = [
            { id: "customerInlineAddressSection", visible: mode === "create" || mode === "edit" },
            { id: "customerInlineCreateActions", visible: mode === "create" },
            { id: "customerInlineEditActions", visible: mode === "edit" },
            { id: "customerInlineCreateResult", visible: mode === "create" },
            { id: "customerInlineEditResult", visible: mode === "edit" }
        ];

        for (let i: number = 0; i < blocks.length; i++) {
            const block: HTMLElement = element.querySelector("#" + blocks[i].id) as HTMLElement;
            if (block) {
                block.style.display = blocks[i].visible ? "" : "none";
            }
        }

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
        CustomerInlineDialog._markBody(false);
        if (this._resolve) {
            this._resolve(result);
            this._resolve = null;
        }
        this.closeDialog();
    }

    private _closeClickHandler(): boolean {
        (window as any)[GUARD_KEY] = false;
        CustomerInlineDialog._markBody(false);
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
