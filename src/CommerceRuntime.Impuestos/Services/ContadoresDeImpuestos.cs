using System;
using System.Threading;

namespace Trujillo.PeruEInvoicing.Impuestos.Services
{
    /// <summary>
    /// Contadores del proceso, publicados en el AppDomain para que TRU_Diagnostics los lea sin
    /// referenciar este ensamblado. Cada instancia del CSU lleva los suyos.
    /// </summary>
    public static class ContadoresDeImpuestos
    {
        public const string ClaveAppDomain = "TRU.ImpuestosSinRepetir";

        // Orden compartido con DiagnosticsService.RunImpuestosAsync.
        private const int Pedidos = 0;
        private const int Reales = 1;
        private const int Evitadas = 2;
        private const int Verificadas = 3;
        private const int Diferencias = 4;
        private const int Candidatas = 5;

        // Se verifica la primera repeticion y despues una de cada 25.
        private const int VerificarUnaDeCada = 25;

        private static readonly long[] Valores = Publicar();

        public static long CorridasReales => Interlocked.Read(ref Valores[Reales]);

        public static long CorridasEvitadas => Interlocked.Read(ref Valores[Evitadas]);

        public static long CorridasVerificadas => Interlocked.Read(ref Valores[Verificadas]);

        public static long DiferenciasEncontradas => Interlocked.Read(ref Valores[Diferencias]);

        /// <summary>Una diferencia apaga el salto en este proceso: se vuelve a calcular todo como antes.</summary>
        public static bool SaltoApagado => DiferenciasEncontradas > 0;

        public static void ContarPedido() => Interlocked.Increment(ref Valores[Pedidos]);

        public static void ContarCorridaReal() => Interlocked.Increment(ref Valores[Reales]);

        public static void ContarCorridaEvitada() => Interlocked.Increment(ref Valores[Evitadas]);

        public static void ContarVerificacion() => Interlocked.Increment(ref Valores[Verificadas]);

        public static void ContarDiferencia() => Interlocked.Increment(ref Valores[Diferencias]);

        public static bool TocaVerificar() =>
            Interlocked.Increment(ref Valores[Candidatas]) % VerificarUnaDeCada == 1;

        private static long[] Publicar()
        {
            long[] valores = AppDomain.CurrentDomain.GetData(ClaveAppDomain) as long[];
            if (valores == null)
            {
                valores = new long[6];
                AppDomain.CurrentDomain.SetData(ClaveAppDomain, valores);
            }
            return valores;
        }
    }
}
