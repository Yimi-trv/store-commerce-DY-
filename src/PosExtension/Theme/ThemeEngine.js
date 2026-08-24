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
                        if (nodo.children.length === 0 && /(monto|importe)\s+total/i.test((nodo.textContent || "").trim())) {
                            etiqueta = nodo;
                            break;
                        }
                    }
                    var fila = null;
                    if (etiqueta) {
                        fila = etiqueta;
                        while (fila && fila.parentElement !== derecha)
                            fila = fila.parentElement;
                    }
                    if (!fila && derecha.children.length > 0) {
                        fila = derecha.children[derecha.children.length - 1];
                    }
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
                ThemeEngine.nodoVivo = function (raiz, selector) {
                    var lista = raiz.querySelectorAll(selector);
                    for (var i = 0; i < lista.length; i++) {
                        var elemento = lista[i];
                        if (elemento.getBoundingClientRect().height > 0 && (elemento.textContent || "").trim().length > 0) {
                            return elemento;
                        }
                    }
                    return null;
                };
                ThemeEngine.rotuloSinCliente = function (zona) {
                    var hojas = zona.querySelectorAll("div,span,label,h1,h2,h3,h4");
                    for (var i = 0; i < hojas.length; i++) {
                        var hoja = hojas[i];
                        if (hoja.children.length === 0
                            && (hoja.textContent || "").trim() === "Agregue un cliente a esta transacción"
                            && hoja.getBoundingClientRect().width > 0) {
                            return hoja;
                        }
                    }
                    return null;
                };
                ThemeEngine.soltarClase = function (clase, salvo) {
                    var marcados = ThemeEngine.todos("." + clase);
                    for (var i = 0; i < marcados.length; i++) {
                        if (marcados[i] !== salvo)
                            marcados[i].classList.remove(clase);
                    }
                };
                ThemeEngine.topActual = function (elemento) {
                    return parseFloat(getComputedStyle(elemento).top) || 0;
                };
                ThemeEngine.acomodarColumnaDerecha = function () {
                    var montos = ThemeEngine.q("#TotalsPanel");
                    var boleta = ThemeEngine.q("#CustomControl1");
                    var pagos = ThemeEngine.q("#ButtonGrid4");
                    if (!montos || !boleta || !pagos)
                        return;
                    var rMontos = montos.getBoundingClientRect();
                    var rBoleta = boleta.getBoundingClientRect();
                    var rPagos = pagos.getBoundingClientRect();
                    if (rMontos.height < 40 || rBoleta.height < 20 || rPagos.height < 20)
                        return;
                    var HUECO = 8;
                    var topBoleta = Math.round(ThemeEngine.topActual(boleta) + (rMontos.top - rBoleta.top));
                    var yPagos = rMontos.top + rBoleta.height + HUECO;
                    var topPagos = Math.round(ThemeEngine.topActual(pagos) + (yPagos - rPagos.top));
                    var altoPagos = Math.round(rMontos.bottom - yPagos);
                    if (altoPagos < 60)
                        return;
                    var raiz = "body." + ThemeAssets_1.CLASE_AMBITO + " ";
                    var css = raiz + "#CustomControl1{top:" + topBoleta + "px !important;}\n"
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
                };
                ThemeEngine.repartirPanel = function (idControl, proporcion) {
                    var zona = ThemeEngine.q("#" + idControl.replace("Control", ""));
                    var control = ThemeEngine.q("#" + idControl);
                    var tarjeta = ThemeEngine.q("#TabControl .tabContent");
                    if (!zona || !control || !tarjeta)
                        return;
                    var botones = ThemeEngine.todos("#" + idControl + " .buttonGridButton");
                    if (botones.length === 0)
                        return;
                    var estilosTarjeta = getComputedStyle(tarjeta);
                    var rTarjeta = tarjeta.getBoundingClientRect();
                    var anchoUtil = Math.round(rTarjeta.width - (parseFloat(estilosTarjeta.paddingLeft) || 0) - (parseFloat(estilosTarjeta.paddingRight) || 0));
                    var altoUtil = Math.round(rTarjeta.height - (parseFloat(estilosTarjeta.paddingTop) || 0) - (parseFloat(estilosTarjeta.paddingBottom) || 0));
                    var anchoZona = Math.round(zona.getBoundingClientRect().width);
                    var ancho = Math.min(anchoZona, anchoUtil);
                    if (ancho < 100 || altoUtil < 80)
                        return;
                    var HUECO = 8;
                    var filas = [];
                    var columnas = [];
                    var i = 0;
                    for (i = 0; i < botones.length; i++) {
                        var r = botones[i].getBoundingClientRect();
                        var y = Math.round(r.top);
                        var x = Math.round(r.left);
                        if (filas.indexOf(y) < 0)
                            filas.push(y);
                        if (columnas.indexOf(x) < 0)
                            columnas.push(x);
                    }
                    filas.sort(function (a, b) { return a - b; });
                    columnas.sort(function (a, b) { return a - b; });
                    if (filas.length === 0 || columnas.length === 0)
                        return;
                    var anchoBoton = Math.floor((ancho - (columnas.length - 1) * HUECO) / columnas.length);
                    var altoMaximo = Math.floor((altoUtil - (filas.length - 1) * HUECO) / filas.length);
                    var altoBoton = columnas.length > 1 ? Math.round(anchoBoton * proporcion) : altoMaximo;
                    if (altoBoton > altoMaximo)
                        altoBoton = altoMaximo;
                    if (altoBoton < 30)
                        return;
                    var altoTotal = filas.length * altoBoton + (filas.length - 1) * HUECO;
                    ThemeEngine.establecer("#" + idControl + ", #" + idControl + " .buttonsContainer", {
                        "width": ancho + "px",
                        "height": altoTotal + "px"
                    });
                    for (i = 0; i < botones.length; i++) {
                        var rect = botones[i].getBoundingClientRect();
                        var fila = filas.indexOf(Math.round(rect.top));
                        var columna = columnas.indexOf(Math.round(rect.left));
                        if (fila < 0)
                            fila = 0;
                        if (columna < 0)
                            columna = 0;
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
                };
                ThemeEngine.repartirBotonesPago = function (altoZona, hueco) {
                    var contenedor = ThemeEngine.q("#ButtonGrid4Control .buttonsContainer") || ThemeEngine.q("#ButtonGrid4Control");
                    if (!contenedor)
                        return;
                    var botones = ThemeEngine.todos("#ButtonGrid4Control .buttonGridButton");
                    if (botones.length === 0)
                        return;
                    var ancho = Math.round(contenedor.getBoundingClientRect().width);
                    if (ancho < 80)
                        return;
                    var filas = [];
                    var i = 0;
                    for (i = 0; i < botones.length; i++) {
                        var y = Math.round(botones[i].getBoundingClientRect().top);
                        if (filas.indexOf(y) < 0)
                            filas.push(y);
                    }
                    filas.sort(function (a, b) { return a - b; });
                    if (filas.length === 0)
                        return;
                    var altoBoton = Math.floor((altoZona - (filas.length - 1) * hueco) / filas.length);
                    if (altoBoton < 24)
                        return;
                    for (var f = 0; f < filas.length; f++) {
                        var deLaFila = [];
                        var columnas = [];
                        for (i = 0; i < botones.length; i++) {
                            if (Math.round(botones[i].getBoundingClientRect().top) !== filas[f])
                                continue;
                            deLaFila.push(botones[i]);
                            var x = Math.round(botones[i].getBoundingClientRect().left);
                            if (columnas.indexOf(x) < 0)
                                columnas.push(x);
                        }
                        columnas.sort(function (a, b) { return a - b; });
                        var anchoBoton = Math.floor((ancho - (columnas.length - 1) * hueco) / columnas.length);
                        for (i = 0; i < deLaFila.length; i++) {
                            var col = columnas.indexOf(Math.round(deLaFila[i].getBoundingClientRect().left));
                            if (col < 0)
                                col = 0;
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
                };
                ThemeEngine.ajustarNumpad = function () {
                    var zona = ThemeEngine.q("#TabControl");
                    var tabs = ThemeEngine.q("#TabControl .tabsContainer");
                    var tarjeta = ThemeEngine.q("#TabControl .tabContent");
                    var carrito = ThemeEngine.q("#TransactionGrid");
                    if (!zona || !tarjeta || !carrito)
                        return;
                    var teclas = ThemeEngine.todos("#TabControl .numpad-control-buttons button");
                    if (teclas.length === 0)
                        return;
                    if (!ThemeEngine.teclaNativa) {
                        ThemeEngine.teclaNativa = Math.round(teclas[0].getBoundingClientRect().height) || 54;
                    }
                    var filasY = [];
                    for (var i = 0; i < teclas.length; i++) {
                        var y = Math.round(teclas[i].getBoundingClientRect().top);
                        if (filasY.indexOf(y) < 0)
                            filasY.push(y);
                    }
                    var filas = filasY.length;
                    if (filas === 0)
                        return;
                    var SEP = 4;
                    var HUECO = 8;
                    var ALTO_INPUT = 34;
                    var altoZona = Math.round(carrito.getBoundingClientRect().bottom - zona.getBoundingClientRect().top);
                    if (altoZona < 160)
                        return;
                    var altoTabs = tabs ? Math.round(tabs.getBoundingClientRect().height) : 0;
                    var margenTabs = tabs ? (parseFloat(getComputedStyle(tabs).marginBottom) || 0) : 0;
                    var estilosTarjeta = getComputedStyle(tarjeta);
                    var relleno = (parseFloat(estilosTarjeta.paddingTop) || 0) + (parseFloat(estilosTarjeta.paddingBottom) || 0);
                    var disponible = altoZona - altoTabs - margenTabs - relleno;
                    var altoTecla = Math.floor((disponible - ALTO_INPUT - HUECO - (filas - 1) * SEP) / filas);
                    if (altoTecla > ThemeEngine.teclaNativa)
                        altoTecla = ThemeEngine.teclaNativa;
                    if (altoTecla < 30)
                        altoTecla = 30;
                    var altoTeclado = filas * altoTecla + (filas - 1) * SEP;
                    var raiz = "body." + ThemeAssets_1.CLASE_AMBITO + " ";
                    var css = raiz + "#TabControl{height:" + altoZona + "px !important;max-height:" + altoZona + "px !important;overflow:visible !important;}\n"
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
                };
                ThemeEngine.aplicarCliente = function () {
                    var zonaCliente = ThemeEngine.q("#CustomerPanel");
                    if (!zonaCliente)
                        zonaCliente = ThemeEngine.zona(/Agregue un cliente|CLIENTE DESCRIPTIVO/i);
                    if (!zonaCliente)
                        return;
                    var rotuloVacio = ThemeEngine.rotuloSinCliente(zonaCliente);
                    var detalle = ThemeEngine.nodoVivo(zonaCliente, ".customerDetailsCardStyle");
                    var conCliente = !!detalle && !rotuloVacio;
                    if (conCliente && detalle) {
                        ThemeEngine.soltarClase("sct-cli-empty", null);
                        ThemeEngine.soltarAlturaVacio();
                        var tarjeta = ThemeEngine.nodoVivo(detalle, ".primaryPanelBackgroundColor.highContrastBorderThin");
                        if (!tarjeta)
                            tarjeta = detalle;
                        ThemeEngine.soltarClase("sct-cli-card", tarjeta);
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
                        var direccion = ThemeEngine.nodoVivo(zonaCliente, ".customerPanelPrimaryAddress");
                        ThemeEngine.soltarClase("sct-dom-card", direccion);
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
                    if (!rotuloVacio)
                        return;
                    var tarjetaVacia = ThemeEngine.ancestroTarjeta(rotuloVacio);
                    if (!tarjetaVacia)
                        return;
                    ThemeEngine.soltarClase("sct-cli-card", null);
                    ThemeEngine.soltarClase("sct-dom-card", null);
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
                ThemeEngine.rotuloPago = function (boton) {
                    var titulo = (boton.getAttribute("title") || "").trim();
                    if (titulo.length > 0 && titulo.length <= 40)
                        return titulo;
                    for (var i = 0; i < boton.children.length; i++) {
                        var texto = (boton.children[i].textContent || "").trim();
                        if (texto.length > 0 && !/\d+\s+of\s+\d+/.test(texto))
                            return texto;
                    }
                    return titulo;
                };
                ThemeEngine.prepararBotones = function () {
                    var botones = ThemeEngine.todos("#ButtonGrid4Control .buttonGridButton");
                    if (botones.length === 0)
                        return;
                    var definiciones = [
                        { clase: "sct-p0", re: /^efectivo$/i },
                        { clase: "sct-p1", re: /vales/i },
                        { clase: "sct-p3", re: /planilla/i },
                        { clase: "sct-p4", re: /terceros/i },
                        { clase: "sct-p2", re: /niubiz/i }
                    ];
                    var usadas = {};
                    for (var i = 0; i < botones.length; i++) {
                        var boton = botones[i];
                        var rotulo = ThemeEngine.rotuloPago(boton);
                        var def = null;
                        for (var j = 0; j < definiciones.length; j++) {
                            if (!usadas[definiciones[j].clase] && definiciones[j].re.test(rotulo)) {
                                def = definiciones[j];
                                usadas[def.clase] = true;
                                break;
                            }
                        }
                        if (!boton.classList.contains("sct-pbtn"))
                            boton.classList.add("sct-pbtn");
                        ThemeEngine.estilo(boton, {
                            "background-color": "rgba(22,21,20,0.6)",
                            "border": "1px solid rgba(255,255,255,0.16)",
                            "border-radius": "12px",
                            "color": "#FFFFFF"
                        });
                        if (!def)
                            continue;
                        ThemeEngine.estilo(boton, { "background-image": "none" });
                        if (!boton.classList.contains(def.clase)) {
                            boton.classList.add(def.clase);
                            ThemeEngine.icono(boton, "sct-ic-" + def.clase.substring(4));
                        }
                        for (var k = 0; k < boton.children.length; k++) {
                            var hijo = boton.children[k];
                            if (hijo.tagName === "DIV" && hijo.style.getPropertyValue("display") !== "none") {
                                hijo.style.setProperty("display", "none", "important");
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
                    ThemeEngine.ajustarNumpad();
                    ThemeEngine.acomodarColumnaDerecha();
                    ThemeEngine.repartirPanel("ButtonGrid1Control", 1.27);
                    ThemeEngine.repartirPanel("ButtonGrid2Control", 1.27);
                    ThemeEngine.repartirPanel("ButtonGrid3Control", 1.27);
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
                    ThemeEngine.decorarBoleto(ThemeEngine.todos("#ButtonGrid3Control .buttonGridButton"));
                    ThemeEngine.ajustarNumpad();
                    ThemeEngine.acomodarColumnaDerecha();
                    ThemeEngine.repartirPanel("ButtonGrid1Control", 1.27);
                    ThemeEngine.repartirPanel("ButtonGrid2Control", 1.27);
                    ThemeEngine.repartirPanel("ButtonGrid3Control", 1.27);
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
                ThemeEngine.pasadaColapsada = function () {
                    var ahora = new Date().getTime();
                    if (ahora - ThemeEngine.ultimaPasadaInmediata > 120) {
                        ThemeEngine.ultimaPasadaInmediata = ahora;
                        ThemeEngine.pasada();
                    }
                    ThemeEngine.programarRepasoFinal(60);
                };
                ThemeEngine.programarRepasoFinal = function (demora) {
                    window.clearTimeout(ThemeEngine.temporizador);
                    ThemeEngine.temporizador = window.setTimeout(function () { ThemeEngine.pasada(); }, demora);
                };
                ThemeEngine.alInteractuar = function (evento) {
                    var tipo = (evento && evento.type) || "";
                    var escribiendo = tipo === "keyup";
                    if (!escribiendo) {
                        var ahora = new Date().getTime();
                        if (ahora - ThemeEngine.ultimaPasadaInmediata > 120) {
                            ThemeEngine.ultimaPasadaInmediata = ahora;
                            window.setTimeout(function () { ThemeEngine.pasada(); }, 0);
                        }
                    }
                    ThemeEngine.programarRepasoFinal(escribiendo ? 300 : 60);
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
                            ThemeEngine.pasadaColapsada();
                        }
                    });
                    ThemeEngine.observadorEstilos = new MutationObserver(function () {
                        ThemeEngine.pasadaColapsada();
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
                ThemeEngine.ultimaPasadaInmediata = 0;
                ThemeEngine.observadorDom = null;
                ThemeEngine.observadorEstilos = null;
                ThemeEngine.ocupado = false;
                ThemeEngine.temporizador = 0;
                ThemeEngine.temporizadorSalidaAmbito = 0;
                ThemeEngine.eventosRegistrados = false;
                ThemeEngine.estiloNumpad = null;
                ThemeEngine.estiloAlineacion = null;
                ThemeEngine.teclaNativa = 0;
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
