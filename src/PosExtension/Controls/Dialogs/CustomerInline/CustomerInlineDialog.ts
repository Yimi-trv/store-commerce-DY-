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
    GetCurrentCartClientRequest,
    GetCurrentCartClientResponse,
    SetCustomerOnCartOperationRequest,
    SetCustomerOnCartOperationResponse
} from "PosApi/Consume/Cart";
import {
    GetChannelConfigurationClientRequest,
    GetChannelConfigurationClientResponse
} from "PosApi/Consume/Device";
import { ProxyEntities } from "PosApi/Entities";
import SunatCustomerService, { ISunatCustomerData } from "../../../Services/SunatCustomerService";
import { TRU_Diagnostics, TRU_GeographicData, Entities } from "../../../DataService/DataServiceRequests.g";

const GUARD_KEY: string = "__customerInlineDialogActive";

/**
 * Prefijo de soporte. Escribirlo en el campo de búsqueda ejecuta un diagnóstico de esquema
 * en vez de una búsqueda: `__diag:CUST` lista las columnas de los objetos del channel DB que
 * contienen "CUST". Es la única vía para inspeccionar el esquema en entornos donde no se
 * pueden lanzar peticiones a Retail Server a mano.
 *
 * Deliberadamente sin UI propia: no debe aparecerle al cajero. Eliminar cuando la búsqueda
 * de clientes dentro del modal esté terminada.
 */
const DIAG_PREFIX: string = "__diag:";

export type CustomerInlineDialogMode = "search" | "create" | "edit";

export interface ICustomerInlineDialogResult {
    mode: CustomerInlineDialogMode;
    action: string;
    customerAccountNumber?: string;
    /** Texto que el cajero escribió en la pestaña Buscar; lo consume el trigger que abrió el modal. */
    searchText?: string;
}

export default class CustomerInlineDialog extends ExtensionTemplatedDialogBase {
    private _mode: CustomerInlineDialogMode;
    private _resolve: ((result: ICustomerInlineDialogResult | null) => void) | null;
    private _currentCustomer: ProxyEntities.Customer | null;
    private _initialSearchText: string;
    private readonly _sunatService: SunatCustomerService;
    private _lastSunatData: ISunatCustomerData | null;

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

    /**
     * El SDK del POS no expone una búsqueda de clientes que devuelva datos sin abrir UI
     * (`SelectCustomerClientRequest` siempre dibuja la grilla nativa). Por eso el modal no
     * resuelve la búsqueda: cierra y delega en el trigger que lo abrió, pasándole el texto
     * escrito. El trigger es quien sigue vivo después de cerrar el diálogo y puede ejecutar
     * la búsqueda y la asignación al carrito sin trabajar sobre un DOM ya destruido.
     */
    private _executeSearch(element: HTMLElement, isPagination: boolean = false): Promise<void> {
        const searchText: string = this._getValue(element, "customerInlineSearchText") || this._initialSearchText;

        if (searchText.indexOf(DIAG_PREFIX) === 0) {
            return this._runSchemaDiagnostic(element, searchText.substring(DIAG_PREFIX.length));
        }

        this.closeDialog();
        if (this._resolve) {
            this._resolve({
                mode: "search",
                action: "native_search",
                searchText: searchText
            });
            this._resolve = null;
        }
        return Promise.resolve();
    }

    /**
     * Ejecuta un modo del endpoint TRU_Diagnostics y vuelca el resultado en la consola del
     * navegador, que es de donde el soporte puede copiarlo cuando no hay acceso para lanzar
     * peticiones contra Retail Server.
     *
     * Sintaxis: `__diag:CUST` (modo Columns, patrón CUST) o `__diag:Views|` (modo explícito,
     * parámetro tras la barra).
     *
     * La salida se parte en bloques: el logger del POS trunca a 8192 caracteres y el listado
     * de columnas del channel DB los supera con holgura.
     */
    private _runSchemaDiagnostic(element: HTMLElement, argument: string): Promise<void> {
        let mode: string = "Columns";
        let parameter: string = argument;

        const separatorIndex: number = argument.indexOf("|");
        if (separatorIndex >= 0) {
            mode = argument.substring(0, separatorIndex) || "Columns";
            parameter = argument.substring(separatorIndex + 1);
        }

        this._showMessage(element, "Ejecutando diagnóstico " + mode + " (" + parameter + ")...");
        this._showTextResult(element, "customerInlineSearchResult", "");

        const request: TRU_Diagnostics.RunRequest<TRU_Diagnostics.RunResponse> =
            new TRU_Diagnostics.RunRequest(mode, parameter);

        return this.context.runtime.executeAsync(request)
            .then((response: any): void => {
                const rows: any[] = (response && response.data && response.data.result) || [];
                const first: any = rows.length > 0 ? rows[0] : null;
                const text: string = (first && (first.TxtContent || first.ErrorMessage)) || "(sin contenido)";
                const header: string = "=== TRU_Diagnostics " + mode + " '" + parameter + "' ===";

                this._logChunked(header, text);
                this._showTextResult(element, "customerInlineSearchResult", text);
                this._showMessage(element, "Diagnóstico listo. Copie el bloque desde la consola (F12).");
            })
            .catch((reason: any): void => {
                const message: string = this._getErrorMessage(reason);
                this._logChunked("=== TRU_Diagnostics " + mode + " FALLÓ ===", message);
                this._showTextResult(element, "customerInlineSearchResult", message);
                this._showMessage(element, "El diagnóstico falló: " + message);
            });
    }

    private _logChunked(header: string, body: string): void {
        const CHUNK_SIZE: number = 3000;
        const logger: any = this.context && this.context.logger;

        if (typeof console !== "undefined" && console.log) {
            console.log(header + "\n" + body);
        }

        for (let start: number = 0, part: number = 1; start < body.length; start += CHUNK_SIZE, part++) {
            const chunk: string = header + " [" + part + "] " + body.substring(start, start + CHUNK_SIZE);
            if (logger && logger.logInformational) {
                logger.logInformational(chunk);
            }
        }
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
            let addressStreet = this._getValue(element, "customerInlineCreateAddress");
            
            if ((u && u.IsValid) || addressStreet) {
                const addressPurpose = this._getValue(element, "customerInlineCreateAddressPurpose") || "Negocio";
                
                const address: ProxyEntities.Address = new ProxyEntities.AddressClass();
                address.ThreeLetterISORegionName = "PER";
                address.Name = addressPurpose;
                address.Street = addressStreet;
                address.IsPrimary = true;
                
                if (addressPurpose === "Entrega") {
                    address.AddressTypeValue = 1; // Delivery
                } else if (addressPurpose === "Factura") {
                    address.AddressTypeValue = 4; // Invoice
                } else if (addressPurpose === "Casa") {
                    address.AddressTypeValue = 3; // Home
                } else {
                    address.AddressTypeValue = 2; // Business / Office / Default
                }
                
                address.ExtensionProperties = [];
                
                if (u && u.IsValid) {
                    address.State = u.StateId;
                    address.County = u.CountyId;
                    address.City = u.CityName;
                    address.DistrictName = sunatData.district || "";
                }
                
                customer.Addresses = [address];
            }

            this._showMessage(element, "Paso 2: Aplicando valores por defecto del canal...");

            return this._applyChannelDefaults(customer).then((): Promise<void> => {
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

                        // El cliente se asigna al carrito ANTES de cerrar el diálogo. Si se cierra
                        // primero, este request corre sobre un diálogo destruido y cualquier fallo
                        // se pierde en silencio (el cliente queda creado pero no asignado).
                        this._showMessage(element, "Paso 4: Asignando nuevo cliente a la venta...");

                        return this._setCustomerOnCart(accountNumber)
                            .then((): void => {
                                this._complete({
                                    mode: "create",
                                    action: "createAndSetCustomerOnCart",
                                    customerAccountNumber: accountNumber
                                });
                            })
                            .catch((reason: any): void => {
                                this._logError("SetCustomerOnCart error: " + this._stringify(reason));
                                this._showMessage(
                                    element,
                                    "Cliente " + accountNumber + " creado, pero no se pudo asignar a la venta: "
                                    + this._getErrorMessage(reason));
                            });
                    });
            });
        });
    }

    /**
     * Rellena los campos que la pantalla estándar CustomerAddEditView completa desde la
     * configuración del canal antes de guardar. Un Customer construido a mano con
     * `new CustomerClass({})` los deja en undefined y Retail Server revienta con una
     * excepción no manejada (HTTP 400 + "Server exception is not in expected format",
     * string_29274) en lugar de un error de validación legible.
     *
     * AccountNumber es el único campo NO opcional de la entidad Customer: para un alta
     * debe viajar como cadena vacía, nunca ausente.
     *
     * Best-effort: si alguna consulta de configuración falla, se continúa con lo que se
     * haya podido resolver — el alta con datos incompletos es preferible a bloquear la venta.
     */
    private _applyChannelDefaults(customer: ProxyEntities.Customer): Promise<void> {
        if (!customer.AccountNumber) {
            customer.AccountNumber = "";
        }

        const channelPromise: Promise<void> = this.context.runtime
            .executeAsync(new GetChannelConfigurationClientRequest<GetChannelConfigurationClientResponse>(this._getCorrelationId()))
            .then((response: any): void => {
                const config: any = response && response.data && response.data.result;
                if (!config) {
                    return;
                }
                if (!customer.CurrencyCode && config.Currency) {
                    customer.CurrencyCode = config.Currency;
                }
                if (!customer.Language && config.DefaultLanguageId) {
                    customer.Language = config.DefaultLanguageId;
                }
                if (!customer.ReceiptSettings && config.ReceiptSettingsValue) {
                    customer.ReceiptSettings = config.ReceiptSettingsValue;
                }
            })
            .catch((reason: any): void => {
                this._logError("GetChannelConfiguration error: " + this._stringify(reason));
            });

        // CustomerGroup no viaja en ChannelConfiguration. Se toma del cliente que la venta
        // ya tiene asignado (el cliente por defecto del canal cuando el cajero no eligió otro),
        // que por definición es un cliente válido de este canal.
        return channelPromise
            .then((): Promise<ProxyEntities.Customer | null> => {
                if (customer.CustomerGroup) {
                    return Promise.resolve(null);
                }
                return this.context.runtime
                    .executeAsync(new GetCurrentCartClientRequest<GetCurrentCartClientResponse>(this._getCorrelationId()))
                    .then((response: any): Promise<ProxyEntities.Customer | null> => {
                        const cart: any = response && response.data && response.data.result;
                        const templateAccount: string = (cart && cart.CustomerId) || "";
                        if (!templateAccount) {
                            return Promise.resolve(null);
                        }
                        return this._getCustomerByAccount(templateAccount);
                    });
            })
            .then((template: ProxyEntities.Customer | null): void => {
                if (!template) {
                    return;
                }
                if (!customer.CustomerGroup && template.CustomerGroup) {
                    customer.CustomerGroup = template.CustomerGroup;
                }
                if (!customer.CurrencyCode && template.CurrencyCode) {
                    customer.CurrencyCode = template.CurrencyCode;
                }
                if (!customer.Language && template.Language) {
                    customer.Language = template.Language;
                }
            })
            .catch((reason: any): void => {
                this._logError("Channel defaults (template customer) error: " + this._stringify(reason));
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

                                return this._setCustomerOnCart(accountNumber)
                                    .then((): void => {
                                        this._complete({
                                            mode: "edit",
                                            action: "updateAndSetCustomerOnCart",
                                            customerAccountNumber: accountNumber
                                        });
                                    })
                                    .catch((reason: any): void => {
                                        this._logError("SetCustomerOnCart error: " + this._stringify(reason));
                                        this._showMessage(
                                            element,
                                            "Cliente actualizado, pero no se pudo asignar a la venta: "
                                            + this._getErrorMessage(reason));
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
        try {
            if (typeof reason === "string") return reason;
            if (Array.isArray(reason) && reason.length > 0) {
                const first = reason[0];
                if (first && first.message) return first.message;
                if (first && first.ErrorCode) return "Error Code: " + first.ErrorCode;
                return JSON.stringify(reason);
            }
            if (reason && reason.message) return reason.message;
            if (reason && reason.ErrorCode) return "Error Code: " + reason.ErrorCode;
            if (reason) return JSON.stringify(reason);
        } catch (e) {
            // ignore
        }
        return "Error desconocido. Revise F12.";
    }

    private _stringify(value: any): string {
        try { return JSON.stringify(value); } catch (error) { return value ? value.toString() : ""; }
    }

    private _logError(message: string): void {
        if (this.context && this.context.logger) this.context.logger.logError(message);
    }
}
