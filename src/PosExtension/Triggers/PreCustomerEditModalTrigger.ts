import {
    IPreCustomerEditTriggerOptions,
    PreCustomerEditTrigger
} from "PosApi/Extend/Triggers/CustomerTriggers";
import { ProxyEntities } from "PosApi/Entities";
import CustomerInlineDialog from "../Controls/Dialogs/CustomerInline/CustomerInlineDialog";

export default class PreCustomerEditModalTrigger extends PreCustomerEditTrigger {
    public execute(options: IPreCustomerEditTriggerOptions): Promise<Commerce.Client.Entities.ICancelable> {
        let dialog: CustomerInlineDialog = new CustomerInlineDialog();
        let customer: ProxyEntities.Customer | null = options && options.customer ? options.customer as ProxyEntities.Customer : null;

        return dialog.open("edit", customer)
            .then((): Commerce.Client.Entities.ICancelable => {
                return { canceled: true };
            })
            .catch((reason: any): Commerce.Client.Entities.ICancelable => {
                this.context.logger.logError("PreCustomerEditModalTrigger error: " + JSON.stringify(reason));
                return { canceled: false };
            });
    }
}
