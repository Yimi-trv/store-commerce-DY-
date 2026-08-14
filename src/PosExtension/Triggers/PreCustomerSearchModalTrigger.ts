import { ClientEntities } from "PosApi/Entities";
import { IPreCustomerSearchTriggerOptions, PreCustomerSearchTrigger } from "PosApi/Extend/Triggers/CustomerTriggers";
import CustomerInlineDialog from "../Controls/Dialogs/CustomerInline/CustomerInlineDialog";

const GUARD_KEY = "__customerInlineDialogActive";

export default class PreCustomerSearchModalTrigger extends PreCustomerSearchTrigger {
    public execute(options: IPreCustomerSearchTriggerOptions): Promise<ClientEntities.ICancelable> {
        if ((window as any)[GUARD_KEY]) {
            return Promise.resolve({ canceled: false });
        }

        let searchText: string = "";

        const dialog = new CustomerInlineDialog();
        return dialog.open("search", null, searchText)
            .then((result: any): ClientEntities.ICancelable => {
                return { canceled: true };
            })
            .catch(() => {
                return { canceled: true };
            });
    }
}
