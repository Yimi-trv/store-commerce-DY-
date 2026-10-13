import { ClientEntities } from "PosApi/Entities";
import {
    IPreProductSaleTriggerOptions,
    PreProductSaleTrigger
} from "PosApi/Extend/Triggers/ProductTriggers";
import ValeRestringidoRule from "../Services/ValeRestringidoRule";

/**
 * EL ORDEN INVERSO: el vale ya está aplicado y recién entonces aparece el licor.
 *
 * Sin este control, la secuencia "paso el vale restringido → agrego una cerveza → cierro" se
 * escaparía de PostGetGiftCardNumber (que ya corrió, con un carrito todavía sin alcohol).
 * Se frena aquí, al agregar el producto, que es cuando el cajero puede explicarlo sin haber
 * cobrado nada.
 *
 * NO LE CUESTA NADA A LA CAJA CUANDO NO HAY VALE RESTRINGIDO. La regla mira primero los
 * códigos de los vales del carrito, que lee sin salir a la red; si ninguno está restringido
 * —el caso de casi todas las ventas— corta ahí. Y cuando sí lo hay, la lista de artículos
 * restringidos ya está en memoria: el chequeo es una búsqueda en un diccionario, no una ida
 * y vuelta por artículo.
 */
export default class PreProductSaleValeRestringidoTrigger extends PreProductSaleTrigger {

    public execute(options: IPreProductSaleTriggerOptions): Promise<ClientEntities.ICancelable> {
        const detalles: any[] = (options && options.productSaleDetails) || [];

        const itemIds: string[] = detalles
            .map((detalle: any): string =>
                (detalle && detalle.product && detalle.product.ItemId) ? String(detalle.product.ItemId) : "")
            .filter((itemId: string): boolean => !!itemId);

        if (itemIds.length === 0) {
            return Promise.resolve({ canceled: false });
        }

        return ValeRestringidoRule.evaluarProductos(this.context, options ? options.cart : null, itemIds)
            .then((motivo: string): Promise<ClientEntities.ICancelable> => {
                if (!motivo) {
                    return Promise.resolve({ canceled: false });
                }

                this.context.logger.logInformational(
                    "PreProductSaleValeRestringidoTrigger: artículo rechazado. " + motivo);

                return ValeRestringidoRule.mostrarBloqueo(this.context, motivo)
                    .then((): ClientEntities.ICancelable => {
                        return { canceled: true };
                    });
            });
    }
}
