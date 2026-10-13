import { ClientEntities } from "PosApi/Entities";
import { IPreEndTransactionTriggerOptions, PreEndTransactionTrigger } from "PosApi/Extend/Triggers/TransactionTriggers";
import ValePortadorRule from "../Services/ValePortadorRule";

/**
 * Último neto: impide CERRAR una venta con alcohol pagada con un vale al portador.
 *
 * Los bloqueos que el cajero ve normalmente son los otros tres, antes de cobrar o al agregar
 * el artículo. Este existe para los cierres que no pasen por ninguno de ellos —una venta
 * recuperada de suspensión, un camino de pago distinto— porque, una vez cerrada, deshacerlo
 * cuesta una devolución.
 *
 * Misma regla compartida (ValePortadorRule): una regla, una implementación.
 */
export default class PreEndTransactionValePortadorTrigger extends PreEndTransactionTrigger {

    public execute(options: IPreEndTransactionTriggerOptions): Promise<ClientEntities.ICancelable> {
        // options.cart ya trae el carrito: pedirlo otra vez era una ida y vuelta por cierre.
        return ValePortadorRule.evaluarCarrito(this.context, options ? options.cart : null)
            .then((motivo: string): Promise<ClientEntities.ICancelable> => {
                if (!motivo) {
                    return Promise.resolve({ canceled: false });
                }

                this.context.logger.logInformational(
                    "PreEndTransactionValePortadorTrigger: cierre bloqueado. " + motivo);

                return ValePortadorRule.mostrarBloqueo(this.context, motivo)
                    .then((): ClientEntities.ICancelable => {
                        return { canceled: true };
                    });
            });
    }
}
