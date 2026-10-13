import { ClientEntities } from "PosApi/Entities";
import {
    IPreAddTenderLineTriggerOptions,
    PreAddTenderLineTrigger
} from "PosApi/Extend/Triggers/PaymentTriggers";
import ValePortadorRule from "../Services/ValePortadorRule";

/**
 * Red de seguridad del pago: antes de que la línea de pago entre al carrito.
 *
 * POR QUÉ, SI YA ESTÁ PostGetGiftCardNumber
 * Aquel trigger cubre el camino normal —el cajero pasa el vale por el lector—, pero no todo
 * pago con tarjeta regalo nace de ahí: una operación distinta, un pago recuperado de una venta
 * suspendida o un dispositivo de pago pueden traer el número por otra vía. Aquí se mira la
 * línea que de verdad va a entrar.
 *
 * Evalúa el vale de ESTA línea junto con el carrito, con la misma regla.
 */
export default class PreAddTenderLineValePortadorTrigger extends PreAddTenderLineTrigger {

    public execute(options: IPreAddTenderLineTriggerOptions): Promise<ClientEntities.ICancelable> {
        const linea: any = options ? options.tenderLine : null;
        const codigo: string = linea && linea.GiftCardId ? String(linea.GiftCardId) : "";

        // Sin tarjeta regalo de por medio no hay nada que mirar: el resto de medios de pago
        // no tienen restricción de productos.
        if (!codigo) {
            return Promise.resolve({ canceled: false });
        }

        return ValePortadorRule.evaluarVale(this.context, codigo, options ? options.cart : null)
            .then((motivo: string): Promise<ClientEntities.ICancelable> => {
                if (!motivo) {
                    return Promise.resolve({ canceled: false });
                }

                this.context.logger.logInformational(
                    "PreAddTenderLineValePortadorTrigger: pago bloqueado. " + motivo);

                return ValePortadorRule.mostrarBloqueo(this.context, motivo)
                    .then((): ClientEntities.ICancelable => {
                        return { canceled: true };
                    });
            });
    }
}
