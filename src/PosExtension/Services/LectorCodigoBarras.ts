/**
 * LECTOR DE CODIGOS DE BARRAS — cuenta lo que se escanea y lo compara con lo que entra a la venta
 * ===============================================================================================
 *
 * POR QUE EXISTE
 * En caja se escanearon 10 productos —el lector pito 10 veces— y la venta registro 9. La suma de
 * la columna Cantidad daba 9, asi que no era un repetido sumado a otra linea: se perdio una
 * lectura de verdad, con el paquete 1.6.6 ya desplegado. Antes, en otra caja, un EAN-13 entero
 * (7750371671936) habia terminado tecleado en el numpad del importe del pago.
 *
 * El pitido no prueba nada sobre el POS: el lector pita cuando DECODIFICA el codigo, no cuando la
 * aplicacion lo acepta. En modo teclado (keyboard wedge) el lector "teclea" los caracteres y un
 * Enter en pocos milisegundos, y lo que pase con esas teclas depende de quien tenga el foco y de
 * si el hilo de la pagina esta libre para atenderlas.
 *
 * El SDK del POS no tiene trigger de escaneo (se revisaron todos los tipos de trigger): no hay
 * forma de preguntarle cuantas lecturas recibio. Esto las ve por su cuenta.
 *
 * QUE HACE
 *  1. Escucha keydown en CAPTURA sobre document, asi ve TODAS las teclas sin importar el foco.
 *     Solo observa: nunca cancela ni frena un evento. Si algo falla aqui, la tecla pasa igual.
 *  2. Reconoce la firma del lector: caracteres con menos de 40 ms entre si y un Enter al final.
 *     Una persona no baja de ~80 ms entre teclas.
 *  3. Empareja cada lectura con el producto que agrega el POS (LectorProductoTrigger, en
 *     PostProductSale) POR CODIGO: el detalle del producto trae el BarcodeId escaneado.
 *  4. Una lectura sin producto a los 8 s se anuncia como PERDIDA, con el elemento que tenia el
 *     foco cuando llego y cuanto esperaron sus teclas en la cola del navegador.
 *
 * Y ademas rafagaEnVuelo(): ThemeEngine la consulta para no recolocar la botonera en medio de un
 * escaneo. Ver ThemeEngine.pasada().
 *
 * LO QUE NO DISTINGUE. Una lectura que el POS rechaza A LA VISTA —codigo inexistente, vale
 * restringido— tambien sale como perdida, porque tampoco agrega producto. Pero en esos casos el
 * cajero vio un aviso y el log del POS tiene la linea del rechazo al lado: no es la perdida
 * SILENCIOSA que se busca. Una prueba de N escaneos sin ningun aviso en pantalla deberia dar
 * cero perdidas.
 *
 * EL ESTADO VIVE EN window (gotcha 8): si el bundle se carga dos veces, cada copia tendria su
 * propio estado de modulo, y el guard de ThemeEngine de una copia no veria las teclas que cuenta
 * el listener de la otra. En window lo comparten. Tambien sirve para leerlo desde las devtools de
 * la caja: window.__SCT_LECTOR.
 */

interface ILecturaPendiente {
    codigo: string;
    foco: string;
    esperaMax: number;
    duracion: number;
    recibida: number;
    partidaPrevia: string;
}

interface IEstadoLector {
    instalado: boolean;
    contexto: any;

    // Rafaga en curso.
    buffer: string;
    inicio: number;
    ultima: number;
    ultimaReloj: number;
    foco: string;
    esperaMax: number;
    partidaPrevia: string;
    partidaEn: number;

    // Contabilidad.
    pendientes: ILecturaPendiente[];
    lecturas: number;
    emparejadas: number;
    perdidas: number;
    partidas: number;
    productos: number;
    manuales: number;
    sinRafaga: number;
    esperaMaxTotal: number;

    // Ritmo: cuanto tarda cada lectura en convertirse en producto. Ver _anotarDemora().
    ultimaLectura: number;
    ultimoCodigo: string;
    repetidas: number;
    demoraSuma: number;
    demoraCuenta: number;
    demoraMax: number;
    colaMax: number;
}

export default class LectorCodigoBarras {

    private static readonly CLAVE: string = "__SCT_LECTOR";

    /**
     * Hueco maximo entre dos teclas de la misma lectura. Un lector manda un caracter cada 5-20 ms;
     * una persona rara vez baja de 80. Se mide con event.timeStamp, que es cuando la tecla LLEGO,
     * no cuando se atendio: asi una lectura que espero en la cola sigue reconociendose como tal.
     */
    private static readonly MS_ENTRE_TECLAS: number = 40;

    /** Una lectura esta "en vuelo" si su ultima tecla llego hace menos de esto y aun no hubo Enter. */
    private static readonly MS_RAFAGA_ABIERTA: number = 100;

    /** El codigo de producto mas corto que se usa en estas tiendas es de 6 cifras. */
    private static readonly MIN_CARACTERES: number = 6;

    /**
     * Cuanto se espera a que el POS agregue el producto antes de dar la lectura por perdida.
     * Agregar un articulo es una ida y vuelta al CSU; 8 s cubre de sobra un CSU lento sin que una
     * perdida real tarde demasiado en aparecer en el log.
     */
    private static readonly MS_ESPERA_PRODUCTO: number = 8000;

    private static readonly LECTURAS_POR_RESUMEN: number = 20;

    /** Tope de lecturas sin emparejar: si algo se rompe, la lista no crece sin limite. */
    private static readonly MAX_PENDIENTES: number = 50;

    /** Una rafaga partida se le atribuye a la lectura que empieza justo despues, no a otra. */
    private static readonly MS_VIGENCIA_PARTIDA: number = 2000;

    /** El mismo codigo antes de esto no lo volvio a pasar una persona: lo releyo el lector. */
    private static readonly MS_REPETIDA: number = 300;

    // ------------------------------------------------------------------------------ publico

    /** Engancha el listener. Idempotente: se puede llamar mas de una vez sin duplicar nada. */
    public static instalar(context: any): void {
        try {
            const estado: IEstadoLector = LectorCodigoBarras._estado();
            if (context) {
                estado.contexto = context;
            }
            if (estado.instalado) {
                return;
            }
            estado.instalado = true;

            document.addEventListener("keydown", LectorCodigoBarras._alTeclear as EventListener, true);

            LectorCodigoBarras._decir(
                "SCT_LECTOR vigilando | lectura = menos de " + LectorCodigoBarras.MS_ENTRE_TECLAS
                + " ms entre teclas y al menos " + LectorCodigoBarras.MIN_CARACTERES + " caracteres"
                + " | perdida si no entra producto en " + (LectorCodigoBarras.MS_ESPERA_PRODUCTO / 1000) + " s");
        } catch (e) { }
    }

    /**
     * true mientras llegan las teclas de una lectura. ThemeEngine no arranca una pasada mientras
     * esto valga true: una pasada larga en medio de una lectura es lo que puede partirla en dos.
     */
    public static rafagaEnVuelo(): boolean {
        try {
            const estado: IEstadoLector = LectorCodigoBarras._estado();
            return estado.buffer.length > 0
                && (LectorCodigoBarras._reloj() - estado.ultimaReloj) < LectorCodigoBarras.MS_RAFAGA_ABIERTA;
        } catch (e) {
            return false;
        }
    }

    /**
     * true si hubo una lectura completa hace menos de `ms`. Con esto ThemeEngine deja de recolocar
     * la botonera mientras el cajero sigue escaneando.
     */
    public static lecturaReciente(ms: number): boolean {
        try {
            const estado: IEstadoLector = LectorCodigoBarras._estado();
            return estado.ultimaLectura > 0
                && (LectorCodigoBarras._reloj() - estado.ultimaLectura) < ms;
        } catch (e) {
            return false;
        }
    }

    /**
     * Lo llama LectorProductoTrigger por cada producto que el POS agrega a la venta. Cada producto
     * escaneado se empareja con su lectura por el codigo; los que entran a mano no cuentan.
     */
    public static anotarProductos(detalles: any[]): void {
        try {
            const estado: IEstadoLector = LectorCodigoBarras._estado();
            const lista: any[] = detalles || [];

            for (let i: number = 0; i < lista.length; i++) {
                const detalle: any = lista[i] || {};
                estado.productos++;

                const codigo: string = LectorCodigoBarras._normalizar(
                    detalle.barcode ? detalle.barcode.BarcodeId : "");
                // BarcodeEntryMethodType: 0 SingleScanned, 1 MultipleScanned, 2 ManuallyEntered,
                // 3 Selected. Si trae BarcodeId tambien cuenta como escaneado.
                const escaneado: boolean = !!codigo || detalle.entryType === 0 || detalle.entryType === 1;

                if (!escaneado) {
                    estado.manuales++;
                    continue;
                }

                if (estado.pendientes.length === 0) {
                    // El POS dice que se escaneo, pero aqui no se vio ninguna rafaga. Si este
                    // numero crece, el lector no llega como teclado (OPOS, estacion de hardware)
                    // y este detector esta ciego: hay que mirar por otro lado.
                    estado.sinRafaga++;
                    continue;
                }

                let indice: number = -1;
                if (codigo) {
                    for (let j: number = 0; j < estado.pendientes.length; j++) {
                        if (estado.pendientes[j].codigo === codigo) {
                            indice = j;
                            break;
                        }
                    }
                }

                // Sin codigo que cotejar, o el POS lo normalizo distinto (ceros a la izquierda,
                // digito de control): se toma la lectura mas antigua. La cuenta sale bien igual;
                // lo unico que se arriesga es atribuirle la perdida a la lectura equivocada.
                if (indice < 0) {
                    indice = 0;
                }

                LectorCodigoBarras._anotarDemora(estado, estado.pendientes[indice]);
                estado.pendientes.splice(indice, 1);
                estado.emparejadas++;
            }
        } catch (e) { }
    }

    /**
     * LA MEDIDA QUE FALTABA PARA EL DESFASE. Leer dura 15-30 ms: si el cajero nota retraso, nace
     * despues, entre el Enter y el momento en que el producto entra a la venta. Esto mide ese
     * tramo, que incluye la ida y vuelta al CSU y todo lo que corra en el POS mientras tanto.
     */
    private static _anotarDemora(estado: IEstadoLector, lectura: ILecturaPendiente): void {
        const demora: number = LectorCodigoBarras._reloj() - lectura.recibida;
        estado.demoraSuma += demora;
        estado.demoraCuenta++;
        if (demora > estado.demoraMax) {
            estado.demoraMax = demora;
        }
    }

    // ------------------------------------------------------------------------------ teclado

    private static _alTeclear(evento: KeyboardEvent): void {
        try {
            const estado: IEstadoLector = LectorCodigoBarras._estado();
            const reloj: number = LectorCodigoBarras._reloj();
            const llegada: number = evento.timeStamp || reloj;
            const tecla: string = evento.key || "";

            if (tecla === "Enter" || evento.keyCode === 13) {
                if (estado.buffer.length >= LectorCodigoBarras.MIN_CARACTERES) {
                    LectorCodigoBarras._cerrarLectura(llegada, reloj);
                }
                LectorCodigoBarras._vaciar(estado);
                return;
            }

            // Shift, Control y compania no cuentan ni rompen la lectura: hay lectores que mandan
            // Shift para las letras de los codigos alfanumericos.
            if (tecla.length !== 1) {
                return;
            }

            if (estado.buffer.length > 0 && (llegada - estado.ultima) > LectorCodigoBarras.MS_ENTRE_TECLAS) {
                // Demasiado lenta para seguir siendo la misma lectura. Si ya venian varias
                // rapidas, una lectura se PARTIO a la mitad: es la huella de algo que detuvo el
                // hilo justo mientras llegaban sus teclas.
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

            // Cuanto espero esta tecla entre que llego y que alguien la atendio. Si el hilo estaba
            // ocupado, aqui se ve. Descarta valores absurdos por si timeStamp no comparte origen
            // con performance.now() en algun motor.
            const espera: number = reloj - llegada;
            if (espera > estado.esperaMax && espera < 60000) {
                estado.esperaMax = espera;
            }
        } catch (e) { }
    }

    private static _cerrarLectura(llegada: number, reloj: number): void {
        const estado: IEstadoLector = LectorCodigoBarras._estado();
        estado.lecturas++;
        if (estado.esperaMax > estado.esperaMaxTotal) {
            estado.esperaMaxTotal = estado.esperaMax;
        }

        const partidaVigente: boolean = !!estado.partidaPrevia
            && (estado.inicio - estado.partidaEn) < LectorCodigoBarras.MS_VIGENCIA_PARTIDA;
        const codigo: string = LectorCodigoBarras._normalizar(estado.buffer);

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

        // Lecturas que todavia esperan su producto. Si esto sube, el lector va mas rapido de lo
        // que el POS alcanza a registrar: ese es el desfase, y crece con cada escaneo.
        if (estado.pendientes.length > estado.colaMax) {
            estado.colaMax = estado.pendientes.length;
        }

        while (estado.pendientes.length > LectorCodigoBarras.MAX_PENDIENTES) {
            const vieja: ILecturaPendiente = estado.pendientes.shift() as ILecturaPendiente;
            estado.perdidas++;
            LectorCodigoBarras._anunciarPerdida(vieja);
        }

        window.setTimeout(LectorCodigoBarras._verificar, LectorCodigoBarras.MS_ESPERA_PRODUCTO + 50);

        if (estado.lecturas % LectorCodigoBarras.LECTURAS_POR_RESUMEN === 0) {
            LectorCodigoBarras._anunciarResumen();
        }
    }

    private static _vaciar(estado: IEstadoLector): void {
        estado.buffer = "";
        estado.foco = "";
        estado.esperaMax = 0;
    }

    // ------------------------------------------------------------------------------ cuenta

    private static _verificar(): void {
        try {
            const estado: IEstadoLector = LectorCodigoBarras._estado();
            const limite: number = LectorCodigoBarras._reloj() - LectorCodigoBarras.MS_ESPERA_PRODUCTO;
            const quedan: ILecturaPendiente[] = [];

            for (let i: number = 0; i < estado.pendientes.length; i++) {
                const lectura: ILecturaPendiente = estado.pendientes[i];
                if (lectura.recibida <= limite) {
                    estado.perdidas++;
                    LectorCodigoBarras._anunciarPerdida(lectura);
                } else {
                    quedan.push(lectura);
                }
            }

            estado.pendientes = quedan;
        } catch (e) { }
    }

    /**
     * La linea que resuelve el caso. El FOCO dice adonde fueron a parar los caracteres: a la
     * rejilla de la venta, al numpad del importe, a un buscador o a nada. La ESPERA dice si el
     * hilo estaba ocupado mientras llegaban. Son causas distintas con arreglos distintos.
     */
    private static _anunciarPerdida(lectura: ILecturaPendiente): void {
        const estado: IEstadoLector = LectorCodigoBarras._estado();
        LectorCodigoBarras._decir(
            "SCT_LECTOR PERDIDA: " + LectorCodigoBarras._enmascarar(lectura.codigo)
            + " (" + lectura.codigo.length + " car.)"
            + " | foco " + (lectura.foco || "(nada)")
            + " | sus teclas esperaron hasta " + Math.round(lectura.esperaMax) + " ms"
            + " | la lectura duro " + Math.round(lectura.duracion) + " ms"
            + (lectura.partidaPrevia ? " | antes se partio una: " + lectura.partidaPrevia : "")
            + " | van " + estado.perdidas + " perdidas de " + estado.lecturas + " lecturas");
    }

    private static _anunciarResumen(): void {
        const estado: IEstadoLector = LectorCodigoBarras._estado();
        LectorCodigoBarras._decir(
            "SCT_LECTOR resumen: " + estado.lecturas + " lecturas"
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
    }

    // ------------------------------------------------------------------------------ utiles

    private static _estado(): IEstadoLector {
        const w: any = window as any;
        if (!w[LectorCodigoBarras.CLAVE]) {
            const nuevo: IEstadoLector = {
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
    }

    /** Reloj con el mismo origen que event.timeStamp. */
    private static _reloj(): number {
        try {
            if (typeof performance !== "undefined" && performance.now) {
                return performance.now();
            }
        } catch (e) { }
        return new Date().getTime();
    }

    private static _normalizar(codigo: any): string {
        return String(codigo || "").replace(/\s+/g, "").toUpperCase();
    }

    /**
     * El log no lleva el codigo entero. Casi siempre es un producto, pero tambien se escanean
     * tarjetas de cliente y de fidelizacion, y un log de caja no es sitio para esos numeros.
     * Prefijo y final bastan para reconocer un EAN (775 = Peru) y cotejarlo con la venta.
     */
    private static _enmascarar(codigo: string): string {
        if (codigo.length <= 4) {
            return "****";
        }
        if (codigo.length <= 7) {
            return codigo.substring(0, 2) + "..." + codigo.substring(codigo.length - 2);
        }
        return codigo.substring(0, 4) + "..." + codigo.substring(codigo.length - 3);
    }

    private static _describir(elemento: Element | null): string {
        if (!elemento || !elemento.tagName) {
            return "(nada)";
        }

        let texto: string = elemento.tagName.toLowerCase();
        if (elemento.id) {
            texto += "#" + elemento.id;
        }

        const clases: string = typeof (elemento as any).className === "string" ? (elemento as any).className : "";
        const primeras: string[] = clases.split(/\s+/).filter((c: string): boolean => !!c).slice(0, 2);
        if (primeras.length > 0) {
            texto += "." + primeras.join(".");
        }

        // El importe del pago y los buscadores se reconocen mejor por su rotulo que por su id.
        const rotulo: string | null = elemento.getAttribute
            ? (elemento.getAttribute("aria-label") || elemento.getAttribute("placeholder"))
            : null;
        if (rotulo) {
            texto += " [" + rotulo.substring(0, 30) + "]";
        }

        return texto;
    }

    private static _decir(texto: string): void {
        try {
            const estado: IEstadoLector = LectorCodigoBarras._estado();
            if (estado.contexto && estado.contexto.logger && estado.contexto.logger.logInformational) {
                estado.contexto.logger.logInformational(texto);
            }
        } catch (e) { }
        try {
            if (typeof console !== "undefined" && console.log) {
                console.log(texto);
            }
        } catch (e) { }
    }
}
