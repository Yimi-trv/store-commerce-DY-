import { ClientEntities } from "PosApi/Entities";
import { IPreCustomerSearchTriggerOptions, PreCustomerSearchTrigger } from "PosApi/Extend/Triggers/CustomerTriggers";
import CustomerInlineDialog, { ICustomerInlineDialogResult } from "../Controls/Dialogs/CustomerInline/CustomerInlineDialog";
import { GUARD_KEY, PROGRAMMATIC_KEY, searchAndAssignCustomer } from "./CustomerModalHelper";

export default class PreCustomerSearchModalTrigger extends PreCustomerSearchTrigger {
    public execute(options: IPreCustomerSearchTriggerOptions): Promise<ClientEntities.ICancelable> {
        if ((window as any)[GUARD_KEY] || (window as any)[PROGRAMMATIC_KEY]) {
            return Promise.resolve({ canceled: false });
        }

        // El texto que el cajero ya escribió en la barra del POS: se precarga en el modal
        // para no obligarlo a tipearlo dos veces.
        const initialSearchText: string = (options && options.searchText) || "";

        (window as any)[GUARD_KEY] = true;
        const dialog: CustomerInlineDialog = new CustomerInlineDialog();

        return dialog.open("search", null, initialSearchText)
            .then((result: ICustomerInlineDialogResult | null): Promise<ClientEntities.ICancelable> => {
                if (result && result.action === "native_search") {
                    return searchAndAssignCustomer(this.context, result.searchText || initialSearchText);
                }
                (window as any)[GUARD_KEY] = false;
                return Promise.resolve({ canceled: true });
            })
            .catch((reason: any): ClientEntities.ICancelable => {
                (window as any)[GUARD_KEY] = false;
                this.context.logger.logError("PreCustomerSearchModalTrigger error: " + JSON.stringify(reason));
                return { canceled: true };
            });
    }
}
