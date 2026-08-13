import {
    IPreCustomerSearchTriggerOptions,
    PreCustomerSearchTrigger
} from "PosApi/Extend/Triggers/CustomerTriggers";
import CustomerInlineDialog from "../Controls/Dialogs/CustomerInline/CustomerInlineDialog";

const GUARD_KEY: string = "__customerInlineDialogActive";

export default class PreCustomerSearchModalTrigger extends PreCustomerSearchTrigger {
    public execute(options: IPreCustomerSearchTriggerOptions): Promise<Commerce.Client.Entities.ICancelable> {
        if ((window as any)[GUARD_KEY]) {
            return Promise.resolve({ canceled: false });
        }

        (window as any)[GUARD_KEY] = true;
        let dialog: CustomerInlineDialog = new CustomerInlineDialog();
        let searchText: string = options && options.searchText ? options.searchText : "";

        return dialog.open("search", null, searchText)
            .then((): Commerce.Client.Entities.ICancelable => {
                (window as any)[GUARD_KEY] = false;
                return { canceled: true };
            })
            .catch((reason: any): Commerce.Client.Entities.ICancelable => {
                (window as any)[GUARD_KEY] = false;
                this.context.logger.logError("PreCustomerSearchModalTrigger error: " + JSON.stringify(reason));
                return { canceled: false };
            });
    }
}
