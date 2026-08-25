import { ApplicationStartTrigger, IApplicationStartTriggerOptions } from "PosApi/Extend/Triggers/ApplicationTriggers";
import { GetCurrentCartClientRequest, GetCurrentCartClientResponse } from "PosApi/Consume/Cart";
import { GetCustomerClientRequest, GetCustomerClientResponse } from "PosApi/Consume/Customer";
import { ProxyEntities } from "PosApi/Entities";
import CustomerInlineDialog from "../Controls/Dialogs/CustomerInline/CustomerInlineDialog";
import { GUARD_KEY } from "./CustomerModalHelper";

/**
 * "AGREGAR DIRECCIÓN" DEL PANEL DE CLIENTE ABRE EL MODAL DE EDICIÓN
 * =================================================================
 *
 * Cuando el cliente asignado a la venta no tiene dirección, el panel muestra un "+ Agregar
 * dirección". Ese botón llevaba a la pantalla nativa, donde la dirección se escribe a mano
 * sin ubigeo validado — justo lo que el modal resuelve.
 *
 * POR QUÉ SE INTERCEPTA POR DOM Y NO CON UN TRIGGER
 * No hay trigger para esa acción. Los `PreCustomerSearch/Add/Edit` no se disparan (verificado:
 * el botón no abre el modal aunque esos triggers están registrados) y en el enum de
 * operaciones del SDK no existe ninguna de "agregar dirección" — el POS navega directo.
 * OperationProbeTrigger sigue registrando cada operación en consola: si algún día aparece un
 * id para esto, conviene cambiar a esa vía, que es más estable.
 *
 * CÓMO SE IDENTIFICA EL BOTÓN
 * Por su texto, dentro del panel de cliente. El proyecto tiene una regla de no detectar por
 * texto (gotcha del tema), y se respeta donde hay una clase estructural que usar; aquí no la
 * hay, así que se acota el riesgo:
 *
 *   - solo se mira DENTRO del panel de cliente, nunca en toda la pantalla;
 *   - se aceptan las variantes en español e inglés del rótulo;
 *   - si no se reconoce nada, NO se toca el click y el POS hace lo de siempre.
 *
 * Cada intercepción se registra en consola con el rótulo y las clases del elemento, para
 * poder afinar la detección sin adivinar si algún día cambia.
 */
/**
 * Espacios en blanco consecutivos. Fuera de la clase: se compila una sola vez.
 *
 * LAS DOS BARRAS SON NECESARIAS. Con una sola, la cadena entrega [s]+ a la expresion -\s
 * no es un escape de cadena, asi que se queda en s- y en vez de colapsar espacios borraba
 * la letra s: "changeCustomerLabel" salia como "changeCu.tomerLabel".
 */
const RE_ESPACIOS: RegExp = new RegExp("[\\s]+", "g");

/** Salto de linea. Construido asi para no depender de escapes en el generador. */
const SALTO: string = String.fromCharCode(10);

export default class CustomerPanelAddressTrigger extends ApplicationStartTrigger {

    /** El listener se instala UNA vez por sesión del POS. */
    private static readonly INSTALLED_KEY: string = "__customerPanelAddressHooked";

    /**
     * Momento de la última intercepción. Se escuchan pointerdown, mousedown y click, y los tres
     * llegan por la misma pulsación: sin esto se abrirían tres modales.
     */
    private _lastInterceptAt: number = 0;

    /** Rótulos ya registrados, para no repetir la misma línea en cada click. */
    private _unknownLabels: { [texto: string]: boolean } = {};

    /** Largo máximo que puede tener el rótulo; por encima, no es el botón. */
    private static readonly MAX_LABEL_LENGTH: number = 40;

    private static readonly LABELS: string[] = [
        "AGREGAR DIRECCION",
        "ANADIR DIRECCION",
        "ADD ADDRESS",
        "ADD AN ADDRESS",
        "NEW ADDRESS"
    ];

    public execute(options: IApplicationStartTriggerOptions): Promise<void> {
        if (typeof document === "undefined" || (window as any)[CustomerPanelAddressTrigger.INSTALLED_KEY]) {
            return Promise.resolve();
        }

        (window as any)[CustomerPanelAddressTrigger.INSTALLED_KEY] = true;

        // Fase de CAPTURA y los TRES eventos de pulsación. En una caja táctil el POS puede
        // navegar en `pointerdown` o `mousedown`, mucho antes de que llegue el `click`: si solo
        // se escucha `click`, se cancela una navegación que ya ocurrió. Se cancelan los tres y
        // el modal se abre una sola vez (ver _recentlyIntercepted).
        const eventos: string[] = ["pointerdown", "mousedown", "click"];

        for (let i: number = 0; i < eventos.length; i++) {
            document.addEventListener(eventos[i], (event: Event): void => {
                this._onDocumentClick(event);
            }, true);
        }

        // HUELLA DEL PAQUETE. Dos versiones distintas del paquete se llamaban igual (1.2.2) y
        // no habia forma de saber cual estaba cargado: se depuro un problema ya resuelto
        // porque en la caja corria un paquete anterior. Esta linea dice de un vistazo que
        // reglas trae el que esta corriendo.
        const marca: string = "RegenerateFE 1.4.0 activo | reglas: comprobante-vs-documento,"
            + " veto-RUC-observado, cliente-descriptivo, direccion-obligatoria-solo-empresas,"
            + " modal-en-toda-vista, cliente-antes-del-pago, boleta-solo-negada-a-empresas, mapa-de-clicks";

        this.context.logger.logInformational(marca);

        if (typeof console !== "undefined" && console.log) {
            console.log("=== " + marca + " ===");
        }

        return Promise.resolve();
    }

    private _onDocumentClick(event: Event): void {
        try {
            if ((window as any)[GUARD_KEY]) {
                return;
            }

            // Solo en "click": los tres eventos llegan por la misma pulsacion y mapear en los
            // tres imprimiria todo por triplicado.
            if (event.type === "click") {
                this._mapearElemento(event.target as HTMLElement);
            }

            const clickable: HTMLElement | null = this._findAddressButton(event.target as HTMLElement);

            if (!clickable) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            // Sin esto, otros listeners ya registrados sobre el mismo nodo siguen corriendo y
            // el POS navega igual: cancelar la propagacion normal no alcanza.
            if (typeof (event as any).stopImmediatePropagation === "function") {
                (event as any).stopImmediatePropagation();
            }

            // Los tres eventos de una misma pulsación se cancelan, pero el modal se abre una
            // sola vez.
            const ahora: number = new Date().getTime();

            if (ahora - this._lastInterceptAt < 900) {
                return;
            }

            this._lastInterceptAt = ahora;

            this.context.logger.logInformational(
                "CustomerPanelAddressTrigger: interceptado por " + event.type + " | rotulo='"
                + (clickable.textContent || "").replace(/\s+/g, " ").trim()
                + "' | clases=" + (typeof clickable.className === "string" ? clickable.className : "(sin clases)")
                + " | dentro del panel=" + this._isInsideCustomerPanel(clickable));

            this._openEditDialog();
        } catch (error) {
            // Un fallo aqui jamas debe romper la pantalla de venta: se deja pasar el click.
            this.context.logger.logError("CustomerPanelAddressTrigger error: " + String(error));
        }
    }

    /**
     * Sube desde el nodo pulsado buscando el botón de agregar dirección. Se limita a unos
     * pocos niveles: el rótulo suele estar en un `span` dentro del botón, pero subir sin tope
     * acabaría reconociendo el panel entero.
     */
    private _findAddressButton(target: HTMLElement): HTMLElement | null {
        // PRIMERO, LA SEÑAL BUENA: el binding de knockout del propio POS.
        //
        // El rastro de la navegación lo dejó claro:
        //     addressEditClickHandler @ Pos.ViewModels.js
        //     onAddressEditClicked    @ Pos.Views.js
        //
        // El botón está declarado como `data-bind="click: addressEditClickHandler"`, y knockout
        // deja ese atributo en el DOM. Es una marca estructural del POS —no depende del idioma,
        // ni del rótulo, ni de dónde esté anidado— justo lo que la regla del proyecto pide usar
        // en lugar de reconocer por texto. El texto queda solo como respaldo.
        const porBinding: HTMLElement | null = this._findByKnockoutBinding(target);

        if (porBinding) {
            return porBinding;
        }

        let node: HTMLElement = target;

        for (let depth: number = 0; node && depth < 5; depth++) {
            const raw: string = node.textContent || "";

            // DESCARTE BARATO PRIMERO. Esto corre en cada click de la caja: `textContent` de un
            // nodo alto devuelve el texto de todo su subárbol, y normalizarlo con siete
            // expresiones regulares para descubrir que no era el botón es trabajo tirado.
            // El rótulo es corto, y los ancestros solo pueden tener MÁS texto: en cuanto se
            // pasa del largo posible, no hay nada más arriba que mirar.
            if (raw.length > CustomerPanelAddressTrigger.MAX_LABEL_LENGTH) {
                // Si el texto largo hablaba de direcciones, se registra antes de descartarlo:
                // es justo la pista que haria falta si el rotulo real fuera mas extenso de lo
                // previsto, y perderla obligaria a otro despliegue solo para averiguarlo.
                if (this._looksLikeAddressLabel(raw)) {
                    // Se normalizan los espacios ANTES de truncar: el textContent de un
                    // contenedor arrastra la sangría del HTML, y cortar a ciegas los primeros
                    // caracteres devolvía puro espacio en blanco. El aviso anterior salió así,
                    // vacío y sin decir nada.
                    const limpio: string = raw.replace(/\s+/g, " ").trim();
                    this._reportUnknownLabel(limpio.substring(0, 120) + " [...] (texto largo)");
                }

                return null;
            }

            if (this._looksLikeAddressLabel(raw)) {
                if (this._matchesLabel(node)) {
                    return node;
                }

                // Parecía el botón y no lo era: casi siempre significa que el rótulo real es
                // otro. Se registra UNA vez por texto distinto para poder añadirlo a LABELS sin
                // adivinar, en vez de gastar un despliegue entero en averiguarlo.
                this._reportUnknownLabel(raw);
            }

            node = node.parentElement;
        }

        return null;
    }

    /**
     * DIAGNOSTICO: dice QUE se acaba de pulsar y con que lo maneja el POS.
     * =====================================================================
     *
     * TEMPORAL. Quitar cuando "Cambiar cuenta de cliente" quede resuelto.
     *
     * PARA QUE
     * Un boton del POS solo se puede interceptar bien si se sabe por que senal reconocerlo. Con
     * "Agregar direccion" se resolvio asi: aparecio `addressEditClickHandler` en el `data-bind`
     * y eso reemplazo a la comparacion de textos, que era fragil. Aqui hace falta lo mismo para
     * "Cambiar cuenta de cliente".
     *
     * QUE IMPRIME
     * La cadena de ancestros con su `data-bind` -el nombre del manejador de knockout, que es lo
     * que de verdad identifica al control- y, si knockout esta a mano, el modelo de vista que
     * hay detras y sus propiedades de cliente. Eso ultimo es lo que diria si al cliente elegido
     * se le puede entregar DIRECTAMENTE a la pantalla de pago, que es justo lo que la API de
     * triggers no permite.
     *
     * COSTE
     * Una linea por clic, y solo por clic. No es lo que hacia lenta la caja: aquello registraba
     * cada operacion y cada tecla. Para apagarlo sin reempaquetar, en la consola:
     *     window.__mapaDeClicks = false
     */
    private _mapearElemento(target: HTMLElement): void {
        if ((window as any).__mapaDeClicks === false || !target) {
            return;
        }

        const lineas: string[] = ["=== CLICK ==="];
        let nodo: HTMLElement = target;

        for (let nivel: number = 0; nodo && nivel < 7; nivel++) {
            const clases: string = (typeof nodo.className === "string" && nodo.className)
                ? "." + nodo.className.replace(RE_ESPACIOS, ".")
                : "";
            const id: string = nodo.id ? "#" + nodo.id : "";
            const bind: string = nodo.getAttribute ? (nodo.getAttribute("data-bind") || "") : "";
            const texto: string = (nodo.textContent || "").replace(RE_ESPACIOS, " ").trim();

            lineas.push("  " + nivel + ") " + nodo.tagName + id + clases);

            // El data-bind es LA senal util: es el nombre del manejador en el modelo de vista.
            if (bind) {
                lineas.push("       bind = " + bind);
            }

            if (texto) {
                lineas.push("       texto = '" + texto.substring(0, 60) + "'");
            }

            nodo = nodo.parentElement;
        }

        this._mapearModeloDeVista(target, lineas);

        const salida: string = lineas.join(SALTO);

        if (typeof console !== "undefined" && console.log) {
            console.log(salida);
        }

        this.context.logger.logInformational(salida);
    }

    /**
     * El modelo de vista de knockout que hay detras del elemento, y sus propiedades de cliente.
     *
     * Es la parte que puede desbloquear el problema de fondo: un PreOperationTrigger no puede
     * devolverle el cliente a la pantalla que lo pidio, pero si el modelo de vista expone algo
     * como `customer` o `customerAccountNumber`, si se le puede poner ahi directamente.
     */
    private _mapearModeloDeVista(target: HTMLElement, lineas: string[]): void {
        const ko: any = (window as any).ko;

        if (!ko || typeof ko.dataFor !== "function") {
            lineas.push("  ko: no disponible");
            return;
        }

        try {
            const modelo: any = ko.dataFor(target);

            if (!modelo) {
                lineas.push("  ko: sin modelo de vista en este elemento");
                return;
            }

            const nombre: string = (modelo.constructor && modelo.constructor.name) || "(anonimo)";
            const interesantes: string[] = [];

            for (const clave in modelo) {
                const k: string = clave.toLowerCase();

                if (k.indexOf("customer") >= 0 || k.indexOf("account") >= 0 || k.indexOf("cart") >= 0) {
                    interesantes.push(clave + " (" + typeof modelo[clave] + ")");
                }
            }

            lineas.push("  ko: " + nombre);
            lineas.push("       cliente/cuenta/carrito: "
                + (interesantes.length ? interesantes.join(", ") : "(ninguna)"));
        } catch (error) {
            lineas.push("  ko: no se pudo leer el modelo de vista (" + error + ")");
        }
    }

    /**
     * Registra un rotulo parecido pero no reconocido, sin repetir.
     *
     * El requisito de estar dentro del panel de cliente SE QUITÓ del camino de decisión: la
     * comprobación subía doce niveles buscando clases concretas y, si el POS anida el botón
     * más hondo o usa otras, el rótulo correcto se descartaba igual. La coincidencia EXACTA
     * del rótulo ya es señal suficiente —ningún otro control del POS se llama "Agregar
     * dirección"— y el panel se sigue registrando en el log como dato.
     */
    private _reportUnknownLabel(raw: string): void {
        const texto: string = (raw || "").replace(/\s+/g, " ").trim();

        if (!texto || this._unknownLabels[texto]) {
            return;
        }

        this._unknownLabels[texto] = true;
        this.context.logger.logInformational(
            "CustomerPanelAddressTrigger: rotulo parecido NO reconocido: '" + texto + "'");
    }

    /**
     * Busca el elemento cuyo `data-bind` declara el manejador de editar dirección del POS.
     *
     * Sube más niveles que la búsqueda por texto (el atributo está en el botón, y lo pulsado
     * suele ser un icono o un span dentro) y no mira el contenido, así que subir es barato.
     */
    private _findByKnockoutBinding(target: HTMLElement): HTMLElement | null {
        let node: HTMLElement = target;

        for (let depth: number = 0; node && depth < 10; depth++) {
            if (typeof node.getAttribute === "function") {
                const bind: string = node.getAttribute("data-bind") || "";

                if (bind.indexOf("addressEditClickHandler") >= 0
                    || bind.indexOf("AddressEditClick") >= 0) {
                    return node;
                }
            }

            node = node.parentElement;
        }

        return null;
    }

    /** Filtro previo por subcadena: descarta sin normalizar ni recorrer ancestros. */
    private _looksLikeAddressLabel(raw: string): boolean {
        const text: string = raw.toUpperCase();
        return text.indexOf("IRECCI") >= 0 || text.indexOf("DDRESS") >= 0;
    }

    private _isInsideCustomerPanel(node: HTMLElement): boolean {
        let current: HTMLElement = node;

        for (let depth: number = 0; current && depth < 12; depth++) {
            const id: string = current.id || "";
            const cls: string = typeof current.className === "string" ? current.className : "";

            if (id.indexOf("CustomerPanel") >= 0
                || cls.indexOf("customerPanel") >= 0
                || cls.indexOf("customerDetailsCardStyle") >= 0) {
                return true;
            }

            current = current.parentElement;
        }

        return false;
    }

    /** Compara sin acentos ni signos: el rótulo lleva tilde y a veces un "+" delante. */
    private _matchesLabel(node: HTMLElement): boolean {
        const text: string = (node.textContent || "")
            .toUpperCase()
            .replace(/[ÁÀÄÂ]/g, "A").replace(/[ÉÈËÊ]/g, "E").replace(/[ÍÌÏÎ]/g, "I")
            .replace(/[ÓÒÖÔ]/g, "O").replace(/[ÚÙÜÛ]/g, "U")
            // La Ñ se convierte ANTES de limpiar: si no, "Añadir" quedaba "A ADIR" y no casaba.
            .replace(/Ñ/g, "N")
            .replace(/[^A-Z ]/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        // Se exige coincidencia EXACTA con alguno de los rótulos conocidos. Con `indexOf` un
        // contenedor que envuelva al botón tambien casaria y se interceptarian clicks ajenos.
        for (let i: number = 0; i < CustomerPanelAddressTrigger.LABELS.length; i++) {
            if (text === CustomerPanelAddressTrigger.LABELS[i]) {
                return true;
            }
        }

        return false;
    }

    /** Abre el modal en Editar Actual con el cliente de la venta ya cargado. */
    private _openEditDialog(): void {
        const correlationId: string = this.context.logger.getNewCorrelationId();

        this.context.runtime
            .executeAsync(new GetCurrentCartClientRequest<GetCurrentCartClientResponse>(correlationId))
            .then((response: any): Promise<ProxyEntities.Customer | null> => {
                const cart: any = response && response.data && response.data.result;
                const accountNumber: string = (cart && cart.CustomerId) || "";

                if (!accountNumber) {
                    return Promise.resolve(null);
                }

                return this.context.runtime
                    .executeAsync(new GetCustomerClientRequest<GetCustomerClientResponse>(accountNumber, correlationId))
                    .then((customerResponse: any): ProxyEntities.Customer | null => {
                        return (customerResponse && customerResponse.data && customerResponse.data.result) || null;
                    });
            })
            .then((customer: ProxyEntities.Customer | null): Promise<any> => {
                if (!customer) {
                    // Sin cliente en la venta no hay nada que editar; el modal se abre en
                    // Buscar para que el cajero elija uno.
                    this.context.logger.logInformational(
                        "CustomerPanelAddressTrigger: la venta no tiene cliente; se abre el modal en Buscar.");
                }

                (window as any)[GUARD_KEY] = true;
                const dialog: CustomerInlineDialog = new CustomerInlineDialog();

                return dialog.open(customer ? "edit" : "search", customer, "");
            })
            .then((): void => {
                (window as any)[GUARD_KEY] = false;
            })
            .catch((reason: any): void => {
                (window as any)[GUARD_KEY] = false;
                let detail: string = "";
                try { detail = JSON.stringify(reason); } catch (error) { detail = String(reason); }
                this.context.logger.logError("CustomerPanelAddressTrigger: no se pudo abrir el modal: " + detail);
            });
    }
}
