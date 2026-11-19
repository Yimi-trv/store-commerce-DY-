import { IPostProductSaleTriggerOptions, PostProductSaleTrigger } from "PosApi/Extend/Triggers/ProductTriggers";
import LectorCodigoBarras from "../Services/LectorCodigoBarras";

/**
 * LA OTRA MITAD DE LA CUENTA DEL LECTOR
 * =====================================
 *
 * LectorCodigoBarras ve las lecturas llegar como teclas; este trigger le avisa de cada producto
 * que DE VERDAD entra a la venta, para emparejarlo con su lectura. Sin el, el detector veria
 * escaneos pero no sabria cuales llegaron.
 *
 * PostProductSale y no Pre, a proposito: solo cuenta lo que entro. Un Pre corre tambien para los
 * productos que despues cancela otro trigger, y contarlos taparia justo la perdida que se busca.
 *
 * Y es no cancelable: pase lo que pase aqui, la venta sigue. anotarProductos() ya captura sus
 * propios errores, y aun asi esto devuelve siempre una promesa resuelta.
 */
export default class LectorProductoTrigger extends PostProductSaleTrigger {
    public execute(options: IPostProductSaleTriggerOptions): Promise<void> {
        LectorCodigoBarras.anotarProductos(options ? options.productSaleDetails : null);
        return Promise.resolve();
    }
}
