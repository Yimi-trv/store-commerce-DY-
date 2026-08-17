import { construirCss, TEMA_ACTIVO, CLASE_AMBITO, CLASE_AMPLIO, CLASE_COMPACTO } from "./ThemeAssets";

/**
 * SCT_ThemeEngine — aplica el tema "Trujillo Market" sobre el DOM del POS.
 *
 * Implementa un MutationObserver dual (DOM y Estilos) y soporta dinámicamente
 * layout amplio (1920) y layout compacto (1024) según el ancho de la ventana.
 */
export class ThemeEngine {

    private static readonly ID_ESTILO: string = "sct-theme";
    private static observadorDom: MutationObserver | null = null;
    private static observadorEstilos: MutationObserver | null = null;
    private static ocupado: boolean = false;
    private static temporizador: number = 0;
    private static temporizadorSalidaAmbito: number = 0;
    private static eventosRegistrados: boolean = false;
    private static sondaEstilos: HTMLElement | null = null;
    private static estilosNormalizados: { [clave: string]: string } = {};
    private static altoOriginalLineas: number | null = null;
    private static recalculoPestanasSolicitado: boolean = false;

    private static readonly SELECTORES_OBSERVADOS: string[] = [
        "#TransactionGrid", "#TotalsPanel", "#TotalsPanel .fields.row", "#TotalsPanel .panel-footer",
        ".sct-live-zona-cliente", ".sct-live-zona-montos", ".sct-live-direccion",
        "#TabControl", "#TabControl .commerceTabControl.righttabs", "#TabControl .tabContent",
        "#CustomControl1", "#ButtonGrid1Control", "#ButtonGrid1Control .buttonsContainer",
        "#ButtonGrid2Control", "#ButtonGrid2Control .buttonsContainer",
        "#ButtonGrid3Control", "#ButtonGrid3Control .buttonsContainer",
        "#ButtonGrid4", "#ButtonGrid4Control", "#ButtonGrid4Control .buttonsContainer"
    ];

    // ---------------------------------------------------------------- helpers

    private static q(selector: string): HTMLElement | null {
        return document.querySelector(selector) as HTMLElement | null;
    }

    private static todos(selector: string): HTMLElement[] {
        var lista: NodeListOf<Element> = document.querySelectorAll(selector);
        var salida: HTMLElement[] = [];
        for (var i: number = 0; i < lista.length; i++) {
            salida.push(lista[i] as HTMLElement);
        }
        return salida;
    }

    private static normalizarEstilo(propiedad: string, valor: string): string {
        var claveCache: string = propiedad + "\u0000" + valor;
        if (ThemeEngine.estilosNormalizados.hasOwnProperty(claveCache)) {
            return ThemeEngine.estilosNormalizados[claveCache];
        }
        if (!ThemeEngine.sondaEstilos) {
            ThemeEngine.sondaEstilos = document.createElement("div");
        }
        ThemeEngine.sondaEstilos.style.removeProperty(propiedad);
        ThemeEngine.sondaEstilos.style.setProperty(propiedad, valor);
        var normalizado: string = ThemeEngine.sondaEstilos.style.getPropertyValue(propiedad) || valor;
        ThemeEngine.estilosNormalizados[claveCache] = normalizado;
        return normalizado;
    }

    private static estilo(elemento: HTMLElement | null, propiedades: { [clave: string]: string }): void {
        if (!elemento) return;
        for (var clave in propiedades) {
            if (propiedades.hasOwnProperty(clave)) {
                var valorNormalizado: string = ThemeEngine.normalizarEstilo(clave, propiedades[clave]);
                if (elemento.style.getPropertyValue(clave) !== valorNormalizado || elemento.style.getPropertyPriority(clave) !== "important") {
                    elemento.style.setProperty(clave, propiedades[clave], "important");
                }
            }
        }
    }

    private static establecer(selector: string, propiedades: { [clave: string]: string }): void {
        var nodos: HTMLElement[] = ThemeEngine.todos(selector);
        for (var i: number = 0; i < nodos.length; i++) {
            ThemeEngine.estilo(nodos[i], propiedades);
        }
    }

    private static raiz(): HTMLElement | null {
        var grilla: HTMLElement | null = ThemeEngine.q("#ButtonGrid4Control");
        if (!grilla || !grilla.parentElement || !grilla.parentElement.parentElement) return null;
        return grilla.parentElement.parentElement;
    }

    private static zona(patron: RegExp): HTMLElement | null {
        var raiz: HTMLElement | null = ThemeEngine.raiz();
        if (!raiz) return null;
        for (var i: number = 0; i < raiz.children.length; i++) {
            var hijo: HTMLElement = raiz.children[i] as HTMLElement;
            if (patron.test(hijo.textContent || "")) return hijo;
        }
        return null;
    }

    // La tarjeta de Boleta es el control OptionDetails de DP.LocalizacionPeru, que el layout de HQ
    // monta como #CustomControl1. Se buscaba SOLO por el texto "Seleccionar una preferencia": si DP
    // cambia ese rotulo (ya renombraron el boton una vez), la tarjeta perdia el estilo en silencio.
    // Ahora: texto insensible a mayusculas y, si falla, la zona por id.
    private static zonaBoleta(): HTMLElement | null {
        var encontrada: HTMLElement | null = ThemeEngine.zona(/seleccionar una preferencia/i);
        if (encontrada) return encontrada;
        // Respaldo por id. Se SUBE hasta el hijo directo de raiz() para devolver exactamente el
        // mismo tipo de nodo que zona(): si #CustomControl1 no cuelga de raiz, no es la zona de
        // esta pantalla y no se toca (si no, .sct-boleta acabaria pegada a un control ajeno).
        var control: HTMLElement | null = ThemeEngine.q("#CustomControl1");
        var raiz: HTMLElement | null = ThemeEngine.raiz();
        if (!control || !raiz) return null;
        var actual: HTMLElement | null = control;
        while (actual && actual.parentElement !== raiz) actual = actual.parentElement;
        return actual;
    }

    // El rotulo de la tarjeta ("Boleta"/"Factura") se marca en LOS DOS layouts. Antes solo lo hacia
    // aplicarLayoutAmplio(), asi que en compacto el titulo se quedaba con el tamano nativo del POS
    // (h3) dentro de una tarjeta de 94px de alto.
    private static marcarTituloBoleta(zonaBoleta: HTMLElement | null): void {
        if (!zonaBoleta) return;
        var objetivo: HTMLElement | null = null;
        var posibles: NodeListOf<Element> = zonaBoleta.querySelectorAll("*");
        for (var i: number = 0; i < posibles.length; i++) {
            var elemento: HTMLElement = posibles[i] as HTMLElement;
            var texto: string = (elemento.textContent || "").trim();
            if (elemento.children.length === 0 && (texto === "Boleta" || texto === "Factura") && !elemento.closest("select")) {
                objetivo = elemento; break;
            }
        }
        // Al cambiar de Boleta a Factura el rotulo puede mudarse de nodo: hay que despegar la clase
        // del anterior o acaban DOS elementos con estilo de titulo.
        // OJO: solo se escribe cuando algo cambia de verdad. El vigilante observa el atributo
        // "class"; quitar y volver a poner la clase en cada pasada dispararia el bucle de
        // mutaciones (el parpadeo que ya costo arreglar una vez).
        var previos: NodeListOf<Element> = zonaBoleta.querySelectorAll(".sct-titulo");
        for (var p: number = 0; p < previos.length; p++) {
            var viejo: HTMLElement = previos[p] as HTMLElement;
            if (viejo !== objetivo) viejo.classList.remove("sct-titulo");
        }
        if (objetivo && !objetivo.classList.contains("sct-titulo")) objetivo.classList.add("sct-titulo");
    }

    // Botones del panel BOLETEO (#ButtonGrid3Control). Antes se asignaban por POSICION: el boton 0
    // recibia siempre el rotulo "A Cuenta / Empleado Planilla". Como el tema REESCRIBE el texto del
    // boton, un orden distinto en HQ pegaria el rotulo equivocado sobre la accion equivocada (y eso
    // en una caja que emite documentos tributarios no es cosmetico). Ahora se identifica por el
    // texto propio del boton y la posicion queda solo como respaldo.
    // Un boton inesperado (un tercero) se deja NATIVO a proposito: recibir un sct-b3 inexistente lo
    // dejaria en position:absolute sin top, superpuesto sobre los otros dos.
    private static decorarBoleto(botones: HTMLElement[]): void {
        var defs: any[] = [
            { n: 1, re: /empleado|planilla/i, titulo: "A Cuenta", sub: "Empleado Planilla" },
            { n: 2, re: /tercero|honorario/i, titulo: "A cuenta de terceros", sub: "RECIBO POR HONORARIOS" }
        ];
        var usados: any = {};
        var asignadas: any[] = [];
        var i: number = 0;
        var j: number = 0;
        // 1a vuelta: emparejar por el texto del PROPIO boton, mirando todos antes de repartir nada.
        for (i = 0; i < botones.length; i++) {
            asignadas[i] = null;
            var texto: string = botones[i].textContent || "";
            for (j = 0; j < defs.length; j++) {
                if (!usados[defs[j].n] && defs[j].re.test(texto)) {
                    asignadas[i] = defs[j];
                    usados[defs[j].n] = true;
                    break;
                }
            }
        }
        // 2a vuelta: al que no caso por texto se le da la PRIMERA def libre, NO la de su indice.
        // Con el respaldo por indice, si el boton 0 casaba con la def 2, el boton 1 se quedaba sin
        // nada (pedia la def 2, ya usada) aunque la def 1 estuviera libre.
        for (i = 0; i < botones.length; i++) {
            if (asignadas[i]) continue;
            for (j = 0; j < defs.length; j++) {
                if (!usados[defs[j].n]) { asignadas[i] = defs[j]; usados[defs[j].n] = true; break; }
            }
        }
        for (i = 0; i < botones.length; i++) {
            var def: any = asignadas[i];
            var clases: DOMTokenList = botones[i].classList;
            if (!def) {
                if (clases.contains("sct-bbtn")) clases.remove("sct-bbtn", "sct-b1", "sct-b2");
                continue;
            }
            // Se retira la marca anterior si cambio, para que no se acumulen dos posiciones.
            // Igual que arriba: solo se escribe cuando hay cambio real, por el vigilante.
            var clase: string = "sct-b" + def.n;
            if (!clases.contains(clase)) {
                if (clases.contains("sct-b1")) clases.remove("sct-b1");
                if (clases.contains("sct-b2")) clases.remove("sct-b2");
                clases.add(clase);
            }
            if (!clases.contains("sct-bbtn")) clases.add("sct-bbtn");
            ThemeEngine.estilo(botones[i], { "background-color": "#1B1A19", "color": "#FFFFFF", "background-image": "none" });
            ThemeEngine.icono(botones[i], "sct-ic-b" + def.n);
            var etiqueta: HTMLElement | null = botones[i].querySelector("div") as HTMLElement | null;
            if (etiqueta) {
                // La guarda mira la IDENTIDAD del rotulo, no su mera presencia: si un boton quedo
                // con el rotulo del otro, hay que corregirlo, no darlo por bueno.
                var marca: HTMLElement | null = etiqueta.querySelector(".sct-b-t") as HTMLElement | null;
                if (!marca || (marca.textContent || "") !== def.titulo) {
                    var destino: HTMLElement = (etiqueta.querySelector(".h4") as HTMLElement) || etiqueta;
                    destino.innerHTML = "<span class=\"sct-b-t\">" + def.titulo + "</span><span class=\"sct-b-s\">" + def.sub + "</span>";
                }
            }
        }
    }

    private static icono(boton: HTMLElement, clase: string): void {
        var actual: HTMLElement | null = null;
        for (var i: number = 0; i < boton.children.length; i++) {
            var hijo: HTMLElement = boton.children[i] as HTMLElement;
            if (hijo.tagName === "I" && hijo.className.indexOf("sct-ic") >= 0) {
                actual = hijo;
                break;
            }
        }
        if (!actual) {
            actual = document.createElement("i");
            boton.insertBefore(actual, boton.firstChild);
        }
        actual.className = "sct-ic " + clase;
    }

    private static ancestroTarjeta(desde: HTMLElement): HTMLElement | null {
        var actual: HTMLElement | null = desde;
        while (actual && !(actual.classList && actual.classList.contains("primaryPanelBackgroundColor"))) {
            actual = actual.parentElement;
        }
        return actual;
    }

    // ---------------------------------------------------------------- resolución

    // El umbral DEBE coincidir con el de las @media de ThemeAssets (max-width:1366 / min-width:1367).
    // Estaba en 1200 y entre 1201 y 1366px el tema quedaba en estado mixto: el CSS activo era el
    // COMPACTO mientras el JS ejecutaba aplicarLayoutAmplio() y marcaba el body como sct-amplio.
    // No es hipotetico: HQ sirve un layout size de 1366x768 (el que trae la pestana BOLETEO).
    private static esCompacto(): boolean {
        return window.innerWidth <= 1366;
    }

    // ---------------------------------------------------------------- secciones comunes

    private static marcarAmbito(): boolean {
        var enTransaccion: boolean = !!ThemeEngine.q("#ButtonGrid4Control") && !!ThemeEngine.q(".transactionLinesPane");
        if (enTransaccion) {
            if (ThemeEngine.temporizadorSalidaAmbito) {
                window.clearTimeout(ThemeEngine.temporizadorSalidaAmbito);
                ThemeEngine.temporizadorSalidaAmbito = 0;
            }
            if (!document.body.classList.contains(CLASE_AMBITO)) {
                document.body.classList.add(CLASE_AMBITO);
            }
            var zonaBoleta: HTMLElement | null = ThemeEngine.zonaBoleta();
            if (zonaBoleta) zonaBoleta.classList.add("sct-boleta");
        } else if (document.body.classList.contains(CLASE_AMBITO) && !ThemeEngine.temporizadorSalidaAmbito) {
            ThemeEngine.temporizadorSalidaAmbito = window.setTimeout((): void => {
                ThemeEngine.temporizadorSalidaAmbito = 0;
                var sigueEnTransaccion: boolean = !!ThemeEngine.q("#ButtonGrid4Control") && !!ThemeEngine.q(".transactionLinesPane");
                if (!sigueEnTransaccion) {
                    document.body.classList.remove(CLASE_AMBITO);
                }
            }, 160);
        }
        return enTransaccion;
    }

    private static aplicarZonas(): void {
        var grilla: HTMLElement | null = ThemeEngine.q("#ButtonGrid4Control");
        var raiz: HTMLElement | null = ThemeEngine.raiz();
        if (!grilla || !raiz) return;
        var montos: HTMLElement | null = ThemeEngine.q(".fields.row");
        var fantasma: HTMLElement | null = montos;
        while (fantasma) {
            fantasma = fantasma.parentElement;
            if (fantasma && fantasma.classList && fantasma.classList.contains("primaryPanelBackgroundColor")) {
                fantasma.classList.add("sct-ghost");
                break;
            }
        }
        var deposito: HTMLElement | null = ThemeEngine.zona(/DEPÓSITO/);
        if (deposito) deposito.classList.add("sct-ghost");
    }

    private static aplicarPestanas(): void {
        // El rotulo de la 4a pestana es BOLETEO (la cuadricula se llama "Boleteos" en HQ).
        // OJO: esta pestana solo existe cuando el layout activo asigna una cuadricula a la zona
        // TransactionScreen3. El layout de 1366x768 la trae; el de 1024x768 NO, y por eso ahi el
        // riel solo muestra tres pestanas. Eso se corrige en HQ, no aqui.
        var rotulos: string[] = ["NUMPAD", "CLIENTE", "TRANSAC.", "BOLETEO"];
        var pestanas: HTMLElement[] = ThemeEngine.todos(".commerceTabControl.righttabs .tabsContainer .tab");
        for (var i: number = 0; i < pestanas.length && i < rotulos.length; i++) {
            pestanas[i].classList.add("sct-tab" + i);
            var texto: HTMLElement | null = pestanas[i].querySelector(".text") as HTMLElement | null;
            if (texto && (texto.textContent || "").trim() !== rotulos[i]) texto.textContent = rotulos[i];
            var icono: HTMLElement | null = pestanas[i].querySelector(".icon") as HTMLElement | null;
            if (icono && icono.style.getPropertyValue("background-image")) icono.style.removeProperty("background-image");
        }
    }

    private static aplicarMontos(): void {
        var montos: HTMLElement | null = ThemeEngine.q(".fields.row");
        if (!montos) return;
        var derecha: HTMLElement | null = montos.querySelector(".right") as HTMLElement | null;
        if (!derecha) return;
        var etiqueta: HTMLElement | null = null;
        var nodos: NodeListOf<Element> = derecha.querySelectorAll("*");
        for (var i: number = 0; i < nodos.length; i++) {
            var nodo: HTMLElement = nodos[i] as HTMLElement;
            if (nodo.children.length === 0 && (nodo.textContent || "").trim() === "Monto total") {
                etiqueta = nodo; break;
            }
        }
        if (!etiqueta) return;
        var fila: HTMLElement | null = etiqueta;
        while (fila && fila.parentElement !== derecha) fila = fila.parentElement;
        if (!fila) return;
        fila.classList.add("sct-mt");
        var valores: NodeListOf<Element> = fila.querySelectorAll("*");
        for (var j: number = 0; j < valores.length; j++) {
            var valor: HTMLElement = valores[j] as HTMLElement;
            if (valor.children.length === 0 && (valor.textContent || "").indexOf("/") >= 0) {
                valor.classList.add("sct-mt-v"); break;
            }
        }
    }

    private static aplicarCliente(): void {
        var zonaCliente: HTMLElement | null = ThemeEngine.zona(/Agregue un cliente|CLIENTE DESCRIPTIVO/i);
        if (!zonaCliente) return;
        var listaCandidatos: NodeListOf<Element> = zonaCliente.querySelectorAll("div,span,label,h1,h2,h3,h4");
        var conCodigo: HTMLElement | null = null;
        for (var i: number = 0; i < listaCandidatos.length; i++) {
            var candidato: HTMLElement = listaCandidatos[i] as HTMLElement;
            if (candidato.children.length === 0 && /[A-Z]{2,4}-\d{4,}/.test((candidato.textContent || "").trim()) && candidato.getBoundingClientRect().width > 0) {
                conCodigo = candidato;
            }
        }
        if (conCodigo) {
            var tarjeta: HTMLElement | null = ThemeEngine.ancestroTarjeta(conCodigo);
            if (tarjeta && tarjeta.parentElement && tarjeta.parentElement.parentElement) {
                tarjeta.classList.add("sct-cli-card");
                var nombre: HTMLElement | null = null;
                var hijos: NodeListOf<Element> = tarjeta.querySelectorAll("*");
                for (var j: number = 0; j < hijos.length; j++) {
                    var hijo: HTMLElement = hijos[j] as HTMLElement;
                    var textoHijo: string = (hijo.textContent || "").trim();
                    if (hijo.children.length === 0 && textoHijo.length > 14 && !/\d{4,}/.test(textoHijo)) {
                        nombre = hijo; break;
                    }
                }
                ThemeEngine.estilo(nombre, { "white-space": "normal", "font-size": "13px", "line-height": "1.25" });
                var pila: HTMLElement = tarjeta.parentElement.parentElement;
                for (var k: number = 0; k < pila.children.length; k++) {
                    var seccion: HTMLElement = pila.children[k] as HTMLElement;
                    if (/^DOMICILIO/.test((seccion.textContent || "").trim())) {
                        seccion.classList.add("sct-dom-card");
                        var internos: NodeListOf<Element> = seccion.querySelectorAll("*");
                        for (var m: number = 0; m < internos.length; m++) {
                            var interno: HTMLElement = internos[m] as HTMLElement;
                            ThemeEngine.estilo(interno, { "background": "transparent", "border": "none", "white-space": "normal" });
                            if (interno.children.length === 0 && (interno.textContent || "").trim() === "DOMICILIO") interno.classList.add("sct-dom-h");
                        }
                        break;
                    }
                }
            }
            return;
        }
        var vacio: HTMLElement | null = null;
        for (var v: number = 0; v < listaCandidatos.length; v++) {
            var candidatoVacio: HTMLElement = listaCandidatos[v] as HTMLElement;
            if (candidatoVacio.children.length === 0 && (candidatoVacio.textContent || "").trim() === "Agregue un cliente a esta transacción" && candidatoVacio.getBoundingClientRect().width > 0) {
                vacio = candidatoVacio; break;
            }
        }
        if (!vacio) return;
        var tarjetaVacia: HTMLElement | null = ThemeEngine.ancestroTarjeta(vacio);
        if (!tarjetaVacia) return;
        tarjetaVacia.classList.add("sct-cli-empty");
        var raiz: HTMLElement | null = ThemeEngine.raiz();
        var subir: HTMLElement | null = tarjetaVacia;
        while (subir && subir.parentElement && subir.parentElement !== raiz) {
            ThemeEngine.estilo(subir, { "height": "100%" });
            subir = subir.parentElement;
        }
        ThemeEngine.estilo(tarjetaVacia, { "height": "100%" });
    }

    private static limpiarTooltips(): void {
        var tooltips: HTMLElement[] = ThemeEngine.todos(".ui-tooltip");
        for (var i: number = 0; i < tooltips.length; i++) {
            if (tooltips[i].parentElement) tooltips[i].parentElement.removeChild(tooltips[i]);
        }
    }

    private static solicitarRecalculoPestanas(): void {
        var cantidad: number = document.querySelectorAll("#TabControl .tabsContainer .tab").length;
        if (cantidad >= 4 || ThemeEngine.recalculoPestanasSolicitado) return;
        ThemeEngine.recalculoPestanasSolicitado = true;
        window.requestAnimationFrame((): void => {
            var tabControl: any = ThemeEngine.q("#TabControl");
            var rightTabs: any = ThemeEngine.q("#TabControl .commerceTabControl.righttabs");
            var elementos: any[] = [tabControl, rightTabs];
            for (var i: number = 0; i < elementos.length; i++) {
                var control = elementos[i] && elementos[i].winControl;
                try {
                    if (control && typeof control.forceLayout === "function") control.forceLayout();
                    if (control && typeof control.updateLayout === "function") control.updateLayout();
                } catch (error) { }
            }
            window.dispatchEvent(new Event("resize"));
        });
    }

    // ---------------------------------------------------------------- layouts 1024 / 1920

    private static prepararBotones(): void {
        var nombresClaves = ["button0", "button1", "button3", "button4", "button2"];
        var keysIds = ["p0", "p1", "p3", "p4", "p2"];
        for (var i = 0; i < nombresClaves.length; i++) {
            var pb = ThemeEngine.q("#ButtonGrid4Control .buttonGridButton." + nombresClaves[i]);
            if (pb) {
                if (!pb.classList.contains("sct-" + keysIds[i])) {
                    pb.classList.add("sct-pbtn", "sct-" + keysIds[i]);
                    ThemeEngine.icono(pb, "sct-ic-" + keysIds[i]);
                }
                ThemeEngine.estilo(pb, { "background-image": "none", "background-color": "rgba(22,21,20,0.6)", "border": "1px solid rgba(255,255,255,0.16)", "border-radius": "12px", "color": "#FFFFFF", "transform": "none" });
                for (var j = 0; j < pb.children.length; j++) {
                    var ch = pb.children[j] as HTMLElement;
                    if (ch.tagName === "DIV") ch.style.setProperty("display", "none", "important");
                }
            }
        }
    }

    private static aplicarLayoutCompacto(): void {
        var panelLineas = ThemeEngine.q("#TransactionGrid");
        if (panelLineas && ThemeEngine.altoOriginalLineas === null) {
            ThemeEngine.altoOriginalLineas = Math.round(panelLineas.getBoundingClientRect().height);
        }
        var propLineas: any = { "left": "0px", "right": "auto", "width": "600px", "box-sizing": "border-box" };
        if (ThemeEngine.altoOriginalLineas && ThemeEngine.altoOriginalLineas > 120) propLineas["height"] = (ThemeEngine.altoOriginalLineas - 8) + "px";
        ThemeEngine.establecer("#TransactionGrid", propLineas);
        
        // Paneles ahora manejados por CSS Media Queries

        // Cliente
        var botonesC: HTMLElement[] = ThemeEngine.todos("#ButtonGrid1Control .buttonGridButton");
        for (var i: number = 0; i < botonesC.length; i++) {
            botonesC[i].classList.add("sct-cbtn");
            botonesC[i].classList.add(i === 0 ? "sct-cbtn-primary" : "sct-cbtn-dark");
            ThemeEngine.estilo(botonesC[i], { "color": "#FFFFFF", "background-image": "none", "background-color": i === 0 ? "#C8102E" : "#1B1A19" });
            ThemeEngine.icono(botonesC[i], "sct-ic-c" + (i + 1));
        }

        // Transacciones
        var botonesT: HTMLElement[] = ThemeEngine.todos("#ButtonGrid2Control .buttonGridButton");
        for (var j: number = 0; j < botonesT.length; j++) {
            botonesT[j].classList.add("sct-tbtn", "sct-t" + (j + 1));
            ThemeEngine.estilo(botonesT[j], { "color": "#FFFFFF", "background-image": "none", "background-color": j === 4 ? "#C8102E" : "#1B1A19" });
            ThemeEngine.icono(botonesT[j], "sct-ic-t" + (j + 1));
        }

        // Boleto. OJO: en el layout de 1024x768 esta cuadricula NO existe (HQ no la asigna a la
        // zona TransactionScreen3), asi que la lista viene vacia y esto no hace nada. Se deja
        // preparado para cuando se asigne en HQ: el CSS compacto ya tiene sus reglas.
        ThemeEngine.decorarBoleto(ThemeEngine.todos("#ButtonGrid3Control .buttonGridButton"));
        ThemeEngine.marcarTituloBoleta(ThemeEngine.zonaBoleta());

        // Pagos (Posiciones manejadas por CSS)


        // Zonas de clientes y montos inferiores
        var raiz = ThemeEngine.raiz();
        if (raiz) {
            var zCliente = null, zMontos = null;
            var montosF = ThemeEngine.q("#TotalsPanel .fields.row");
            for (var c: number = 0; c < raiz.children.length; c++) {
                var hijo = raiz.children[c] as HTMLElement;
                if (montosF && hijo.contains(montosF)) zMontos = hijo;
                if (hijo.querySelector(".sct-cli-card, .sct-dom-card") || /Agregue un cliente|CLIENTE DESCRIPTIVO/i.test(hijo.textContent || "")) zCliente = hijo;
            }
            if (zCliente) zCliente.classList.add("sct-live-zona-cliente");
            if (zMontos) zMontos.classList.add("sct-live-zona-montos");

            var dom = ThemeEngine.q(".sct-dom-card");
            if (dom) {
                var hojas = [];
                var n = dom.querySelectorAll("*");
                for (var v = 0; v < n.length; v++) {
                    var el = n[v] as HTMLElement;
                    var t = (el.textContent || "").trim();
                    if (el.children.length === 0 && t.length > 0 && t !== "DOMICILIO") hojas.push(el);
                }
                hojas.sort(function(a, b) { return (b.textContent || "").trim().length - (a.textContent || "").trim().length; });
                if (hojas[0]) hojas[0].classList.add("sct-live-direccion");
            }
        }
        
        ThemeEngine.solicitarRecalculoPestanas();
    }

    private static aplicarLayoutAmplio(): void {
        ThemeEngine.estilo(ThemeEngine.zona(/Escribir/), { "height": "490px" });
        var grilla: HTMLElement | null = ThemeEngine.q("#ButtonGrid4Control");
        var raiz: HTMLElement | null = ThemeEngine.raiz();
        if (!grilla || !raiz) return;

        var zonaPagos: HTMLElement | null = null;
        var zonaCliente: HTMLElement | null = null;
        var zonaMontos: HTMLElement | null = null;
        var montos: HTMLElement | null = ThemeEngine.q(".fields.row");
        for (var i: number = 0; i < raiz.children.length; i++) {
            var hijo: HTMLElement = raiz.children[i] as HTMLElement;
            if (hijo.contains(grilla)) zonaPagos = hijo;
            if (montos && hijo.contains(montos)) zonaMontos = hijo;
            if (/Agregue un cliente|CLIENTE DESCRIPTIVO/i.test(hijo.textContent || "")) zonaCliente = hijo;
        }

        if (zonaPagos) zonaPagos.classList.add("sct-live-zona-pagos");
        if (zonaMontos) zonaMontos.classList.add("sct-live-zona-montos");
        if (zonaCliente) zonaCliente.classList.add("sct-cliente", "sct-live-zona-cliente");


        var zonaBoleta: HTMLElement | null = ThemeEngine.zonaBoleta();
        if (zonaBoleta) zonaBoleta.classList.add("sct-live-zona-boleta");
        ThemeEngine.marcarTituloBoleta(zonaBoleta);



        // Paneles anchos 1920
        var b1 = ThemeEngine.q("#ButtonGrid1Control");
        if (b1) {
            var btn1 = ThemeEngine.todos("#ButtonGrid1Control .buttonGridButton");
            for (var i = 0; i < btn1.length; i++) {
                btn1[i].classList.add("sct-cbtn", i === 0 ? "sct-cbtn-primary" : "sct-cbtn-dark");
                ThemeEngine.estilo(btn1[i], { "color": "#FFFFFF", "background-image": "none", "background-color": i === 0 ? "#C8102E" : "#1B1A19" });
                ThemeEngine.icono(btn1[i], "sct-ic-c" + (i + 1));
            }
        }
        var b2 = ThemeEngine.q("#ButtonGrid2Control");
        if (b2) {
            var btn2 = ThemeEngine.todos("#ButtonGrid2Control .buttonGridButton");
            for (var i = 0; i < btn2.length; i++) {
                btn2[i].classList.add("sct-tbtn", "sct-t" + (i + 1));
                btn2[i].classList.remove("sct-tbtn-dark", "sct-tbtn-outline", "sct-tbtn-fill");
                btn2[i].classList.add(i === 4 ? "sct-tbtn-fill" : (i === 3 ? "sct-tbtn-outline" : "sct-tbtn-dark"));
                ThemeEngine.estilo(btn2[i], { "color": "#FFFFFF", "background-image": "none", "background-color": i === 4 ? "#C8102E" : "#1B1A19" });
                ThemeEngine.icono(btn2[i], "sct-ic-t" + (i + 1));
            }
        }
        var b3 = ThemeEngine.q("#ButtonGrid3Control");
        if (b3) {
            ThemeEngine.estilo(b3, { "width": "428px", "height": "316px" });
            ThemeEngine.decorarBoleto(ThemeEngine.todos("#ButtonGrid3Control .buttonGridButton"));
        }

        
        // Estilos para los botones de pago (las clases sct-p0..sct-p4 ya fueron asignadas en prepararBotones, posiciones manejadas por CSS)
    }

    // ---------------------------------------------------------------- ciclo

    public static aplicarTodo(): void {
        if (!TEMA_ACTIVO) return;
        if (!ThemeEngine.marcarAmbito()) return;

        var esCompacto: boolean = ThemeEngine.esCompacto();
        if (esCompacto) {
            document.body.classList.add(CLASE_COMPACTO);
            document.body.classList.remove(CLASE_AMPLIO);
        } else {
            document.body.classList.add(CLASE_AMPLIO);
            document.body.classList.remove(CLASE_COMPACTO);
        }

        ThemeEngine.prepararBotones();

        var pasosComunes: Array<() => void> = [
            ThemeEngine.aplicarZonas, ThemeEngine.aplicarPestanas, ThemeEngine.aplicarMontos,
            ThemeEngine.aplicarCliente, ThemeEngine.limpiarTooltips
        ];
        
        for (var i: number = 0; i < pasosComunes.length; i++) {
            try { pasosComunes[i](); } catch (e) { }
        }

        try {
            if (esCompacto) {
                ThemeEngine.aplicarLayoutCompacto();
            } else {
                ThemeEngine.aplicarLayoutAmplio();
                var dom = ThemeEngine.q(".sct-dom-card");
                var pie = ThemeEngine.q(".panel-footer");
                if (dom && pie) {
                    var a = Math.round(pie.getBoundingClientRect().bottom - dom.getBoundingClientRect().top);
                    if (a > 40) ThemeEngine.estilo(dom, { "height": a + "px", "min-height": "0", "box-sizing": "border-box" });
                }
            }
        } catch (e) { }
    }

    private static observarCambios(): void {
        if (ThemeEngine.observadorDom) {
            ThemeEngine.observadorDom.observe(document.body, { childList: true, subtree: true });
        }
        if (ThemeEngine.observadorEstilos) {
            for (var i: number = 0; i < ThemeEngine.SELECTORES_OBSERVADOS.length; i++) {
                var nodos: HTMLElement[] = ThemeEngine.todos(ThemeEngine.SELECTORES_OBSERVADOS[i]);
                for (var j: number = 0; j < nodos.length; j++) {
                    ThemeEngine.observadorEstilos.observe(nodos[j], { attributes: true, attributeFilter: ["style"] });
                }
            }
        }
    }

    public static pasada(): void {
        if (ThemeEngine.ocupado) return;
        ThemeEngine.ocupado = true;
        if (ThemeEngine.observadorDom) ThemeEngine.observadorDom.disconnect();
        if (ThemeEngine.observadorEstilos) ThemeEngine.observadorEstilos.disconnect();
        try {
            ThemeEngine.aplicarTodo();
        } finally {
            ThemeEngine.ocupado = false;
            ThemeEngine.observarCambios();
        }
    }

    private static programarRepasoFinal(demora: number): void {
        window.clearTimeout(ThemeEngine.temporizador);
        ThemeEngine.temporizador = window.setTimeout((): void => { ThemeEngine.pasada(); }, demora);
    }

    private static alInteractuar(): void {
        window.setTimeout((): void => { ThemeEngine.pasada(); }, 0);
        ThemeEngine.programarRepasoFinal(60);
    }

    public static iniciar(): void {
        if (!TEMA_ACTIVO) return;
        var estilo: HTMLStyleElement | null = document.getElementById(ThemeEngine.ID_ESTILO) as HTMLStyleElement | null;
        if (!estilo) {
            estilo = document.createElement("style");
            estilo.id = ThemeEngine.ID_ESTILO;
            document.head.appendChild(estilo);
        }
        estilo.textContent = construirCss();

        if (ThemeEngine.observadorDom) ThemeEngine.observadorDom.disconnect();
        if (ThemeEngine.observadorEstilos) ThemeEngine.observadorEstilos.disconnect();

        ThemeEngine.observadorDom = new MutationObserver((mutaciones): void => {
            var forzar: boolean = false;
            for (var i: number = 0; i < mutaciones.length; i++) {
                var mutacion = mutaciones[i];
                if (mutacion.type === "childList") {
                    for (var j: number = 0; j < mutacion.addedNodes.length; j++) {
                        var nodo = mutacion.addedNodes[j] as HTMLElement;
                        if (nodo.nodeType === 1) {
                            if (nodo.classList && (nodo.classList.contains("buttonGridButton") || nodo.classList.contains("fields") || nodo.id === "ButtonGrid4Control")) {
                                forzar = true; break;
                            }
                        }
                    }
                }
            }
            if (forzar) {
                ThemeEngine.pasada();
                ThemeEngine.programarRepasoFinal(60);
            }
        });

        ThemeEngine.observadorEstilos = new MutationObserver((): void => {
            ThemeEngine.pasada();
            ThemeEngine.programarRepasoFinal(60);
        });

        ThemeEngine.observarCambios();

        var eventos: string[] = ["focusin", "click", "keyup", "mouseup", "pointerup"];
        if (!ThemeEngine.eventosRegistrados) {
            for (var i: number = 0; i < eventos.length; i++) {
                document.addEventListener(eventos[i], ThemeEngine.alInteractuar, true);
            }
            window.addEventListener("resize", () => {
                ThemeEngine.pasada();
                ThemeEngine.programarRepasoFinal(60);
            });
            ThemeEngine.eventosRegistrados = true;
        }

        ThemeEngine.pasada();
    }
}
