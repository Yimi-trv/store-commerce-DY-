/**
 * Prueba la regla del vale restringido sobre el .js COMPILADO, que es lo que se despliega
 * a las cajas. Simula el cargador System.register del POS y sustituye por maquetas lo único
 * que la regla necesita de fuera: el diálogo y la consulta de artículos.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const RAIZ = path.join(__dirname, "src", "PosExtension");

/** Carga un módulo System.register, con las dependencias ya resueltas. */
function cargar(rutaRelativa, dependencias) {
    const codigo = fs.readFileSync(path.join(RAIZ, rutaRelativa), "utf8");
    const exportados = {};
    let registrado = null;

    const sandbox = {
        window: {},
        Promise: Promise,
        Date: Date,
        JSON: JSON,
        console: console,
        System: {
            register: function (deps, factory) { registrado = { deps: deps, factory: factory }; }
        }
    };
    sandbox.global = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(codigo, sandbox, { filename: rutaRelativa });

    if (!registrado) { throw new Error("no se registró el módulo " + rutaRelativa); }

    const declaracion = registrado.factory(
        function (nombre, valor) { exportados[nombre] = valor; },
        { id: rutaRelativa });

    registrado.deps.forEach(function (dep, i) {
        declaracion.setters[i](dependencias[dep] || {});
    });
    declaracion.execute();

    return { exportados: exportados, ventana: sandbox.window };
}

/* Maquetas de lo que la regla importa. */
let itemsPedidos = 0;
const maquetaDialogos = {
    ShowMessageDialogClientRequest: function () { return {}; }
};
const maquetaItems = {
    ItemRestringidoEntity: function () { return {}; },
    ItemsRestringidosRequest: function () { itemsPedidos++; return { __items: true }; },
    ItemsRestringidosResponse: function () { return {}; }
};

const modulo = cargar("Services/ValeRestringidoRule.js", {
    "PosApi/Consume/Dialogs": maquetaDialogos,
    "../DataService/ItemsRestringidosRequest": maquetaItems
});
let Regla = modulo.exportados["default"];

/* ----------------------------------------------------------------- 1. Nomenclatura */

let fallos = 0;
function comprobar(etiqueta, real, esperado) {
    const ok = JSON.stringify(real) === JSON.stringify(esperado);
    if (!ok) { fallos++; }
    console.log((ok ? "  ok   " : "  FALLA") + "  " + etiqueta
        + (ok ? "" : "\n          esperado " + JSON.stringify(esperado) + "\n          real     " + JSON.stringify(real)));
}

function restriccion(codigo) {
    const r = Regla.restriccionDe(codigo);
    return r.desconocida ? "desconocida:" + r.letra : (r.sinAlcohol ? "sin-alcohol" : "libre");
}

console.log("\n== Qué dice el código de barras ==");
comprobar("T173AGO26001   vale de siempre, sin letra", restriccion("T173AGO26001"), "libre");
comprobar("TA174AGO26001  restringido", restriccion("TA174AGO26001"), "sin-alcohol");
comprobar("minúsculas y espacios", restriccion("  ta174ago26001  "), "sin-alcohol");
comprobar("TA1ENE26001    lote de un dígito", restriccion("TA1ENE26001"), "sin-alcohol");
comprobar("TA1234DIC26999 lote de cuatro", restriccion("TA1234DIC26999"), "sin-alcohol");
comprobar("T1234DIC26999  cuatro dígitos sin letra", restriccion("T1234DIC26999"), "libre");
comprobar("TB174AGO26001  letra que no conocemos", restriccion("TB174AGO26001"), "desconocida:B");
comprobar("5012345678     otra tarjeta regalo", restriccion("5012345678"), "libre");
comprobar("TABC123        empieza con TA pero no es la nomenclatura", restriccion("TABC123"), "libre");
comprobar("TA174AGO260011 un dígito de más", restriccion("TA174AGO260011"), "libre");
comprobar("cadena vacía", restriccion(""), "libre");
comprobar("null", restriccion(null), "libre");
comprobar("undefined", restriccion(undefined), "libre");

/* --------------------------------------------------- 2. Vales dentro del carrito */

console.log("\n== Qué vale hay pagando la venta ==");
function hayRestringido(tenderLines) {
    return Regla._hayValeRestringido({ TenderLines: tenderLines });
}
comprobar("sin pagos", hayRestringido([]), false);
comprobar("pago en efectivo (sin GiftCardId)", hayRestringido([{ Amount: 50 }]), false);
comprobar("un vale normal", hayRestringido([{ GiftCardId: "T173AGO26001" }]), false);
comprobar("un vale restringido", hayRestringido([{ GiftCardId: "TA174AGO26001" }]), true);
comprobar("normal + restringido", hayRestringido([
    { GiftCardId: "T173AGO26001" }, { GiftCardId: "TA174AGO26001" }]), true);
comprobar("restringido ANULADO no restringe", hayRestringido([
    { GiftCardId: "TA174AGO26001", VoidStatusValue: 1 }]), false);
comprobar("anulado + otro vigente", hayRestringido([
    { GiftCardId: "TA174AGO26001", VoidStatusValue: 2 }, { GiftCardId: "TA175AGO26001" }]), true);
comprobar("carrito nulo", Regla._hayValeRestringido(null), false);

/* -------------------------------------------- 3. La decisión completa, con la lista */

console.log("\n== La decisión en caja ==");

/** Contexto del POS de mentira. `lista` son los ItemId que son alcohol. */
function contexto(lista, falla) {
    return {
        avisos: [],
        logger: {
            logInformational: function () { },
            logError: function () { },
            getNewCorrelationId: function () { return "x"; }
        },
        runtime: {
            executeAsync: function (peticion) {
                if (peticion && peticion.__items) {
                    if (falla) { return Promise.reject(new Error("CSU caído")); }
                    return Promise.resolve({
                        data: { result: lista.map(function (id, i) {
                            return { Id: i + 1, ItemId: id, Categoria: "CERVEZAS" };
                        }) }
                    });
                }
                return Promise.resolve({});    // el diálogo
            }
        }
    };
}

const CERVEZA = { ItemId: "90001", Description: "CERVEZA PILSEN 650ML" };
const ARROZ = { ItemId: "10001", Description: "ARROZ COSTENO 5KG" };


const casos = [
    {
        etiqueta: "vale normal + cerveza  → deja pasar",
        correr: function () {
            const ctx = contexto(["90001"]);
            return Regla.evaluarVale(ctx, "T173AGO26001", { CartLines: [CERVEZA] })
                .then(function (m) { return m === "" ? "pasa" : "bloquea"; });
        },
        esperado: "pasa"
    },
    {
        etiqueta: "vale restringido + solo arroz → pasa SIN modal",
        correr: function () {
            const ctx = contexto(["90001"]);
            let dialogos = 0;
            const original = ctx.runtime.executeAsync;
            ctx.runtime.executeAsync = function (p) {
                if (!(p && p.__items)) { dialogos++; }
                return original.call(this, p);
            };
            return Regla.evaluarVale(ctx, "TA174AGO26001", { CartLines: [ARROZ] })
                .then(function (m) {
                    if (m !== "") { return "bloquea"; }
                    return dialogos === 0 ? "pasa sin modal" : "MAL: mostro " + dialogos + " modal(es)";
                });
        },
        esperado: "pasa sin modal"
    },
    {
        etiqueta: "vale restringido + cerveza → bloquea y nombra el producto",
        correr: function () {
            const ctx = contexto(["90001"]);
            return Regla.evaluarVale(ctx, "TA174AGO26001", { CartLines: [ARROZ, CERVEZA] })
                .then(function (m) {
                    return m.indexOf("CERVEZA PILSEN") >= 0 && m.indexOf("90001") >= 0
                        ? "bloquea nombrando" : "MAL: " + m;
                });
        },
        esperado: "bloquea nombrando"
    },
    {
        etiqueta: "vale restringido + cerveza ANULADA → pasa",
        correr: function () {
            const ctx = contexto(["90001"]);
            const anulada = { ItemId: "90001", Description: "CERVEZA", IsVoided: true };
            return Regla.evaluarVale(ctx, "TA174AGO26001", { CartLines: [ARROZ, anulada] })
                .then(function (m) { return m === "" ? "pasa" : "bloquea"; });
        },
        esperado: "pasa"
    },
    {
        etiqueta: "vale restringido y el CSU no responde → bloquea ESE vale",
        correr: function () {
            const ctx = contexto([], true);
            return Regla.evaluarVale(ctx, "TA174AGO26001", { CartLines: [ARROZ] })
                .then(function (m) {
                    return m.indexOf("No se pudo revisar") >= 0 ? "bloquea" : "MAL: " + m;
                });
        },
        esperado: "bloquea"
    },
    {
        etiqueta: "vale NORMAL y el CSU no responde → deja cobrar igual",
        correr: function () {
            const ctx = contexto([], true);
            return Regla.evaluarVale(ctx, "T173AGO26001", { CartLines: [CERVEZA] })
                .then(function (m) { return m === "" ? "pasa" : "bloquea"; });
        },
        esperado: "pasa"
    },
    {
        etiqueta: "centinela: el CSU dice que no pudo armar la lista → bloquea",
        correr: function () {
            const ctx = contexto(["*NO-RESUELTO*"]);
            return Regla.evaluarVale(ctx, "TA174AGO26001", { CartLines: [ARROZ] })
                .then(function (m) {
                    return m.indexOf("No se pudo revisar") >= 0 ? "bloquea" : "MAL: " + m;
                });
        },
        esperado: "bloquea"
    },
    {
        etiqueta: "letra desconocida → bloquea sin consultar nada",
        correr: function () {
            const antes = itemsPedidos;
            const ctx = contexto(["90001"]);
            return Regla.evaluarVale(ctx, "TB174AGO26001", { CartLines: [ARROZ] })
                .then(function (m) {
                    const consulto = itemsPedidos > antes;
                    return (m.indexOf("no reconoce") >= 0 && !consulto)
                        ? "bloquea sin consultar" : "MAL: consulto=" + consulto + " | " + m;
                });
        },
        esperado: "bloquea sin consultar"
    },
    {
        etiqueta: "agregar cerveza con vale restringido ya aplicado → bloquea",
        correr: function () {
            const ctx = contexto(["90001"]);
            const cart = { TenderLines: [{ GiftCardId: "TA174AGO26001" }], CartLines: [ARROZ] };
            return Regla.evaluarProductos(ctx, cart, ["90001"])
                .then(function (m) { return m.indexOf("90001") >= 0 ? "bloquea" : "MAL: " + m; });
        },
        esperado: "bloquea"
    },
    {
        etiqueta: "agregar cerveza SIN vale restringido → ni consulta la lista",
        correr: function () {
            const antes = itemsPedidos;
            const ctx = contexto(["90001"]);
            const cart = { TenderLines: [{ GiftCardId: "T173AGO26001" }], CartLines: [] };
            return Regla.evaluarProductos(ctx, cart, ["90001"])
                .then(function (m) {
                    return (m === "" && itemsPedidos === antes) ? "pasa sin consultar" : "MAL: " + m;
                });
        },
        esperado: "pasa sin consultar"
    },
    {
        etiqueta: "cerrar venta con cerveza y vale restringido → bloquea",
        correr: function () {
            const ctx = contexto(["90001"]);
            const cart = { TenderLines: [{ GiftCardId: "TA174AGO26001" }], CartLines: [CERVEZA] };
            return Regla.evaluarCarrito(ctx, cart)
                .then(function (m) { return m.indexOf("CERVEZA") >= 0 ? "bloquea" : "MAL: " + m; });
        },
        esperado: "bloquea"
    }
];

/* Cada caso necesita la caché de artículos limpia: se recarga el módulo entero. */
function correrCasos(i) {
    if (i >= casos.length) {
        console.log("\n" + (fallos === 0
            ? "TODO BIEN: " + (13 + 8 + casos.length) + " comprobaciones."
            : fallos + " COMPROBACIONES FALLARON."));
        process.exit(fallos === 0 ? 0 : 1);
    }

    const fresco = cargar("Services/ValeRestringidoRule.js", {
        "PosApi/Consume/Dialogs": maquetaDialogos,
        "../DataService/ItemsRestringidosRequest": maquetaItems
    });
    const ReglaFresca = fresco.exportados["default"];
    const guardada = Regla;
    // El caso usa la variable global `Regla`; se apunta a la copia fresca y se restaura.
    Regla = ReglaFresca;

    casos[i].correr()
        .then(function (real) {
            Regla = guardada;
            comprobar(casos[i].etiqueta, real, casos[i].esperado);
            correrCasos(i + 1);
        })
        .catch(function (error) {
            Regla = guardada;
            fallos++;
            console.log("  FALLA  " + casos[i].etiqueta + "\n          excepción: " + error);
            correrCasos(i + 1);
        });
}

correrCasos(0);
