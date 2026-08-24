import { ApplicationStartTrigger, IApplicationStartTriggerOptions } from "PosApi/Extend/Triggers/ApplicationTriggers";
import { GetCurrentCartClientRequest, GetCurrentCartClientResponse } from "PosApi/Consume/Cart";
import { GetCustomerClientRequest, GetCustomerClientResponse } from "PosApi/Consume/Customer";
import { ProxyEntities } from "PosApi/Entities";
import CustomerInlineDialog from "../Controls/Dialogs/CustomerInline/CustomerInlineDialog";
import { GUARD_KEY } from "./CustomerModalHelper";

/**
 * "AGREGAR DIRECCIÓN" DEL PANEL DE CLIENTE ABRE EL MODAL DE EDICIÓN
 * =================================================================
 *
 * Cuando el cliente asignado a la venta no tiene dirección, el panel muestra un "+ Agregar
 * dirección". Ese botón llevaba a la pantalla nativa, donde la dirección se escribe a mano
 * sin ubigeo validado — justo lo que el modal resuelve.
 *
 * POR QUÉ SE INTERCEPTA POR DOM Y NO CON UN TRIGGER
 * No hay trigger para esa acción. Los `PreCustomerSearch/Add/Edit` no se disparan (verificado:
 * el botón no abre el modal aunque esos triggers están registrados) y en el enum de
 * operaciones del SDK no existe ninguna de "agregar dirección" — el POS navega directo.
 * OperationProbeTrigger sigue registrando cada operación en consola: si algún día aparece un
 * id para esto, conviene cambiar a esa vía, que es más estable.
 *
 * CÓMO SE IDENTIFICA EL BOTÓN
 * Por su texto, dentro del panel de cliente. El proyecto tiene una regla de no detectar por
 * texto (gotcha del tema), y se respeta donde hay una clase estructural que usar; aquí no la
 * hay, así que se acota el riesgo:
 *
 *   - solo se mira DENTRO del panel de cliente, nunca en toda la pantalla;
 *   - se aceptan las variantes en español e inglés del rótulo;
 *   - si no se reconoce nada, NO se toca el click y el POS hace lo de siempre.
 *
 * Cada intercepción se registra en consola con el rótulo y las clases del elemento, para
 * poder afinar la detección sin adivinar si algún día cambia.
 */
export default class CustomerPanelAddressTrigger extends ApplicationStartTrigger {

    /** El listener se instala UNA vez por sesión del POS. */
    private static readonly INSTALLED_KEY: string = "__customerPanelAddressHooked";

    private static readonly LABELS: string[] = [
        "AGREGAR DIRECCION",
        "ANADIR DIRECCION",
        "ADD ADDRESS",
        "ADD AN ADDRESS",
        "NEW ADDRESS"
    ];

    public execute(options: IApplicationStartTriggerOptions): Promise<void> {
        if (typeof document === "undefined" || (window as any)[CustomerPanelAddressTrigger.INSTALLED_KEY]) {
            return Promise.resolve();
        }

        (window as any)[CustomerPanelAddressTrigger.INSTALLED_KEY] = true;

        // Fase de CAPTURA: es la única forma de quedarse con el click antes de que el POS lo
        // procese y navegue. En fase de burbuja ya sería tarde.
        document.addEventListener("click", (event: Event): void => {
            this._onDocumentClick(event);
        }, true);

        this.context.logger.logInformational(
            "CustomerPanelAddressTrigger: intercepcion de 'Agregar direccion' instalada.");

        return Promise.resolve();
    }

    private _onDocumentClick(event: Event): void {
        try {
            if ((window as any)[GUARD_KEY]) {
                return;
            }

            const clickable: HTMLElement | null = this._findAddressButton(event.target as HTMLElement);

            if (!clickable) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            // Sin esto, otros listeners ya registrados sobre el mismo nodo siguen corriendo y
            // el POS navega igual: cancelar la propagacion normal no alcanza.
            if (typeof (event as any).stopImmediatePropagation === "function") {
                (event as any).stopImmediatePropagation();
            }

            this.context.logger.logInformational(
                "CustomerPanelAddressTrigger: interceptado '"
                + (clickable.textContent || "").replace(/\s+/g, " ").trim()
                + "' | clases=" + (typeof clickable.className === "string" ? clickable.className : "(sin clases)"));

            this._openEditDialog();
        } catch (error) {
            // Un fallo aqui jamas debe romper la pantalla de venta: se deja pasar el click.
            this.context.logger.logError("CustomerPanelAddressTrigger error: " + String(error));
        }
    }

    /**
     * Sube desde el nodo pulsado buscando el botón de agregar dirección. Se limita a unos
     * pocos niveles: el rótulo suele estar en un `span` dentro del botón, pero subir sin tope
     * acabaría reconociendo el panel entero.
     */
    private _findAddressButton(target: HTMLElement): HTMLElement | null {
        let node: HTMLElement = target;

        for (let depth: number = 0; node && depth < 5; depth++) {
            if (this._isInsideCustomerPanel(node) && this._matchesLabel(node)) {
                return node;
            }

            node = node.parentElement;
        }

        return null;
    }

    private _isInsideCustomerPanel(node: HTMLElement): boolean {
        let current: HTMLElement = node;

        for (let depth: number = 0; current && depth < 12; depth++) {
            const id: string = current.id || "";
            const cls: string = typeof current.className === "string" ? current.className : "";

            if (id.indexOf("CustomerPanel") >= 0
                || cls.indexOf("customerPanel") >= 0
                || cls.indexOf("customerDetailsCardStyle") >= 0) {
                return true;
            }

            current = current.parentElement;
        }

        return false;
    }

    /** Compara sin acentos ni signos: el rótulo lleva tilde y a veces un "+" delante. */
    private _matchesLabel(node: HTMLElement): boolean {
        const text: string = (node.textContent || "")
            .toUpperCase()
            .replace(/[ÁÀÄÂ]/g, "A").replace(/[ÉÈËÊ]/g, "E").replace(/[ÍÌÏÎ]/g, "I")
            .replace(/[ÓÒÖÔ]/g, "O").replace(/[ÚÙÜÛ]/g, "U")
            // La Ñ se convierte ANTES de limpiar: si no, "Añadir" quedaba "A ADIR" y no casaba.
            .replace(/Ñ/g, "N")
            .replace(/[^A-Z ]/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        // Se exige coincidencia EXACTA con alguno de los rótulos conocidos. Con `indexOf` un
        // contenedor que envuelva al botón tambien casaria y se interceptarian clicks ajenos.
        for (let i: number = 0; i < CustomerPanelAddressTrigger.LABELS.length; i++) {
            if (text === CustomerPanelAddressTrigger.LABELS[i]) {
                return true;
            }
        }

        return false;
    }

    /** Abre el modal en Editar Actual con el cliente de la venta ya cargado. */
    private _openEditDialog(): void {
        const correlationId: string = this.context.logger.getNewCorrelationId();

        this.context.runtime
            .executeAsync(new GetCurrentCartClientRequest<GetCurrentCartClientResponse>(correlationId))
            .then((response: any): Promise<ProxyEntities.Customer | null> => {
                const cart: any = response && response.data && response.data.result;
                const accountNumber: string = (cart && cart.CustomerId) || "";

                if (!accountNumber) {
                    return Promise.resolve(null);
                }

                return this.context.runtime
                    .executeAsync(new GetCustomerClientRequest<GetCustomerClientResponse>(accountNumber, correlationId))
                    .then((customerResponse: any): ProxyEntities.Customer | null => {
                        return (customerResponse && customerResponse.data && customerResponse.data.result) || null;
                    });
            })
            .then((customer: ProxyEntities.Customer | null): Promise<any> => {
                if (!customer) {
                    // Sin cliente en la venta no hay nada que editar; el modal se abre en
                    // Buscar para que el cajero elija uno.
                    this.context.logger.logInformational(
                        "CustomerPanelAddressTrigger: la venta no tiene cliente; se abre el modal en Buscar.");
                }

                (window as any)[GUARD_KEY] = true;
                const dialog: CustomerInlineDialog = new CustomerInlineDialog();

                return dialog.open(customer ? "edit" : "search", customer, "");
            })
            .then((): void => {
                (window as any)[GUARD_KEY] = false;
            })
            .catch((reason: any): void => {
                (window as any)[GUARD_KEY] = false;
                let detail: string = "";
                try { detail = JSON.stringify(reason); } catch (error) { detail = String(reason); }
                this.context.logger.logError("CustomerPanelAddressTrigger: no se pudo abrir el modal: " + detail);
            });
    }
}
