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
import { TRU_GeographicData, Entities } from "../../../DataService/DataServiceRequests.g";

const GUARD_KEY: string = "__customerInlineDialogActive";

export type CustomerInlineDialogMode = "searchcreate" | "edit";

export interface ICustomerInlineDialogResult {
    mode: CustomerInlineDialogMode;
    action: string;
    customerAccountNumber?: string;
}

export default class CustomerInlineDialog extends ExtensionTemplatedDialogBase {
    private _mode: CustomerInlineDialogMode;
    private _resolve: ((result: ICustomerInlineDialogResult | null) => void) | null;
    private _currentCustomer: ProxyEntities.Customer | null;
    private _initialSearchText: string;
    private readonly _sunatService: SunatCustomerService;

    constructor() {
        super();
        this._mode = "searchcreate";
        this._resolve = null;
        this._currentCustomer = null;
        this._initialSearchText = "";
        this._sunatService = new SunatCustomerService();
    }

    public open(
        mode: string,
        customer?: ProxyEntities.Customer | null,
        initialSearchText?: string
    ): Promise<ICustomerInlineDialogResult | null> {
        this._mode = mode === "edit" ? "edit" : "searchcreate";
        this._currentCustomer = customer || null;
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
        this._bindTab(element, "searchcreate", "customerInlineTabSearchCreate");
        this._bindTab(element, "edit", "customerInlineTabEdit");

        this._bindAction(element, "customerInlineSearchCreateButton", this._processDocument.bind(this));
        this._bindAction(element, "customerInlineEditSunatButton", this._lookupSunatForEdit.bind(this));
        this._bindAction(element, "customerInlineEditButton", this._updateCustomer.bind(this));

        if (!this._currentCustomer) {
            const editTab: HTMLElement = element.querySelector("#customerInlineTabEdit") as HTMLElement;
            if (editTab) {
                editTab.style.display = "none";
            }
        }

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
            this._setValue(element, "customerInlineSearchDocument", this._initialSearchText);
        }

        if (this._currentCustomer) {
            this._setValue(element, "customerInlineEditAccount", this._currentCustomer.AccountNumber || "");
            this._setValue(element, "customerInlineEditDocument", this._sunatService.getDocumentNumber(this._currentCustomer));
            this._setValue(element, "customerInlineEditName", this._currentCustomer.Name || "");
            this._setValue(element, "customerInlineEditPhone", this._currentCustomer.Phone || "");
            this._setValue(element, "customerInlineEditEmail", this._currentCustomer.Email || "");
            this._showTextResult(element, "customerInlineEditResult", this._formatCustomerSummary(this._currentCustomer));
        }
    }

    private _processDocument(element: HTMLElement): Promise<void> {
        let rawDocument: string = this._getValue(element, "customerInlineSearchDocument");
        let documentNumber: string = this._sunatService.normalizeDocument(rawDocument);

        if (!this._sunatService.getDocumentType(documentNumber)) {
            this._showMessage(element, "Ingrese un DNI de 8 dígitos o RUC de 11 dígitos válido.");
            return Promise.resolve();
        }

        this._showMessage(element, "Paso 1: Buscando cliente en Store Commerce...");
        this._showTextResult(element, "customerInlineSearchCreateResult", "");

        return this._selectCustomerFromSystem(documentNumber)
            .then((customer: ProxyEntities.Customer | null): Promise<void> => {
                if (customer) {
                    this._showMessage(element, "Cliente encontrado en el sistema. Asignando a la venta...");
                    const accountNumber: string = customer.AccountNumber || "";
                    if (!accountNumber) {
                        this._showMessage(element, "El cliente del sistema no tiene número de cuenta.");
                        return Promise.resolve();
                    }
                    return this._setCustomerOnCart(accountNumber).then((): void => {
                        this._complete({
                            mode: "searchcreate",
                            action: "searchAndSetCustomerOnCart",
                            customerAccountNumber: accountNumber
                        });
                    });
                } else {
                    this._showMessage(element, "Paso 2: Consultando SUNAT para crear cliente...");
                    
                    return this._sunatService.lookup(documentNumber)
                        .then((sunatData: ISunatCustomerData): Promise<void> => {
                            this._showMessage(element, "Paso 3: Resolviendo dirección (Ubigeo)...");
                            return this._resolveAndCreateCustomer(element, sunatData);
                        });
                }
            });
    }

    private _resolveAndCreateCustomer(element: HTMLElement, sunatData: ISunatCustomerData): Promise<void> {
        const customer: ProxyEntities.Customer = new ProxyEntities.CustomerClass({});
        this._sunatService.applySunatIdentity(customer, sunatData);
        
        let resolvePromise: Promise<Entities.UbigeoResolutionResult | null> = Promise.resolve(null);

        if (sunatData.documentType === "RUC" && (sunatData.department || sunatData.province)) {
            const request: TRU_GeographicData.ResolveUbigeoRequest<TRU_GeographicData.ResolveUbigeoResponse> =
                new TRU_GeographicData.ResolveUbigeoRequest(sunatData.department || "", sunatData.province || "", sunatData.district || "");
            
            resolvePromise = this.context.runtime.executeAsync(request)
                .then((response: any): Entities.UbigeoResolutionResult | null => {
                    if (response && response.data && response.data.result && response.data.result.length > 0) {
                        return response.data.result[0];
                    }
                    return null;
                })
                .catch((error: any): Entities.UbigeoResolutionResult | null => {
                    this._logError("ResolveUbigeo error: " + this._stringify(error));
                    return null;
                });
        }

        return resolvePromise.then((u: Entities.UbigeoResolutionResult | null): Promise<void> => {
            if (u && u.IsValid) {
                const address: ProxyEntities.Address = new ProxyEntities.AddressClass();
                address.AddressTypeValue = 2; // Negocio
                address.ThreeLetterISORegionName = "PER";
                address.Name = "DOMICILIO FISCAL";
                address.Street = (sunatData.address || "").trim();
                address.State = u.StateId;
                address.County = u.CountyId;
                address.City = u.CityName;
                address.IsPrimary = true;
                
                customer.Addresses = [address];
            }

            this._showMessage(element, "Paso 4: Registrando cliente en D365...");
            const createRequest: CreateCustomerServiceRequest = new CreateCustomerServiceRequest(this._getCorrelationId(), customer);

            return this.context.runtime.executeAsync(createRequest)
                .then((response: any): Promise<void> => {
                    if (response.canceled || !response.data || !response.data.customer) {
                        this._showMessage(element, "La creación del cliente falló o fue cancelada.");
                        return Promise.resolve();
                    }

                    const createdCustomer: ProxyEntities.Customer = response.data.customer;
                    const accountNumber: string = createdCustomer.AccountNumber || "";

                    if (!accountNumber) {
                        this._showMessage(element, "Cliente creado pero sin número de cuenta.");
                        return Promise.resolve();
                    }

                    this._showMessage(element, "Paso 5: Asignando nuevo cliente a la venta...");
                    return this._setCustomerOnCart(accountNumber).then((): void => {
                        this._complete({
                            mode: "searchcreate",
                            action: "createAndSetCustomerOnCart",
                            customerAccountNumber: accountNumber
                        });
                    });
                });
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
            })
            .catch((): ProxyEntities.Customer | null => {
                return null;
            });
    }

    private _lookupSunatForEdit(element: HTMLElement): Promise<void> {
        const documentNumber: string = this._sunatService.normalizeDocument(this._getValue(element, "customerInlineEditDocument"));

        if (!this._sunatService.getDocumentType(documentNumber)) {
            this._showMessage(element, "Ingrese un DNI de 8 dígitos o RUC de 11 dígitos.");
            return Promise.resolve();
        }

        this._showMessage(element, "Consultando SUNAT para comparar antes de editar...");

        return this._sunatService.lookup(documentNumber)
            .then((sunatData: ISunatCustomerData): void => {
                if (!this._getValue(element, "customerInlineEditName")) {
                    this._setValue(element, "customerInlineEditName", sunatData.name || "");
                }

                const differences: string[] = this._currentCustomer ? this._sunatService.compareWithCustomer(this._currentCustomer, sunatData) : [];

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
                                    this._showMessage(element, "La actualización fue cancelada.");
                                    return Promise.resolve();
                                }

                                const updatedCustomer: ProxyEntities.Customer = response.data.customer;
                                const accountNumber: string = updatedCustomer.AccountNumber || this._getValue(element, "customerInlineEditAccount");

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
                    this._showMessage(element, "El documento debe ser válido.");
                    return Promise.resolve();
                }

                this._showMessage(element, "Validando SUNAT antes de guardar cambios...");

                return this._sunatService.lookup(documentNumber)
                    .then((sunatData: ISunatCustomerData): Promise<void> => {
                        this._sunatService.applySunatMetadata(customer, sunatData);
                        return updateWithCustomer(customer);
                    });
            });
    }

    private _setCustomerOnCart(accountNumber: string): Promise<void> {
        const request: SetCustomerOnCartOperationRequest<SetCustomerOnCartOperationResponse> =
            new SetCustomerOnCartOperationRequest(this._getCorrelationId(), accountNumber);

        return this.context.runtime.executeAsync(request)
            .then((response: any): void => {
                if (response.canceled) {
                    throw new Error("La asignación del cliente a la venta fue cancelada.");
                }
            });
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
                if (!customer) throw new Error("No se encontro el cliente en el sistema.");
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

    private _setMode(element: HTMLElement, mode: CustomerInlineDialogMode): void {
        this._mode = mode;

        this._toggle(element, "customerInlineTabSearchCreate", mode === "searchcreate");
        this._toggle(element, "customerInlineTabEdit", mode === "edit");
        this._toggle(element, "customerInlinePanelSearchCreate", mode === "searchcreate");
        this._toggle(element, "customerInlinePanelEdit", mode === "edit");

        this._showMessage(element, mode === "edit" ? "Edite el cliente actual." : "Si no existe en D365, se consultará en SUNAT automáticamente.");
    }

    private _toggle(element: HTMLElement, id: string, active: boolean): void {
        const target: HTMLElement = element.querySelector("#" + id) as HTMLElement;
        if (!target) return;
        if (active) target.classList.add("is-active");
        else target.classList.remove("is-active");
    }

    private _showMessage(element: HTMLElement, message: string): void {
        const messageElement: HTMLElement = element.querySelector("#customerInlineMessage") as HTMLElement;
        if (messageElement) messageElement.textContent = message;
    }

    private _showTextResult(element: HTMLElement, id: string, message: string): void {
        const target: HTMLElement = element.querySelector("#" + id) as HTMLElement;
        if (target) target.textContent = message || "";
    }

    private _getValue(element: HTMLElement, id: string): string {
        const target: HTMLInputElement = element.querySelector("#" + id) as HTMLInputElement;
        return target && target.value ? target.value.trim() : "";
    }

    private _setValue(element: HTMLElement, id: string, value: string): void {
        const target: HTMLInputElement = element.querySelector("#" + id) as HTMLInputElement;
        if (target) target.value = value || "";
    }

    private _formatCustomerSummary(customer: ProxyEntities.Customer): string {
        if (!customer) return "";
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
        if (sunatData.padronesText) lines.push("Padrones: " + sunatData.padronesText);
        return lines.join("\n");
    }

    private _getCorrelationId(): string {
        const logger: any = this.context && this.context.logger;
        if (logger && logger.getNewCorrelationId) return logger.getNewCorrelationId();
        return "customer-inline-" + new Date().getTime().toString();
    }

    private _complete(result: ICustomerInlineDialogResult): void {
        (window as any)[GUARD_KEY] = false;
        if (this._resolve) {
            this._resolve(result);
            this._resolve = null;
        }
        this.closeDialog();
    }

    private _closeClickHandler(): boolean {
        (window as any)[GUARD_KEY] = false;
        if (this._resolve) {
            this._resolve(null);
            this._resolve = null;
        }
        return true;
    }

    private _getErrorMessage(reason: any): string {
        if (reason && reason.message) return reason.message;
        return "No se pudo completar la acción. Revise el log del POS.";
    }

    private _stringify(value: any): string {
        try { return JSON.stringify(value); } catch (error) { return value ? value.toString() : ""; }
    }

    private _logError(message: string): void {
        if (this.context && this.context.logger) this.context.logger.logError(message);
    }
}
