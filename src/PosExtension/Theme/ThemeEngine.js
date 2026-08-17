System.register(["./ThemeAssets"], function (exports_1, context_1) {
    "use strict";
    var ThemeAssets_1, ThemeEngine;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (ThemeAssets_1_1) {
                ThemeAssets_1 = ThemeAssets_1_1;
            }
        ],
        execute: function () {
            ThemeEngine = (function () {
                function ThemeEngine() {
                }
                ThemeEngine.q = function (selector) {
                    return document.querySelector(selector);
                };
                ThemeEngine.todos = function (selector) {
                    var lista = document.querySelectorAll(selector);
                    var salida = [];
                    for (var i = 0; i < lista.length; i++) {
                        salida.push(lista[i]);
                    }
                    return salida;
                };
                ThemeEngine.normalizarEstilo = function (propiedad, valor) {
                    var claveCache = propiedad + "\u0000" + valor;
                    if (ThemeEngine.estilosNormalizados.hasOwnProperty(claveCache)) {
                        return ThemeEngine.estilosNormalizados[claveCache];
                    }
                    if (!ThemeEngine.sondaEstilos) {
                        ThemeEngine.sondaEstilos = document.createElement("div");
                    }
                    ThemeEngine.sondaEstilos.style.removeProperty(propiedad);
                    ThemeEngine.sondaEstilos.style.setProperty(propiedad, valor);
                    var normalizado = ThemeEngine.sondaEstilos.style.getPropertyValue(propiedad) || valor;
                    ThemeEngine.estilosNormalizados[claveCache] = normalizado;
                    return normalizado;
                };
                ThemeEngine.estilo = function (elemento, propiedades) {
                    if (!elemento)
                        return;
                    for (var clave in propiedades) {
                        if (propiedades.hasOwnProperty(clave)) {
                            var valorNormalizado = ThemeEngine.normalizarEstilo(clave, propiedades[clave]);
                            if (elemento.style.getPropertyValue(clave) !== valorNormalizado || elemento.style.getPropertyPriority(clave) !== "important") {
                                elemento.style.setProperty(clave, propiedades[clave], "important");
                            }
                        }
                    }
                };
                ThemeEngine.establecer = function (selector, propiedades) {
                    var nodos = ThemeEngine.todos(selector);
                    for (var i = 0; i < nodos.length; i++) {
                        ThemeEngine.estilo(nodos[i], propiedades);
                    }
                };
                ThemeEngine.raiz = function () {
                    var grilla = ThemeEngine.q("#ButtonGrid4Control");
                    if (!grilla || !grilla.parentElement || !grilla.parentElement.parentElement)
                        return null;
                    return grilla.parentElement.parentElement;
                };
                ThemeEngine.zona = function (patron) {
                    var raiz = ThemeEngine.raiz();
                    if (!raiz)
                        return null;
                    for (var i = 0; i < raiz.children.length; i++) {
                        var hijo = raiz.children[i];
                        if (patron.test(hijo.textContent || ""))
                            return hijo;
                    }
                    return null;
                };
                ThemeEngine.zonaBoleta = function () {
                    var encontrada = ThemeEngine.zona(/seleccionar una preferencia/i);
                    if (encontrada)
                        return encontrada;
                    var control = ThemeEngine.q("#CustomControl1");
                    var raiz = ThemeEngine.raiz();
                    if (!control || !raiz)
                        return null;
                    var actual = control;
                    while (actual && actual.parentElement !== raiz)
                        actual = actual.parentElement;
                    return actual;
                };
                ThemeEngine.marcarTituloBoleta = function (zonaBoleta) {
                    if (!zonaBoleta)
                        return;
                    var objetivo = null;
                    var posibles = zonaBoleta.querySelectorAll("*");
                    for (var i = 0; i < posibles.length; i++) {
                        var elemento = posibles[i];
                        var texto = (elemento.textContent || "").trim();
                        if (elemento.children.length === 0 && (texto === "Boleta" || texto === "Factura") && !elemento.closest("select")) {
                            objetivo = elemento;
                            break;
                        }
                    }
                    var previos = zonaBoleta.querySelectorAll(".sct-titulo");
                    for (var p = 0; p < previos.length; p++) {
                        var viejo = previos[p];
                        if (viejo !== objetivo)
                            viejo.classList.remove("sct-titulo");
                    }
                    if (objetivo && !objetivo.classList.contains("sct-titulo"))
                        objetivo.classList.add("sct-titulo");
                };
                ThemeEngine.decorarBoleto = function (botones) {
                    var defs = [
                        { n: 1, re: /empleado|planilla/i, titulo: "A Cuenta", sub: "Empleado Planilla" },
                        { n: 2, re: /tercero|honorario/i, titulo: "A cuenta de terceros", sub: "RECIBO POR HONORARIOS" }
                    ];
                    var usados = {};
                    var asignadas = [];
                    var i = 0;
                    var j = 0;
                    for (i = 0; i < botones.length; i++) {
                        asignadas[i] = null;
                        var texto = botones[i].textContent || "";
                        for (j = 0; j < defs.length; j++) {
                            if (!usados[defs[j].n] && defs[j].re.test(texto)) {
                                asignadas[i] = defs[j];
                                usados[defs[j].n] = true;
                                break;
                            }
                        }
                    }
                    for (i = 0; i < botones.length; i++) {
                        if (asignadas[i])
                            continue;
                        for (j = 0; j < defs.length; j++) {
                            if (!usados[defs[j].n]) {
                                asignadas[i] = defs[j];
                                usados[defs[j].n] = true;
                                break;
                            }
                        }
                    }
                    for (i = 0; i < botones.length; i++) {
                        var def = asignadas[i];
                        var clases = botones[i].classList;
                        if (!def) {
                            if (clases.contains("sct-bbtn"))
                                clases.remove("sct-bbtn", "sct-b1", "sct-b2");
                            continue;
                        }
                        var clase = "sct-b" + def.n;
                        if (!clases.contains(clase)) {
                            if (clases.contains("sct-b1"))
                                clases.remove("sct-b1");
                            if (clases.contains("sct-b2"))
                                clases.remove("sct-b2");
                            clases.add(clase);
                        }
                        if (!clases.contains("sct-bbtn"))
                            clases.add("sct-bbtn");
                        ThemeEngine.estilo(botones[i], { "background-color": "#1B1A19", "color": "#FFFFFF", "background-image": "none" });
                        ThemeEngine.icono(botones[i], "sct-ic-b" + def.n);
                        var etiqueta = botones[i].querySelector("div");
                        if (etiqueta) {
                            var marca = etiqueta.querySelector(".sct-b-t");
                            if (!marca || (marca.textContent || "") !== def.titulo) {
                                var destino = etiqueta.querySelector(".h4") || etiqueta;
                                destino.innerHTML = "<span class=\"sct-b-t\">" + def.titulo + "</span><span class=\"sct-b-s\">" + def.sub + "</span>";
                            }
                        }
                    }
                };
                ThemeEngine.icono = function (boton, clase) {
                    var actual = null;
                    for (var i = 0; i < boton.children.length; i++) {
                        var hijo = boton.children[i];
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
                };
                ThemeEngine.ancestroTarjeta = function (desde) {
                    var actual = desde;
                    while (actual && !(actual.classList && actual.classList.contains("primaryPanelBackgroundColor"))) {
                        actual = actual.parentElement;
                    }
                    return actual;
                };
                ThemeEngine.esCompacto = function () {
                    return window.innerWidth <= 1366;
                };
                ThemeEngine.marcarAmbito = function () {
                    var enTransaccion = !!ThemeEngine.q("#ButtonGrid4Control") && !!ThemeEngine.q(".transactionLinesPane");
                    if (enTransaccion) {
                        if (ThemeEngine.temporizadorSalidaAmbito) {
                            window.clearTimeout(ThemeEngine.temporizadorSalidaAmbito);
                            ThemeEngine.temporizadorSalidaAmbito = 0;
                        }
                        if (!document.body.classList.contains(ThemeAssets_1.CLASE_AMBITO)) {
                            document.body.classList.add(ThemeAssets_1.CLASE_AMBITO);
                        }
                        var zonaBoleta = ThemeEngine.zonaBoleta();
                        if (zonaBoleta)
                            zonaBoleta.classList.add("sct-boleta");
                    }
                    else if (document.body.classList.contains(ThemeAssets_1.CLASE_AMBITO) && !ThemeEngine.temporizadorSalidaAmbito) {
                        ThemeEngine.temporizadorSalidaAmbito = window.setTimeout(function () {
                            ThemeEngine.temporizadorSalidaAmbito = 0;
                            var sigueEnTransaccion = !!ThemeEngine.q("#ButtonGrid4Control") && !!ThemeEngine.q(".transactionLinesPane");
                            if (!sigueEnTransaccion) {
                                document.body.classList.remove(ThemeAssets_1.CLASE_AMBITO);
                            }
                        }, 160);
                    }
                    return enTransaccion;
                };
                ThemeEngine.aplicarZonas = function () {
                    var grilla = ThemeEngine.q("#ButtonGrid4Control");
                    var raiz = ThemeEngine.raiz();
                    if (!grilla || !raiz)
                        return;
                    var montos = ThemeEngine.q(".fields.row");
                    var fantasma = montos;
                    while (fantasma) {
                        fantasma = fantasma.parentElement;
                        if (fantasma && fantasma.classList && fantasma.classList.contains("primaryPanelBackgroundColor")) {
                            fantasma.classList.add("sct-ghost");
                            break;
                        }
                    }
                    var deposito = ThemeEngine.zona(/DEPÓSITO/);
                    if (deposito)
                        deposito.classList.add("sct-ghost");
                };
                ThemeEngine.aplicarPestanas = function () {
                    var rotulos = ["NUMPAD", "CLIENTE", "TRANSAC.", "BOLETEO"];
                    var pestanas = ThemeEngine.todos(".commerceTabControl.righttabs .tabsContainer .tab");
                    for (var i = 0; i < pestanas.length && i < rotulos.length; i++) {
                        pestanas[i].classList.add("sct-tab" + i);
                        var texto = pestanas[i].querySelector(".text");
                        if (texto && (texto.textContent || "").trim() !== rotulos[i])
                            texto.textContent = rotulos[i];
                        var icono = pestanas[i].querySelector(".icon");
                        if (icono && icono.style.getPropertyValue("background-image"))
                            icono.style.removeProperty("background-image");
                    }
                };
                ThemeEngine.aplicarMontos = function () {
                    var montos = ThemeEngine.q(".fields.row");
                    if (!montos)
                        return;
                    var derecha = montos.querySelector(".right");
                    if (!derecha)
                        return;
                    var etiqueta = null;
                    var nodos = derecha.querySelectorAll("*");
                    for (var i = 0; i < nodos.length; i++) {
                        var nodo = nodos[i];
                        if (nodo.children.length === 0 && (nodo.textContent || "").trim() === "Monto total") {
                            etiqueta = nodo;
                            break;
                        }
                    }
                    if (!etiqueta)
                        return;
                    var fila = etiqueta;
                    while (fila && fila.parentElement !== derecha)
                        fila = fila.parentElement;
                    if (!fila)
                        return;
                    fila.classList.add("sct-mt");
                    var valores = fila.querySelectorAll("*");
                    for (var j = 0; j < valores.length; j++) {
                        var valor = valores[j];
                        if (valor.children.length === 0 && (valor.textContent || "").indexOf("/") >= 0) {
                            valor.classList.add("sct-mt-v");
                            break;
                        }
                    }
                };
                ThemeEngine.aplicarCliente = function () {
                    var zonaCliente = ThemeEngine.q("#CustomerPanel");
                    if (!zonaCliente)
                        zonaCliente = ThemeEngine.zona(/Agregue un cliente|CLIENTE DESCRIPTIVO/i);
                    if (!zonaCliente)
                        return;
                    var detalle = zonaCliente.querySelector(".customerDetailsCardStyle");
                    var conCliente = !!detalle && detalle.getBoundingClientRect().height > 0;
                    var tarjetaVieja = ThemeEngine.q(".sct-cli-card");
                    var domVieja = ThemeEngine.q(".sct-dom-card");
                    if (conCliente && detalle) {
                        var vaciaVieja = ThemeEngine.q(".sct-cli-empty");
                        if (vaciaVieja)
                            vaciaVieja.classList.remove("sct-cli-empty");
                        ThemeEngine.soltarAlturaVacio();
                        var tarjeta = detalle.querySelector(".primaryPanelBackgroundColor.highContrastBorderThin");
                        if (!tarjeta)
                            tarjeta = detalle;
                        if (tarjetaVieja && tarjetaVieja !== tarjeta)
                            tarjetaVieja.classList.remove("sct-cli-card");
                        if (!tarjeta.classList.contains("sct-cli-card"))
                            tarjeta.classList.add("sct-cli-card");
                        var nombre = null;
                        var hijos = tarjeta.querySelectorAll("*");
                        for (var j = 0; j < hijos.length; j++) {
                            var hijo = hijos[j];
                            var textoHijo = (hijo.textContent || "").trim();
                            if (hijo.children.length === 0 && textoHijo.length > 14 && !/\d{4,}/.test(textoHijo)) {
                                nombre = hijo;
                                break;
                            }
                        }
                        ThemeEngine.estilo(nombre, { "white-space": "normal", "font-size": "13px", "line-height": "1.25" });
                        var direccion = zonaCliente.querySelector(".customerPanelPrimaryAddress");
                        if (domVieja && domVieja !== direccion)
                            domVieja.classList.remove("sct-dom-card");
                        if (direccion) {
                            if (!direccion.classList.contains("sct-dom-card"))
                                direccion.classList.add("sct-dom-card");
                            var internos = direccion.querySelectorAll("*");
                            for (var m = 0; m < internos.length; m++) {
                                var interno = internos[m];
                                ThemeEngine.estilo(interno, { "background": "transparent", "border": "none", "white-space": "normal" });
                            }
                            var cabecera = direccion.querySelector(".headerBackground .h4");
                            if (cabecera && !cabecera.classList.contains("sct-dom-h"))
                                cabecera.classList.add("sct-dom-h");
                        }
                        return;
                    }
                    var listaCandidatos = zonaCliente.querySelectorAll("div,span,label,h1,h2,h3,h4");
                    var vacio = null;
                    for (var v = 0; v < listaCandidatos.length; v++) {
                        var candidatoVacio = listaCandidatos[v];
                        if (candidatoVacio.children.length === 0 && (candidatoVacio.textContent || "").trim() === "Agregue un cliente a esta transacción" && candidatoVacio.getBoundingClientRect().width > 0) {
                            vacio = candidatoVacio;
                            break;
                        }
                    }
                    if (!vacio)
                        return;
                    var tarjetaVacia = ThemeEngine.ancestroTarjeta(vacio);
                    if (!tarjetaVacia)
                        return;
                    if (tarjetaVieja)
                        tarjetaVieja.classList.remove("sct-cli-card");
                    if (domVieja)
                        domVieja.classList.remove("sct-dom-card");
                    if (!tarjetaVacia.classList.contains("sct-cli-empty"))
                        tarjetaVacia.classList.add("sct-cli-empty");
                    var raiz = ThemeEngine.raiz();
                    var subir = tarjetaVacia;
                    while (subir && subir.parentElement && subir.parentElement !== raiz) {
                        if (!subir.classList.contains("sct-alto-vacio"))
                            subir.classList.add("sct-alto-vacio");
                        ThemeEngine.estilo(subir, { "height": "100%" });
                        subir = subir.parentElement;
                    }
                    ThemeEngine.estilo(tarjetaVacia, { "height": "100%" });
                };
                ThemeEngine.soltarAlturaVacio = function () {
                    var marcados = ThemeEngine.todos(".sct-alto-vacio");
                    for (var i = 0; i < marcados.length; i++) {
                        marcados[i].style.removeProperty("height");
                        marcados[i].classList.remove("sct-alto-vacio");
                    }
                };
                ThemeEngine.limpiarTooltips = function () {
                    var tooltips = ThemeEngine.todos(".ui-tooltip");
                    for (var i = 0; i < tooltips.length; i++) {
                        if (tooltips[i].parentElement)
                            tooltips[i].parentElement.removeChild(tooltips[i]);
                    }
                };
                ThemeEngine.solicitarRecalculoPestanas = function () {
                    var cantidad = document.querySelectorAll("#TabControl .tabsContainer .tab").length;
                    if (cantidad >= 4 || ThemeEngine.recalculoPestanasSolicitado)
                        return;
                    ThemeEngine.recalculoPestanasSolicitado = true;
                    window.requestAnimationFrame(function () {
                        var tabControl = ThemeEngine.q("#TabControl");
                        var rightTabs = ThemeEngine.q("#TabControl .commerceTabControl.righttabs");
                        var elementos = [tabControl, rightTabs];
                        for (var i = 0; i < elementos.length; i++) {
                            var control = elementos[i] && elementos[i].winControl;
                            try {
                                if (control && typeof control.forceLayout === "function")
                                    control.forceLayout();
                                if (control && typeof control.updateLayout === "function")
                                    control.updateLayout();
                            }
                            catch (error) { }
                        }
                        window.dispatchEvent(new Event("resize"));
                    });
                };
                ThemeEngine.prepararBotones = function () {
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
                                var ch = pb.children[j];
                                if (ch.tagName === "DIV")
                                    ch.style.setProperty("display", "none", "important");
                            }
                        }
                    }
                };
                ThemeEngine.aplicarLayoutCompacto = function () {
                    var propLineas = { "left": "-12px", "right": "auto", "width": "626px", "height": "400px", "box-sizing": "border-box" };
                    ThemeEngine.establecer("#TransactionGrid", propLineas);
                    var botonesC = ThemeEngine.todos("#ButtonGrid1Control .buttonGridButton");
                    for (var i = 0; i < botonesC.length; i++) {
                        botonesC[i].classList.add("sct-cbtn");
                        botonesC[i].classList.add(i === 0 ? "sct-cbtn-primary" : "sct-cbtn-dark");
                        ThemeEngine.estilo(botonesC[i], { "color": "#FFFFFF", "background-image": "none", "background-color": i === 0 ? "#C8102E" : "#1B1A19" });
                        ThemeEngine.icono(botonesC[i], "sct-ic-c" + (i + 1));
                    }
                    var botonesT = ThemeEngine.todos("#ButtonGrid2Control .buttonGridButton");
                    for (var j = 0; j < botonesT.length; j++) {
                        botonesT[j].classList.add("sct-tbtn", "sct-t" + (j + 1));
                        ThemeEngine.estilo(botonesT[j], { "color": "#FFFFFF", "background-image": "none", "background-color": j === 4 ? "#C8102E" : "#1B1A19" });
                        ThemeEngine.icono(botonesT[j], "sct-ic-t" + (j + 1));
                    }
                    ThemeEngine.decorarBoleto(ThemeEngine.todos("#ButtonGrid3Control .buttonGridButton"));
                    ThemeEngine.marcarTituloBoleta(ThemeEngine.zonaBoleta());
                    var raiz = ThemeEngine.raiz();
                    if (raiz) {
                        var zCliente = null, zMontos = null;
                        var montosF = ThemeEngine.q("#TotalsPanel .fields.row");
                        for (var c = 0; c < raiz.children.length; c++) {
                            var hijo = raiz.children[c];
                            if (montosF && hijo.contains(montosF))
                                zMontos = hijo;
                            if (hijo.querySelector(".sct-cli-card, .sct-dom-card") || /Agregue un cliente|CLIENTE DESCRIPTIVO/i.test(hijo.textContent || ""))
                                zCliente = hijo;
                        }
                        if (zCliente)
                            zCliente.classList.add("sct-live-zona-cliente");
                        if (zMontos)
                            zMontos.classList.add("sct-live-zona-montos");
                        var dom = ThemeEngine.q(".sct-dom-card");
                        if (dom) {
                            var hojas = [];
                            var n = dom.querySelectorAll("*");
                            for (var v = 0; v < n.length; v++) {
                                var el = n[v];
                                var t = (el.textContent || "").trim();
                                if (el.children.length === 0 && t.length > 0 && t !== "DOMICILIO")
                                    hojas.push(el);
                            }
                            hojas.sort(function (a, b) { return (b.textContent || "").trim().length - (a.textContent || "").trim().length; });
                            if (hojas[0])
                                hojas[0].classList.add("sct-live-direccion");
                        }
                    }
                    ThemeEngine.solicitarRecalculoPestanas();
                };
                ThemeEngine.aplicarLayoutAmplio = function () {
                    ThemeEngine.estilo(ThemeEngine.zona(/Escribir/), { "height": "490px" });
                    var grilla = ThemeEngine.q("#ButtonGrid4Control");
                    var raiz = ThemeEngine.raiz();
                    if (!grilla || !raiz)
                        return;
                    var zonaPagos = null;
                    var zonaCliente = null;
                    var zonaMontos = null;
                    var montos = ThemeEngine.q(".fields.row");
                    for (var i = 0; i < raiz.children.length; i++) {
                        var hijo = raiz.children[i];
                        if (hijo.contains(grilla))
                            zonaPagos = hijo;
                        if (montos && hijo.contains(montos))
                            zonaMontos = hijo;
                        if (/Agregue un cliente|CLIENTE DESCRIPTIVO/i.test(hijo.textContent || ""))
                            zonaCliente = hijo;
                    }
                    if (zonaPagos)
                        zonaPagos.classList.add("sct-live-zona-pagos");
                    if (zonaMontos)
                        zonaMontos.classList.add("sct-live-zona-montos");
                    if (zonaCliente)
                        zonaCliente.classList.add("sct-cliente", "sct-live-zona-cliente");
                    var zonaBoleta = ThemeEngine.zonaBoleta();
                    if (zonaBoleta)
                        zonaBoleta.classList.add("sct-live-zona-boleta");
                    ThemeEngine.marcarTituloBoleta(zonaBoleta);
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
                };
                ThemeEngine.aplicarTodo = function () {
                    if (!ThemeAssets_1.TEMA_ACTIVO)
                        return;
                    if (!ThemeEngine.marcarAmbito())
                        return;
                    var esCompacto = ThemeEngine.esCompacto();
                    if (esCompacto) {
                        document.body.classList.add(ThemeAssets_1.CLASE_COMPACTO);
                        document.body.classList.remove(ThemeAssets_1.CLASE_AMPLIO);
                    }
                    else {
                        document.body.classList.add(ThemeAssets_1.CLASE_AMPLIO);
                        document.body.classList.remove(ThemeAssets_1.CLASE_COMPACTO);
                    }
                    ThemeEngine.prepararBotones();
                    var pasosComunes = [
                        ThemeEngine.aplicarZonas, ThemeEngine.aplicarPestanas, ThemeEngine.aplicarMontos,
                        ThemeEngine.aplicarCliente, ThemeEngine.limpiarTooltips
                    ];
                    for (var i = 0; i < pasosComunes.length; i++) {
                        try {
                            pasosComunes[i]();
                        }
                        catch (e) { }
                    }
                    try {
                        if (esCompacto) {
                            ThemeEngine.aplicarLayoutCompacto();
                        }
                        else {
                            ThemeEngine.aplicarLayoutAmplio();
                            var dom = ThemeEngine.q(".sct-dom-card");
                            var pie = ThemeEngine.q(".panel-footer");
                            if (dom && pie) {
                                var a = Math.round(pie.getBoundingClientRect().bottom - dom.getBoundingClientRect().top);
                                if (a > 40)
                                    ThemeEngine.estilo(dom, { "height": a + "px", "min-height": "0", "box-sizing": "border-box" });
                            }
                        }
                    }
                    catch (e) { }
                };
                ThemeEngine.observarCambios = function () {
                    if (ThemeEngine.observadorDom) {
                        ThemeEngine.observadorDom.observe(document.body, { childList: true, subtree: true });
                    }
                    if (ThemeEngine.observadorEstilos) {
                        for (var i = 0; i < ThemeEngine.SELECTORES_OBSERVADOS.length; i++) {
                            var nodos = ThemeEngine.todos(ThemeEngine.SELECTORES_OBSERVADOS[i]);
                            for (var j = 0; j < nodos.length; j++) {
                                ThemeEngine.observadorEstilos.observe(nodos[j], { attributes: true, attributeFilter: ["style"] });
                            }
                        }
                    }
                };
                ThemeEngine.pasada = function () {
                    if (ThemeEngine.ocupado)
                        return;
                    ThemeEngine.ocupado = true;
                    if (ThemeEngine.observadorDom)
                        ThemeEngine.observadorDom.disconnect();
                    if (ThemeEngine.observadorEstilos)
                        ThemeEngine.observadorEstilos.disconnect();
                    try {
                        ThemeEngine.aplicarTodo();
                    }
                    finally {
                        ThemeEngine.ocupado = false;
                        ThemeEngine.observarCambios();
                    }
                };
                ThemeEngine.programarRepasoFinal = function (demora) {
                    window.clearTimeout(ThemeEngine.temporizador);
                    ThemeEngine.temporizador = window.setTimeout(function () { ThemeEngine.pasada(); }, demora);
                };
                ThemeEngine.alInteractuar = function () {
                    window.setTimeout(function () { ThemeEngine.pasada(); }, 0);
                    ThemeEngine.programarRepasoFinal(60);
                };
                ThemeEngine.iniciar = function () {
                    if (!ThemeAssets_1.TEMA_ACTIVO)
                        return;
                    var estilo = document.getElementById(ThemeEngine.ID_ESTILO);
                    if (!estilo) {
                        estilo = document.createElement("style");
                        estilo.id = ThemeEngine.ID_ESTILO;
                        document.head.appendChild(estilo);
                    }
                    estilo.textContent = ThemeAssets_1.construirCss();
                    if (ThemeEngine.observadorDom)
                        ThemeEngine.observadorDom.disconnect();
                    if (ThemeEngine.observadorEstilos)
                        ThemeEngine.observadorEstilos.disconnect();
                    ThemeEngine.observadorDom = new MutationObserver(function (mutaciones) {
                        var forzar = false;
                        for (var i = 0; i < mutaciones.length; i++) {
                            var mutacion = mutaciones[i];
                            if (mutacion.type === "childList") {
                                for (var j = 0; j < mutacion.addedNodes.length; j++) {
                                    var nodo = mutacion.addedNodes[j];
                                    if (nodo.nodeType === 1) {
                                        if (nodo.classList && (nodo.classList.contains("buttonGridButton") || nodo.classList.contains("fields") || nodo.id === "ButtonGrid4Control")) {
                                            forzar = true;
                                            break;
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
                    ThemeEngine.observadorEstilos = new MutationObserver(function () {
                        ThemeEngine.pasada();
                        ThemeEngine.programarRepasoFinal(60);
                    });
                    ThemeEngine.observarCambios();
                    var eventos = ["focusin", "click", "keyup", "mouseup", "pointerup"];
                    if (!ThemeEngine.eventosRegistrados) {
                        for (var i = 0; i < eventos.length; i++) {
                            document.addEventListener(eventos[i], ThemeEngine.alInteractuar, true);
                        }
                        window.addEventListener("resize", function () {
                            ThemeEngine.pasada();
                            ThemeEngine.programarRepasoFinal(60);
                        });
                        ThemeEngine.eventosRegistrados = true;
                    }
                    ThemeEngine.pasada();
                };
                ThemeEngine.ID_ESTILO = "sct-theme";
                ThemeEngine.observadorDom = null;
                ThemeEngine.observadorEstilos = null;
                ThemeEngine.ocupado = false;
                ThemeEngine.temporizador = 0;
                ThemeEngine.temporizadorSalidaAmbito = 0;
                ThemeEngine.eventosRegistrados = false;
                ThemeEngine.sondaEstilos = null;
                ThemeEngine.estilosNormalizados = {};
                ThemeEngine.recalculoPestanasSolicitado = false;
                ThemeEngine.SELECTORES_OBSERVADOS = [
                    "#TransactionGrid", "#TotalsPanel", "#TotalsPanel .fields.row", "#TotalsPanel .panel-footer",
                    ".sct-live-zona-cliente", ".sct-live-zona-montos", ".sct-live-direccion",
                    "#TabControl", "#TabControl .commerceTabControl.righttabs", "#TabControl .tabContent",
                    "#CustomControl1", "#ButtonGrid1Control", "#ButtonGrid1Control .buttonsContainer",
                    "#ButtonGrid2Control", "#ButtonGrid2Control .buttonsContainer",
                    "#ButtonGrid3Control", "#ButtonGrid3Control .buttonsContainer",
                    "#ButtonGrid4", "#ButtonGrid4Control", "#ButtonGrid4Control .buttonsContainer"
                ];
                return ThemeEngine;
            }());
            exports_1("ThemeEngine", ThemeEngine);
        }
    };
});
