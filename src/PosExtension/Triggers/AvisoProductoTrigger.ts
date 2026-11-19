import { IPostProductSaleTriggerOptions, PostProductSaleTrigger } from "PosApi/Extend/Triggers/ProductTriggers";
import { ThemeEngine } from "../Theme/ThemeEngine";

/**
 * EL AVISO DE PRODUCTO, EN EL MOMENTO EN QUE EL PRODUCTO ENTRA
 * ============================================================
 *
 * Le pasa a ThemeEngine.anunciarVenta() cada venta, con el carrito ya actualizado, para que el
 * aviso rojo ("BOLSA DE REGALO ... 10 → 11") salga sincronizado con la linea y no detras de ella.
 * El porque completo esta en anunciarVenta().
 *
 * VA PRIMERO EN EL MANIFEST, delante de DefaultCustomerTrigger: con el primer producto de cada
 * venta ese trigger hace una ida y vuelta al servidor para poner el cliente descriptivo, y el
 * aviso no tiene que esperar detras de ella.
 *
 * Es PostProductSale, no cancelable: pase lo que pase aqui, la venta sigue. anunciarVenta() ya
 * captura sus propios errores.
 */
export default class AvisoProductoTrigger extends PostProductSaleTrigger {
    public execute(options: IPostProductSaleTriggerOptions): Promise<void> {
        ThemeEngine.anunciarVenta(
            options ? options.productSaleDetails : null,
            options ? options.cart : null);
        return Promise.resolve();
    }
}
