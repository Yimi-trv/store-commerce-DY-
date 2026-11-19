import { ClientEntities } from "PosApi/Entities";
import { IPrePaymentTriggerOptions, PrePaymentTrigger } from "PosApi/Extend/Triggers/PaymentTriggers";
import BotonesDePago from "../Services/BotonesDePago";

/**
 * LA OTRA MITAD DE LA PROTECCION DE LOS BOTONES DE PAGO
 * =====================================================
 *
 * BotonesDePago descarta el clic de teclado que se reprodujo en el POS web. Este trigger cubre lo
 * que no se pudo reproducir: si un pago arranca sin que nadie haya tocado un boton de pago, deja
 * constancia con el foco y las ultimas teclas. Asi un salto por otro camino se ve en el log.
 *
 * Solo anota. No cancela nunca: las reglas del cobro son de los otros triggers de PrePayment.
 */
export default class PagoSinToqueTrigger extends PrePaymentTrigger {
    public execute(options: IPrePaymentTriggerOptions): Promise<ClientEntities.ICancelable> {
        BotonesDePago.anotarPago();
        return Promise.resolve({ canceled: false });
    }
}
