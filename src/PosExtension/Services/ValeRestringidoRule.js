System.register(["PosApi/Consume/Dialogs", "../DataService/ItemsRestringidosRequest"], function (exports_1, context_1) {
    "use strict";
    var Dialogs_1, ItemsRestringidosRequest_1, CENTINELA_NO_RESUELTO, CLAVE_ESTADO, NOMENCLATURA, LETRA_SIN_ALCOHOL, SIN_RESTRICCION, ESPERA_REINTENTO_MS, ValeRestringidoRule;
    var __moduleName = context_1 && context_1.id;
    function estado() {
        var w = window;
        if (!w[CLAVE_ESTADO]) {
            w[CLAVE_ESTADO] = { items: null, itemsResueltos: false, itemsEnVuelo: null, itemsReintentarDesde: 0 };
        }
        return w[CLAVE_ESTADO];
    }
    return {
        setters: [
            function (Dialogs_1_1) {
                Dialogs_1 = Dialogs_1_1;
            },
            function (ItemsRestringidosRequest_1_1) {
                ItemsRestringidosRequest_1 = ItemsRestringidosRequest_1_1;
            }
        ],
        execute: function () {
            CENTINELA_NO_RESUELTO = "*NO-RESUELTO*";
            CLAVE_ESTADO = "__truValeRestringido";
            NOMENCLATURA = /^T([A-Z]?)(\d{1,4})([A-ZÑ]{3})(\d{2})(\d{3})$/;
            LETRA_SIN_ALCOHOL = "A";
            SIN_RESTRICCION = { sinAlcohol: false, desconocida: false, letra: "" };
            ESPERA_REINTENTO_MS = 60000;
            ValeRestringidoRule = (function () {
                function ValeRestringidoRule() {
                }
                ValeRestringidoRule.restriccionDe = function (codigo) {
                    var limpio = (codigo || "").trim().toUpperCase();
                    var partes = NOMENCLATURA.exec(limpio);
                    if (!partes) {
                        return SIN_RESTRICCION;
                    }
                    var letra = partes[1] || "";
                    if (!letra) {
                        return SIN_RESTRICCION;
                    }
                    if (letra === LETRA_SIN_ALCOHOL) {
                        return { sinAlcohol: true, desconocida: false, letra: letra };
                    }
                    return { sinAlcohol: false, desconocida: true, letra: letra };
                };
                ValeRestringidoRule.evaluarVale = function (context, codigo, cart) {
                    var restriccion = ValeRestringidoRule.restriccionDe(codigo);
                    if (restriccion.desconocida) {
                        return Promise.resolve(ValeRestringidoRule._motivoDesconocida(restriccion.letra));
                    }
                    if (!restriccion.sinAlcohol) {
                        return Promise.resolve("");
                    }
                    return ValeRestringidoRule._alcoholEnCarrito(context, cart)
                        .then(function (hallazgo) {
                        if (!hallazgo.resuelto) {
                            return Promise.resolve("Este vale no puede pagar bebidas alcohólicas, pero ahora mismo no se "
                                + "puede verificar qué productos lo son.\n\n"
                                + "Cobre con otro medio de pago y avise a sistemas.");
                        }
                        if (hallazgo.lineas.length > 0) {
                            return Promise.resolve(ValeRestringidoRule._motivo(hallazgo.lineas));
                        }
                        return ValeRestringidoRule.mostrarAviso(context, "Vale con restricción", "Este vale no puede pagar bebidas alcohólicas.\n\n"
                            + "La venta actual no tiene ninguna, así que puede continuar.")
                            .then(function () { return ""; });
                    })
                        .catch(function (razon) {
                        ValeRestringidoRule._log(context, "evaluarVale", razon);
                        return "";
                    });
                };
                ValeRestringidoRule.evaluarProductos = function (context, cart, itemIds) {
                    var candidatos = (itemIds || []).filter(function (x) { return !!x; });
                    if (candidatos.length === 0) {
                        return Promise.resolve("");
                    }
                    if (!ValeRestringidoRule._hayValeRestringido(cart)) {
                        return Promise.resolve("");
                    }
                    return ValeRestringidoRule._items(context)
                        .then(function (lista) {
                        if (!lista.resuelto) {
                            return "La venta se está pagando con un vale que no cubre bebidas alcohólicas "
                                + "y no se puede verificar si este producto es una.\n\n"
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
                            ? "Esta venta se está pagando con un vale que no cubre bebidas alcohólicas:\n\n"
                                + bloqueados.join("\n")
                                + "\n\nQuite el vale del pago, o venda el licor en otra transacción."
                            : "";
                    })
                        .catch(function (razon) {
                        ValeRestringidoRule._log(context, "evaluarProductos", razon);
                        return "";
                    });
                };
                ValeRestringidoRule.evaluarCarrito = function (context, cart) {
                    if (!ValeRestringidoRule._hayValeRestringido(cart)) {
                        return Promise.resolve("");
                    }
                    return ValeRestringidoRule._alcoholEnCarrito(context, cart)
                        .then(function (hallazgo) {
                        if (!hallazgo.resuelto) {
                            return "La venta se está pagando con un vale que no cubre bebidas alcohólicas "
                                + "y no se puede verificar si la venta tiene alguna.\n\n"
                                + "Quite el vale y cobre con otro medio de pago.";
                        }
                        return hallazgo.lineas.length > 0 ? ValeRestringidoRule._motivo(hallazgo.lineas) : "";
                    })
                        .catch(function (razon) {
                        ValeRestringidoRule._log(context, "evaluarCarrito", razon);
                        return "";
                    });
                };
                ValeRestringidoRule.mostrarBloqueo = function (context, motivo) {
                    return ValeRestringidoRule._dialogo(context, "Vale con restricción", motivo);
                };
                ValeRestringidoRule.mostrarAviso = function (context, titulo, mensaje) {
                    return ValeRestringidoRule._dialogo(context, titulo, mensaje);
                };
                ValeRestringidoRule._dialogo = function (context, titulo, mensaje) {
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
                        context.logger.logError("ValeRestringidoRule: no se pudo mostrar el aviso.");
                    });
                };
                ValeRestringidoRule._motivo = function (lineas) {
                    return "Este vale no cubre bebidas alcohólicas.\n\n"
                        + "La venta tiene:\n" + lineas.join("\n")
                        + "\n\nRetire esos productos, o cóbrelos con otro medio de pago.";
                };
                ValeRestringidoRule._motivoDesconocida = function (letra) {
                    return "Este vale lleva una restricción (" + letra + ") que esta versión del Store "
                        + "Commerce no sabe aplicar.\n\n"
                        + "Cobre con otro medio de pago y avise a sistemas: la extensión del POS está "
                        + "desactualizada frente al sistema de vales.";
                };
                ValeRestringidoRule._hayValeRestringido = function (cart) {
                    var codigos = ValeRestringidoRule._codigosDeValesEnCarrito(cart);
                    for (var i = 0; i < codigos.length; i++) {
                        var restriccion = ValeRestringidoRule.restriccionDe(codigos[i]);
                        if (restriccion.sinAlcohol) {
                            return true;
                        }
                    }
                    return false;
                };
                ValeRestringidoRule._codigosDeValesEnCarrito = function (cart) {
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
                ValeRestringidoRule._alcoholEnCarrito = function (context, cart) {
                    return ValeRestringidoRule._items(context)
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
                ValeRestringidoRule._items = function (context) {
                    var st = estado();
                    if (st.items !== null) {
                        return Promise.resolve({ resuelto: st.itemsResueltos, items: st.items });
                    }
                    if (!st.itemsEnVuelo && Date.now() < st.itemsReintentarDesde) {
                        return Promise.resolve({ resuelto: false, items: {} });
                    }
                    if (!st.itemsEnVuelo) {
                        st.itemsEnVuelo = context.runtime
                            .executeAsync(new ItemsRestringidosRequest_1.ItemsRestringidosRequest())
                            .then(function (respuesta) {
                            var filas = (respuesta && respuesta.data && respuesta.data.result) || [];
                            var centinela = filas.length === 1
                                && filas[0] && filas[0].ItemId === CENTINELA_NO_RESUELTO;
                            if (centinela) {
                                context.logger.logError("ValeRestringidoRule: el CSU no pudo resolver los artículos restringidos: "
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
                            context.logger.logInformational("ValeRestringidoRule: " + filas.length + " artículos restringidos en caché.");
                            estado().items = mapa;
                            estado().itemsResueltos = filas.length > 0;
                        })
                            .catch(function (razon) {
                            ValeRestringidoRule._log(context, "_items", razon);
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
                ValeRestringidoRule._log = function (context, donde, razon) {
                    var detalle = "";
                    try {
                        detalle = JSON.stringify(razon);
                    }
                    catch (error) {
                        detalle = String(razon);
                    }
                    context.logger.logError("ValeRestringidoRule." + donde + ": " + detalle);
                };
                return ValeRestringidoRule;
            }());
            exports_1("ValeRestringidoRule", ValeRestringidoRule);
            exports_1("default", ValeRestringidoRule);
        }
    };
});
