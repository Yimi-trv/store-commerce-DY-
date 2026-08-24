import { ClientEntities } from "PosApi/Entities";
import { SelectCustomerClientRequest, SelectCustomerClientResponse } from "PosApi/Consume/Customer";
import { SetCustomerOnCartOperationRequest, SetCustomerOnCartOperationResponse } from "PosApi/Consume/Cart";

export const GUARD_KEY: string = "__customerInlineDialogActive";
export const PROGRAMMATIC_KEY: string = "__customerSearchProgrammatic";

/**
 * Ejecuta la búsqueda nativa de clientes y asigna el elegido a la venta.
 *
 * Vive en el trigger y no en el diálogo a propósito: el modal ya se cerró cuando esto
 * corre, y un `executeAsync` lanzado desde un diálogo destruido pierde sus errores en
 * silencio (el `.catch` termina escribiendo sobre un DOM desconectado). El trigger sigue
 * vivo hasta que resuelve su promesa, así que es el único lugar donde el fallo se puede
 * registrar de verdad.
 *
 * PROGRAMMATIC_KEY evita que `SelectCustomerClientRequest` vuelva a disparar
 * PreCustomerSearch y reabra este mismo modal en bucle.
 */
/**
 * ¿Está el POS en la pantalla de VENTA?
 *
 * NO DECIDE NADA. Solo se registra en el log como dato.
 *
 * DOS INTENTOS FALLIDOS, LOS DOS COMPROBADOS EN UAT:
 *   1) Preguntar si los elementos EXISTEN (`querySelector`). Daba "es la venta" también en la
 *      pantalla de pago: el POS navega dejando la vista anterior montada, así que la rejilla de
 *      botones y el panel de líneas seguían en el DOM.
 *   2) Preguntar si están A LA VISTA (`offsetParent` / `getClientRects`). Daba lo mismo. El POS
 *      no oculta la vista anterior con `display:none`, así que sus elementos siguen midiendo.
 *
 * La conclusión es que la pantalla no se puede reconocer así, y sobre todo que era la pregunta
 * equivocada. Lo que hace falta saber no es QUÉ PANTALLA es, sino si la búsqueda de cliente la
 * pidió el cajero o la pidió OTRA OPERACIÓN que sigue esperando respuesta. Eso se sabe con
 * certeza mirando qué operaciones están en curso: ver `tomarOperacionEnvolvente`.
 */
export function esVistaDeVenta(): boolean {
    if (typeof document === "undefined") {
        return true;
    }

    return estaALaVista("#ButtonGrid4Control") && estaALaVista(".transactionLinesPane");
}

/** Existe Y ocupa lugar en pantalla. Un elemento de una vista oculta no ocupa ninguno. */
function estaALaVista(selector: string): boolean {
    const nodo: any = document.querySelector(selector);

    if (!nodo) {
        return false;
    }

    if (nodo.offsetParent) {
        return true;
    }

    return typeof nodo.getClientRects === "function" && nodo.getClientRects().length > 0;
}

/**
 * OPERACIONES EN CURSO — PARA DEVOLVERLE EL CONTROL A QUIEN PIDIÓ LA BÚSQUEDA
 * ===========================================================================
 *
 * EL LÍMITE DE LA API, QUE ES LA RAÍZ DEL PROBLEMA
 * Un PreOperationTrigger solo puede DEJAR PASAR o CANCELAR una operación (devuelve ICancelable).
 * NO puede entregarle un resultado. Y la búsqueda de cliente (602) no siempre la lanza el
 * cajero: "A cuenta de terceros" (202) la lanza POR DENTRO para saber a qué cuenta abonar, y se
 * queda esperando el cliente que la búsqueda devuelva.
 *
 * Al abrir el modal ahí, el cliente se asigna al carrito —eso funciona, el log lo confirma— pero
 * la 602 se cancela sin resultado, la vista de pago se queda con lo que tenía y el cobro falla
 * con "La cuenta de cliente es obligatoria". Volver a pulsar "Cobrar" tampoco servía: esa vista
 * ya había leído el carrito al abrirse y no lo relee.
 *
 * LA SALIDA
 * Relanzar la operación que envolvía a la búsqueda. Vuelve a abrirse, esta vez leyendo un
 * carrito que YA tiene el cliente. Es hacer automáticamente lo único que funcionaba a mano.
 *
 * CÓMO SE SABE CUÁL ERA
 * Se apunta cada operación que empieza y se borra cuando termina; la última que siga en curso
 * cuando llega la 602 es la que la envolvía. No se usa el correlationId: se comprobó en el log
 * que la 602 del pago no hereda el de la operación 202 sino el del flujo de pago, así que
 * compararlos no distingue nada.
 */
interface IOperacionEnCurso {
    id: any;
    request: any;
    at: number;
}

const operacionesEnCurso: IOperacionEnCurso[] = [];

/**
 * Una operación abandonada (el cajero se sale del pago sin terminar) NO emite PostOperation y
 * quedaría apuntada para siempre. Pasado este rato deja de considerarse: más vale no relanzar
 * nada que mandar al cajero a una pantalla que ya había dejado atrás.
 */
const VIGENCIA_MS: number = 60000;

export function anotarOperacionIniciada(id: any, request: any): void {
    operacionesEnCurso.push({ id: id, request: request, at: new Date().getTime() });

    // Tope de seguridad: sin PostOperation para todo, esto no puede crecer sin límite.
    if (operacionesEnCurso.length > 6) {
        operacionesEnCurso.shift();
    }
}

export function anotarOperacionTerminada(id: any): void {
    for (let i: number = operacionesEnCurso.length - 1; i >= 0; i--) {
        if (operacionesEnCurso[i].id === id) {
            operacionesEnCurso.splice(i, 1);
            return;
        }
    }
}

/**
 * Devuelve la operación que envolvía a la búsqueda, y VACÍA lo apuntado.
 *
 * Se vacía a propósito: al llegar una búsqueda de cliente, cualquier flujo anterior ya quedó
 * interrumpido y relanzarlo más tarde sería mandar al cajero a donde no está.
 */
export function tomarOperacionEnvolvente(): any {
    const ahora: number = new Date().getTime();
    let elegida: any = null;

    for (let i: number = operacionesEnCurso.length - 1; i >= 0; i--) {
        if (ahora - operacionesEnCurso[i].at <= VIGENCIA_MS) {
            elegida = operacionesEnCurso[i].request;
            break;
        }
    }

    operacionesEnCurso.length = 0;
    return elegida;
}

export function searchAndAssignCustomer(context: any, searchText: string): Promise<ClientEntities.ICancelable> {
    // Quien llama aqui viene de una operacion que hay que CANCELAR igualmente: el cliente ya
    // quedo en el carrito y la operacion original no tiene nada mas que hacer.
    return seleccionarYAsignarCliente(context, searchText)
        .then((): ClientEntities.ICancelable => ({ canceled: true }));
}

/**
 * Abre la seleccion nativa del POS, asigna el elegido al carrito y devuelve SU CUENTA.
 *
 * Devuelve la cuenta y no un ICancelable porque hay dos usos con decisiones opuestas: uno
 * necesita cancelar la operacion que lo llamo y el otro necesita DEJARLA PASAR. Con un
 * `canceled: true` fijo no habia forma de distinguir "el cajero eligio" de "el cajero se
 * arrepintio", y las dos cosas terminaban igual. Cadena vacia = no se eligio a nadie.
 */
export function seleccionarYAsignarCliente(context: any, searchText: string): Promise<string> {
    const correlationId: string = context && context.logger && context.logger.getNewCorrelationId
        ? context.logger.getNewCorrelationId()
        : "customer-inline-search";

    (window as any)[PROGRAMMATIC_KEY] = true;

    const release: (accountNumber: string) => string = (accountNumber: string): string => {
        (window as any)[PROGRAMMATIC_KEY] = false;
        (window as any)[GUARD_KEY] = false;
        return accountNumber;
    };

    return context.runtime
        .executeAsync(new SelectCustomerClientRequest<SelectCustomerClientResponse>(correlationId, searchText))
        .then((response: any): Promise<string> => {
            const selected: any = response && response.data && response.data.result;
            const accountNumber: string = (selected && selected.AccountNumber) || "";

            if (response && response.canceled) {
                return Promise.resolve(release(""));
            }

            if (!accountNumber) {
                context.logger.logError("seleccionarYAsignarCliente: la selección no devolvió AccountNumber.");
                return Promise.resolve(release(""));
            }

            return context.runtime
                .executeAsync(new SetCustomerOnCartOperationRequest<SetCustomerOnCartOperationResponse>(correlationId, accountNumber))
                .then((): string => release(accountNumber));
        })
        .catch((reason: any): string => {
            context.logger.logError("seleccionarYAsignarCliente error: " + safeStringify(reason));
            return release("");
        });
}

function safeStringify(value: any): string {
    try {
        return JSON.stringify(value);
    } catch (error) {
        return value ? value.toString() : "";
    }
}
