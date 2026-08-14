import { ClientEntities } from "PosApi/Entities";
import { IPreCustomerSearchTriggerOptions, PreCustomerSearchTrigger } from "PosApi/Extend/Triggers/CustomerTriggers";
import CustomerInlineDialog from "../Controls/Dialogs/CustomerInline/CustomerInlineDialog";

const GUARD_KEY = "__customerInlineDialogActive";

export default class PreCustomerSearchModalTrigger extends PreCustomerSearchTrigger {
    public execute(options: IPreCustomerSearchTriggerOptions): Promise<ClientEntities.ICancelable> {
        if ((window as any)[GUARD_KEY] || (window as any)["__customerSearchProgrammatic"]) {
            return Promise.resolve({ canceled: false });
        const dialog = new CustomerInlineDialog();
        return dialog.open("search", null, "")
            .then((result: any): ClientEntities.ICancelable => {
                if (result && result.action === "native_search") {
                    return { canceled: false };
                }
                return { canceled: true };
            })
            .catch(() => {
                return { canceled: true };
            });
    }
}
