import {
    CustomerAddEditCustomControlBase,
    ICustomerAddEditCustomControlContext,
    ICustomerAddEditCustomControlState,
    CustomerAddEditCustomerUpdatedData
} from "PosApi/Extend/Views/CustomerAddEditView";
import { ProxyEntities } from "PosApi/Entities";

interface IPadronDef {
    /** Key de la ExtensionProperty (idéntica a la que usa el control del DP y el server). */
    key: string;
    /** Id del placeholder en NUESTRO markup. */
    domId: string;
    /** Id del contenedor del toggle equivalente del DP (para ocultarlo). */
    dpDomId: string;
    label: string;
}

/**
 * Custom control que reemplaza los 8 toggles de padrones/condiciones del cliente localizado
 * (control CustomerFieldsPeru del DP) por toggles PROPIOS con refresco EN VIVO.
 *
 * Contexto del problema ("padrones invisibles hasta reabrir"):
 * El control del DP lee las ExtensionProperties UNA sola vez en su onReady y NO implementa
 * customerUpdatedHandler, por lo que nunca refleja valores escritos por código (p. ej. el
 * comando "Consultar SUNAT"). Este control SÍ implementa ese hook nativo del POS: cualquier
 * cambio al customer refresca los 8 toggles al instante, y todos siguen siendo editables.
 *
 * Los 3 primeros (retención, percepción, sector público) los llena SUNAT automáticamente;
 * los otros 5 son manuales. Los 8 del DP se ocultan para no duplicar UI.
 * Además sincroniza los campos Tipo/Número de documento del DP (mismo defecto de lectura única).
 */
export default class SunatPadronesControl extends CustomerAddEditCustomControlBase {

    private static readonly PADRONES: IPadronDef[] = [
        // Llenados por Consultar SUNAT (y editables):
        { key: "DPAGENTRETENTION_PE", domId: "sunat_retention_pe", dpDomId: "dpagentretention_pe", label: "Agente de retención" },
        { key: "DPAGENTPERCEPTION_PE", domId: "sunat_perception_pe", dpDomId: "dpagentperception_pe", label: "Agente de percepción" },
        { key: "DPPUBLICSECTOR_PE", domId: "sunat_publicsector_pe", dpDomId: "dppublicsector_pe", label: "Sector público" },
        // Manuales (mismo refresco en vivo, por consistencia y a prueba de futuras automatizaciones):
        { key: "DPEMERGENCYZONE_PE", domId: "sunat_emergencyzone_pe", dpDomId: "dpemergencyzone_pe", label: "Zona de emergencia" },
        { key: "DPEXONERATEDPERCEPTION_PE", domId: "sunat_exoneratedperception_pe", dpDomId: "dpexoneratedperception_pe", label: "Exonerado de percepción" },
        { key: "DPFINALCONSUMER_PE", domId: "sunat_finalconsumer_pe", dpDomId: "dpfinalconsumer_pe", label: "Consumidor final" },
        { key: "DPOTHERS_PE", domId: "sunat_others_pe", dpDomId: "dpothers_pe", label: "Otros" },
        { key: "DPNOTDOMICILED_PE", domId: "sunat_notdomiciled_pe", dpDomId: "dpnotdomiciled_pe", label: "No domiciliado" }
    ];

    private _toggles: { [key: string]: Commerce.Extensibility.IToggle } = {};

    // Evita re-escribir la property cuando el cambio del toggle proviene de una sincronización
    // programática (customerUpdatedHandler) y no de un click del cajero.
    private _isSyncing: boolean = false;

    constructor(id: string, context: ICustomerAddEditCustomControlContext) {
        super(id, context);

        // Hook nativo del POS que el control del DP omitió: se dispara cuando el cliente cambia
        // (p. ej. cuando SunatLookupCommand hace "this.customer = updatedCustomer").
        this.customerUpdatedHandler = (data: CustomerAddEditCustomerUpdatedData): void => {
            this._syncTogglesFromCustomer();
            this._syncDpDocFields();
        };
    }

    protected init(state: ICustomerAddEditCustomControlState): void {
        this.isVisible = true;
    }

    public onReady(element: HTMLElement): void {
        element.innerHTML = this._buildHtml();
        this._hideDpToggles();
        for (var i: number = 0; i < SunatPadronesControl.PADRONES.length; i++) {
            var def: IPadronDef = SunatPadronesControl.PADRONES[i];
            var toggle: Commerce.Extensibility.IToggle | null = this._createToggle(element, def);
            if (toggle) {
                this._toggles[def.key] = toggle;
            }
        }
    }

    /** Markup generado por código: única fuente de verdad (el .html del manifest es un stub). */
    private _buildHtml(): string {
        var html: string = '<div class="sunatPadronesPeru" style="margin-top:8px;margin-bottom:8px;">'
            + '<h2 style="margin-top:8px;margin-bottom:8px;">Padrones SUNAT</h2>'
            + '<div style="display:flex;flex-wrap:wrap;">';
        for (var i: number = 0; i < SunatPadronesControl.PADRONES.length; i++) {
            var def: IPadronDef = SunatPadronesControl.PADRONES[i];
            html += '<div style="display:flex;flex-direction:column;min-width:170px;margin:0 24px 12px 0;">'
                + '<label for="' + def.domId + '">' + def.label + '</label>'
                + '<div id="' + def.domId + '"></div>'
                + '</div>';
        }
        html += '</div></div>';
        return html;
    }

    private _createToggle(element: HTMLElement, def: IPadronDef): Commerce.Extensibility.IToggle | null {
        var root: HTMLDivElement = element.querySelector("#" + def.domId) as HTMLDivElement;
        if (!root) {
            this.context.logger.logError("SunatPadronesControl: no se encontró el placeholder #" + def.domId);
            return null;
        }
        var key: string = def.key;
        var options: Commerce.Extensibility.IToggleOptions = {
            tabIndex: 0,
            enabled: true,
            checked: this._readPadron(key),
            labelOn: "Sí",
            labelOff: "No"
        };
        var toggle: Commerce.Extensibility.IToggle = this.context.controlFactory.create(
            this.context.logger.getNewCorrelationId(), "Toggle", options, root);
        toggle.addEventListener("CheckedChanged", (eventData: { checked: boolean }): void => {
            // Si el cambio proviene de la sync programática, no re-escribimos (ya está en el cliente).
            if (this._isSyncing) {
                return;
            }
            this._writePadron(key, eventData.checked);
        });
        return toggle;
    }

    /** Re-lee los 8 padrones del cliente y refresca los toggles. Lo dispara customerUpdatedHandler. */
    private _syncTogglesFromCustomer(): void {
        this._isSyncing = true;
        try {
            for (var i: number = 0; i < SunatPadronesControl.PADRONES.length; i++) {
                var def: IPadronDef = SunatPadronesControl.PADRONES[i];
                var toggle: Commerce.Extensibility.IToggle = this._toggles[def.key];
                if (toggle) {
                    toggle.checked = this._readPadron(def.key);
                }
            }
        } finally {
            this._isSyncing = false;
        }
    }

    /**
     * Sincroniza los campos "Tipo documento de identidad" (select) y "Número de documento de
     * identidad" (input) del control del DP con lo que hay en las ExtensionProperties.
     * MOTIVO: el DP los lee UNA sola vez en su init() y nunca refresca — tras Consultar SUNAT
     * quedan visualmente vacíos aunque DPTYPEDOCID_PE/DPNUMBERDOCUMID_PE ya tengan los valores.
     * Al setear el valor y disparar 'change', el binding Knockout del DP actualiza su observable
     * y re-escribe la misma property (idempotente). Best-effort: si el DOM del DP no está, no hace nada.
     */
    private _syncDpDocFields(): void {
        var docType: string = this._readStringProp("DPTYPEDOCID_PE");
        var docNumber: string = this._readStringProp("DPNUMBERDOCUMID_PE");
        if (docType) {
            this._setDpSelectValue("customerPersonalizado", docType, 0);
        }
        if (docNumber) {
            this._setDpInputValue("customerdpnumberid_pe", docNumber);
        }
    }

    private _readStringProp(key: string): string {
        var customer: ProxyEntities.Customer = this.customer;
        if (!customer || !customer.ExtensionProperties) {
            return "";
        }
        for (var i: number = 0; i < customer.ExtensionProperties.length; i++) {
            var prop: ProxyEntities.CommerceProperty = customer.ExtensionProperties[i];
            if (prop.Key === key && prop.Value && prop.Value.StringValue) {
                return prop.Value.StringValue;
            }
        }
        return "";
    }

    private _setDpInputValue(domId: string, value: string): void {
        var el: HTMLInputElement = document.getElementById(domId) as HTMLInputElement;
        if (!el || el.value === value) {
            return;
        }
        el.value = value;
        this._dispatchChange(el);
    }

    /** El select del DP carga sus opciones async (getTypeDoc) — reintenta hasta que la opción exista. */
    private _setDpSelectValue(domId: string, value: string, attempt: number): void {
        var el: HTMLSelectElement = document.getElementById(domId) as HTMLSelectElement;
        if (el) {
            var hasOption: boolean = false;
            for (var i: number = 0; i < el.options.length; i++) {
                if (el.options[i].value === value) {
                    hasOption = true;
                    break;
                }
            }
            if (hasOption) {
                if (el.value !== value) {
                    el.value = value;
                    this._dispatchChange(el);
                }
                return;
            }
        }
        if (attempt < 5) {
            setTimeout((): void => { this._setDpSelectValue(domId, value, attempt + 1); }, 600);
        }
    }

    private _dispatchChange(el: HTMLElement): void {
        var evt: Event;
        try {
            evt = new Event("change", { bubbles: true });
        } catch {
            evt = document.createEvent("Event");
            evt.initEvent("change", true, false);
        }
        el.dispatchEvent(evt);
    }

    /**
     * Lee un padrón del cliente. Acepta IntegerValue (nuestro formato y el que leen el DP y el
     * servidor) y también BooleanValue (el que escribe el DP durante la sesión), por compatibilidad.
     */
    private _readPadron(key: string): boolean {
        var customer: ProxyEntities.Customer = this.customer;
        if (!customer || !customer.ExtensionProperties) {
            return false;
        }
        for (var i: number = 0; i < customer.ExtensionProperties.length; i++) {
            var prop: ProxyEntities.CommerceProperty = customer.ExtensionProperties[i];
            if (prop.Key === key && prop.Value) {
                if (prop.Value.IntegerValue === 1) {
                    return true;
                }
                if (prop.Value.BooleanValue === true) {
                    return true;
                }
                return false;
            }
        }
        return false;
    }

    /** Escribe un padrón usando IntegerValue (formato que el DP lee en onReady y que persiste el servidor). */
    private _writePadron(key: string, value: boolean): void {
        var customer: ProxyEntities.Customer = this.customer;
        if (!customer) {
            return;
        }
        if (!customer.ExtensionProperties) {
            customer.ExtensionProperties = [];
        }
        var intValue: number = value ? 1 : 0;
        for (var i: number = 0; i < customer.ExtensionProperties.length; i++) {
            if (customer.ExtensionProperties[i].Key === key) {
                customer.ExtensionProperties[i].Value = { IntegerValue: intValue };
                return;
            }
        }
        var prop: ProxyEntities.CommerceProperty = new ProxyEntities.CommercePropertyClass();
        prop.Key = key;
        prop.Value = { IntegerValue: intValue };
        customer.ExtensionProperties.push(prop);
    }

    /** Oculta los 8 toggles + labels equivalentes del control del DP para no mostrar datos duplicados. */
    private _hideDpToggles(): void {
        // (a) CSS global: robusto ante el orden de renderizado del control del DP. Oculta el toggle
        //     y su label dondequiera que el DP los renderice, sin depender del timing.
        var styleId: string = "sunatPadronesHideDpStyle";
        if (!document.getElementById(styleId)) {
            var selectors: string[] = [];
            for (var i: number = 0; i < SunatPadronesControl.PADRONES.length; i++) {
                var domId: string = SunatPadronesControl.PADRONES[i].dpDomId;
                selectors.push("#" + domId);
                selectors.push('label[for="' + domId + '"]');
            }
            var style: HTMLStyleElement = document.createElement("style");
            style.id = styleId;
            style.appendChild(document.createTextNode(selectors.join(",") + "{display:none !important;}"));
            document.head.appendChild(style);
        }

        // (b) Best-effort: ocultar además la celda contenedora del DP para no dejar huecos. Puede
        //     fallar si el DP aún no renderizó; el CSS de (a) ya cubre lo esencial.
        setTimeout((): void => {
            for (var j: number = 0; j < SunatPadronesControl.PADRONES.length; j++) {
                var node: HTMLElement | null = document.getElementById(SunatPadronesControl.PADRONES[j].dpDomId);
                while (node && (!node.className || node.className.indexOf("divTableCell") < 0)) {
                    node = node.parentElement;
                }
                if (node) {
                    node.style.display = "none";
                }
            }
        }, 0);
    }
}
