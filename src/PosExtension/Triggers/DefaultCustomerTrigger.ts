import { IPostProductSaleTriggerOptions, PostProductSaleTrigger } from "PosApi/Extend/Triggers/ProductTriggers";
import { GetCurrentCartClientRequest, GetCurrentCartClientResponse } from "PosApi/Consume/Cart";
import { SetCustomerOnCartOperationRequest, SetCustomerOnCartOperationResponse } from "PosApi/Consume/Cart";
import { GUARD_KEY } from "./CustomerModalHelper";

/**
 * CLIENTE DESCRIPTIVO AUTOMÁTICO AL AGREGAR PRODUCTO
 * ===================================================
 *
 * Al agregar un producto a una venta SIN cliente, se asigna el cliente descriptivo
 * (consumidor final) para que el panel de cliente nunca quede vacío y la boleta salga
 * con su cliente desde el primer artículo.
 *
 * POR QUÉ EXISTE ESTE TRIGGER
 * El cliente por defecto del canal vive en el perfil de funcionalidad de D365, y el POS lo
 * usa por debajo pero NO lo muestra en el panel: la tarjeta aparece solo con un cliente
 * asignado explícitamente al carrito. Asignarlo aquí de forma explícita hace visible la
 * tarjeta ("CLIENTE DESCRIPTIVO — TRV-000001") y deja la venta lista para boleta sin pasos
 * extra del cajero. Esta asignación NUNCA estuvo en la extensión: se agrega a pedido del
 * negocio (2026-08-20).
 *
 * CUÁNDO NO HACE NADA
 * - Si el carrito YA tiene cliente (el descriptivo u otro): asignar de nuevo sería una
 *   petición inútil por producto.
 * - Si el modal de cliente está abierto (GUARD_KEY): el cajero está eligiendo cliente en
 *   ese momento y pisarle la elección con el descriptivo sería una carrera.
 * - Si la lectura del carrito o la asignación fallan: se registra y se sigue. Un fallo de
 *   este acomodo jamás debe interrumpir la venta — es PostProductSale (no cancelable)
 *   precisamente por eso.
 */
export default class DefaultCustomerTrigger extends PostProductSaleTrigger {

    /**
     * Cuenta del cliente descriptivo (consumidor final) en este ambiente. Si HQ la cambia,
     * se cambia aquí y se reempaqueta: el perfil de funcionalidad no la expone al POS de
     * forma consultable, así que no hay de dónde leerla en runtime.
     */
    private static readonly DEFAULT_CUSTOMER_ACCOUNT: string = "TRV-000001";

    public execute(options: IPostProductSaleTriggerOptions): Promise<void> {
        if ((window as any)[GUARD_KEY]) {
            return Promise.resolve();
        }

        const correlationId: string = this.context.logger.getNewCorrelationId();

        return this.context.runtime
            .executeAsync(new GetCurrentCartClientRequest<GetCurrentCartClientResponse>(correlationId))
            .then((response: any): Promise<void> => {
                const cart: any = response && response.data && response.data.result;

                // Sin carrito no hay dónde asignar; con cliente ya puesto no hay nada que hacer.
                if (!cart || (cart.CustomerId && cart.CustomerId !== "")) {
                    return Promise.resolve();
                }

                return this.context.runtime
                    .executeAsync(new SetCustomerOnCartOperationRequest<SetCustomerOnCartOperationResponse>(
                        correlationId, DefaultCustomerTrigger.DEFAULT_CUSTOMER_ACCOUNT))
                    .then((): void => {
                        this.context.logger.logInformational(
                            "DefaultCustomerTrigger: cliente descriptivo "
                            + DefaultCustomerTrigger.DEFAULT_CUSTOMER_ACCOUNT + " asignado a la venta.");
                    });
            })
            .catch((reason: any): void => {
                // Nunca interrumpir la venta por este acomodo.
                let detail: string = "";
                try { detail = JSON.stringify(reason); } catch (e) { detail = String(reason); }
                this.context.logger.logError("DefaultCustomerTrigger error: " + detail);
            });
    }
}
