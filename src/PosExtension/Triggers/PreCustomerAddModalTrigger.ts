import {
    IPreCustomerAddTriggerOptions,
    PreCustomerAddTrigger
} from "PosApi/Extend/Triggers/CustomerTriggers";
import CustomerInlineDialog from "../Controls/Dialogs/CustomerInline/CustomerInlineDialog";

const GUARD_KEY: string = "__customerInlineDialogActive";

export default class PreCustomerAddModalTrigger extends PreCustomerAddTrigger {
    public execute(options: IPreCustomerAddTriggerOptions): Promise<Commerce.Client.Entities.ICancelable> {
        if ((window as any)[GUARD_KEY]) {
            return Promise.resolve({ canceled: false });
        }

        (window as any)[GUARD_KEY] = true;
        let dialog: CustomerInlineDialog = new CustomerInlineDialog();

        return dialog.open("create")
            .then((): Commerce.Client.Entities.ICancelable => {
                (window as any)[GUARD_KEY] = false;
                return { canceled: true };
            })
            .catch((reason: any): Commerce.Client.Entities.ICancelable => {
                (window as any)[GUARD_KEY] = false;
                this.context.logger.logError("PreCustomerAddModalTrigger error: " + JSON.stringify(reason));
                return { canceled: false };
            });
    }
}
