import {
    ExtensionTemplatedDialogBase,
    ITemplatedDialogOptions
} from "PosApi/Create/Dialogs";
import {
    CreateCustomerServiceRequest,
    GetCustomerClientRequest,
    GetCustomerClientResponse,
    SelectCustomerClientRequest,
    SelectCustomerClientResponse,
    UpdateCustomerServiceRequest,
} from "PosApi/Consume/Customer";
import {
    SetCustomerOnCartOperationRequest,
    SetCustomerOnCartOperationResponse
} from "PosApi/Consume/Cart";
import { ProxyEntities } from "PosApi/Entities";
import SunatCustomerService, { ISunatCustomerData } from "../../../Services/SunatCustomerService";

export type CustomerInlineDialogMode = "search" | "create" | "edit";

export interface ICustomerInlineDialogResult {
    mode: CustomerInlineDialogMode;
    action: string;
    customerAccountNumber?: string;
}

export default class CustomerInlineDialog extends ExtensionTemplatedDialogBase {
    private _mode: CustomerInlineDialogMode;
    private _resolve: ((result: ICustomerInlineDialogResult | null) => void) | null;
    private _currentCustomer: ProxyEntities.Customer | null;
    private _selectedCustomer: ProxyEntities.Customer | null;
    private _initialSearchText: string;
    private readonly _sunatService: SunatCustomerService;
    private readonly _sunatByDocument: { [documentNumber: string]: ISunatCustomerData };

    constructor() {
        super();
        this._mode = "search";
        this._resolve = null;
        this._currentCustomer = null;
        this._selectedCustomer = null;
        this._initialSearchText = "";
        this._sunatService = new SunatCustomerService();
        this._sunatByDocument = {};
    }

    public open(
        mode: CustomerInlineDialogMode,
        customer?: ProxyEntities.Customer | null,
        initialSearchText?: string
    ): Promise<ICustomerInlineDialogResult | null> {
        this._mode = mode;
        this._currentCustomer = customer || null;
        this._selectedCustomer = null;
        this._initialSearchText = initialSearchText || "";

        return new Promise((resolve: (result: ICustomerInlineDialogResult | null) => void) => {
            this._resolve = resolve;

            const dialogOptions: ITemplatedDialogOptions = {
                title: "Cliente",
                button1: {
                    id: "customerInlineClose",
                    label: "Cerrar",
                    isPrimary: true,
                    onClick: this._closeClickHandler.bind(this)
                },
                onCloseX: this._closeClickHandler.bind(this)
            };

            this.openDialog(dialogOptions);
        });
    }

    public onReady(element: HTMLElement): void {
        this._bindTab(element, "search", "customerInlineTabSearch");
        this._bindTab(element, "create", "customerInlineTabCreate");
        this._bindTab(element, "edit", "customerInlineTabEdit");

        this._bindAction(element, "customerInlineSearchButton", this._searchAndSetCustomer.bind(this));
        this._bindAction(element, "customerInlineSearchSunatButton", this._validateSearchWithSunat.bind(this));
        this._bindAction(element, "customerInlineCreateSunatButton", this._lookupSunatForCreate.bind(this));
        this._bindAction(element, "customerInlineCreateButton", this._createCustomer.bind(this));
        this._bindAction(element, "customerInlineEditSunatButton", this._lookupSunatForEdit.bind(this));
        this._bindAction(element, "customerInlineEditButton", this._updateCustomer.bind(this));

        this._prefillInitialValues(element);
        this._setMode(element, this._mode);
    }

    private _bindTab(element: HTMLElement, mode: CustomerInlineDialogMode, buttonId: string): void {
        const button: HTMLElement = element.querySelector("#" + buttonId) as HTMLElement;
        if (button) {
            button.onclick = (): void => {
                this._setMode(element, mode);
            };
        }
    }

    private _bindAction(element: HTMLElement, buttonId: string, action: (element: HTMLElement) => Promise<void>): void {
        const button: HTMLButtonElement = element.querySelector("#" + buttonId) as HTMLButtonElement;
        if (!button) {
            return;
        }

        button.onclick = (): void => {
            button.disabled = true;
            action(element).then((): void => {
                button.disabled = false;
            }).catch((reason: any): void => {
                button.disabled = false;
                this._logError(buttonId + " error: " + this._stringify(reason));
                this._showMessage(element, this._getErrorMessage(reason));
            });
        };
    }

    private _prefillInitialValues(element: HTMLElement): void {
        if (this._initialSearchText) {
            this._setValue(element, "customerInlineSearchText", this._initialSearchText);
        }

        if (this._currentCustomer) {
            this._setValue(element, "customerInlineEditAccount", this._currentCustomer.AccountNumber || "");
            this._setValue(element, "customerInlineEditDocument", this._sunatService.getDocumentNumber(this._currentCustomer));
            this._setValue(element, "customerInlineEditName", this._currentCustomer.Name || "");
            this._setValue(element, "customerInlineEditPhone", this._currentCustomer.Phone || "");
            this._setValue(element, "customerInlineEditEmail", this._currentCustomer.Email || "");
            this._showCustomerResult(element, "customerInlineEditResult", this._currentCustomer);
        }
    }

    private _searchAndSetCustomer(element: HTMLElement): Promise<void> {
        const searchText: string = this._getValue(element, "customerInlineSearchText");
        const searchType: string = this._getValue(element, "customerInlineSearchType");

        if (!searchText) {
            this._showMessage(element, "Ingrese cuenta, DNI/RUC o nombre para buscar en el sistema.");
            return Promise.resolve();
        }

        this._showMessage(element, "Buscando cliente en Store Commerce/D365...");

        return this._findCustomerInSystem(searchText, searchType)
            .then((customer: ProxyEntities.Customer | null): Promise<void> => {
                if (!customer) {
                    this._showMessage(element, "No se selecciono ningun cliente del sistema.");
                    return Promise.resolve();
                }

                this._selectedCustomer = customer;
                this._showCustomerResult(element, "customerInlineSearchResult", customer);

                const accountNumber: string = customer.AccountNumber || "";
                if (!accountNumber) {
                    this._showMessage(element, "El cliente seleccionado no tiene numero de cuenta para asignar a la venta.");
                    return Promise.resolve();
                }

                return this._setCustomerOnCart(accountNumber).then((): void => {
                    this._showMessage(element, "Cliente del sistema asignado a la venta. Puede validar SUNAT sin sobrescribir o cerrar.");
                });
            });
    }

    private _validateSearchWithSunat(element: HTMLElement): Promise<void> {
        const customer: ProxyEntities.Customer | null = this._selectedCustomer || this._currentCustomer;
        let documentNumber: string = this._sunatService.normalizeDocument(this._getValue(element, "customerInlineSearchText"));

        if (!this._sunatService.getDocumentType(documentNumber) && customer) {
            documentNumber = this._sunatService.getDocumentNumber(customer);
        }

        if (!this._sunatService.getDocumentType(documentNumber)) {
            this._showMessage(element, "Para validar SUNAT ingrese o seleccione un cliente con DNI/RUC fiscal.");
            return Promise.resolve();
        }

        this._showMessage(element, "Validando contra SUNAT sin modificar el cliente del sistema...");

        return this._getSunatData(documentNumber)
            .then((sunatData: ISunatCustomerData): void => {
                const differences: string[] = customer ? this._sunatService.compareWithCustomer(customer, sunatData) : [
                    "SUNAT validado. Seleccione el cliente del sistema para comparar trazabilidad."
                ];

                this._showTextResult(element, "customerInlineSearchResult", this._formatSunatSummary(sunatData) + "\n" + differences.join("\n"));
                this._showMessage(element, "SUNAT se uso solo como validacion. No se actualizo ningun dato del cliente.");
            });
    }

    private _lookupSunatForCreate(element: HTMLElement): Promise<void> {
        const documentNumber: string = this._sunatService.normalizeDocument(this._getValue(element, "customerInlineCreateDocument"));

        if (!this._sunatService.getDocumentType(documentNumber)) {
            this._showMessage(element, "Ingrese un DNI de 8 digitos o RUC de 11 digitos.");
            return Promise.resolve();
        }

        this._showMessage(element, "Consultando SUNAT para prellenar el cliente...");

        return this._getSunatData(documentNumber)
            .then((sunatData: ISunatCustomerData): void => {
                this._setValue(element, "customerInlineCreateName", sunatData.name || "");
                this._showTextResult(element, "customerInlineCreateSunatResult", this._formatSunatSummary(sunatData));
                this._showMessage(element, "Datos SUNAT cargados como sugerencia. Revise y confirme Crear.");
            });
    }

    private _createCustomer(element: HTMLElement): Promise<void> {
        const documentNumber: string = this._sunatService.normalizeDocument(this._getValue(element, "customerInlineCreateDocument"));

        if (!this._sunatService.getDocumentType(documentNumber)) {
            this._showMessage(element, "Para crear con trazabilidad ingrese DNI o RUC valido.");
            return Promise.resolve();
        }

        this._showMessage(element, "Validando SUNAT antes de crear el cliente...");

        return this._getSunatData(documentNumber)
            .then((sunatData: ISunatCustomerData): Promise<void> => {
                const customer: ProxyEntities.Customer = new ProxyEntities.CustomerClass({});
                this._sunatService.applySunatIdentity(customer, sunatData);
                this._applyEditableFields(
                    customer,
                    this._getValue(element, "customerInlineCreateName") || sunatData.name,
                    this._getValue(element, "customerInlineCreatePhone"),
                    this._getValue(element, "customerInlineCreateEmail")
                );

                const request: CreateCustomerServiceRequest =
                    new CreateCustomerServiceRequest(this._getCorrelationId(), customer);

                return this.context.runtime.executeAsync(request)
                    .then((response: any): Promise<void> => {
                        if (response.canceled || !response.data || !response.data.customer) {
                            this._showMessage(element, "La creacion del cliente fue cancelada o no devolvio cliente.");
                            return Promise.resolve();
                        }

                        const createdCustomer: ProxyEntities.Customer = response.data.customer;
                        const accountNumber: string = createdCustomer.AccountNumber || "";

                        if (!accountNumber) {
                            this._showCustomerResult(element, "customerInlineCreateSunatResult", createdCustomer);
                            this._showMessage(element, "Cliente creado, pero no se recibio cuenta para asignarlo a la venta.");
                            return Promise.resolve();
                        }

                        return this._setCustomerOnCart(accountNumber).then((): void => {
                            this._complete({
                                mode: "create",
                                action: "createAndSetCustomerOnCart",
                                customerAccountNumber: accountNumber
                            });
                        });
                    });
            });
    }

    private _lookupSunatForEdit(element: HTMLElement): Promise<void> {
        const documentNumber: string = this._sunatService.normalizeDocument(this._getValue(element, "customerInlineEditDocument"));

        if (!this._sunatService.getDocumentType(documentNumber)) {
            this._showMessage(element, "Ingrese un DNI de 8 digitos o RUC de 11 digitos.");
            return Promise.resolve();
        }

        this._showMessage(element, "Consultando SUNAT para comparar antes de editar...");

        return this._getSunatData(documentNumber)
            .then((sunatData: ISunatCustomerData): void => {
                if (!this._getValue(element, "customerInlineEditName")) {
                    this._setValue(element, "customerInlineEditName", sunatData.name || "");
                }

                const differences: string[] = this._currentCustomer ? this._sunatService.compareWithCustomer(this._currentCustomer, sunatData) : [
                    "SUNAT validado. Cargue la cuenta del cliente para comparar contra el sistema."
                ];

                this._showTextResult(element, "customerInlineEditResult", this._formatSunatSummary(sunatData) + "\n" + differences.join("\n"));
                this._showMessage(element, "SUNAT consultado. Revise diferencias y confirme Guardar.");
            });
    }

    private _updateCustomer(element: HTMLElement): Promise<void> {
        return this._loadCustomerForEdit(element)
            .then((customer: ProxyEntities.Customer): Promise<void> => {
                const documentNumber: string = this._sunatService.normalizeDocument(this._getValue(element, "customerInlineEditDocument"));

                this._applyEditableFields(customer, this._getValue(element, "customerInlineEditName"), this._getValue(element, "customerInlineEditPhone"), this._getValue(element, "customerInlineEditEmail"));

                const updateWithCustomer: (customerToUpdate: ProxyEntities.Customer) => Promise<void> =
                    (customerToUpdate: ProxyEntities.Customer): Promise<void> => {
                        const request: UpdateCustomerServiceRequest =
                            new UpdateCustomerServiceRequest(this._getCorrelationId(), customerToUpdate);

                        return this.context.runtime.executeAsync(request)
                            .then((response: any): Promise<void> => {
                                if (response.canceled || !response.data || !response.data.customer) {
                                    this._showMessage(element, "La actualizacion fue cancelada o no devolvio cliente.");
                                    return Promise.resolve();
                                }

                                const updatedCustomer: ProxyEntities.Customer = response.data.customer;
                                const accountNumber: string = updatedCustomer.AccountNumber || this._getValue(element, "customerInlineEditAccount");

                                if (!accountNumber) {
                                    this._showMessage(element, "Cliente actualizado, pero no se recibio cuenta para asignarlo a la venta.");
                                    return Promise.resolve();
                                }

                                return this._setCustomerOnCart(accountNumber).then((): void => {
                                    this._complete({
                                        mode: "edit",
                                        action: "updateAndSetCustomerOnCart",
                                        customerAccountNumber: accountNumber
                                    });
                                });
                            });
                    };

                if (!documentNumber) {
                    return updateWithCustomer(customer);
                }

                if (!this._sunatService.getDocumentType(documentNumber)) {
                    this._showMessage(element, "El documento de edicion debe ser DNI de 8 digitos o RUC de 11 digitos.");
                    return Promise.resolve();
                }

                this._showMessage(element, "Validando SUNAT antes de guardar cambios...");

                return this._getSunatData(documentNumber)
                    .then((sunatData: ISunatCustomerData): Promise<void> => {
                        this._sunatService.applySunatMetadata(customer, sunatData);
                        return updateWithCustomer(customer);
                    });
            });
    }

    private _findCustomerInSystem(searchText: string, searchType: string): Promise<ProxyEntities.Customer | null> {
        if (searchType === "account") {
            return this._getCustomerByAccount(searchText)
                .then((customer: ProxyEntities.Customer | null): Promise<ProxyEntities.Customer | null> => {
                    return customer ? Promise.resolve(customer) : this._selectCustomerFromSystem(searchText);
                });
        }

        return this._selectCustomerFromSystem(searchText);
    }

    private _getCustomerByAccount(accountNumber: string): Promise<ProxyEntities.Customer | null> {
        const request: GetCustomerClientRequest<GetCustomerClientResponse> =
            new GetCustomerClientRequest(accountNumber, this._getCorrelationId());

        return this.context.runtime.executeAsync(request)
            .then((response: any): ProxyEntities.Customer | null => {
                if (response.canceled || !response.data || !response.data.result) {
                    return null;
                }

                return response.data.result;
            });
    }

    private _selectCustomerFromSystem(searchText: string): Promise<ProxyEntities.Customer | null> {
        const request: SelectCustomerClientRequest<SelectCustomerClientResponse> =
            new SelectCustomerClientRequest(this._getCorrelationId(), searchText);

        return this.context.runtime.executeAsync(request)
            .then((response: any): ProxyEntities.Customer | null => {
                if (response.canceled || !response.data || !response.data.result) {
                    return null;
                }

                return response.data.result;
            });
    }

    private _setCustomerOnCart(accountNumber: string): Promise<void> {
        const request: SetCustomerOnCartOperationRequest<SetCustomerOnCartOperationResponse> =
            new SetCustomerOnCartOperationRequest(this._getCorrelationId(), accountNumber);

        return this.context.runtime.executeAsync(request)
            .then((response: any): void => {
                if (response.canceled) {
                    throw new Error("La asignacion del cliente a la venta fue cancelada.");
                }
            });
    }

    private _loadCustomerForEdit(element: HTMLElement): Promise<ProxyEntities.Customer> {
        if (this._currentCustomer) {
            return Promise.resolve(this._cloneCustomer(this._currentCustomer));
        }

        const accountNumber: string = this._getValue(element, "customerInlineEditAccount");
        if (!accountNumber) {
            return Promise.reject(new Error("Ingrese la cuenta del cliente a editar."));
        }

        return this._getCustomerByAccount(accountNumber)
            .then((customer: ProxyEntities.Customer | null): ProxyEntities.Customer => {
                if (!customer) {
                    throw new Error("No se encontro el cliente en el sistema.");
                }

                return this._cloneCustomer(customer);
            });
    }

    private _cloneCustomer(customer: ProxyEntities.Customer): ProxyEntities.Customer {
        let customerCopy: any = {};

        try {
            customerCopy = JSON.parse(JSON.stringify(customer || {}));
        } catch (error) {
            customerCopy = customer || {};
        }

        return new ProxyEntities.CustomerClass(customerCopy);
    }

    private _applyEditableFields(customer: ProxyEntities.Customer, name: string, phone: string, email: string): void {
        customer.Name = name || customer.Name || "";
        customer.Phone = phone || "";
        customer.Email = email || "";
    }

    private _getSunatData(documentNumber: string): Promise<ISunatCustomerData> {
        const normalizedDocument: string = this._sunatService.normalizeDocument(documentNumber);

        if (this._sunatByDocument[normalizedDocument]) {
            return Promise.resolve(this._sunatByDocument[normalizedDocument]);
        }

        return this._sunatService.lookup(normalizedDocument)
            .then((sunatData: ISunatCustomerData): ISunatCustomerData => {
                this._sunatByDocument[normalizedDocument] = sunatData;
                return sunatData;
            });
    }

    private _setMode(element: HTMLElement, mode: CustomerInlineDialogMode): void {
        this._mode = mode;

        this._toggle(element, "customerInlineTabSearch", mode === "search");
        this._toggle(element, "customerInlineTabCreate", mode === "create");
        this._toggle(element, "customerInlineTabEdit", mode === "edit");
        this._toggle(element, "customerInlinePanelSearch", mode === "search");
        this._toggle(element, "customerInlinePanelCreate", mode === "create");
        this._toggle(element, "customerInlinePanelEdit", mode === "edit");

        this._showMessage(element, this._getModeMessage(mode));
    }

    private _toggle(element: HTMLElement, id: string, active: boolean): void {
        const target: HTMLElement = element.querySelector("#" + id) as HTMLElement;
        if (!target) {
            return;
        }

        if (active) {
            target.classList.add("is-active");
        } else {
            target.classList.remove("is-active");
        }
    }

    private _showMessage(element: HTMLElement, message: string): void {
        const messageElement: HTMLElement = element.querySelector("#customerInlineMessage") as HTMLElement;
        if (messageElement) {
            messageElement.textContent = message;
        }
    }

    private _showCustomerResult(element: HTMLElement, id: string, customer: ProxyEntities.Customer): void {
        this._showTextResult(element, id, this._formatCustomerSummary(customer));
    }

    private _showTextResult(element: HTMLElement, id: string, message: string): void {
        const target: HTMLElement = element.querySelector("#" + id) as HTMLElement;
        if (target) {
            target.textContent = message || "";
        }
    }

    private _getModeMessage(mode: CustomerInlineDialogMode): string {
        switch (mode) {
            case "create":
                return "Cree el cliente desde la venta. SUNAT prellena, el cajero confirma.";
            case "edit":
                return "Edite el cliente sin salir de la venta. SUNAT valida antes de guardar.";
            default:
                return "Buscar usa clientes del sistema. SUNAT solo valida y no sobrescribe.";
        }
    }

    private _getValue(element: HTMLElement, id: string): string {
        const target: HTMLInputElement = element.querySelector("#" + id) as HTMLInputElement;
        return target && target.value ? target.value.trim() : "";
    }

    private _setValue(element: HTMLElement, id: string, value: string): void {
        const target: HTMLInputElement = element.querySelector("#" + id) as HTMLInputElement;
        if (target) {
            target.value = value || "";
        }
    }

    private _formatCustomerSummary(customer: ProxyEntities.Customer): string {
        if (!customer) {
            return "";
        }

        return [
            "Cliente del sistema",
            "Cuenta: " + (customer.AccountNumber || ""),
            "Nombre: " + (customer.Name || ""),
            "Documento fiscal: " + (this._sunatService.getDocumentNumber(customer) || "Sin documento")
        ].join("\n");
    }

    private _formatSunatSummary(sunatData: ISunatCustomerData): string {
        const lines: string[] = [
            "SUNAT " + sunatData.documentType + ": " + sunatData.documentNumber,
            "Nombre: " + (sunatData.name || "")
        ];

        if (sunatData.padronesText) {
            lines.push("Padrones: " + sunatData.padronesText);
        }

        if (sunatData.documentType === "RUC") {
            lines.push("Retencion: " + (sunatData.isRetentionAgent ? "Si" : "No"));
            lines.push("Percepcion: " + (sunatData.isPerceptionAgent ? "Si" : "No"));
            lines.push("Sector publico: " + (sunatData.isPublicSector ? "Si" : "No"));
        }

        return lines.join("\n");
    }

    private _getCorrelationId(): string {
        const logger: any = this.context && this.context.logger;

        if (logger && logger.getNewCorrelationId) {
            return logger.getNewCorrelationId();
        }

        return "customer-inline-" + new Date().getTime().toString();
    }

    private _complete(result: ICustomerInlineDialogResult): void {
        if (this._resolve) {
            this._resolve(result);
            this._resolve = null;
        }

        this.closeDialog();
    }

    private _closeClickHandler(): boolean {
        if (this._resolve) {
            this._resolve(null);
            this._resolve = null;
        }

        return true;
    }

    private _getErrorMessage(reason: any): string {
        if (reason && reason.message) {
            return reason.message;
        }

        return "No se pudo completar la accion. Revise el log del POS.";
    }

    private _stringify(value: any): string {
        try {
            return JSON.stringify(value);
        } catch (error) {
            return value ? value.toString() : "";
        }
    }

    private _logError(message: string): void {
        if (this.context && this.context.logger) {
            this.context.logger.logError(message);
        }
    }
}
