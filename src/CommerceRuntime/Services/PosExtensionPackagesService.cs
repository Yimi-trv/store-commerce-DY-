using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Threading.Tasks;
using Microsoft.Dynamics.Commerce.Runtime;
using Microsoft.Dynamics.Commerce.Runtime.DataModel;
using Microsoft.Dynamics.Commerce.Runtime.Messages;

namespace Trujillo.PeruEInvoicing.CommerceRuntime.Services
{
    /// <summary>
    /// Auto-reporta NUESTRA extensión POS (RegenerateFE) para que Store Commerce la descubra
    /// y descargue del CSU (GetExtensionPackageDefinitionsRequest, consultado al iniciar sesión).
    ///
    /// MODELO DEL API (aprendido a fuerza de 5 deploys, 2026-07-09 → 2026-07-31): la plataforma
    /// AGREGA las contribuciones de TODOS los handlers registrados para este request — cada
    /// extensión CRT auto-reporta sus paquetes POS. Por eso el handler del DP que devuelve
    /// [DP.LocalizacionPeru] es USO CORRECTO (no un hardcode malicioso como se creyó primero),
    /// y por eso el orden de composición nunca cambió el resultado.
    ///
    /// HISTORIA / LECCIÓN (no repetir): la versión v2.8.1→v2.9.1 de este handler encadenaba al
    /// handler previo y además agregaba DP.LocalizacionPeru como "fallback". Bajo agregación eso
    /// producía la lista [DP, RegenerateFE, DP] → el loader del POS cargaba el paquete del DP DOS
    /// veces → su trigger DPEndTransaction quedaba con DOS instancias → el TXT de FE se descargaba
    /// DUPLICADO en cada venta del kiosko UAT (confirmado por la traza TRV-DUP del 2026-07-31:
    /// instanciaPrimera=1, instanciaActual=2, mismo lote de recibos). También explicaba el error
    /// del componente DP "StoreReceiptsOperationRequestHandler" (la operación 4001 no puede
    /// registrarse dos veces). LA REGLA: reportar SOLO lo propio — nada de chains ni fallbacks.
    ///
    /// Este archivo se compila SOLO con -p:IncludePos=true (builds con POS).
    /// El build API-only de producción no lo incluye (prod no lleva RegenerateFE).
    /// </summary>
    public class PosExtensionPackagesService : IRequestHandlerAsync
    {
        public IEnumerable<Type> SupportedRequestTypes => new[]
        {
            typeof(GetExtensionPackageDefinitionsRequest)
        };

        public Task<Response> Execute(Request request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            var packages = new Collection<ExtensionPackageDefinition>
            {
                new ExtensionPackageDefinition
                {
                    Name = "RegenerateFE",
                    Publisher = "DP",
                    IsEnabled = true
                }
            };

            return Task.FromResult<Response>(new GetExtensionPackageDefinitionsResponse(packages));
        }
    }
}
