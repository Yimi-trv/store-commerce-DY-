import { ClientEntities } from "PosApi/Entities";
import { IOperationTriggerOptions, PreOperationTrigger } from "PosApi/Extend/Triggers/OperationTriggers";

/**
 * SONDA DE DIAGNÓSTICO — TEMPORAL
 * ================================
 *
 * Registra en la consola qué operación dispara cada botón del POS, sin interferir con ninguna:
 * siempre deja pasar la operación.
 *
 * PARA QUÉ EXISTE
 * El botón "Agregar cliente" del panel de la venta no abre el modal, y no se sabe qué operación
 * ejecuta. Los triggers actuales cubren PreCustomerSearch, PreCustomerAdd y PreCustomerEdit; si
 * ese botón usara alguna de esas, el modal se abriría. Como no lo hace, dispara otra cosa.
 *
 * CÓMO USARLA
 * Presionar el botón en cuestión y buscar en la consola (F12):
 *
 *     === OPERACION === id=612 | nombre=CustomerAdd
 *
 * Con ese número se decide si hace falta un trigger nuevo o si alcanza con los existentes.
 *
 * ELIMINAR cuando el botón "Agregar cliente" quede resuelto. Está registrada en manifest.json
 * como OperationProbeTrigger.
 */
export default class OperationProbeTrigger extends PreOperationTrigger {
    public execute(options: IOperationTriggerOptions): Promise<ClientEntities.ICancelable> {
        try {
            const request: any = options ? options.operationRequest : null;
            const operationId: any = request ? request.operationId : "(sin operationRequest)";

            // El nombre del tipo ayuda a identificar la operación cuando el id no es conocido.
            let typeName: string = "";
            if (request && request.constructor && request.constructor.name) {
                typeName = request.constructor.name;
            }

            const line: string = "=== OPERACION === id=" + operationId + " | tipo=" + typeName;

            if (typeof console !== "undefined" && console.log) {
                console.log(line);
            }
            this.context.logger.logInformational(line);
        } catch (error) {
            // Una sonda de diagnóstico jamás debe romper una operación de caja.
        }

        // Nunca cancela: solo observa.
        return Promise.resolve({ canceled: false });
    }
}
