/**
 * BOTONES DE PAGO — un Enter no abre el cobro
 * ===========================================
 *
 * POR QUE EXISTE
 * En caja, pasando productos rapido, el POS saltaba solo a la pantalla de pago y las lecturas
 * siguientes caian en el importe (7,750,371,671,936.000). Se reprodujo en el POS web: con foco en
 * Efectivo y el numpad vacio, un Enter genera un clic de teclado (x=0, y=0) y el pago abre en
 * 17 ms. Con digitos en el numpad no pasa, porque ese Enter lo atiende el POS y agrega el producto.
 * Lo que deja esas dos condiciones en una caja real sigue sin verse: en el POS web, 37 lecturas
 * rapidas no las produjeron. Por eso esto bloquea el mecanismo y ademas deja constancia.
 *
 * QUE HACE
 *  1. Escucha click en CAPTURA sobre window y descarta solo el clic de teclado que cae en un
 *     boton de pago. Un toque o un clic de mouse traen posicion y pasan intactos.
 *  2. No cancela ninguna tecla: el Enter del lector sigue llegando al POS como siempre.
 *  3. Anota el tipo de las ultimas teclas, nunca su valor: el log de caja no es sitio para los
 *     codigos de tarjetas de cliente. Ver _alTeclear().
 *  4. PagoSinToqueTrigger avisa cuando arranca un pago que no salio de un toque. Si el salto
 *     vuelve por otro camino, esa linea dice por cual.
 *
 * COMO LEERLO EN CAJA
 * Cada aviso va al log del POS y a la consola con el prefijo SCT_PAGO. Los ultimos quedan en
 * localStorage, asi sobreviven a cerrar la app: localStorage.getItem("__SCT_PAGO_AVISOS").
 *
 * EL ESTADO VIVE EN window (gotcha 8): si el bundle se carga dos veces, los listeners no se duplican.
 */

interface ITeclaAnotada {
    nombre: string;
    cuenta: number;
    hueco: number;
}

interface IEstadoPago {
    instalado: boolean;
    contexto: any;
    teclas: ITeclaAnotada[];
    ultimaTecla: number;
    ultimoToque: number;
    toqueEn: string;
    toquePago: number;
    ignorados: number;
    sinToque: number;
}

export default class BotonesDePago {

    private static readonly CLAVE: string = "__SCT_PAGO";

    private static readonly CLAVE_AVISOS: string = "__SCT_PAGO_AVISOS";

    /**
     * Operaciones que abren un cobro (RetailOperation). Se reconocen por operacion y no por grilla
     * porque cada layout de caja acomoda los botones distinto. VoidPayment (211) no cobra.
     */
    private static readonly OPERACIONES_DE_PAGO: number[] = [
        200, 201, 202, 203, 204, 206, 207, 208, 213, 214, 216, 217, 218, 219, 220
    ];

    /** Grupos de teclas que acompanan a cada aviso: alcanza para ver las ultimas lecturas. */
    private static readonly MAX_TECLAS: number = 16;

    private static readonly MAX_AVISOS: number = 30;

    /**
     * Cuanto puede tardar un pago en arrancar tras tocar su boton. Si hay lecturas en cola, espera
     * a que terminen, y con el lector a toda velocidad esa cola llego a unos 23 s.
     */
    private static readonly MS_TOQUE_VIGENTE: number = 30000;

    // ------------------------------------------------------------------------------ publico

    /** Engancha los listeners. Idempotente: se puede llamar mas de una vez sin duplicar nada. */
    public static instalar(context: any): void {
        try {
            const estado: IEstadoPago = BotonesDePago._estado();
            if (context) {
                estado.contexto = context;
            }
            if (estado.instalado) {
                return;
            }
            estado.instalado = true;

            // Sobre window y no document: el POS corta el Enter de una lectura en la captura de
            // document, y este listener tiene que verlo aunque se instale despues que el suyo.
            window.addEventListener("keydown", BotonesDePago._alTeclear as EventListener, true);
            window.addEventListener("pointerdown", BotonesDePago._alTocar as EventListener, true);
            window.addEventListener("click", BotonesDePago._alClic as EventListener, true);

            BotonesDePago._decir("SCT_PAGO vigilando | un clic de teclado no abre un cobro");
        } catch (e) { }
    }

    /** Lo llama PagoSinToqueTrigger cada vez que arranca un pago. Solo anota: nunca cancela. */
    public static anotarPago(): void {
        try {
            const estado: IEstadoPago = BotonesDePago._estado();
            const tocado: boolean = estado.toquePago > 0
                && (BotonesDePago._reloj() - estado.toquePago) < BotonesDePago.MS_TOQUE_VIGENTE;
            estado.toquePago = 0;

            if (!tocado) {
                estado.sinToque++;
                BotonesDePago._avisar("pago sin toque en un boton de pago", null);
            }
        } catch (e) { }
    }

    // ------------------------------------------------------------------------------ eventos

    private static _alClic(evento: MouseEvent): void {
        try {
            const boton: Element | null = BotonesDePago._botonDePago(evento.target);
            if (!boton) {
                return;
            }

            const estado: IEstadoPago = BotonesDePago._estado();
            if (!BotonesDePago._esClicDeTeclado(evento)) {
                estado.toquePago = BotonesDePago._reloj();
                return;
            }

            evento.preventDefault();
            evento.stopImmediatePropagation();
            estado.ignorados++;
            BotonesDePago._avisar("Enter ignorado", boton);
        } catch (e) { }
    }

    /**
     * El navegador marca asi el clic que genera el teclado: detail 0 y sin posicion. Un toque
     * cuenta 1 y trae coordenadas; el .click() de un script no es de confianza y sigue su camino.
     */
    private static _esClicDeTeclado(evento: MouseEvent): boolean {
        return evento.isTrusted && evento.detail === 0 && evento.clientX === 0 && evento.clientY === 0;
    }

    private static _alTocar(evento: Event): void {
        try {
            const estado: IEstadoPago = BotonesDePago._estado();
            estado.ultimoToque = BotonesDePago._reloj();
            estado.toqueEn = BotonesDePago._nombre(evento.target as Element);
        } catch (e) { }
    }

    /**
     * Agrupa las teclas de caracter en "#13" y deja las demas por nombre, con el hueco desde la
     * anterior: "#13 Enter(+12) Enter(+3)" delata un lector que manda dos Enter.
     */
    private static _alTeclear(evento: KeyboardEvent): void {
        try {
            const estado: IEstadoPago = BotonesDePago._estado();
            const reloj: number = BotonesDePago._reloj();
            const hueco: number = estado.ultimaTecla > 0 ? Math.round(reloj - estado.ultimaTecla) : 0;
            const tecla: string = evento.key || "";
            const nombre: string = tecla.length === 1 ? "#" : tecla;
            const ultima: ITeclaAnotada | undefined = estado.teclas[estado.teclas.length - 1];

            estado.ultimaTecla = reloj;

            if (nombre === "#" && ultima && ultima.nombre === "#") {
                ultima.cuenta++;
                return;
            }

            estado.teclas.push({ nombre: nombre, cuenta: 1, hueco: hueco });
            if (estado.teclas.length > BotonesDePago.MAX_TECLAS) {
                estado.teclas.shift();
            }
        } catch (e) { }
    }

    // ------------------------------------------------------------------------------ utiles

    private static _botonDePago(destino: EventTarget | null): Element | null {
        const elemento: Element | null = destino as Element;
        if (!elemento || !elemento.closest) {
            return null;
        }

        const boton: Element | null = elemento.closest("button[data-action]");
        if (!boton) {
            return null;
        }

        const operacion: number = parseInt(boton.getAttribute("data-action") || "", 10);
        return BotonesDePago.OPERACIONES_DE_PAGO.indexOf(operacion) >= 0 ? boton : null;
    }

    private static _avisar(motivo: string, boton: Element | null): void {
        const estado: IEstadoPago = BotonesDePago._estado();
        const toque: string = estado.ultimoToque > 0
            ? Math.round(BotonesDePago._reloj() - estado.ultimoToque) + " ms en " + estado.toqueEn
            : "ninguno";

        const texto: string = "SCT_PAGO " + motivo
            + (boton
                ? " en " + BotonesDePago._nombre(boton) + " (op " + boton.getAttribute("data-action") + ")"
                : "")
            + " | foco " + BotonesDePago._nombre(document.activeElement)
            + " | ultimo toque " + toque
            + " | teclas " + BotonesDePago._resumirTeclas(estado.teclas)
            + " | ignorados " + estado.ignorados + ", sin toque " + estado.sinToque;

        BotonesDePago._decir(texto);
        BotonesDePago._guardar(texto);
    }

    private static _resumirTeclas(teclas: ITeclaAnotada[]): string {
        return teclas.map((tecla: ITeclaAnotada): string => {
            return tecla.nombre === "#" ? "#" + tecla.cuenta : tecla.nombre + "(+" + tecla.hueco + ")";
        }).join(" ");
    }

    private static _guardar(texto: string): void {
        try {
            const previos: string | null = window.localStorage.getItem(BotonesDePago.CLAVE_AVISOS);
            const avisos: string[] = previos ? JSON.parse(previos) : [];
            avisos.push(new Date().toISOString() + " " + texto);
            window.localStorage.setItem(BotonesDePago.CLAVE_AVISOS,
                JSON.stringify(avisos.slice(-BotonesDePago.MAX_AVISOS)));
        } catch (e) { }
    }

    private static _estado(): IEstadoPago {
        const w: any = window as any;
        if (!w[BotonesDePago.CLAVE]) {
            const nuevo: IEstadoPago = {
                instalado: false, contexto: null,
                teclas: [], ultimaTecla: 0,
                ultimoToque: 0, toqueEn: "", toquePago: 0,
                ignorados: 0, sinToque: 0
            };
            w[BotonesDePago.CLAVE] = nuevo;
        }
        return w[BotonesDePago.CLAVE];
    }

    private static _reloj(): number {
        return new Date().getTime();
    }

    /** Como lo llamaria un cajero: los botones de la grilla no tienen texto, solo aria-label. */
    private static _nombre(elemento: Element | null): string {
        if (!elemento || !elemento.tagName) {
            return "(nada)";
        }

        const rotulo: string | null = elemento.getAttribute("aria-label");
        const texto: string = rotulo || ((elemento as HTMLElement).innerText || "").trim();
        return elemento.tagName.toLowerCase() + (texto ? " [" + texto.substring(0, 30) + "]" : "");
    }

    private static _decir(texto: string): void {
        try {
            const estado: IEstadoPago = BotonesDePago._estado();
            if (estado.contexto && estado.contexto.logger && estado.contexto.logger.logInformational) {
                estado.contexto.logger.logInformational(texto);
            }
        } catch (e) { }
        try {
            if (typeof console !== "undefined" && console.log) {
                console.log(texto);
            }
        } catch (e) { }
    }
}
