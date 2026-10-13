System.register(["PosApi/Consume/Dialogs", "../DataService/ValeRestriccionRequest"], function (exports_1, context_1) {
    "use strict";
    var Dialogs_1, ValeRestriccionRequest_1, CENTINELA_NO_RESUELTO, CLAVE_ESTADO, ESPERA_REINTENTO_MS, ValePortadorRule;
    var __moduleName = context_1 && context_1.id;
    function estado() {
        var w = window;
        if (!w[CLAVE_ESTADO]) {
            w[CLAVE_ESTADO] = {
                items: null, itemsResueltos: false, itemsEnVuelo: null, itemsReintentarDesde: 0, vales: {}
            };
        }
        return w[CLAVE_ESTADO];
    }
    return {
        setters: [
            function (Dialogs_1_1) {
                Dialogs_1 = Dialogs_1_1;
            },
            function (ValeRestriccionRequest_1_1) {
                ValeRestriccionRequest_1 = ValeRestriccionRequest_1_1;
            }
        ],
        execute: function () {
            CENTINELA_NO_RESUELTO = "*NO-RESUELTO*";
            CLAVE_ESTADO = "__truValePortador";
            ESPERA_REINTENTO_MS = 60000;
            ValePortadorRule = (function () {
                function ValePortadorRule() {
                }
                ValePortadorRule.evaluarVale = function (context, codigo, cart) {
                    return ValePortadorRule._restriccion(context, codigo)
                        .then(function (restriccion) {
                        if (restriccion.permiteAlcohol) {
                            return Promise.resolve("");
                        }
                        return ValePortadorRule._alcoholEnCarrito(context, cart)
                            .then(function (hallazgo) {
                            if (!hallazgo.resuelto) {
                                return Promise.resolve("Este vale es AL PORTADOR y no puede pagar bebidas alcohólicas, pero "
                                    + "ahora mismo no se puede verificar qué productos lo son.\n\n"
                                    + "Cobre con otro medio de pago y avise a sistemas.");
                            }
                            if (hallazgo.lineas.length > 0) {
                                return Promise.resolve(ValePortadorRule._motivo(hallazgo.lineas));
                            }
                            return ValePortadorRule.mostrarAviso(context, "Vale AL PORTADOR", "Este vale no puede pagar bebidas alcohólicas.\n\n"
                                + "La venta actual no tiene ninguna, así que puede continuar.")
                                .then(function () { return ""; });
                        });
                    })
                        .catch(function (razon) {
                        ValePortadorRule._log(context, "evaluarVale", razon);
                        return "";
                    });
                };
                ValePortadorRule.evaluarProductos = function (context, cart, itemIds) {
                    var candidatos = (itemIds || []).filter(function (x) { return !!x; });
                    if (candidatos.length === 0) {
                        return Promise.resolve("");
                    }
                    return ValePortadorRule._hayValePortador(context, cart)
                        .then(function (hayPortador) {
                        if (!hayPortador) {
                            return Promise.resolve("");
                        }
                        return ValePortadorRule._items(context)
                            .then(function (lista) {
                            if (!lista.resuelto) {
                                return "La venta se está pagando con un vale AL PORTADOR y no se puede "
                                    + "verificar si este producto es una bebida alcohólica.\n\n"
                                    + "Quite el vale y cobre con otro medio de pago.";
                            }
                            var bloqueados = [];
                            for (var i = 0; i < candidatos.length; i++) {
                                var categoria = lista.items[candidatos[i].toLowerCase()];
                                if (categoria) {
                                    bloqueados.push(candidatos[i] + " (" + categoria + ")");
                                }
                            }
                            return bloqueados.length > 0
                                ? "Esta venta se está pagando con un vale AL PORTADOR, que no cubre "
                                    + "bebidas alcohólicas:\n\n" + bloqueados.join("\n")
                                    + "\n\nQuite el vale del pago, o venda el licor en otra transacción."
                                : "";
                        });
                    })
                        .catch(function (razon) {
                        ValePortadorRule._log(context, "evaluarProductos", razon);
                        return "";
                    });
                };
                ValePortadorRule.evaluarCarrito = function (context, cart) {
                    return ValePortadorRule._hayValePortador(context, cart)
                        .then(function (hayPortador) {
                        if (!hayPortador) {
                            return Promise.resolve("");
                        }
                        return ValePortadorRule._alcoholEnCarrito(context, cart)
                            .then(function (hallazgo) {
                            if (!hallazgo.resuelto) {
                                return "La venta se está pagando con un vale AL PORTADOR y no se puede "
                                    + "verificar si tiene bebidas alcohólicas.\n\n"
                                    + "Quite el vale y cobre con otro medio de pago.";
                            }
                            return hallazgo.lineas.length > 0 ? ValePortadorRule._motivo(hallazgo.lineas) : "";
                        });
                    })
                        .catch(function (razon) {
                        ValePortadorRule._log(context, "evaluarCarrito", razon);
                        return "";
                    });
                };
                ValePortadorRule.mostrarBloqueo = function (context, motivo) {
                    return ValePortadorRule._dialogo(context, "Vale AL PORTADOR: no cubre bebidas alcohólicas", motivo);
                };
                ValePortadorRule.mostrarAviso = function (context, titulo, mensaje) {
                    return ValePortadorRule._dialogo(context, titulo, mensaje);
                };
                ValePortadorRule._dialogo = function (context, titulo, mensaje) {
                    var options = {
                        title: titulo,
                        message: mensaje,
                        showCloseX: false,
                        button1: { id: "understood", label: "Entendido", isPrimary: true, result: "ok" }
                    };
                    return context.runtime
                        .executeAsync(new Dialogs_1.ShowMessageDialogClientRequest(options, context.logger.getNewCorrelationId()))
                        .then(function () { return; })
                        .catch(function () {
                        context.logger.logError("ValePortadorRule: no se pudo mostrar el aviso.");
                    });
                };
                ValePortadorRule._motivo = function (lineas) {
                    return "Este vale es AL PORTADOR y no cubre bebidas alcohólicas.\n\n"
                        + "La venta tiene:\n" + lineas.join("\n")
                        + "\n\nRetire esos productos, o cóbrelos con otro medio de pago.";
                };
                ValePortadorRule._restriccion = function (context, codigo) {
                    var clave = (codigo || "").trim().toUpperCase();
                    if (!clave) {
                        return Promise.resolve({ permiteAlcohol: true, esPortador: false, indeterminado: false, mensaje: "" });
                    }
                    var cacheado = estado().vales[clave];
                    if (cacheado) {
                        return Promise.resolve(cacheado);
                    }
                    return context.runtime
                        .executeAsync(new ValeRestriccionRequest_1.ConsultarRestriccionValeRequest(clave))
                        .then(function (respuesta) {
                        var filas = (respuesta && respuesta.data && respuesta.data.result) || [];
                        var fila = filas.length > 0 ? filas[0] : null;
                        var restriccion = fila
                            ? {
                                permiteAlcohol: fila.PermiteAlcohol,
                                esPortador: fila.TipoVale === "AlPortador",
                                indeterminado: fila.Indeterminado,
                                mensaje: fila.Mensaje || ""
                            }
                            : { permiteAlcohol: true, esPortador: false, indeterminado: true, mensaje: "" };
                        context.logger.logInformational("ValePortadorRule: vale=" + clave
                            + " | tipo=" + (fila ? fila.TipoVale : "(sin respuesta)")
                            + " | permiteAlcohol=" + restriccion.permiteAlcohol
                            + " | indeterminado=" + restriccion.indeterminado
                            + " | " + (fila ? (fila.Detalle || "") : ""));
                        if (!restriccion.indeterminado) {
                            estado().vales[clave] = restriccion;
                        }
                        return restriccion;
                    })
                        .catch(function (razon) {
                        ValePortadorRule._log(context, "_restriccion(" + clave + ")", razon);
                        return { permiteAlcohol: true, esPortador: false, indeterminado: true, mensaje: "" };
                    });
                };
                ValePortadorRule._hayValePortador = function (context, cart) {
                    var codigos = ValePortadorRule._codigosDeValesEnCarrito(cart);
                    if (codigos.length === 0) {
                        return Promise.resolve(false);
                    }
                    return Promise.all(codigos.map(function (c) {
                        return ValePortadorRule._restriccion(context, c);
                    }))
                        .then(function (restricciones) {
                        return restricciones.some(function (r) { return !r.permiteAlcohol; });
                    });
                };
                ValePortadorRule._codigosDeValesEnCarrito = function (cart) {
                    var lineas = (cart && cart.TenderLines) || [];
                    var codigos = [];
                    for (var i = 0; i < lineas.length; i++) {
                        var linea = lineas[i];
                        if (!linea || !linea.GiftCardId) {
                            continue;
                        }
                        if (linea.VoidStatusValue) {
                            continue;
                        }
                        var codigo = String(linea.GiftCardId).trim().toUpperCase();
                        if (codigo && codigos.indexOf(codigo) < 0) {
                            codigos.push(codigo);
                        }
                    }
                    return codigos;
                };
                ValePortadorRule._alcoholEnCarrito = function (context, cart) {
                    return ValePortadorRule._items(context)
                        .then(function (lista) {
                        if (!lista.resuelto) {
                            return { resuelto: false, lineas: [] };
                        }
                        var lineasCarrito = (cart && cart.CartLines) || [];
                        var encontradas = [];
                        for (var i = 0; i < lineasCarrito.length; i++) {
                            var linea = lineasCarrito[i];
                            if (!linea || linea.IsVoided) {
                                continue;
                            }
                            var itemId = (linea.ItemId || "").toString().trim();
                            if (!itemId) {
                                continue;
                            }
                            var categoria = lista.items[itemId.toLowerCase()];
                            if (categoria) {
                                var descripcion = linea.Description || linea.ProductName || itemId;
                                encontradas.push("· " + descripcion + " [" + itemId + "]");
                            }
                        }
                        return { resuelto: true, lineas: encontradas };
                    });
                };
                ValePortadorRule._items = function (context) {
                    var st = estado();
                    if (st.items !== null) {
                        return Promise.resolve({ resuelto: st.itemsResueltos, items: st.items });
                    }
                    if (!st.itemsEnVuelo && Date.now() < st.itemsReintentarDesde) {
                        return Promise.resolve({ resuelto: false, items: {} });
                    }
                    if (!st.itemsEnVuelo) {
                        st.itemsEnVuelo = context.runtime
                            .executeAsync(new ValeRestriccionRequest_1.ItemsRestringidosRequest())
                            .then(function (respuesta) {
                            var filas = (respuesta && respuesta.data && respuesta.data.result) || [];
                            var centinela = filas.length === 1
                                && filas[0] && filas[0].ItemId === CENTINELA_NO_RESUELTO;
                            if (centinela) {
                                context.logger.logError("ValePortadorRule: el CSU no pudo resolver los artículos restringidos: "
                                    + (filas[0].Categoria || ""));
                                estado().items = {};
                                estado().itemsResueltos = false;
                                return;
                            }
                            var mapa = {};
                            for (var i = 0; i < filas.length; i++) {
                                if (filas[i] && filas[i].ItemId) {
                                    mapa[filas[i].ItemId.toLowerCase()] = filas[i].Categoria || "bebida alcohólica";
                                }
                            }
                            context.logger.logInformational("ValePortadorRule: " + filas.length + " artículos restringidos en caché.");
                            estado().items = mapa;
                            estado().itemsResueltos = filas.length > 0;
                        })
                            .catch(function (razon) {
                            ValePortadorRule._log(context, "_items", razon);
                            estado().items = {};
                            estado().itemsResueltos = false;
                        })
                            .then(function () {
                            var actual = estado();
                            actual.itemsEnVuelo = null;
                            if (!actual.itemsResueltos) {
                                actual.items = null;
                                actual.itemsReintentarDesde = Date.now() + ESPERA_REINTENTO_MS;
                            }
                        });
                    }
                    return st.itemsEnVuelo.then(function () {
                        var actual = estado();
                        return { resuelto: actual.itemsResueltos, items: actual.items || {} };
                    });
                };
                ValePortadorRule._log = function (context, donde, razon) {
                    var detalle = "";
                    try {
                        detalle = JSON.stringify(razon);
                    }
                    catch (error) {
                        detalle = String(razon);
                    }
                    context.logger.logError("ValePortadorRule." + donde + ": " + detalle);
                };
                return ValePortadorRule;
            }());
            exports_1("ValePortadorRule", ValePortadorRule);
            exports_1("default", ValePortadorRule);
        }
    };
});
