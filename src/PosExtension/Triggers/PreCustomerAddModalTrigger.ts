import {
    IPreCustomerAddTriggerOptions,
    PreCustomerAddTrigger
} from "PosApi/Extend/Triggers/CustomerTriggers";
import CustomerInlineDialog from "../Controls/Dialogs/CustomerInline/CustomerInlineDialog";

export default class PreCustomerAddModalTrigger extends PreCustomerAddTrigger {
    public execute(options: IPreCustomerAddTriggerOptions): Promise<Commerce.Client.Entities.ICancelable> {
        let dialog: CustomerInlineDialog = new CustomerInlineDialog();

        return dialog.open("create")
            .then((): Commerce.Client.Entities.ICancelable => {
                return { canceled: true };
            })
            .catch((reason: any): Commerce.Client.Entities.ICancelable => {
                this.context.logger.logError("PreCustomerAddModalTrigger error: " + JSON.stringify(reason));
                return { canceled: false };
            });
    }
}
