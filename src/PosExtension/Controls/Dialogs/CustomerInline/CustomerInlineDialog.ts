import {
    ExtensionTemplatedDialogBase,
    ITemplatedDialogOptions
} from "PosApi/Create/Dialogs";
import {
    CreateCustomerServiceRequest,
    GetCustomerClientRequest,
    GetCustomerClientResponse,
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

export type CustomerInlineDialogMode = "search" | "create" | "edit";

export interface ICustomerInlineDialogResult {
    mode: CustomerInlineDialogMode;
    action: string;
    customerAccountNumber?: string;
}

class CustomCustomerSearchRequest extends Commerce.DataService.DataServiceRequest<Commerce.DataService.DataServiceResponse> {
    constructor(keyword: string, top: number, skip: number) {
        super();
        (this as any)._entitySet = "Customers";
        (this as any)._entityType = "Customer";
        (this as any)._method = "";
        (this as any)._parameters = { 
            "$filter": `(contains(Name, '${keyword}') or IdentificationNumber eq '${keyword}' or AccountNumber eq '${keyword}')`,
            "$top": top,
            "$skip": skip
        };
        (this as any)._isAction = false;
    }
}

export default class CustomerInlineDialog extends ExtensionTemplatedDialogBase {
    private _mode: CustomerInlineDialogMode;
    private _resolve: ((result: ICustomerInlineDialogResult | null) => void) | null;
    private _currentCustomer: ProxyEntities.Customer | null;
    private _initialSearchText: string;
    private readonly _sunatService: SunatCustomerService;
    private _lastSunatData: ISunatCustomerData | null;
    
    private _searchSkip: number = 0;
    private _searchTop: number = 20;
    private _lastSearchText: string = "";

    constructor() {
        super();
        this._mode = "search";
        this._resolve = null;
        this._currentCustomer = null;
        this._initialSearchText = "";
        this._sunatService = new SunatCustomerService();
        this._lastSunatData = null;
    }

    public open(
        mode: string,
        customer?: ProxyEntities.Customer | null,
        initialSearchText?: string
    ): Promise<ICustomerInlineDialogResult | null> {
        this._mode = mode as CustomerInlineDialogMode;
        if (["search", "create", "edit"].indexOf(this._mode) === -1) {
            this._mode = "search";
        }
        
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
        this._bindTab(element, "search", "customerInlineTabSearch");
        this._bindTab(element, "create", "customerInlineTabCreate");
        this._bindTab(element, "edit", "customerInlineTabEdit");

        const searchBtn: HTMLElement = element.querySelector("#customerInlineSearchBtn");
        if (searchBtn) {
            searchBtn.onclick = () => {
                this._executeSearch(element, false);
            };
        }

        this._bindAction(element, "customerInlineCreateSunatButton", this._lookupSunatForCreate.bind(this));
        this._bindAction(element, "customerInlineCreateButton", this._executeCreate.bind(this));
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
            this._setValue(element, "customerInlineSearchText", this._initialSearchText);
            this._setValue(element, "customerInlineCreateDocument", this._initialSearchText);
        }

        if (this._currentCustomer) {
            this._setValue(element, "customerInlineEditAccount", this._currentCustomer.AccountNumber || "");
            this._setValue(element, "customerInlineEditDocument", this._sunatService.getDocumentNumber(this._currentCustomer) || "");
            this._setValue(element, "customerInlineEditName", this._currentCustomer.Name || "");
            this._setValue(element, "customerInlineEditPhone", this._currentCustomer.Phone || "");
            this._setValue(element, "customerInlineEditEmail", this._currentCustomer.Email || "");
            this._showTextResult(element, "customerInlineEditResult", this._formatCustomerSummary(this._currentCustomer));
        }
    }

    private _executeSearch(element: HTMLElement, isPagination: boolean = false): Promise<void> {
        if (!isPagination) {
            this._searchSkip = 0;
            this._lastSearchText = this._getValue(element, "customerInlineSearchText");
        }
        
        const searchText: string = this._lastSearchText.trim();
        if (!searchText) return Promise.resolve();

        const container = element.querySelector("#customerInlineSearchResultsContainer") as HTMLElement;
        const status = element.querySelector("#customerInlineSearchStatus") as HTMLElement;
        const tbody = element.querySelector("#customerInlineSearchResultsBody") as HTMLElement;
        
        if (container) container.style.display = "flex";
        if (status) status.innerText = "Buscando...";
        if (!isPagination && tbody) tbody.innerHTML = "";

        const searchRequest = new CustomCustomerSearchRequest(searchText, this._searchTop, this._searchSkip);

        return this.context.runtime.executeAsync(searchRequest).then((response: any) => {
            const results = (response.data && response.data.result) || [];
            this._renderSearchResults(element, results);
        }).catch((error: any) => {
            this._logError("Search error: " + this._stringify(error));
            if (status) status.innerText = "Error en la búsqueda. (Revise conexión o longitud de palabra)";
        });
    }

    private _renderSearchResults(element: HTMLElement, results: any[]): void {
        const tbody = element.querySelector("#customerInlineSearchResultsBody") as HTMLElement;
        const status = element.querySelector("#customerInlineSearchStatus") as HTMLElement;
        const nextBtn = element.querySelector("#customerInlineSearchNextBtn") as HTMLButtonElement;
        const prevBtn = element.querySelector("#customerInlineSearchPrevBtn") as HTMLButtonElement;
        
        if (!tbody) return;
        tbody.innerHTML = "";
        
        if (results.length === 0) {
            if (status) status.innerText = "No se encontraron clientes.";
        } else {
            if (status) status.innerText = `Mostrando resultados ${this._searchSkip + 1} - ${this._searchSkip + results.length}`;
            
            results.forEach((customer: any) => {
                const tr = document.createElement("tr");
                tr.style.borderBottom = "1px solid #f3f2f1";
                
                const tdDoc = document.createElement("td");
                tdDoc.style.padding = "8px";
                tdDoc.innerText = customer.IdentificationNumber || "";
                
                const tdName = document.createElement("td");
                tdName.style.padding = "8px";
                tdName.innerText = customer.Name || [customer.FirstName, customer.LastName].join(" ").trim() || "";
                
                const tdAccount = document.createElement("td");
                tdAccount.style.padding = "8px";
                tdAccount.innerText = customer.AccountNumber || "";
                
                const tdAction = document.createElement("td");
                tdAction.style.padding = "8px";
                const btn = document.createElement("button");
                btn.innerText = "Elegir";
                btn.style.padding = "4px 8px";
                btn.style.background = "#0063b1";
                btn.style.color = "white";
                btn.style.border = "none";
                btn.style.cursor = "pointer";
                btn.onclick = () => {
                    this._selectCustomerFromSearch(customer.AccountNumber);
                };
                tdAction.appendChild(btn);
                
                tr.appendChild(tdDoc);
                tr.appendChild(tdName);
                tr.appendChild(tdAccount);
                tr.appendChild(tdAction);
                tbody.appendChild(tr);
            });
        }
        
        if (prevBtn) {
            prevBtn.disabled = this._searchSkip === 0;
            prevBtn.onclick = () => {
                this._searchSkip = Math.max(0, this._searchSkip - this._searchTop);
                this._executeSearch(element, true);
            };
        }
        
        if (nextBtn) {
            nextBtn.disabled = results.length < this._searchTop;
            nextBtn.onclick = () => {
                this._searchSkip += this._searchTop;
                this._executeSearch(element, true);
            };
        }
    }

    private _selectCustomerFromSearch(accountNumber: string): void {
        this.closeDialog();
        
        setTimeout(() => {
            const cartRequest: SetCustomerOnCartOperationRequest<SetCustomerOnCartOperationResponse> = new SetCustomerOnCartOperationRequest(this._getCorrelationId(), accountNumber);
            this.context.runtime.executeAsync(cartRequest).catch((error) => {
                this._logError("Error SetCustomerOnCartOperationRequest: " + this._stringify(error));
            });
        }, 500);
    }

    private _lookupSunatForCreate(element: HTMLElement): Promise<void> {
        let rawDocument: string = this._getValue(element, "customerInlineCreateDocument");
        let documentNumber: string = this._sunatService.normalizeDocument(rawDocument);

        if (!this._sunatService.getDocumentType(documentNumber)) {
            this._showMessage(element, "Ingrese un DNI de 8 dígitos o RUC de 11 dígitos válido.");
            return Promise.resolve();
        }

        this._showMessage(element, "Consultando SUNAT...");
        this._showTextResult(element, "customerInlineCreateResult", "");
        
        return this._sunatService.lookup(documentNumber)
            .then((sunatData: ISunatCustomerData): void => {
                this._lastSunatData = sunatData;
                this._setValue(element, "customerInlineCreateName", sunatData.name || "");
                this._setValue(element, "customerInlineCreateAddress", sunatData.address || "");
                this._setValue(element, "customerInlineCreateDepartment", sunatData.department || "");
                this._setValue(element, "customerInlineCreateProvince", sunatData.province || "");
                this._setValue(element, "customerInlineCreateDistrict", sunatData.district || "");
                this._setValue(element, "customerInlineCreateCondition", (sunatData.raw && sunatData.raw.condicion) || "");
                this._setChecked(element, "customerInlineCreateRetention", sunatData.isRetentionAgent);
                this._setChecked(element, "customerInlineCreatePerception", sunatData.isPerceptionAgent);
                this._setChecked(element, "customerInlineCreatePublicSector", sunatData.isPublicSector);
                this._setChecked(element, "customerInlineCreateEmergencyZone", sunatData.isEmergencyZone);
                this._setChecked(element, "customerInlineCreateExoneratedPerception", sunatData.isExoneratedPerception);
                this._setChecked(element, "customerInlineCreateFinalConsumer", sunatData.isFinalConsumer);
                this._setChecked(element, "customerInlineCreateOthers", sunatData.isOthers);
                this._setChecked(element, "customerInlineCreateNotDomiciled", sunatData.isNotDomiciled);
                this._showTextResult(element, "customerInlineCreateResult", this._formatSunatSummary(sunatData));
                this._showMessage(element, "Datos obtenidos. Complete si falta algo y presione Crear en Sistema.");
            });
    }

    private _executeCreate(element: HTMLElement): Promise<void> {
        let rawDocument: string = this._getValue(element, "customerInlineCreateDocument");
        let documentNumber: string = this._sunatService.normalizeDocument(rawDocument);

        if (!this._sunatService.getDocumentType(documentNumber)) {
            this._showMessage(element, "Ingrese un documento válido.");
            return Promise.resolve();
        }

        const name: string = this._getValue(element, "customerInlineCreateName");
        if (!name) {
            this._showMessage(element, "El nombre/razón social es obligatorio.");
            return Promise.resolve();
        }

        this._showMessage(element, "Paso 1: Resolviendo dirección (Ubigeo)...");
        
        const sunatDataToUse: ISunatCustomerData = this._lastSunatData || {
            documentNumber: documentNumber,
            documentType: this._sunatService.getDocumentType(documentNumber) as string,
            name: name
        } as ISunatCustomerData;

        sunatDataToUse.isRetentionAgent = this._getChecked(element, "customerInlineCreateRetention");
        sunatDataToUse.isPerceptionAgent = this._getChecked(element, "customerInlineCreatePerception");
        sunatDataToUse.isPublicSector = this._getChecked(element, "customerInlineCreatePublicSector");
        sunatDataToUse.isEmergencyZone = this._getChecked(element, "customerInlineCreateEmergencyZone");
        sunatDataToUse.isExoneratedPerception = this._getChecked(element, "customerInlineCreateExoneratedPerception");
        sunatDataToUse.isFinalConsumer = this._getChecked(element, "customerInlineCreateFinalConsumer");
        sunatDataToUse.isOthers = this._getChecked(element, "customerInlineCreateOthers");
        sunatDataToUse.isNotDomiciled = this._getChecked(element, "customerInlineCreateNotDomiciled");
        sunatDataToUse.address = this._getValue(element, "customerInlineCreateAddress");
        sunatDataToUse.department = this._getValue(element, "customerInlineCreateDepartment");
        sunatDataToUse.province = this._getValue(element, "customerInlineCreateProvince");
        sunatDataToUse.district = this._getValue(element, "customerInlineCreateDistrict");

        return this._resolveAndCreateCustomer(element, sunatDataToUse, name, this._getValue(element, "customerInlineCreatePhone"), this._getValue(element, "customerInlineCreateEmail"));
    }

    private _resolveAndCreateCustomer(element: HTMLElement, sunatData: ISunatCustomerData, overrideName: string, phone: string, email: string): Promise<void> {
        const customer: ProxyEntities.Customer = new ProxyEntities.CustomerClass({});
        this._sunatService.applySunatIdentity(customer, sunatData);
        
        customer.Name = overrideName || customer.Name;
        customer.Phone = phone || "";
        customer.Email = email || "";
        
        let resolvePromise: Promise<Entities.UbigeoResolutionResult | null> = Promise.resolve(null);

        if (sunatData.department || sunatData.province || sunatData.district) {
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
            let addressStreet: string = (sunatData.address || "").trim();
            
            if ((u && u.IsValid) || addressStreet) {
                const address: ProxyEntities.Address = new ProxyEntities.AddressClass();
                address.ThreeLetterISORegionName = "PER";
                address.Name = sunatData.documentType === "RUC" ? "DOMICILIO FISCAL" : "DOMICILIO PERSONAL";
                address.Street = addressStreet;
                address.IsPrimary = true;
                
                if (u && u.IsValid) {
                    address.State = u.StateId;
                    address.County = u.CountyId;
                    address.City = u.CityName;
                    address.DistrictName = u.DistrictName;
                }
                
                address.ZipCode = ""; // Algunos entornos requieren que ZipCode no sea nulo
                
                customer.Addresses = [address];
            }

            this._showMessage(element, "Paso 3: Registrando cliente en D365...");
            const createRequest: CreateCustomerServiceRequest = new CreateCustomerServiceRequest(this._getCorrelationId(), customer);

            return this.context.runtime.executeAsync(createRequest)
                .then((response: any): Promise<void> => {
                    if (response.canceled || !response.data || !response.data.customer) {
                        this._showMessage(element, "La creación del cliente falló o fue cancelada por el sistema.");
                        return Promise.resolve();
                    }

                    const createdCustomer: ProxyEntities.Customer = response.data.customer;
                    const accountNumber: string = createdCustomer.AccountNumber || "";

                    if (!accountNumber) {
                        this._showMessage(element, "Cliente creado pero sin número de cuenta.");
                        return Promise.resolve();
                    }

                    this._showMessage(element, "Paso 4: Asignando nuevo cliente a la venta...");
                    this._complete({
                        mode: "create",
                        action: "createAndSetCustomerOnCart",
                        customerAccountNumber: accountNumber
                    });
                    
                    return new Promise((resolve) => {
                        setTimeout(() => {
                            this._setCustomerOnCart(accountNumber).then(resolve);
                        }, 500);
                    });
                });
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

                                this._complete({
                                    mode: "edit",
                                    action: "updateAndSetCustomerOnCart",
                                    customerAccountNumber: accountNumber
                                });
                                
                                return new Promise((resolve) => {
                                    setTimeout(() => {
                                        this._setCustomerOnCart(accountNumber).then(resolve);
                                    }, 500);
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

        this._toggle(element, "customerInlineTabSearch", mode === "search");
        this._toggle(element, "customerInlineTabCreate", mode === "create");
        this._toggle(element, "customerInlineTabEdit", mode === "edit");
        this._toggle(element, "customerInlinePanelSearch", mode === "search");
        this._toggle(element, "customerInlinePanelCreate", mode === "create");
        this._toggle(element, "customerInlinePanelEdit", mode === "edit");

        if (mode === "search") {
            this._showMessage(element, "Busque clientes existentes por documento, nombre o cuenta.");
        } else if (mode === "create") {
            this._showMessage(element, "El cliente será creado directamente validando la data desde SUNAT.");
        } else {
            this._showMessage(element, "Edite el cliente actual.");
        }
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

    private _getChecked(element: HTMLElement, id: string): boolean {
        const target: HTMLInputElement = element.querySelector("#" + id) as HTMLInputElement;
        return target ? target.checked : false;
    }

    private _setChecked(element: HTMLElement, id: string, value: boolean): void {
        const target: HTMLInputElement = element.querySelector("#" + id) as HTMLInputElement;
        if (target) target.checked = value || false;
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
