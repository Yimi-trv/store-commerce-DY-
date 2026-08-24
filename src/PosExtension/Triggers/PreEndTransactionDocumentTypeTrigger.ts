import { ClientEntities } from "PosApi/Entities";
import { IPreEndTransactionTriggerOptions, PreEndTransactionTrigger } from "PosApi/Extend/Triggers/TransactionTriggers";
import DocumentTypeRule from "../Services/DocumentTypeRule";

/**
 * Red de seguridad: impide CERRAR la transacción con un comprobante que no corresponde al
 * documento del cliente.
 *
 * El bloqueo que el cajero ve normalmente es el de PrePaymentDocumentTypeTrigger, antes de
 * cobrar. Este existe para los cierres que no pasen por ese punto —una venta en cero, un
 * camino de pago distinto— porque una vez cerrada la transacción el comprobante ya se emitió
 * y corregirlo cuesta una nota de crédito.
 *
 * Misma regla compartida (DocumentTypeRule): una regla, una implementación.
 */
export default class PreEndTransactionDocumentTypeTrigger extends PreEndTransactionTrigger {

    public execute(options: IPreEndTransactionTriggerOptions): Promise<ClientEntities.ICancelable> {
        return DocumentTypeRule.evaluateCurrentCart(this.context)
            .then((reason: string): Promise<ClientEntities.ICancelable> => {
                if (!reason) {
                    return Promise.resolve({ canceled: false });
                }

                this.context.logger.logInformational("PreEndTransactionDocumentTypeTrigger: cierre bloqueado. " + reason);

                return DocumentTypeRule.showBlockedDialog(this.context, reason)
                    .then((): ClientEntities.ICancelable => {
                        return { canceled: true };
                    });
            });
    }
}
