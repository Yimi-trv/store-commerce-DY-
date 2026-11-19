System.register([], function (exports_1, context_1) {
    "use strict";
    var BotonesDePago;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [],
        execute: function () {
            BotonesDePago = (function () {
                function BotonesDePago() {
                }
                BotonesDePago.instalar = function (context) {
                    try {
                        var estado = BotonesDePago._estado();
                        if (context) {
                            estado.contexto = context;
                        }
                        if (estado.instalado) {
                            return;
                        }
                        estado.instalado = true;
                        window.addEventListener("keydown", BotonesDePago._alTeclear, true);
                        window.addEventListener("pointerdown", BotonesDePago._alTocar, true);
                        window.addEventListener("click", BotonesDePago._alClic, true);
                        BotonesDePago._decir("SCT_PAGO vigilando | un clic de teclado no abre un cobro");
                    }
                    catch (e) { }
                };
                BotonesDePago.anotarPago = function () {
                    try {
                        var estado = BotonesDePago._estado();
                        var tocado = estado.toquePago > 0
                            && (BotonesDePago._reloj() - estado.toquePago) < BotonesDePago.MS_TOQUE_VIGENTE;
                        estado.toquePago = 0;
                        if (!tocado) {
                            estado.sinToque++;
                            BotonesDePago._avisar("pago sin toque en un boton de pago", null);
                        }
                    }
                    catch (e) { }
                };
                BotonesDePago._alClic = function (evento) {
                    try {
                        var boton = BotonesDePago._botonDePago(evento.target);
                        if (!boton) {
                            return;
                        }
                        var estado = BotonesDePago._estado();
                        if (!BotonesDePago._esClicDeTeclado(evento)) {
                            estado.toquePago = BotonesDePago._reloj();
                            return;
                        }
                        evento.preventDefault();
                        evento.stopImmediatePropagation();
                        estado.ignorados++;
                        BotonesDePago._avisar("Enter ignorado", boton);
                    }
                    catch (e) { }
                };
                BotonesDePago._esClicDeTeclado = function (evento) {
                    return evento.isTrusted && evento.detail === 0 && evento.clientX === 0 && evento.clientY === 0;
                };
                BotonesDePago._alTocar = function (evento) {
                    try {
                        var estado = BotonesDePago._estado();
                        estado.ultimoToque = BotonesDePago._reloj();
                        estado.toqueEn = BotonesDePago._nombre(evento.target);
                    }
                    catch (e) { }
                };
                BotonesDePago._alTeclear = function (evento) {
                    try {
                        var estado = BotonesDePago._estado();
                        var reloj = BotonesDePago._reloj();
                        var hueco = estado.ultimaTecla > 0 ? Math.round(reloj - estado.ultimaTecla) : 0;
                        var tecla = evento.key || "";
                        var nombre = tecla.length === 1 ? "#" : tecla;
                        var ultima = estado.teclas[estado.teclas.length - 1];
                        estado.ultimaTecla = reloj;
                        if (nombre === "#" && ultima && ultima.nombre === "#") {
                            ultima.cuenta++;
                            return;
                        }
                        estado.teclas.push({ nombre: nombre, cuenta: 1, hueco: hueco });
                        if (estado.teclas.length > BotonesDePago.MAX_TECLAS) {
                            estado.teclas.shift();
                        }
                    }
                    catch (e) { }
                };
                BotonesDePago._botonDePago = function (destino) {
                    var elemento = destino;
                    if (!elemento || !elemento.closest) {
                        return null;
                    }
                    var boton = elemento.closest("button[data-action]");
                    if (!boton) {
                        return null;
                    }
                    var operacion = parseInt(boton.getAttribute("data-action") || "", 10);
                    return BotonesDePago.OPERACIONES_DE_PAGO.indexOf(operacion) >= 0 ? boton : null;
                };
                BotonesDePago._avisar = function (motivo, boton) {
                    var estado = BotonesDePago._estado();
                    var toque = estado.ultimoToque > 0
                        ? Math.round(BotonesDePago._reloj() - estado.ultimoToque) + " ms en " + estado.toqueEn
                        : "ninguno";
                    var texto = "SCT_PAGO " + motivo
                        + (boton
                            ? " en " + BotonesDePago._nombre(boton) + " (op " + boton.getAttribute("data-action") + ")"
                            : "")
                        + " | foco " + BotonesDePago._nombre(document.activeElement)
                        + " | ultimo toque " + toque
                        + " | teclas " + BotonesDePago._resumirTeclas(estado.teclas)
                        + " | ignorados " + estado.ignorados + ", sin toque " + estado.sinToque;
                    BotonesDePago._decir(texto);
                    BotonesDePago._guardar(texto);
                };
                BotonesDePago._resumirTeclas = function (teclas) {
                    return teclas.map(function (tecla) {
                        return tecla.nombre === "#" ? "#" + tecla.cuenta : tecla.nombre + "(+" + tecla.hueco + ")";
                    }).join(" ");
                };
                BotonesDePago._guardar = function (texto) {
                    try {
                        var previos = window.localStorage.getItem(BotonesDePago.CLAVE_AVISOS);
                        var avisos = previos ? JSON.parse(previos) : [];
                        avisos.push(new Date().toISOString() + " " + texto);
                        window.localStorage.setItem(BotonesDePago.CLAVE_AVISOS, JSON.stringify(avisos.slice(-BotonesDePago.MAX_AVISOS)));
                    }
                    catch (e) { }
                };
                BotonesDePago._estado = function () {
                    var w = window;
                    if (!w[BotonesDePago.CLAVE]) {
                        var nuevo = {
                            instalado: false, contexto: null,
                            teclas: [], ultimaTecla: 0,
                            ultimoToque: 0, toqueEn: "", toquePago: 0,
                            ignorados: 0, sinToque: 0
                        };
                        w[BotonesDePago.CLAVE] = nuevo;
                    }
                    return w[BotonesDePago.CLAVE];
                };
                BotonesDePago._reloj = function () {
                    return new Date().getTime();
                };
                BotonesDePago._nombre = function (elemento) {
                    if (!elemento || !elemento.tagName) {
                        return "(nada)";
                    }
                    var rotulo = elemento.getAttribute("aria-label");
                    var texto = rotulo || (elemento.innerText || "").trim();
                    return elemento.tagName.toLowerCase() + (texto ? " [" + texto.substring(0, 30) + "]" : "");
                };
                BotonesDePago._decir = function (texto) {
                    try {
                        var estado = BotonesDePago._estado();
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
                BotonesDePago.CLAVE = "__SCT_PAGO";
                BotonesDePago.CLAVE_AVISOS = "__SCT_PAGO_AVISOS";
                BotonesDePago.OPERACIONES_DE_PAGO = [
                    200, 201, 202, 203, 204, 206, 207, 208, 213, 214, 216, 217, 218, 219, 220
                ];
                BotonesDePago.MAX_TECLAS = 16;
                BotonesDePago.MAX_AVISOS = 30;
                BotonesDePago.MS_TOQUE_VIGENTE = 30000;
                return BotonesDePago;
            }());
            exports_1("default", BotonesDePago);
        }
    };
});
