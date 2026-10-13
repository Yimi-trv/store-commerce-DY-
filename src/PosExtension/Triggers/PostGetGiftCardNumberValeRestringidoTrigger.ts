import { ClientEntities } from "PosApi/Entities";
import {
    IPostGetGiftCardNumberTriggerOptions,
    PostGetGiftCardNumberTrigger
} from "PosApi/Extend/Triggers/PaymentTriggers";
import ValeRestringidoRule from "../Services/ValeRestringidoRule";

/**
 * EL MOMENTO EN QUE EL CAJERO SE ENTERA.
 *
 * Dispara justo después de pasar (o tipear) el número del vale, ANTES de consultar su saldo
 * y de aplicar el pago. Si el código dice que el vale está restringido (empieza con TA):
 *
 *   · la venta tiene bebidas alcohólicas → se cancela y se dice qué productos sacar;
 *   · la venta no tiene                  → se avisa igual y se sigue.
 *
 * El aviso sin bloqueo no es ruido: el cliente todavía puede agregar una cerveza al final, y
 * entonces el cajero ya sabe por qué el POS se la va a rechazar (PreProductSale).
 *
 * POR QUÉ AQUÍ Y NO SOLO AL CERRAR
 * Es el primer punto donde se puede avisar SIN haber cobrado. Los otros tres controles
 * (PreAddTenderLine, PreProductSale, PreEndTransaction) son redes de seguridad y usan la
 * MISMA regla: duplicar la lógica es el error que ya divergió tres veces en este proyecto.
 */
export default class PostGetGiftCardNumberValeRestringidoTrigger extends PostGetGiftCardNumberTrigger {

    public execute(options: IPostGetGiftCardNumberTriggerOptions): Promise<ClientEntities.ICancelable> {
        const codigo: string = options ? options.giftCardNumber : "";
        const cart: any = options ? options.cart : null;

        if (!codigo) {
            return Promise.resolve({ canceled: false });
        }

        return ValeRestringidoRule.evaluarVale(this.context, codigo, cart)
            .then((motivo: string): Promise<ClientEntities.ICancelable> => {
                if (!motivo) {
                    return Promise.resolve({ canceled: false });
                }

                this.context.logger.logInformational(
                    "PostGetGiftCardNumberValeRestringidoTrigger: vale rechazado. " + motivo);

                return ValeRestringidoRule.mostrarBloqueo(this.context, motivo)
                    .then((): ClientEntities.ICancelable => {
                        return { canceled: true };
                    });
            });
    }
}
