import {
    IPreCustomerEditTriggerOptions,
    PreCustomerEditTrigger
} from "PosApi/Extend/Triggers/CustomerTriggers";
import { ProxyEntities } from "PosApi/Entities";
import CustomerInlineDialog from "../Controls/Dialogs/CustomerInline/CustomerInlineDialog";

const GUARD_KEY: string = "__customerInlineDialogActive";

export default class PreCustomerEditModalTrigger extends PreCustomerEditTrigger {
    public execute(options: IPreCustomerEditTriggerOptions): Promise<Commerce.Client.Entities.ICancelable> {
        if ((window as any)[GUARD_KEY]) {
            return Promise.resolve({ canceled: false });
        }

        (window as any)[GUARD_KEY] = true;
        let dialog: CustomerInlineDialog = new CustomerInlineDialog();
        let customer: ProxyEntities.Customer | null = options && options.customer ? options.customer as ProxyEntities.Customer : null;

        return dialog.open("edit", customer)
            .then((): Commerce.Client.Entities.ICancelable => {
                (window as any)[GUARD_KEY] = false;
                return { canceled: true };
            })
            .catch((reason: any): Commerce.Client.Entities.ICancelable => {
                (window as any)[GUARD_KEY] = false;
                this.context.logger.logError("PreCustomerEditModalTrigger error: " + JSON.stringify(reason));
                return { canceled: false };
            });
    }
}
