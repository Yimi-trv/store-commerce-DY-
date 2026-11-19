import { IApplicationStartTriggerOptions, ApplicationStartTrigger } from "PosApi/Extend/Triggers/ApplicationTriggers";
import { ThemeEngine } from "../Theme/ThemeEngine";
import LectorCodigoBarras from "../Services/LectorCodigoBarras";
import BotonesDePago from "../Services/BotonesDePago";

export default class ApplyThemeTrigger extends ApplicationStartTrigger {
    public execute(options: IApplicationStartTriggerOptions): Promise<void> {
        // El lector va ANTES que el tema y no depende de el: si algun dia se apaga el tema
        // (TEMA_ACTIVO), la cuenta de lecturas tiene que seguir. Y tiene que estar escuchando
        // antes de la primera pasada, que ya consulta rafagaEnVuelo().
        LectorCodigoBarras.instalar(this.context);
        BotonesDePago.instalar(this.context);

        // El contexto va solo para que ThemeEngine pueda escribir sus tiempos en el log del
        // POS: en una tienda, el log es lo unico que se puede leer sin devtools.
        ThemeEngine.iniciar(this.context);
        return Promise.resolve();
    }
}
