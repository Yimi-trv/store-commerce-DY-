import { IApplicationStartTriggerOptions, ApplicationStartTrigger } from "PosApi/Extend/Triggers/ApplicationTriggers";
import { ThemeEngine } from "../Theme/ThemeEngine";

export default class ApplyThemeTrigger extends ApplicationStartTrigger {
    public execute(options: IApplicationStartTriggerOptions): Promise<void> {
        ThemeEngine.iniciar();
        return Promise.resolve();
    }
}
