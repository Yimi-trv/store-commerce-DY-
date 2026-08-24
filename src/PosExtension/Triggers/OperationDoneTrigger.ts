import { IPostOperationTriggerOptions, PostOperationTrigger } from "PosApi/Extend/Triggers/OperationTriggers";
import { anotarOperacionTerminada } from "./CustomerModalHelper";

/**
 * BORRA LA OPERACIÓN APUNTADA CUANDO TERMINA
 * ===========================================
 *
 * La otra mitad de `anotarOperacionIniciada`. Existe para que, cuando llegue una búsqueda de
 * cliente, lo que siga apuntado sean SOLO operaciones realmente en curso.
 *
 * Sin esto, cada operación completada quedaría apuntada para siempre y la búsqueda que el cajero
 * lanza desde la venta parecería estar envuelta en otra: el modal funcionaría igual, pero al
 * cerrarlo el POS relanzaría una operación vieja y mandaría al cajero a una pantalla que ya había
 * dejado atrás. Ver el comentario largo en CustomerModalHelper.
 *
 * Es a propósito lo más barato posible: corre en CADA operación de la caja y lo único que hace es
 * recorrer una lista de seis entradas como mucho.
 */
export default class OperationDoneTrigger extends PostOperationTrigger {
    public execute(options: IPostOperationTriggerOptions): Promise<void> {
        const request: any = options ? options.operationRequest : null;
        anotarOperacionTerminada(request ? request.operationId : null);
        return Promise.resolve();
    }
}
