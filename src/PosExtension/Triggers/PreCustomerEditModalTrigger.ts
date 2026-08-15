import {
    IPreCustomerEditTriggerOptions,
    PreCustomerEditTrigger
} from "PosApi/Extend/Triggers/CustomerTriggers";
import { ProxyEntities } from "PosApi/Entities";
import CustomerInlineDialog, { ICustomerInlineDialogResult } from "../Controls/Dialogs/CustomerInline/CustomerInlineDialog";
import { GUARD_KEY, searchAndAssignCustomer } from "./CustomerModalHelper";

export default class PreCustomerEditModalTrigger extends PreCustomerEditTrigger {
    public execute(options: IPreCustomerEditTriggerOptions): Promise<Commerce.Client.Entities.ICancelable> {
        if ((window as any)[GUARD_KEY]) {
            return Promise.resolve({ canceled: false });
        }

        (window as any)[GUARD_KEY] = true;
        let dialog: CustomerInlineDialog = new CustomerInlineDialog();
        let customer: ProxyEntities.Customer | null = options && options.customer ? options.customer as ProxyEntities.Customer : null;

        return dialog.open("edit", customer)
            .then((result: ICustomerInlineDialogResult | null): Promise<Commerce.Client.Entities.ICancelable> => {
                if (result && result.action === "native_search") {
                    return searchAndAssignCustomer(this.context, result.searchText || "");
                }
                (window as any)[GUARD_KEY] = false;
                return Promise.resolve({ canceled: true });
            })
            .catch((reason: any): Commerce.Client.Entities.ICancelable => {
                (window as any)[GUARD_KEY] = false;
                this.context.logger.logError("PreCustomerEditModalTrigger error: " + JSON.stringify(reason));
                return { canceled: false };
            });
    }
}
