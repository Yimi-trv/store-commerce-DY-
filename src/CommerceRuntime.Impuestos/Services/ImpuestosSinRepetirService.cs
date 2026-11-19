using System;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using System.Threading.Tasks;
using Microsoft.Dynamics.Commerce.Runtime;
using Microsoft.Dynamics.Commerce.Runtime.DataModel;
using Microsoft.Dynamics.Commerce.Runtime.Messages;
using Microsoft.Dynamics.Commerce.Runtime.Services.Messages;

namespace Trujillo.PeruEInvoicing.Impuestos.Services
{
    /// <summary>
    /// Evita repetir el motor estandar de impuestos cuando DP lo pide otra vez sobre una transaccion
    /// que no cambio. El CalculateTaxNew de DP lo invoca hasta tres veces con el MISMO request por
    /// cada recalculo del carrito, aunque ninguna linea tenga bonificacion ni percepcion.
    ///
    /// Va registrado DESPUES de DP, entre DP y el motor. Solo salta una corrida si se cumple todo:
    ///   - es el mismo objeto request que la corrida anterior, o sea el mismo recalculo;
    ///   - la transaccion es el mismo objeto que devolvio esa corrida;
    ///   - la huella completa no cambio desde que termino esa corrida.
    /// Cualquier otro caso, incluido un error armando la huella, calcula igual que sin este handler.
    ///
    /// La primera repeticion y una de cada 25 se calculan igual y se comparan contra el resultado
    /// que ya habia. Si difieren, el salto se apaga en ese proceso (ContadoresDeImpuestos).
    /// </summary>
    public class ImpuestosSinRepetirService : IRequestHandlerAsync
    {
        private static readonly ConditionalWeakTable<Request, UltimaCorrida> Ultimas =
            new ConditionalWeakTable<Request, UltimaCorrida>();

        public IEnumerable<Type> SupportedRequestTypes => new[]
        {
            typeof(CalculateTaxServiceRequest)
        };

        public async Task<Response> Execute(Request request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            var pedido = (CalculateTaxServiceRequest)request;
            ContadoresDeImpuestos.ContarPedido();

            string fiscalAntes = null;
            if (TryGetRepetida(pedido, out UltimaCorrida anterior))
            {
                if (!ContadoresDeImpuestos.TocaVerificar())
                {
                    ContadoresDeImpuestos.ContarCorridaEvitada();
                    return anterior.Respuesta;
                }

                fiscalAntes = HuellaDeTransaccion.Fiscal(pedido.Transaction);
            }

            var respuesta = await this.ExecuteNextAsync<CalculateTaxServiceResponse>(pedido).ConfigureAwait(false);
            ContadoresDeImpuestos.ContarCorridaReal();

            if (fiscalAntes != null)
            {
                Verificar(fiscalAntes, pedido.Transaction);
            }

            Recordar(pedido, respuesta);
            return respuesta;
        }

        private static bool TryGetRepetida(CalculateTaxServiceRequest pedido, out UltimaCorrida anterior)
        {
            if (ContadoresDeImpuestos.SaltoApagado
                || !Ultimas.TryGetValue(pedido, out anterior)
                || !ReferenceEquals(anterior.Transaccion, pedido.Transaction))
            {
                anterior = null;
                return false;
            }

            string huella = HuellaDeTransaccion.Completa(pedido.Transaction);
            return huella != null && huella == anterior.Huella;
        }

        private static void Verificar(string fiscalAntes, SalesTransaction transaccion)
        {
            ContadoresDeImpuestos.ContarVerificacion();
            if (fiscalAntes != HuellaDeTransaccion.Fiscal(transaccion))
            {
                ContadoresDeImpuestos.ContarDiferencia();
            }
        }

        private static void Recordar(CalculateTaxServiceRequest pedido, CalculateTaxServiceResponse respuesta)
        {
            Ultimas.Remove(pedido);

            // Si el motor devolviera otra transaccion, saltarlo dejaria a DP con datos distintos.
            if (!ReferenceEquals(respuesta.Transaction, pedido.Transaction))
            {
                return;
            }

            string huella = HuellaDeTransaccion.Completa(pedido.Transaction);
            if (huella != null)
            {
                Ultimas.Add(pedido, new UltimaCorrida(pedido.Transaction, huella, respuesta));
            }
        }

        private sealed class UltimaCorrida
        {
            public UltimaCorrida(SalesTransaction transaccion, string huella, CalculateTaxServiceResponse respuesta)
            {
                this.Transaccion = transaccion;
                this.Huella = huella;
                this.Respuesta = respuesta;
            }

            public SalesTransaction Transaccion { get; }

            public string Huella { get; }

            public CalculateTaxServiceResponse Respuesta { get; }
        }
    }
}
