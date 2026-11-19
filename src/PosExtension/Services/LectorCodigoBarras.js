System.register([], function (exports_1, context_1) {
    "use strict";
    var LectorCodigoBarras;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [],
        execute: function () {
            LectorCodigoBarras = (function () {
                function LectorCodigoBarras() {
                }
                LectorCodigoBarras.instalar = function (context) {
                    try {
                        var estado = LectorCodigoBarras._estado();
                        if (context) {
                            estado.contexto = context;
                        }
                        if (estado.instalado) {
                            return;
                        }
                        estado.instalado = true;
                        document.addEventListener("keydown", LectorCodigoBarras._alTeclear, true);
                        LectorCodigoBarras._decir("SCT_LECTOR vigilando | lectura = menos de " + LectorCodigoBarras.MS_ENTRE_TECLAS
                            + " ms entre teclas y al menos " + LectorCodigoBarras.MIN_CARACTERES + " caracteres"
                            + " | perdida si no entra producto en " + (LectorCodigoBarras.MS_ESPERA_PRODUCTO / 1000) + " s");
                    }
                    catch (e) { }
                };
                LectorCodigoBarras.rafagaEnVuelo = function () {
                    try {
                        var estado = LectorCodigoBarras._estado();
                        return estado.buffer.length > 0
                            && (LectorCodigoBarras._reloj() - estado.ultimaReloj) < LectorCodigoBarras.MS_RAFAGA_ABIERTA;
                    }
                    catch (e) {
                        return false;
                    }
                };
                LectorCodigoBarras.lecturaReciente = function (ms) {
                    try {
                        var estado = LectorCodigoBarras._estado();
                        return estado.ultimaLectura > 0
                            && (LectorCodigoBarras._reloj() - estado.ultimaLectura) < ms;
                    }
                    catch (e) {
                        return false;
                    }
                };
                LectorCodigoBarras.anotarProductos = function (detalles) {
                    try {
                        var estado = LectorCodigoBarras._estado();
                        var lista = detalles || [];
                        for (var i = 0; i < lista.length; i++) {
                            var detalle = lista[i] || {};
                            estado.productos++;
                            var codigo = LectorCodigoBarras._normalizar(detalle.barcode ? detalle.barcode.BarcodeId : "");
                            var escaneado = !!codigo || detalle.entryType === 0 || detalle.entryType === 1;
                            if (!escaneado) {
                                estado.manuales++;
                                continue;
                            }
                            if (estado.pendientes.length === 0) {
                                estado.sinRafaga++;
                                continue;
                            }
                            var indice = -1;
                            if (codigo) {
                                for (var j = 0; j < estado.pendientes.length; j++) {
                                    if (estado.pendientes[j].codigo === codigo) {
                                        indice = j;
                                        break;
                                    }
                                }
                            }
                            if (indice < 0) {
                                indice = 0;
                            }
                            LectorCodigoBarras._anotarDemora(estado, estado.pendientes[indice]);
                            estado.pendientes.splice(indice, 1);
                            estado.emparejadas++;
                        }
                    }
                    catch (e) { }
                };
                LectorCodigoBarras._anotarDemora = function (estado, lectura) {
                    var demora = LectorCodigoBarras._reloj() - lectura.recibida;
                    estado.demoraSuma += demora;
                    estado.demoraCuenta++;
                    if (demora > estado.demoraMax) {
                        estado.demoraMax = demora;
                    }
                };
                LectorCodigoBarras._alTeclear = function (evento) {
                    try {
                        var estado = LectorCodigoBarras._estado();
                        var reloj = LectorCodigoBarras._reloj();
                        var llegada = evento.timeStamp || reloj;
                        var tecla = evento.key || "";
                        if (tecla === "Enter" || evento.keyCode === 13) {
                            if (estado.buffer.length >= LectorCodigoBarras.MIN_CARACTERES) {
                                LectorCodigoBarras._cerrarLectura(llegada, reloj);
                            }
                            LectorCodigoBarras._vaciar(estado);
                            return;
                        }
                        if (tecla.length !== 1) {
                            return;
                        }
                        if (estado.buffer.length > 0 && (llegada - estado.ultima) > LectorCodigoBarras.MS_ENTRE_TECLAS) {
                            if (estado.buffer.length >= 3) {
                                estado.partidas++;
                                estado.partidaPrevia = estado.buffer.length + " car. y luego un hueco de "
                                    + Math.round(llegada - estado.ultima) + " ms";
                                estado.partidaEn = llegada;
                            }
                            LectorCodigoBarras._vaciar(estado);
                        }
                        if (estado.buffer.length === 0) {
                            estado.inicio = llegada;
                            estado.foco = LectorCodigoBarras._describir(document.activeElement);
                            estado.esperaMax = 0;
                        }
                        estado.buffer += tecla;
                        estado.ultima = llegada;
                        estado.ultimaReloj = reloj;
                        var espera = reloj - llegada;
                        if (espera > estado.esperaMax && espera < 60000) {
                            estado.esperaMax = espera;
                        }
                    }
                    catch (e) { }
                };
                LectorCodigoBarras._cerrarLectura = function (llegada, reloj) {
                    var estado = LectorCodigoBarras._estado();
                    estado.lecturas++;
                    if (estado.esperaMax > estado.esperaMaxTotal) {
                        estado.esperaMaxTotal = estado.esperaMax;
                    }
                    var partidaVigente = !!estado.partidaPrevia
                        && (estado.inicio - estado.partidaEn) < LectorCodigoBarras.MS_VIGENCIA_PARTIDA;
                    var codigo = LectorCodigoBarras._normalizar(estado.buffer);
                    if (codigo === estado.ultimoCodigo
                        && (reloj - estado.ultimaLectura) < LectorCodigoBarras.MS_REPETIDA) {
                        estado.repetidas++;
                    }
                    estado.ultimoCodigo = codigo;
                    estado.ultimaLectura = reloj;
                    estado.pendientes.push({
                        codigo: codigo,
                        foco: estado.foco,
                        esperaMax: estado.esperaMax,
                        duracion: llegada - estado.inicio,
                        recibida: reloj,
                        partidaPrevia: partidaVigente ? estado.partidaPrevia : ""
                    });
                    estado.partidaPrevia = "";
                    if (estado.pendientes.length > estado.colaMax) {
                        estado.colaMax = estado.pendientes.length;
                    }
                    while (estado.pendientes.length > LectorCodigoBarras.MAX_PENDIENTES) {
                        var vieja = estado.pendientes.shift();
                        estado.perdidas++;
                        LectorCodigoBarras._anunciarPerdida(vieja);
                    }
                    window.setTimeout(LectorCodigoBarras._verificar, LectorCodigoBarras.MS_ESPERA_PRODUCTO + 50);
                    if (estado.lecturas % LectorCodigoBarras.LECTURAS_POR_RESUMEN === 0) {
                        LectorCodigoBarras._anunciarResumen();
                    }
                };
                LectorCodigoBarras._vaciar = function (estado) {
                    estado.buffer = "";
                    estado.foco = "";
                    estado.esperaMax = 0;
                };
                LectorCodigoBarras._verificar = function () {
                    try {
                        var estado = LectorCodigoBarras._estado();
                        var limite = LectorCodigoBarras._reloj() - LectorCodigoBarras.MS_ESPERA_PRODUCTO;
                        var quedan = [];
                        for (var i = 0; i < estado.pendientes.length; i++) {
                            var lectura = estado.pendientes[i];
                            if (lectura.recibida <= limite) {
                                estado.perdidas++;
                                LectorCodigoBarras._anunciarPerdida(lectura);
                            }
                            else {
                                quedan.push(lectura);
                            }
                        }
                        estado.pendientes = quedan;
                    }
                    catch (e) { }
                };
                LectorCodigoBarras._anunciarPerdida = function (lectura) {
                    var estado = LectorCodigoBarras._estado();
                    LectorCodigoBarras._decir("SCT_LECTOR PERDIDA: " + LectorCodigoBarras._enmascarar(lectura.codigo)
                        + " (" + lectura.codigo.length + " car.)"
                        + " | foco " + (lectura.foco || "(nada)")
                        + " | sus teclas esperaron hasta " + Math.round(lectura.esperaMax) + " ms"
                        + " | la lectura duro " + Math.round(lectura.duracion) + " ms"
                        + (lectura.partidaPrevia ? " | antes se partio una: " + lectura.partidaPrevia : "")
                        + " | van " + estado.perdidas + " perdidas de " + estado.lecturas + " lecturas");
                };
                LectorCodigoBarras._anunciarResumen = function () {
                    var estado = LectorCodigoBarras._estado();
                    LectorCodigoBarras._decir("SCT_LECTOR resumen: " + estado.lecturas + " lecturas"
                        + " | " + estado.emparejadas + " emparejadas"
                        + " | " + estado.perdidas + " perdidas"
                        + " | " + estado.partidas + " partidas"
                        + " | pendientes " + estado.pendientes.length
                        + " | productos " + estado.productos
                        + " (manuales " + estado.manuales + ", escaneados sin rafaga vista " + estado.sinRafaga + ")"
                        + " | espera max " + Math.round(estado.esperaMaxTotal) + " ms"
                        + " | de lectura a producto: media "
                        + (estado.demoraCuenta ? Math.round(estado.demoraSuma / estado.demoraCuenta) : 0)
                        + " ms, max " + Math.round(estado.demoraMax) + " ms"
                        + " | cola max " + estado.colaMax
                        + " | repetidas " + estado.repetidas);
                };
                LectorCodigoBarras._estado = function () {
                    var w = window;
                    if (!w[LectorCodigoBarras.CLAVE]) {
                        var nuevo = {
                            instalado: false, contexto: null,
                            buffer: "", inicio: 0, ultima: 0, ultimaReloj: 0, foco: "", esperaMax: 0,
                            partidaPrevia: "", partidaEn: 0,
                            pendientes: [], lecturas: 0, emparejadas: 0, perdidas: 0, partidas: 0,
                            productos: 0, manuales: 0, sinRafaga: 0, esperaMaxTotal: 0,
                            ultimaLectura: 0, ultimoCodigo: "", repetidas: 0,
                            demoraSuma: 0, demoraCuenta: 0, demoraMax: 0, colaMax: 0
                        };
                        w[LectorCodigoBarras.CLAVE] = nuevo;
                    }
                    return w[LectorCodigoBarras.CLAVE];
                };
                LectorCodigoBarras._reloj = function () {
                    try {
                        if (typeof performance !== "undefined" && performance.now) {
                            return performance.now();
                        }
                    }
                    catch (e) { }
                    return new Date().getTime();
                };
                LectorCodigoBarras._normalizar = function (codigo) {
                    return String(codigo || "").replace(/\s+/g, "").toUpperCase();
                };
                LectorCodigoBarras._enmascarar = function (codigo) {
                    if (codigo.length <= 4) {
                        return "****";
                    }
                    if (codigo.length <= 7) {
                        return codigo.substring(0, 2) + "..." + codigo.substring(codigo.length - 2);
                    }
                    return codigo.substring(0, 4) + "..." + codigo.substring(codigo.length - 3);
                };
                LectorCodigoBarras._describir = function (elemento) {
                    if (!elemento || !elemento.tagName) {
                        return "(nada)";
                    }
                    var texto = elemento.tagName.toLowerCase();
                    if (elemento.id) {
                        texto += "#" + elemento.id;
                    }
                    var clases = typeof elemento.className === "string" ? elemento.className : "";
                    var primeras = clases.split(/\s+/).filter(function (c) { return !!c; }).slice(0, 2);
                    if (primeras.length > 0) {
                        texto += "." + primeras.join(".");
                    }
                    var rotulo = elemento.getAttribute
                        ? (elemento.getAttribute("aria-label") || elemento.getAttribute("placeholder"))
                        : null;
                    if (rotulo) {
                        texto += " [" + rotulo.substring(0, 30) + "]";
                    }
                    return texto;
                };
                LectorCodigoBarras._decir = function (texto) {
                    try {
                        var estado = LectorCodigoBarras._estado();
                        if (estado.contexto && estado.contexto.logger && estado.contexto.logger.logInformational) {
                            estado.contexto.logger.logInformational(texto);
                        }
                    }
                    catch (e) { }
                    try {
                        if (typeof console !== "undefined" && console.log) {
                            console.log(texto);
                        }
                    }
                    catch (e) { }
                };
                LectorCodigoBarras.CLAVE = "__SCT_LECTOR";
                LectorCodigoBarras.MS_ENTRE_TECLAS = 40;
                LectorCodigoBarras.MS_RAFAGA_ABIERTA = 100;
                LectorCodigoBarras.MIN_CARACTERES = 6;
                LectorCodigoBarras.MS_ESPERA_PRODUCTO = 8000;
                LectorCodigoBarras.LECTURAS_POR_RESUMEN = 20;
                LectorCodigoBarras.MAX_PENDIENTES = 50;
                LectorCodigoBarras.MS_VIGENCIA_PARTIDA = 2000;
                LectorCodigoBarras.MS_REPETIDA = 300;
                return LectorCodigoBarras;
            }());
            exports_1("default", LectorCodigoBarras);
        }
    };
});
