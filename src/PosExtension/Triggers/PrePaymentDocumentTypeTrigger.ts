import { ClientEntities } from "PosApi/Entities";
import { IPrePaymentTriggerOptions, PrePaymentTrigger } from "PosApi/Extend/Triggers/PaymentTriggers";
import DocumentTypeRule from "../Services/DocumentTypeRule";

/**
 * Impide cobrar cuando el comprobante elegido no corresponde al documento del cliente.
 *
 * POR QUÉ EN EL PAGO Y NO SOLO AL CERRAR
 * Es el primer momento en que el cajero se puede enterar SIN haber cobrado. Bloquear recién
 * en PreEndTransaction significa que ya recibió el efectivo o pasó la tarjeta y ahí se le
 * dice que no: peor experiencia y una devolución de por medio.
 *
 * PreEndTransactionDocumentTypeTrigger repite la comprobación como red de seguridad, por si
 * alguna forma de cierre no pasa por aquí. Los dos usan la MISMA regla (DocumentTypeRule);
 * duplicar la lógica es el error que ya divergió tres veces en este proyecto.
 */
export default class PrePaymentDocumentTypeTrigger extends PrePaymentTrigger {

    public execute(options: IPrePaymentTriggerOptions): Promise<ClientEntities.ICancelable> {
        // options.cart ya trae el carrito: pedirlo otra vez era una ida y vuelta por cobro.
        return DocumentTypeRule.evaluateCart(this.context, options ? options.cart : null)
            .then((reason: string): Promise<ClientEntities.ICancelable> => {
                if (!reason) {
                    return Promise.resolve({ canceled: false });
                }

                this.context.logger.logInformational("PrePaymentDocumentTypeTrigger: pago bloqueado. " + reason);

                return DocumentTypeRule.showBlockedDialog(this.context, reason)
                    .then((): ClientEntities.ICancelable => {
                        return { canceled: true };
                    });
            });
    }
}
