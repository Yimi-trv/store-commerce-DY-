import { construirCss, TEMA_ACTIVO, CLASE_AMBITO, CLASE_AMPLIO, CLASE_COMPACTO } from "./ThemeAssets";

/**
 * SCT_ThemeEngine — aplica el tema "Trujillo Market" sobre el DOM del POS.
 *
 * Implementa un MutationObserver dual (DOM y Estilos) y soporta dinámicamente
 * layout amplio (1920) y layout compacto (1024) según el ancho de la ventana.
 *
 * ---------------------------------------------------------------------------------------------
 * DOS REGLAS QUE HAY QUE RESPETAR AL TOCAR ESTE FICHERO
 * ---------------------------------------------------------------------------------------------
 *
 * 1) NUNCA escribir una clase o un estilo de forma incondicional.
 *    El MutationObserver observa los atributos "class" y "style". Si una pasada escribe siempre
 *    (aunque sea el mismo valor), cada escritura relanza el observador y el motor entra en un
 *    bucle de mutaciones: es el parpadeo de ~1s al agregar un producto que ya costo arreglar una
 *    vez. Patron correcto:  if (!el.classList.contains(x)) el.classList.add(x);
 *    El helper estilo() ya compara antes de escribir; usarlo en vez de style.setProperty directo.
 *
 * 2) El umbral amplio/compacto vive en DOS sitios y tienen que coincidir:
 *    aqui en esCompacto() y en las @media de ThemeAssets.ts (max-width:1366 / min-width:1367).
 *    Si se cambia uno, se cambia el otro en el mismo commit.
 *
 * ---------------------------------------------------------------------------------------------
 * CAMBIOS DE ESTA TANDA (v1.2.0 desplegada + endurecimiento posterior)
 * ---------------------------------------------------------------------------------------------
 *
 * DESPLEGADO EN 1.2.0:
 *   - esCompacto(): 1200 -> 1366. Entre 1201 y 1366px el tema quedaba mixto (CSS compacto con JS
 *     amplio). HQ sirve un layout de 1366x768, asi que la franja no era teorica.
 *   - aplicarPestanas(): rotulo de la 4a pestana BOLETO -> BOLETEO.
 *   - ThemeAssets: #ButtonGrid1/2/3{overflow:visible} (la zona de HQ mide 300px con
 *     overflow:hidden y recortaba las esquinas redondeadas del control de 316px) y la regla del
 *     titulo de la tarjeta Boleta en compacto.
 *
 * PENDIENTE DE COMPILAR (va en POS 1.2.1 / paquete 2.9.8.0):
 *   - zonaBoleta(), marcarTituloBoleta() y decorarBoleto(): tres ayudantes nuevos que ANTES
 *     estaban duplicados y divergidos entre aplicarLayoutCompacto() y aplicarLayoutAmplio().
 *     Esa divergencia era el origen de un hueco real: el titulo de la tarjeta Boleta solo se
 *     marcaba en el layout amplio.
 *   - decorarBoleto() identifica los botones por su PROPIO texto, no por posicion. El tema
 *     reescribe el rotulo del boton; con orden por indice, un orden distinto en HQ pegaria
 *     "A Cuenta" sobre la accion de terceros. En una caja que emite documentos tributarios eso
 *     no es cosmetico.
 *   - aplicarCliente() reescrita: detectaba si habia cliente por el FORMATO del numero de cuenta
 *     (/[A-Z]{2,4}-\d{4,}/). El cliente de pruebas TRV-000001 casaba; uno real trae un GUID y no,
 *     asi que con clientes reales el panel se quedaba SIN ESTILO. Ahora se detecta por las clases
 *     del propio POS. Ver el aviso dentro de la funcion.
 *   - soltarAlturaVacio(): NO BORRAR. Suelta los height:100% inline que pone el estado "sin
 *     cliente"; sin ella se quedan pegados al cargar un cliente.
 *   - propLineas: la caja de lineas pasa a left -12 / width 626 / height 400 para cuadrar la
 *     columna izquierda. Va emparejada con #TotalsPanel de ThemeAssets.
 *   - Geometria fina del layout compacto (numpad, separaciones, tiles de pago, ficha de cliente
 *     y direccion): toda en ThemeAssets. Antes de tocar un numero de ahi, leer el bloque de
 *     anclas que encabeza cssCompacto — los valores estan emparejados entre si.
 *
 * La bitacora completa (medidas en vivo, bugs y por que de cada decision) esta en el vault de
 * Obsidian, carpeta 006-MEMORIA, notas 14 (bitacora) y 23 (bugs de 1024x768).
 */
export class ThemeEngine {

    private static readonly ID_ESTILO: string = "sct-theme";
    /**
     * Momento de la ultima pasada inmediata. Una sola pulsacion dispara pointerup, mouseup,
     * click y focusin casi a la vez, y cada uno pedia su propia pasada completa del DOM.
     */
    private static ultimaPasadaInmediata: number = 0;

    private static observadorDom: MutationObserver | null = null;
    private static observadorEstilos: MutationObserver | null = null;
    private static ocupado: boolean = false;
    private static temporizador: number = 0;
    private static temporizadorSalidaAmbito: number = 0;
    private static eventosRegistrados: boolean = false;
    private static estiloNumpad: HTMLStyleElement | null = null;
    private static estiloAlineacion: HTMLStyleElement | null = null;
    private static teclaNativa: number = 0;
    private static sondaEstilos: HTMLElement | null = null;
    private static estilosNormalizados: { [clave: string]: string } = {};
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
        //
        // PARA EL QUE LEA ESTO: la 4a pestana NO depende del tema. Existe solo si el layout que HQ
        // le sirve a ESE usuario asigna una cuadricula a la zona TransactionScreen3. Confirmado en
        // vivo leyendo Commerce.ApplicationContext.Instance._tillLayoutProxy: con el usuario
        // administrador el POS descarga el layout "MPOS_ADMIN" (Diseño Administrador), variante
        // 1024x768, con 7 zonas y SIN entrada para TransactionScreen3 (200 Cliente, 210
        // Transacciones, hueco, 230 Metodos de Pago). Con el usuario de caja el layout si la trae.
        // O sea: si falta la pestana, es el layout del usuario, no el CSS. El bucle recorre las
        // pestanas que existan, asi que con 3 o con 4 funciona igual.
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
        // La fila del total se buscaba comparando el texto EXACTO con "Monto total". En master ese
        // rotulo es "Importe total", asi que no casaba, la fila no recibia .sct-mt y se quedaba con
        // los 20px genericos: su tipografia es mas grande y el importe salia cortado. Es el mismo
        // error de detectar por texto literal que ya aparecio en el panel de cliente y en el bot.
        //
        // Ahora: expresion que acepta las dos formas y, si aun asi no encuentra nada, se toma la
        // ULTIMA fila — que es donde va el total siempre, se llame como se llame y este en el
        // idioma que este.
        var etiqueta: HTMLElement | null = null;
        var nodos: NodeListOf<Element> = derecha.querySelectorAll("*");
        for (var i: number = 0; i < nodos.length; i++) {
            var nodo: HTMLElement = nodos[i] as HTMLElement;
            if (nodo.children.length === 0 && /(monto|importe)\s+total/i.test((nodo.textContent || "").trim())) {
                etiqueta = nodo; break;
            }
        }
        var fila: HTMLElement | null = null;
        if (etiqueta) {
            fila = etiqueta;
            while (fila && fila.parentElement !== derecha) fila = fila.parentElement;
        }
        if (!fila && derecha.children.length > 0) {
            fila = derecha.children[derecha.children.length - 1] as HTMLElement;
        }
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

    // Primer nodo que coincide y esta VIVO: con altura Y con contenido.
    //
    // NO USAR querySelector() PARA ESTO, y NO usar solo la altura como criterio. El POS deja los
    // nodos ANTERIORES en el DOM despues de cargar, editar o anular. Medido en vivo tras anular una
    // transaccion:
    //
    //     .customerDetailsCardStyle  ->  altura 9px, textContent ""   <- cadaver
    //
    // Con querySelector() se cogia ese nodo, y con el criterio "altura > 0" tambien, porque 9 > 0.
    // En los dos casos el motor concluia que HABIA cliente, tomaba la rama de la ficha y no
    // aplicaba nunca el estado vacio: el panel se quedaba sin estilo. Lo que distingue al cadaver
    // es que esta VACIO de contenido, asi que hay que exigir texto.
    private static nodoVivo(raiz: HTMLElement, selector: string): HTMLElement | null {
        var lista: NodeListOf<Element> = raiz.querySelectorAll(selector);
        for (var i: number = 0; i < lista.length; i++) {
            var elemento: HTMLElement = lista[i] as HTMLElement;
            if (elemento.getBoundingClientRect().height > 0 && (elemento.textContent || "").trim().length > 0) {
                return elemento;
            }
        }
        return null;
    }

    // Rotulo "Agregue un cliente a esta transaccion" cuando esta VISIBLE. Es la senal mas fiable de
    // que no hay cliente: el POS muestra SIEMPRE uno de los dos estados, nunca los dos a la vez.
    private static rotuloSinCliente(zona: HTMLElement): HTMLElement | null {
        var hojas: NodeListOf<Element> = zona.querySelectorAll("div,span,label,h1,h2,h3,h4");
        for (var i: number = 0; i < hojas.length; i++) {
            var hoja: HTMLElement = hojas[i] as HTMLElement;
            if (hoja.children.length === 0
                && (hoja.textContent || "").trim() === "Agregue un cliente a esta transacción"
                && hoja.getBoundingClientRect().width > 0) {
                return hoja;
            }
        }
        return null;
    }

    // Quita una clase del tema de TODOS los nodos que la lleven, menos del que toca conservar.
    // Por el mismo motivo: puede haber varios nodos marcados a la vez (el vivo y los muertos), y
    // limpiar solo el primero deja estilos peleandose. Solo escribe si hay algo que quitar, asi
    // que en reposo no genera mutaciones.
    private static soltarClase(clase: string, salvo: HTMLElement | null): void {
        var marcados: HTMLElement[] = ThemeEngine.todos("." + clase);
        for (var i: number = 0; i < marcados.length; i++) {
            if (marcados[i] !== salvo) marcados[i].classList.remove(clase);
        }
    }

    // ---------------------------------------------------------------- alineacion de la columna

    // Valor actual de `top` de un elemento posicionado, en pixeles.
    private static topActual(elemento: HTMLElement): number {
        return parseFloat(getComputedStyle(elemento).top) || 0;
    }

    // Acomoda la columna derecha (tarjeta de Boleta y metodos de pago) contra la caja de importes,
    // y reparte el espacio resultante entre los botones de pago.
    //
    // POR QUE NO HAY NUMEROS FIJOS AQUI. Antes esto eran valores clavados en el CSS —
    // translateY(108px) y translateY(114px) en amplio, top:460 y top:565 en compacto, alturas de
    // 94 y 127— todos medidos contra el layout de UAT. En master las zonas caen en otro sitio y con
    // otros tamanos: Boleta quedaba descolgada de los importes y NIUBIZ se salia por abajo (25px a
    // 1024, 6px a 1920). Cualquier constante aqui vuelve a romperse en el siguiente entorno.
    //
    // QUE HACE, en orden:
    //   1. Boleta arranca donde arranca #TotalsPanel.
    //   2. La zona de pagos va justo debajo, con un hueco fijo, y ACABA donde acaba #TotalsPanel.
    //      Asi las dos columnas cierran a la misma altura.
    //   3. El alto que quede se reparte entre las filas de botones, y el ancho entre sus columnas.
    //      Las filas y columnas se deducen de la posicion REAL de los botones, no de su orden: el
    //      "Efectivo" duplicado de master comparte celda con el original y asi cae en su sitio en
    //      vez de desplazar a los demas.
    //
    // Es estable: se parte del `top` ya aplicado, asi que una vez acomodado el calculo da cero,
    // sale el mismo CSS y no se escribe nada (ver la regla del vigilante en la cabecera).
    private static acomodarColumnaDerecha(): void {
        var montos = ThemeEngine.q("#TotalsPanel");
        var boleta = ThemeEngine.q("#CustomControl1");
        var pagos = ThemeEngine.q("#ButtonGrid4");
        if (!montos || !boleta || !pagos) return;

        var rMontos = montos.getBoundingClientRect();
        var rBoleta = boleta.getBoundingClientRect();
        var rPagos = pagos.getBoundingClientRect();
        if (rMontos.height < 40 || rBoleta.height < 20 || rPagos.height < 20) return;

        var HUECO: number = 8;
        var topBoleta: number = Math.round(ThemeEngine.topActual(boleta) + (rMontos.top - rBoleta.top));
        var yPagos: number = rMontos.top + rBoleta.height + HUECO;
        var topPagos: number = Math.round(ThemeEngine.topActual(pagos) + (yPagos - rPagos.top));
        var altoPagos: number = Math.round(rMontos.bottom - yPagos);
        if (altoPagos < 60) return;

        var raiz: string = "body." + CLASE_AMBITO + " ";
        var css: string = raiz + "#CustomControl1{top:" + topBoleta + "px !important;}\n"
            + raiz + "#ButtonGrid4{top:" + topPagos + "px !important;}\n"
            + raiz + "#ButtonGrid4," + raiz + "#ButtonGrid4Control," + raiz + "#ButtonGrid4Control .buttonsContainer"
            + "{height:" + altoPagos + "px !important;min-height:" + altoPagos + "px !important;max-height:" + altoPagos + "px !important;}\n";

        if (!ThemeEngine.estiloAlineacion) {
            ThemeEngine.estiloAlineacion = document.createElement("style");
            ThemeEngine.estiloAlineacion.setAttribute("id", "sct-alineacion");
            document.head.appendChild(ThemeEngine.estiloAlineacion);
        }
        if (ThemeEngine.estiloAlineacion.textContent !== css) {
            ThemeEngine.estiloAlineacion.textContent = css;
        }

        ThemeEngine.repartirBotonesPago(altoPagos, HUECO);
    }

    // Reparte los botones de un panel del control de pestañas (cliente, transacciones, boleteo)
    // dentro de su tarjeta.
    //
    // POR QUE HACE FALTA. El POS dimensiona el CONTENEDOR de estos paneles al contenido, no a la
    // zona: medido en master, 232x152 dentro de una tarjeta de 316x310. Si el tema no lo estira,
    // los botones se quedan pequeños en una esquina. En los pagos no pasa porque alli la zona y el
    // contenedor son el mismo elemento.
    //
    // COMO REPARTE:
    //   - El ancho se divide entre las columnas reales de la rejilla.
    //   - Con VARIAS columnas (tiles) el alto sale del ancho por proporcion, no estirando: llenar
    //     toda la tarjeta daba tiles de 100x151, demasiado altos. La proporcion 1.27 reproduce los
    //     96x122 que estaban aprobados, pero calculada.
    //   - Con UNA sola columna (barras de cliente y boleteo) si se reparte todo el alto.
    //   - Se acota al ancho UTIL de la tarjeta, no al de la zona: la zona es mas ancha y la ultima
    //     columna se salia por la derecha.
    private static repartirPanel(idControl: string, proporcion: number): void {
        var zona = ThemeEngine.q("#" + idControl.replace("Control", ""));
        var control = ThemeEngine.q("#" + idControl);
        var tarjeta = ThemeEngine.q("#TabControl .tabContent");
        if (!zona || !control || !tarjeta) return;

        var botones: HTMLElement[] = ThemeEngine.todos("#" + idControl + " .buttonGridButton");
        if (botones.length === 0) return;

        var estilosTarjeta = getComputedStyle(tarjeta);
        var rTarjeta = tarjeta.getBoundingClientRect();
        var anchoUtil: number = Math.round(rTarjeta.width - (parseFloat(estilosTarjeta.paddingLeft) || 0) - (parseFloat(estilosTarjeta.paddingRight) || 0));
        var altoUtil: number = Math.round(rTarjeta.height - (parseFloat(estilosTarjeta.paddingTop) || 0) - (parseFloat(estilosTarjeta.paddingBottom) || 0));
        var anchoZona: number = Math.round(zona.getBoundingClientRect().width);
        var ancho: number = Math.min(anchoZona, anchoUtil);
        if (ancho < 100 || altoUtil < 80) return;

        var HUECO: number = 8;
        var filas: number[] = [];
        var columnas: number[] = [];
        var i: number = 0;
        for (i = 0; i < botones.length; i++) {
            var r = botones[i].getBoundingClientRect();
            var y: number = Math.round(r.top);
            var x: number = Math.round(r.left);
            if (filas.indexOf(y) < 0) filas.push(y);
            if (columnas.indexOf(x) < 0) columnas.push(x);
        }
        filas.sort(function (a: number, b: number): number { return a - b; });
        columnas.sort(function (a: number, b: number): number { return a - b; });
        if (filas.length === 0 || columnas.length === 0) return;

        var anchoBoton: number = Math.floor((ancho - (columnas.length - 1) * HUECO) / columnas.length);
        var altoMaximo: number = Math.floor((altoUtil - (filas.length - 1) * HUECO) / filas.length);
        var altoBoton: number = columnas.length > 1 ? Math.round(anchoBoton * proporcion) : altoMaximo;
        if (altoBoton > altoMaximo) altoBoton = altoMaximo;
        if (altoBoton < 30) return;
        var altoTotal: number = filas.length * altoBoton + (filas.length - 1) * HUECO;

        ThemeEngine.establecer("#" + idControl + ", #" + idControl + " .buttonsContainer", {
            "width": ancho + "px",
            "height": altoTotal + "px"
        });

        for (i = 0; i < botones.length; i++) {
            var rect = botones[i].getBoundingClientRect();
            var fila: number = filas.indexOf(Math.round(rect.top));
            var columna: number = columnas.indexOf(Math.round(rect.left));
            if (fila < 0) fila = 0;
            if (columna < 0) columna = 0;
            ThemeEngine.estilo(botones[i], {
                "position": "absolute",
                "left": (columna * (anchoBoton + HUECO)) + "px",
                "top": (fila * (altoBoton + HUECO)) + "px",
                "width": anchoBoton + "px",
                "height": altoBoton + "px",
                "min-height": altoBoton + "px",
                "max-height": altoBoton + "px"
            });
        }
    }

    // Reparte los botones de pago dentro de su zona: las filas se llevan el alto y las columnas el
    // ancho. Filas y columnas salen de la posicion real de cada boton, no de su indice.
    private static repartirBotonesPago(altoZona: number, hueco: number): void {
        var contenedor = ThemeEngine.q("#ButtonGrid4Control .buttonsContainer") || ThemeEngine.q("#ButtonGrid4Control");
        if (!contenedor) return;
        var botones: HTMLElement[] = ThemeEngine.todos("#ButtonGrid4Control .buttonGridButton");
        if (botones.length === 0) return;

        var ancho: number = Math.round(contenedor.getBoundingClientRect().width);
        if (ancho < 80) return;

        var filas: number[] = [];
        var i: number = 0;
        for (i = 0; i < botones.length; i++) {
            var y: number = Math.round(botones[i].getBoundingClientRect().top);
            if (filas.indexOf(y) < 0) filas.push(y);
        }
        filas.sort(function (a: number, b: number): number { return a - b; });
        if (filas.length === 0) return;

        var altoBoton: number = Math.floor((altoZona - (filas.length - 1) * hueco) / filas.length);
        if (altoBoton < 24) return;

        for (var f: number = 0; f < filas.length; f++) {
            var deLaFila: HTMLElement[] = [];
            var columnas: number[] = [];
            for (i = 0; i < botones.length; i++) {
                if (Math.round(botones[i].getBoundingClientRect().top) !== filas[f]) continue;
                deLaFila.push(botones[i]);
                var x: number = Math.round(botones[i].getBoundingClientRect().left);
                if (columnas.indexOf(x) < 0) columnas.push(x);
            }
            columnas.sort(function (a: number, b: number): number { return a - b; });
            var anchoBoton: number = Math.floor((ancho - (columnas.length - 1) * hueco) / columnas.length);
            for (i = 0; i < deLaFila.length; i++) {
                var col: number = columnas.indexOf(Math.round(deLaFila[i].getBoundingClientRect().left));
                if (col < 0) col = 0;
                ThemeEngine.estilo(deLaFila[i], {
                    "top": (f * (altoBoton + hueco)) + "px",
                    "left": (col * (anchoBoton + hueco)) + "px",
                    "width": anchoBoton + "px",
                    "height": altoBoton + "px",
                    "min-height": altoBoton + "px",
                    "max-height": altoBoton + "px"
                });
            }
        }
    }

    // ---------------------------------------------------------------- numpad adaptativo

    // Dimensiona la ZONA del numpad midiendo la pantalla real, en vez de fijar pixeles.
    //
    // POR QUE EXISTE ESTO. El CSS clavaba el alto del control de pestañas en 468px, medido contra
    // la zona de UAT (490). En master HQ da una zona de 360, y como la zona trae overflow:hidden,
    // se recortaban 108px: desaparecia la mitad inferior del numpad, incluido el boton Intro. El
    // usuario no podia trabajar. Cualquier valor fijo aqui vuelve a romperse en el siguiente
    // entorno, porque la geometria de las zonas la decide el layout de HQ y cambia por entorno.
    //
    // COMO LO RESUELVE:
    //   1. La zona crece hasta donde acaba la caja de lineas (#TransactionGrid). Asi el numpad
    //      queda alineado con los productos, que es el criterio visual que se aprobo.
    //   2. Con el espacio resultante calcula el alto de tecla que cabe, sin pasar NUNCA del tamano
    //      nativo: si sobra sitio no las agranda, solo evita que se corten.
    //   3. El input baja a 34px (fuente 22), que es de donde sale la mayor parte del espacio que
    //      falta: el POS lo pinta a 52px con fuente de 34.
    //
    // Escribe en una hoja propia y SOLO cuando el resultado cambia, asi que en reposo no genera
    // mutaciones (ver la regla del vigilante en la cabecera del fichero).
    private static ajustarNumpad(): void {
        var zona: HTMLElement | null = ThemeEngine.q("#TabControl");
        var tabs: HTMLElement | null = ThemeEngine.q("#TabControl .tabsContainer");
        var tarjeta: HTMLElement | null = ThemeEngine.q("#TabControl .tabContent");
        var carrito: HTMLElement | null = ThemeEngine.q("#TransactionGrid");
        if (!zona || !tarjeta || !carrito) return;

        var teclas: HTMLElement[] = ThemeEngine.todos("#TabControl .numpad-control-buttons button");
        if (teclas.length === 0) return;

        // El alto nativo se toma UNA vez, antes de que esta funcion escriba nada. Si se volviera a
        // medir despues, se encogeria en cascada en cada pasada.
        if (!ThemeEngine.teclaNativa) {
            ThemeEngine.teclaNativa = Math.round(teclas[0].getBoundingClientRect().height) || 54;
        }

        var filasY: number[] = [];
        for (var i: number = 0; i < teclas.length; i++) {
            var y: number = Math.round(teclas[i].getBoundingClientRect().top);
            if (filasY.indexOf(y) < 0) filasY.push(y);
        }
        var filas: number = filasY.length;
        if (filas === 0) return;

        var SEP: number = 4;
        var HUECO: number = 8;
        var ALTO_INPUT: number = 34;

        var altoZona: number = Math.round(carrito.getBoundingClientRect().bottom - zona.getBoundingClientRect().top);
        if (altoZona < 160) return;

        var altoTabs: number = tabs ? Math.round(tabs.getBoundingClientRect().height) : 0;
        var margenTabs: number = tabs ? (parseFloat(getComputedStyle(tabs).marginBottom) || 0) : 0;
        var estilosTarjeta: CSSStyleDeclaration = getComputedStyle(tarjeta);
        var relleno: number = (parseFloat(estilosTarjeta.paddingTop) || 0) + (parseFloat(estilosTarjeta.paddingBottom) || 0);
        var disponible: number = altoZona - altoTabs - margenTabs - relleno;

        var altoTecla: number = Math.floor((disponible - ALTO_INPUT - HUECO - (filas - 1) * SEP) / filas);
        if (altoTecla > ThemeEngine.teclaNativa) altoTecla = ThemeEngine.teclaNativa;
        if (altoTecla < 30) altoTecla = 30;
        var altoTeclado: number = filas * altoTecla + (filas - 1) * SEP;

        var raiz: string = "body." + CLASE_AMBITO + " ";
        var css: string = raiz + "#TabControl{height:" + altoZona + "px !important;max-height:" + altoZona + "px !important;overflow:visible !important;}\n"
            + raiz + "#TabControl .numpad-control-input-wrapper{height:" + ALTO_INPUT + "px !important;min-height:" + ALTO_INPUT + "px !important;max-height:" + ALTO_INPUT + "px !important;}\n"
            + raiz + "#TabControl .numpad-control-input{height:" + ALTO_INPUT + "px !important;min-height:" + ALTO_INPUT + "px !important;max-height:" + ALTO_INPUT + "px !important;line-height:" + ALTO_INPUT + "px !important;font-size:22px !important;}\n"
            + raiz + "#TabControl .numpad-control-buttons{height:" + altoTeclado + "px !important;max-height:" + altoTeclado + "px !important;min-height:0 !important;margin:" + HUECO + "px auto 0 auto !important;}\n"
            + raiz + "#TabControl .numpad-control-buttons button," + raiz + "#TabControl .numpad-control-buttons .enter{height:" + altoTecla + "px !important;min-height:" + altoTecla + "px !important;max-height:" + altoTecla + "px !important;}\n";

        if (!ThemeEngine.estiloNumpad) {
            ThemeEngine.estiloNumpad = document.createElement("style");
            ThemeEngine.estiloNumpad.setAttribute("id", "sct-numpad");
            document.head.appendChild(ThemeEngine.estiloNumpad);
        }
        if (ThemeEngine.estiloNumpad.textContent !== css) {
            ThemeEngine.estiloNumpad.textContent = css;
        }
    }

    private static aplicarCliente(): void {
        // ¡¡NO VOLVER A DETECTAR POR TEXTO NI POR FORMATO DE DATOS EN ESTA FUNCION!!
        // Es el error que ya se cometio TRES veces aqui y el que produjo el bug de abajo. Si algo
        // no se encuentra, la respuesta NO es afinar la expresion regular: es buscar la clase
        // estructural que use el POS para eso.
        //
        // BUG CORREGIDO — "al agregar un cliente se pierden los estilos y vuelve el anterior".
        //
        // La deteccion anterior daba por hecho dos cosas que solo son ciertas con el cliente por
        // defecto de pruebas, y con un cliente REAL fallaban las dos:
        //
        //   1) Que el numero de cuenta tiene formato XXX-0000:
        //          /[A-Z]{2,4}-\d{4,}/.test(candidato.textContent)
        //      El cliente por defecto es "TRV-000001" y casaba. Un cliente real trae un GUID
        //      ("5f41e99f-c811-4e86-864b-539c06da3e8f") y NO casa. Sin ese codigo el motor creia
        //      que el panel estaba VACIO, aplicaba el estilo de "sin cliente" y la tarjeta real se
        //      quedaba con el estilo nativo del POS. Medido en vivo con el cliente
        //      "BENITO ROGGIO E HIJOS SA SUCURSAL DEL PERU".
        //
        //   2) Que la tarjeta de direccion empieza por "DOMICILIO":
        //          /^DOMICILIO/.test(seccion.textContent)
        //      Ese rotulo es el TIPO de direccion del cliente. Con "OFICINA", "ALMACEN", etc.
        //      tampoco casaba y la tarjeta de direccion se quedaba sin estilo.
        //
        // Ahora se usan las clases del PROPIO POS, que no dependen de los datos del cliente:
        //   .customerDetailsCardStyle    -> existe (con altura) solo cuando HAY cliente cargado
        //   .customerPanelPrimaryAddress -> la tarjeta de direccion, se llame como se llame
        var zonaCliente: HTMLElement | null = ThemeEngine.q("#CustomerPanel");
        if (!zonaCliente) zonaCliente = ThemeEngine.zona(/Agregue un cliente|CLIENTE DESCRIPTIVO/i);
        if (!zonaCliente) return;

        // DOS senales, y la del rotulo MANDA. Si el POS esta diciendo "Agregue un cliente", no hay
        // cliente por muchos restos que queden en el DOM. Ver nodoVivo() para el porque.
        var rotuloVacio: HTMLElement | null = ThemeEngine.rotuloSinCliente(zonaCliente);
        var detalle: HTMLElement | null = ThemeEngine.nodoVivo(zonaCliente, ".customerDetailsCardStyle");
        var conCliente: boolean = !!detalle && !rotuloVacio;

        if (conCliente && detalle) {
            // Los dos estados son EXCLUYENTES. Antes las clases solo se anadian, nunca se
            // quitaban, asi que .sct-cli-card y .sct-cli-empty acababan conviviendo y sus estilos
            // se peleaban. Se comprobo en vivo: las tres clases presentes a la vez.
            ThemeEngine.soltarClase("sct-cli-empty", null);
            ThemeEngine.soltarAlturaVacio();

            var tarjeta: HTMLElement | null = ThemeEngine.nodoVivo(detalle, ".primaryPanelBackgroundColor.highContrastBorderThin");
            if (!tarjeta) tarjeta = detalle;
            ThemeEngine.soltarClase("sct-cli-card", tarjeta);
            if (!tarjeta.classList.contains("sct-cli-card")) tarjeta.classList.add("sct-cli-card");

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

            var direccion: HTMLElement | null = ThemeEngine.nodoVivo(zonaCliente, ".customerPanelPrimaryAddress");
            ThemeEngine.soltarClase("sct-dom-card", direccion);
            if (direccion) {
                if (!direccion.classList.contains("sct-dom-card")) direccion.classList.add("sct-dom-card");
                var internos: NodeListOf<Element> = direccion.querySelectorAll("*");
                for (var m: number = 0; m < internos.length; m++) {
                    var interno: HTMLElement = internos[m] as HTMLElement;
                    ThemeEngine.estilo(interno, { "background": "transparent", "border": "none", "white-space": "normal" });
                }
                var cabecera: HTMLElement | null = direccion.querySelector(".headerBackground .h4") as HTMLElement | null;
                if (cabecera && !cabecera.classList.contains("sct-dom-h")) cabecera.classList.add("sct-dom-h");
            }
            return;
        }

        // ESTADO VACIO. Se exige que el rotulo de "Agregue un cliente" este VISIBLE (width > 0).
        // Es lo que amortigua el parpadeo: mientras el POS reconstruye el panel hay instantes en
        // que ni la tarjeta ni el vacio miden nada. Si no se ve ninguno de los dos, se sale sin
        // tocar NADA en vez de repintar el estado contrario y volver.
        if (!rotuloVacio) return;
        var tarjetaVacia: HTMLElement | null = ThemeEngine.ancestroTarjeta(rotuloVacio);
        if (!tarjetaVacia) return;
        ThemeEngine.soltarClase("sct-cli-card", null);
        ThemeEngine.soltarClase("sct-dom-card", null);
        if (!tarjetaVacia.classList.contains("sct-cli-empty")) tarjetaVacia.classList.add("sct-cli-empty");
        var raiz: HTMLElement | null = ThemeEngine.raiz();
        var subir: HTMLElement | null = tarjetaVacia;
        while (subir && subir.parentElement && subir.parentElement !== raiz) {
            if (!subir.classList.contains("sct-alto-vacio")) subir.classList.add("sct-alto-vacio");
            ThemeEngine.estilo(subir, { "height": "100%" });
            subir = subir.parentElement;
        }
        ThemeEngine.estilo(tarjetaVacia, { "height": "100%" });
    }

    // Al pasar de "sin cliente" a "con cliente" hay que SOLTAR los height:100% que se pusieron para
    // estirar la tarjeta vacia. Se escriben como estilo INLINE, asi que no desaparecen solos al
    // quitar la clase: hay que borrarlos a mano. Por eso se marcan con .sct-alto-vacio al ponerlos.
    // Solo escribe cuando queda alguno marcado, asi que en reposo no genera mutaciones.
    private static soltarAlturaVacio(): void {
        var marcados: HTMLElement[] = ThemeEngine.todos(".sct-alto-vacio");
        for (var i: number = 0; i < marcados.length; i++) {
            marcados[i].style.removeProperty("height");
            marcados[i].classList.remove("sct-alto-vacio");
        }
    }

    private static limpiarTooltips(): void {
        var tooltips: HTMLElement[] = ThemeEngine.todos(".ui-tooltip");
        for (var i: number = 0; i < tooltips.length; i++) {
            if (tooltips[i].parentElement) tooltips[i].parentElement.removeChild(tooltips[i]);
        }
    }

    // REVISAR (hipotesis descartada, se deja por si el autor ve algo que se nos escapa).
    // Esto nacio de suponer que con menos de 4 pestanas el control de WinJS no habia recalculado su
    // layout, y por eso fuerza forceLayout/updateLayout y lanza un evento "resize" sintetico.
    // Medido despues: el numero de pestanas lo fija el LAYOUT que HQ le sirve al usuario, no el
    // recalculo del control (ver el comentario de aplicarPestanas). Con 3 pestanas esta condicion
    // se cumple SIEMPRE, asi que en cada entrada a la pantalla se dispara un resize sintetico que
    // provoca otra pasada completa del motor, para nada. Esta acotado por la bandera
    // recalculoPestanasSolicitado (solo una vez por carga), asi que no hace dano; pero es trabajo
    // inutil y un efecto secundario global. Candidato a borrarse.
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

    // Rotulo real del boton de pago. El atributo `title` suele traer el nombre del metodo; cuando
    // HQ mete ahi una instruccion larga (pasa en dos de ellos) se cae al texto del propio boton,
    // descartando el sufijo de accesibilidad ("... 3 of 6 selected").
    private static rotuloPago(boton: HTMLElement): string {
        var titulo: string = (boton.getAttribute("title") || "").trim();
        if (titulo.length > 0 && titulo.length <= 40) return titulo;
        for (var i: number = 0; i < boton.children.length; i++) {
            var texto: string = ((boton.children[i] as HTMLElement).textContent || "").trim();
            if (texto.length > 0 && !/\d+\s+of\s+\d+/.test(texto)) return texto;
        }
        return titulo;
    }

    // Estilo de los botones de metodo de pago.
    //
    // ¡¡SE EMPAREJA POR NOMBRE, NUNCA POR POSICION!!
    //
    // Antes se hacia con la clase posicional del POS: "button0" -> p0, "button2" -> p2, etc. Esa
    // posicion la decide como este montada la cuadricula en HQ, y CAMBIA por entorno: en UAT el
    // tercer boton es NIUBIZ y en master es "Empleado en planilla". Resultado medido en master: un
    // metodo de pago aparecia con el logo y el rotulo de OTRO. En una caja eso es cobrar con el
    // medio de pago equivocado, asi que no es un fallo estetico.
    //
    // Tres reglas, y conviene respetarlas:
    //   1. La POSICION y el TAMAÑO no se tocan. Los pone la rejilla del POS (Row/Column/ColumnSpan
    //      de la cuadricula), que ya los coloca bien en cualquier entorno y con cualquier numero de
    //      botones. El tema solo cambia el ASPECTO.
    //   2. Si el boton se reconoce por su nombre, recibe icono y rotulo. El rotulo sale de su
    //      PROPIO nombre, asi que por construccion no puede ser el de otro metodo.
    //   3. Si NO se reconoce, se queda con su texto y su imagen nativos y solo recibe el fondo del
    //      tema. Mejor un boton sin icono que un boton con el icono de otro.
    private static prepararBotones(): void {
        var botones: HTMLElement[] = ThemeEngine.todos("#ButtonGrid4Control .buttonGridButton");
        if (botones.length === 0) return;

        var definiciones: any[] = [
            { clase: "sct-p0", re: /^efectivo$/i },
            { clase: "sct-p1", re: /vales/i },
            { clase: "sct-p3", re: /planilla/i },
            { clase: "sct-p4", re: /terceros/i },
            { clase: "sct-p2", re: /niubiz/i }
        ];
        var usadas: any = {};

        for (var i: number = 0; i < botones.length; i++) {
            var boton: HTMLElement = botones[i];
            var rotulo: string = ThemeEngine.rotuloPago(boton);

            var def: any = null;
            for (var j: number = 0; j < definiciones.length; j++) {
                if (!usadas[definiciones[j].clase] && definiciones[j].re.test(rotulo)) {
                    def = definiciones[j];
                    usadas[def.clase] = true;
                    break;
                }
            }

            if (!boton.classList.contains("sct-pbtn")) boton.classList.add("sct-pbtn");
            ThemeEngine.estilo(boton, {
                "background-color": "rgba(22,21,20,0.6)",
                "border": "1px solid rgba(255,255,255,0.16)",
                "border-radius": "12px",
                "color": "#FFFFFF"
            });

            // No reconocido: se respeta tal cual, con su imagen nativa incluida.
            if (!def) continue;

            ThemeEngine.estilo(boton, { "background-image": "none" });
            if (!boton.classList.contains(def.clase)) {
                boton.classList.add(def.clase);
                ThemeEngine.icono(boton, "sct-ic-" + def.clase.substring(4));
            }
            for (var k: number = 0; k < boton.children.length; k++) {
                var hijo: HTMLElement = boton.children[k] as HTMLElement;
                if (hijo.tagName === "DIV" && hijo.style.getPropertyValue("display") !== "none") {
                    hijo.style.setProperty("display", "none", "important");
                }
            }
        }
    }

    private static aplicarLayoutCompacto(): void {
        // ¡¡NO CAMBIAR ESTOS TRES NUMEROS SIN LEER EL BLOQUE "CSS COMPACTO" DE ThemeAssets.ts!!
        // Van emparejados con #TotalsPanel{width:298px} de alli. Si se toca uno solo, las dos cajas
        // de la izquierda dejan de acabar en el mismo punto y se descuadra la pantalla entera.
        //
        // Caja de lineas: left 0 -> -12px, ancho 600 -> 626px, alto fijo 400px.
        // Deja la columna izquierda cuadrada.
        //
        // Estaba descuadrada por los dos lados:
        //   - Por la izquierda, el carrito empezaba en x=20 y la tarjeta de cliente que tiene
        //     debajo en x=8. Con left:-12px los dos arrancan en 8.
        //   - Por la derecha, el carrito acababa en 620 y la caja de montos en 648, pegada a la
        //     columna derecha (que empieza en 650: quedaban 2px). Con 626 de ancho el carrito
        //     acaba en 634, igual que #TotalsPanel (298px desde x=336), y quedan 16px de aire
        //     hasta la columna derecha — el mismo ritmo que se usa en vertical.
        //   - Por abajo, el carrito acababa en y=488 mientras la tarjeta del numpad acaba en 508.
        //     Con alto 400 (arranca en y=108) los dos cierran en 508, y quedan 16px hasta la
        //     tarjeta de cliente de abajo.
        // Resultado: toda la columna izquierda va de x=8 a x=634, y arriba cierra a la misma
        // altura que la columna derecha.
        //
        // El alto ANTES se calculaba midiendo el panel en la primera pasada y restandole 8px
        // (altoOriginalLineas). Se sustituye por el valor fijo porque en compacto toda la
        // geometria es fija, y de paso desaparece un cache que nunca se invalidaba: al
        // redimensionar la ventana cruzando el umbral, el motor seguia usando una altura medida
        // bajo el OTRO juego de reglas.
        //
        // OJO: estas propiedades se escriben como estilo INLINE con !important, asi que NO se
        // pueden ajustar desde ThemeAssets con reglas de "width"/"left" — el inline gana. Si hay
        // que cambiarlas, se cambian AQUI. Y el ancho va emparejado con el de #TotalsPanel en
        // ThemeAssets: los dos tienen que acabar en el mismo punto o se descuadra otra vez.
        // (Para probarlo en vivo desde la consola: min-width si le gana a un width inline, y
        // margin-left si le gana a un left inline.)
        var propLineas: any = { "left": "-12px", "right": "auto", "width": "626px", "height": "400px", "box-sizing": "border-box" };
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
        
        ThemeEngine.ajustarNumpad();
        ThemeEngine.acomodarColumnaDerecha();
        // Solo actua sobre el panel de la pestaña activa; los otros no estan en el DOM.
        ThemeEngine.repartirPanel("ButtonGrid1Control", 1.27);
        ThemeEngine.repartirPanel("ButtonGrid2Control", 1.27);
        ThemeEngine.repartirPanel("ButtonGrid3Control", 1.27);
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
        // Sin forzar el tamano del contenedor: lo dimensiona el POS a partir de su zona.
        ThemeEngine.decorarBoleto(ThemeEngine.todos("#ButtonGrid3Control .buttonGridButton"));

        
        // Estilos para los botones de pago (las clases sct-p0..sct-p4 ya fueron asignadas en prepararBotones, posiciones manejadas por CSS)

        ThemeEngine.ajustarNumpad();
        ThemeEngine.acomodarColumnaDerecha();
        // Solo actua sobre el panel de la pestaña activa; los otros no estan en el DOM.
        ThemeEngine.repartirPanel("ButtonGrid1Control", 1.27);
        ThemeEngine.repartirPanel("ButtonGrid2Control", 1.27);
        ThemeEngine.repartirPanel("ButtonGrid3Control", 1.27);
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

    /**
     * Pasada inmediata como maximo una vez cada 120 ms, mas el repaso final.
     *
     * Lo usan los dos observadores: el POS repinta en rafagas —al montar una vista cambia el
     * estilo de decenas de nodos— y cada mutacion pedia su propio recorrido completo del DOM.
     * Con el colapso, la rafaga entera cuesta una pasada y el repaso final recoge lo que quede.
     */
    private static pasadaColapsada(): void {
        var ahora: number = new Date().getTime();

        if (ahora - ThemeEngine.ultimaPasadaInmediata > 120) {
            ThemeEngine.ultimaPasadaInmediata = ahora;
            ThemeEngine.pasada();
        }

        ThemeEngine.programarRepasoFinal(60);
    }

    private static programarRepasoFinal(demora: number): void {
        window.clearTimeout(ThemeEngine.temporizador);
        ThemeEngine.temporizador = window.setTimeout((): void => { ThemeEngine.pasada(); }, demora);
    }

    /**
     * COSTE POR INTERACCION. `pasada()` recorre el DOM entero (zonas, pestanas, montos, cliente,
     * layout). Antes, cada uno de los cinco eventos escuchados pedia una pasada inmediata MAS
     * un repaso: una sola pulsacion tactil, que dispara pointerup + mouseup + click + focusin,
     * costaba cinco recorridos completos, y escribir un RUC de once digitos costaba veintidos.
     * Eso es lo que se sentia como caja lenta.
     *
     * Ahora:
     *   - Los eventos de puntero comparten UNA pasada inmediata por rafaga (120 ms). La
     *     respuesta visual al tocar no cambia: la primera pasada sigue siendo inmediata.
     *   - Al ESCRIBIR no se repinta. El tema no depende de lo que se teclea, asi que basta con
     *     un repaso al terminar; con 300 ms de espera, escribir seguido cuesta una sola pasada
     *     en vez de una por tecla.
     *
     * Medido sobre el guion de eventos real: un toque 5 -> 2 pasadas, escribir un RUC 22 -> 1.
     */
    private static alInteractuar(evento?: Event): void {
        var tipo: string = (evento && evento.type) || "";
        var escribiendo: boolean = tipo === "keyup";

        if (!escribiendo) {
            var ahora: number = new Date().getTime();

            if (ahora - ThemeEngine.ultimaPasadaInmediata > 120) {
                ThemeEngine.ultimaPasadaInmediata = ahora;
                window.setTimeout((): void => { ThemeEngine.pasada(); }, 0);
            }
        }

        ThemeEngine.programarRepasoFinal(escribiendo ? 300 : 60);
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
                ThemeEngine.pasadaColapsada();
            }
        });

        ThemeEngine.observadorEstilos = new MutationObserver((): void => {
            ThemeEngine.pasadaColapsada();
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
