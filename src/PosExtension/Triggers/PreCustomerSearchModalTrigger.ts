import {
    IPreCustomerSearchTriggerOptions,
    PreCustomerSearchTrigger
} from "PosApi/Extend/Triggers/CustomerTriggers";
import CustomerInlineDialog from "../Controls/Dialogs/CustomerInline/CustomerInlineDialog";

export default class PreCustomerSearchModalTrigger extends PreCustomerSearchTrigger {
    public execute(options: IPreCustomerSearchTriggerOptions): Promise<Commerce.Client.Entities.ICancelable> {
        let dialog: CustomerInlineDialog = new CustomerInlineDialog();
        let searchText: string = options && options.searchText ? options.searchText : "";

        return dialog.open("search", null, searchText)
            .then((): Commerce.Client.Entities.ICancelable => {
                return { canceled: true };
            })
            .catch((reason: any): Commerce.Client.Entities.ICancelable => {
                this.context.logger.logError("PreCustomerSearchModalTrigger error: " + JSON.stringify(reason));
                return { canceled: false };
            });
    }
}
