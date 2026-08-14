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
                    return window.innerWidth <= 1200;
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
                        var zonaBoleta = ThemeEngine.zona(/Seleccionar una preferencia/);
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
                    var rotulos = ["NUMPAD", "CLIENTE", "TRANSAC.", "BOLETO"];
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
                    var zonaCliente = ThemeEngine.zona(/Agregue un cliente|CLIENTE DESCRIPTIVO/i);
                    if (!zonaCliente)
                        return;
                    var listaCandidatos = zonaCliente.querySelectorAll("div,span,label,h1,h2,h3,h4");
                    var conCodigo = null;
                    for (var i = 0; i < listaCandidatos.length; i++) {
                        var candidato = listaCandidatos[i];
                        if (candidato.children.length === 0 && /[A-Z]{2,4}-\d{4,}/.test((candidato.textContent || "").trim()) && candidato.getBoundingClientRect().width > 0) {
                            conCodigo = candidato;
                        }
                    }
                    if (conCodigo) {
                        var tarjeta = ThemeEngine.ancestroTarjeta(conCodigo);
                        if (tarjeta && tarjeta.parentElement && tarjeta.parentElement.parentElement) {
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
                            var pila = tarjeta.parentElement.parentElement;
                            for (var k = 0; k < pila.children.length; k++) {
                                var seccion = pila.children[k];
                                if (/^DOMICILIO/.test((seccion.textContent || "").trim())) {
                                    seccion.classList.add("sct-dom-card");
                                    var internos = seccion.querySelectorAll("*");
                                    for (var m = 0; m < internos.length; m++) {
                                        var interno = internos[m];
                                        ThemeEngine.estilo(interno, { "background": "transparent", "border": "none", "white-space": "normal" });
                                        if (interno.children.length === 0 && (interno.textContent || "").trim() === "DOMICILIO")
                                            interno.classList.add("sct-dom-h");
                                    }
                                    break;
                                }
                            }
                        }
                        return;
                    }
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
                    tarjetaVacia.classList.add("sct-cli-empty");
                    var raiz = ThemeEngine.raiz();
                    var subir = tarjetaVacia;
                    while (subir && subir.parentElement && subir.parentElement !== raiz) {
                        ThemeEngine.estilo(subir, { "height": "100%" });
                        subir = subir.parentElement;
                    }
                    ThemeEngine.estilo(tarjetaVacia, { "height": "100%" });
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
                    var panelLineas = ThemeEngine.q("#TransactionGrid");
                    if (panelLineas && ThemeEngine.altoOriginalLineas === null) {
                        ThemeEngine.altoOriginalLineas = Math.round(panelLineas.getBoundingClientRect().height);
                    }
                    var propLineas = { "left": "0px", "right": "auto", "width": "600px", "box-sizing": "border-box" };
                    if (ThemeEngine.altoOriginalLineas && ThemeEngine.altoOriginalLineas > 120)
                        propLineas["height"] = (ThemeEngine.altoOriginalLineas - 8) + "px";
                    ThemeEngine.establecer("#TransactionGrid", propLineas);
                    ThemeEngine.establecer("#TotalsPanel", { "right": "auto", "width": "312px", "height": "228px", "min-height": "0px", "max-height": "228px", "transform": "translateY(-20px)", "box-sizing": "border-box", "overflow": "hidden" });
                    ThemeEngine.establecer("#TotalsPanel .fields.row", { "width": "100%", "height": "188px", "min-height": "188px", "max-height": "188px" });
                    ThemeEngine.establecer("#TotalsPanel .panel-footer", { "width": "100%", "height": "40px", "min-height": "40px", "max-height": "40px" });
                    ThemeEngine.establecer("#TabControl", { "right": "auto" });
                    ThemeEngine.establecer("#CustomControl1", { "position": "absolute", "left": "630px", "top": "554px", "right": "auto", "width": "340px", "height": "94px", "min-height": "0px", "max-height": "94px", "transform": "none", "padding": "6px 10px 7px", "overflow": "hidden" });
                    ThemeEngine.establecer("#ButtonGrid4, #ButtonGrid4Control, #ButtonGrid4Control .buttonsContainer", { "position": "absolute", "left": "630px", "top": "644px", "right": "auto", "width": "340px", "height": "127px", "min-height": "0px", "max-height": "127px", "transform": "none" });
                    ThemeEngine.establecer("#ButtonGrid1Control, #ButtonGrid1Control .buttonsContainer", { "width": "316px", "height": "238px" });
                    var botonesC = ThemeEngine.todos("#ButtonGrid1Control .buttonGridButton");
                    for (var i = 0; i < botonesC.length; i++) {
                        botonesC[i].classList.add("sct-cbtn");
                        botonesC[i].classList.add(i === 0 ? "sct-cbtn-primary" : "sct-cbtn-dark");
                        ThemeEngine.estilo(botonesC[i], { "position": "absolute", "left": "0px", "top": (i * 82) + "px", "width": "316px", "height": "74px", "min-height": "0", "max-height": "74px", "color": "#FFFFFF", "background-image": "none", "background-color": i === 0 ? "#C8102E" : "#1B1A19", "transform": "none" });
                        ThemeEngine.icono(botonesC[i], "sct-ic-c" + (i + 1));
                    }
                    ThemeEngine.establecer("#ButtonGrid2Control, #ButtonGrid2Control .buttonsContainer", { "width": "316px", "height": "254px" });
                    var columnasT = [0, 108, 216];
                    var filasT = [0, 132];
                    var botonesT = ThemeEngine.todos("#ButtonGrid2Control .buttonGridButton");
                    for (var j = 0; j < botonesT.length; j++) {
                        botonesT[j].classList.add("sct-tbtn", "sct-t" + (j + 1));
                        ThemeEngine.estilo(botonesT[j], { "position": "absolute", "left": columnasT[j % 3] + "px", "top": (filasT[Math.floor(j / 3)] || 0) + "px", "width": "100px", "height": "122px", "min-height": "0", "max-height": "122px", "color": "#FFFFFF", "background-image": "none", "background-color": j === 4 ? "#C8102E" : "#1B1A19", "transform": "none" });
                        ThemeEngine.icono(botonesT[j], "sct-ic-t" + (j + 1));
                    }
                    ThemeEngine.establecer("#ButtonGrid3Control, #ButtonGrid3Control .buttonsContainer", { "width": "316px", "height": "236px" });
                    var botonesB = ThemeEngine.todos("#ButtonGrid3Control .buttonGridButton");
                    var titulos = ["A Cuenta", "A cuenta de terceros"];
                    var subtitulos = ["Empleado Planilla", "RECIBO POR HONORARIOS"];
                    for (var k = 0; k < botonesB.length; k++) {
                        botonesB[k].classList.add("sct-bbtn", "sct-b" + (k + 1));
                        ThemeEngine.estilo(botonesB[k], { "position": "absolute", "left": "0px", "top": (k * 124) + "px", "width": "316px", "height": "112px", "min-height": "0", "max-height": "112px", "background-color": "#1B1A19", "color": "#FFFFFF", "background-image": "none", "transform": "none" });
                        ThemeEngine.icono(botonesB[k], "sct-ic-b" + (k + 1));
                        var etiqueta = botonesB[k].querySelector("div");
                        if (etiqueta && !etiqueta.querySelector(".sct-b-t") && k < titulos.length) {
                            var destino = etiqueta.querySelector(".h4") || etiqueta;
                            destino.innerHTML = "<span class=\"sct-b-t\">" + titulos[k] + "</span><span class=\"sct-b-s\">" + subtitulos[k] + "</span>";
                        }
                    }
                    var botonesP = [[".sct-p0", 0], [".sct-p1", 86], [".sct-p3", 172], [".sct-p4", 258]];
                    for (var m = 0; m < botonesP.length; m++) {
                        ThemeEngine.establecer("#ButtonGrid4Control " + botonesP[m][0], { "position": "absolute", "left": botonesP[m][1] + "px", "top": "0px", "width": "82px", "height": "64px", "min-height": "0", "max-height": "64px", "transform": "none" });
                    }
                    ThemeEngine.establecer("#ButtonGrid4Control .sct-p2", { "position": "absolute", "left": "0px", "top": "75px", "width": "340px", "height": "52px", "min-height": "0", "max-height": "52px", "transform": "none" });
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
                        ThemeEngine.estilo(zCliente, { "height": "228px", "min-height": "0", "max-height": "228px", "margin-top": "0px", "transform": "translateY(-20px)", "overflow": "hidden", "box-sizing": "border-box" });
                        if (zCliente)
                            zCliente.classList.add("sct-live-zona-cliente");
                        ThemeEngine.estilo(zMontos, { "height": "228px", "min-height": "0", "max-height": "228px", "margin-top": "0px", "overflow": "hidden", "box-sizing": "border-box" });
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
                    ThemeEngine.estilo(zonaPagos, { "transform": "translateY(114px)", "height": "146px", "width": "452px" });
                    ThemeEngine.estilo(zonaMontos, { "transform": "translateY(-20px)", "height": "276px" });
                    if (zonaCliente) {
                        zonaCliente.classList.add("sct-cliente");
                        ThemeEngine.estilo(zonaCliente, { "transform": "translateY(-16px)", "height": "276px" });
                    }
                    var zonaBoleta = ThemeEngine.zona(/Seleccionar una preferencia/);
                    if (zonaBoleta) {
                        ThemeEngine.estilo(zonaBoleta, { "transform": "translateY(108px)", "height": "116px", "max-height": "116px", "min-height": "0", "width": "452px", "padding": "10px 14px 12px 14px", "border": "1px solid rgba(255,255,255,0.12)", "border-radius": "14px", "background": "rgba(22,21,20,0.6)", "box-sizing": "border-box", "overflow": "hidden" });
                        var titulo = null;
                        var posibles = zonaBoleta.querySelectorAll("*");
                        for (var j = 0; j < posibles.length; j++) {
                            var elemento = posibles[j];
                            var texto = (elemento.textContent || "").trim();
                            if (elemento.children.length === 0 && (texto === "Boleta" || texto === "Factura") && !elemento.closest("select")) {
                                titulo = elemento;
                                break;
                            }
                        }
                        ThemeEngine.estilo(titulo, { "font-size": "17px", "font-weight": "600", "color": "#FFFFFF" });
                    }
                    ThemeEngine.estilo(grilla, { "width": "452px", "height": "146px", "padding": "0", "background": "rgba(22,21,20,0.6)" });
                    ThemeEngine.estilo(grilla.querySelector(".buttonsContainer"), { "width": "452px", "height": "146px" });
                    var b1 = ThemeEngine.q("#ButtonGrid1Control");
                    if (b1) {
                        ThemeEngine.estilo(b1, { "width": "428px", "height": "300px" });
                        ThemeEngine.estilo(b1.querySelector(".buttonsContainer"), { "position": "relative", "width": "428px", "height": "300px" });
                        var btn1 = ThemeEngine.todos("#ButtonGrid1Control .buttonGridButton");
                        for (var i = 0; i < btn1.length; i++) {
                            btn1[i].classList.add("sct-cbtn", i === 0 ? "sct-cbtn-primary" : "sct-cbtn-dark");
                            ThemeEngine.estilo(btn1[i], { "position": "absolute", "left": "0px", "top": (i * 104) + "px", "width": "428px", "min-height": "0", "height": "92px", "max-height": "92px", "color": "#FFFFFF", "background-image": "none", "background-color": i === 0 ? "#C8102E" : "#1B1A19" });
                            ThemeEngine.icono(btn1[i], "sct-ic-c" + (i + 1));
                        }
                    }
                    var b2 = ThemeEngine.q("#ButtonGrid2Control");
                    if (b2) {
                        ThemeEngine.estilo(b2, { "width": "428px", "height": "350px" });
                        ThemeEngine.estilo(b2.querySelector(".buttonsContainer"), { "position": "relative", "width": "428px", "height": "350px" });
                        var cols2 = [0, 146, 292], fils2 = [0, 180];
                        var btn2 = ThemeEngine.todos("#ButtonGrid2Control .buttonGridButton");
                        for (var i = 0; i < btn2.length; i++) {
                            btn2[i].classList.add("sct-tbtn", "sct-t" + (i + 1));
                            btn2[i].classList.remove("sct-tbtn-dark", "sct-tbtn-outline", "sct-tbtn-fill");
                            btn2[i].classList.add(i === 4 ? "sct-tbtn-fill" : (i === 3 ? "sct-tbtn-outline" : "sct-tbtn-dark"));
                            ThemeEngine.estilo(btn2[i], { "position": "absolute", "left": cols2[i % 3] + "px", "top": fils2[Math.floor(i / 3)] + "px", "width": "136px", "min-height": "0", "height": "170px", "max-height": "170px", "color": "#FFFFFF", "background-image": "none", "background-color": i === 4 ? "#C8102E" : "#1B1A19" });
                            ThemeEngine.icono(btn2[i], "sct-ic-t" + (i + 1));
                        }
                    }
                    var b3 = ThemeEngine.q("#ButtonGrid3Control");
                    if (b3) {
                        ThemeEngine.estilo(b3, { "width": "428px", "height": "316px" });
                        ThemeEngine.estilo(b3.querySelector(".buttonsContainer"), { "position": "relative", "width": "428px", "height": "316px" });
                        var titulos3 = ["A Cuenta", "A cuenta de terceros"];
                        var subs3 = ["Empleado Planilla", "RECIBO POR HONORARIOS"];
                        var btn3 = ThemeEngine.todos("#ButtonGrid3Control .buttonGridButton");
                        for (var i = 0; i < btn3.length; i++) {
                            btn3[i].classList.add("sct-bbtn", "sct-b" + (i + 1));
                            ThemeEngine.estilo(btn3[i], { "position": "absolute", "left": "0px", "top": (i * 166) + "px", "width": "428px", "min-height": "0", "height": "150px", "max-height": "150px", "background-color": "#1B1A19", "color": "#FFFFFF", "background-image": "none" });
                            ThemeEngine.icono(btn3[i], "sct-ic-b" + (i + 1));
                            var et = btn3[i].querySelector("div");
                            if (et && !et.querySelector(".sct-b-t") && i < titulos3.length) {
                                var dst = et.querySelector(".h4") || et;
                                dst.innerHTML = "<span class=\"sct-b-t\">" + titulos3[i] + "</span><span class=\"sct-b-s\">" + subs3[i] + "</span>";
                            }
                        }
                    }
                    var cols4 = [0, 114, 228, 342, 0];
                    var fils4 = [0, 0, 0, 0, 84];
                    var anchos4 = [110, 110, 110, 110, 452];
                    var altos4 = [78, 78, 78, 78, 62];
                    var keysIds = ["p0", "p1", "p3", "p4", "p2"];
                    for (var i = 0; i < keysIds.length; i++) {
                        var pb = ThemeEngine.q("#ButtonGrid4Control .sct-" + keysIds[i]);
                        if (pb) {
                            ThemeEngine.estilo(pb, { "left": cols4[i] + "px", "top": fils4[i] + "px", "width": anchos4[i] + "px", "min-height": "0", "height": altos4[i] + "px", "max-height": altos4[i] + "px", "background-image": "none", "background-color": "rgba(22,21,20,0.6)", "border": "1px solid rgba(255,255,255,0.16)", "border-radius": "12px", "color": "#FFFFFF" });
                        }
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
                ThemeEngine.altoOriginalLineas = null;
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
