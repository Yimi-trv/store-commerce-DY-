using System;
using System.Collections;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Globalization;
using System.Linq;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Text;
using Microsoft.Dynamics.Commerce.Runtime;
using Microsoft.Dynamics.Commerce.Runtime.DataModel;
using Microsoft.Dynamics.Commerce.Runtime.Framework;

namespace Trujillo.PeruEInvoicing.Impuestos.Services
{
    /// <summary>
    /// Convierte una transaccion en un texto comparable. Recorre las propiedades por reflexion en
    /// vez de usar una lista fija: un campo nuevo o desconocido hace que la huella cambie, y una
    /// huella distinta solo significa recalcular, que es lo seguro.
    /// </summary>
    public static class HuellaDeTransaccion
    {
        private const int MaximoDeValores = 60000;
        private const int ProfundidadMaxima = 6;
        private const char FinDeCampo = '\u001F';
        private const char FinDeEntidad = '\u001E';

        // DP las escribe entre corridas, pero solo las leen el ticket y la facturacion: el motor de
        // impuestos no las usa, asi que no justifican recalcular.
        private static readonly HashSet<string> AnotacionesDeDp = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "DPEXISTPERCEPTION_PE",
            "DPIDTYPEGOODSERVICE_PE",
            "DPPERCENTAGE_PE",
            "DPCodTipoOpeFE_PE",
            "SelectedOption"
        };

        // Version es el rowversion de la base; PersistentProperties repite GetProperties().
        private static readonly HashSet<string> PropiedadesIgnoradas = new HashSet<string>(StringComparer.Ordinal)
        {
            "Version",
            "PersistentProperties"
        };

        private static readonly HashSet<string> ColeccionesFiscales = new HashSet<string>(StringComparer.Ordinal)
        {
            "SalesLines",
            "ChargeLines",
            "TaxLines"
        };

        private static readonly ConcurrentDictionary<Type, PropertyInfo[]> PropiedadesPorTipo =
            new ConcurrentDictionary<Type, PropertyInfo[]>();

        /// <summary>Todo el estado de la transaccion. Devuelve null si no se pudo armar.</summary>
        public static string Completa(SalesTransaction transaccion)
        {
            return new Escritor(soloFiscal: false).Escribir(transaccion);
        }

        /// <summary>Solo importes, impuestos y codigos: lo que importa si el motor cambia un resultado.</summary>
        public static string Fiscal(SalesTransaction transaccion)
        {
            return new Escritor(soloFiscal: true).Escribir(transaccion);
        }

        private static PropertyInfo[] PropiedadesDe(Type tipo)
        {
            return PropiedadesPorTipo.GetOrAdd(tipo, t => t
                .GetProperties(BindingFlags.Public | BindingFlags.Instance)
                .Where(p => p.CanRead
                    && p.GetIndexParameters().Length == 0
                    && !PropiedadesIgnoradas.Contains(p.Name)
                    && !EsVistaDerivada(p.PropertyType))
                .OrderBy(p => p.Name, StringComparer.Ordinal)
                .ToArray());
        }

        // ActiveSalesLines y similares son filtros de SalesLines: recorrerlas repite lo mismo.
        private static bool EsVistaDerivada(Type tipo)
        {
            return tipo.IsGenericType && tipo.GetGenericTypeDefinition() == typeof(ReadOnlyCollection<>);
        }

        private static bool EsValorSimple(object valor)
        {
            Type tipo = valor.GetType();
            return tipo.IsPrimitive
                || tipo.IsEnum
                || valor is string
                || valor is decimal
                || valor is DateTime
                || valor is DateTimeOffset
                || valor is Guid;
        }

        private static bool EsEntidadDelCrt(Type tipo)
        {
            return tipo.Namespace != null && tipo.Namespace.StartsWith("Microsoft.Dynamics.Commerce", StringComparison.Ordinal);
        }

        private static bool EsCampoFiscal(PropertyInfo propiedad)
        {
            Type tipo = Nullable.GetUnderlyingType(propiedad.PropertyType) ?? propiedad.PropertyType;
            if (tipo == typeof(decimal))
            {
                return true;
            }

            if (ColeccionesFiscales.Contains(propiedad.Name))
            {
                return true;
            }

            bool nombraImpuesto = propiedad.Name.IndexOf("Tax", StringComparison.Ordinal) >= 0
                || propiedad.Name == "ItemId"
                || propiedad.Name == "LineId"
                || propiedad.Name == "IsIncludedInPrice";
            return nombraImpuesto && (tipo == typeof(string) || tipo == typeof(bool));
        }

        private sealed class Escritor
        {
            private readonly bool soloFiscal;
            private readonly StringBuilder texto = new StringBuilder(8192);
            private readonly HashSet<object> visitados = new HashSet<object>(ComparadorPorReferencia.Instancia);
            private int valores;

            public Escritor(bool soloFiscal)
            {
                this.soloFiscal = soloFiscal;
            }

            public string Escribir(SalesTransaction transaccion)
            {
                if (transaccion == null)
                {
                    return null;
                }

                try
                {
                    return this.Valor(transaccion, 0) ? this.texto.ToString() : null;
                }
                catch (Exception)
                {
                    // Sin huella no hay salto: la corrida se hace igual que siempre.
                    return null;
                }
            }

            private bool Valor(object valor, int profundidad)
            {
                if (++this.valores > MaximoDeValores)
                {
                    return false;
                }

                if (valor == null)
                {
                    this.texto.Append('~').Append(FinDeCampo);
                    return true;
                }

                if (EsValorSimple(valor))
                {
                    this.Simple(valor);
                    return true;
                }

                if (profundidad >= ProfundidadMaxima)
                {
                    this.texto.Append('^').Append(FinDeCampo);
                    return true;
                }

                if (valor is IEnumerable coleccion)
                {
                    return this.Coleccion(coleccion, profundidad);
                }

                if (EsEntidadDelCrt(valor.GetType()))
                {
                    return this.Entidad(valor, profundidad);
                }

                this.texto.Append(valor).Append(FinDeCampo);
                return true;
            }

            private void Simple(object valor)
            {
                if (valor is IFormattable formateable)
                {
                    this.texto.Append(formateable.ToString(null, CultureInfo.InvariantCulture));
                }
                else
                {
                    this.texto.Append(valor);
                }

                this.texto.Append(FinDeCampo);
            }

            private bool Coleccion(IEnumerable coleccion, int profundidad)
            {
                this.texto.Append('[');
                foreach (object elemento in coleccion)
                {
                    if (!this.Valor(elemento, profundidad + 1))
                    {
                        return false;
                    }
                }

                this.texto.Append(']').Append(FinDeCampo);
                return true;
            }

            private bool Entidad(object entidad, int profundidad)
            {
                // SetProperty tambien las expone como ExtensionProperties.
                if (entidad is CommerceProperty extendida && AnotacionesDeDp.Contains(extendida.Key))
                {
                    return true;
                }

                if (!this.visitados.Add(entidad))
                {
                    this.texto.Append('@').Append(FinDeCampo);
                    return true;
                }

                foreach (PropertyInfo propiedad in PropiedadesDe(entidad.GetType()))
                {
                    if (this.soloFiscal && !EsCampoFiscal(propiedad))
                    {
                        continue;
                    }

                    object valor;
                    try
                    {
                        valor = propiedad.GetValue(entidad);
                    }
                    catch (TargetInvocationException)
                    {
                        this.texto.Append(propiedad.Name).Append("=!").Append(FinDeCampo);
                        continue;
                    }

                    this.texto.Append(propiedad.Name).Append('=');
                    if (!this.Valor(valor, profundidad + 1))
                    {
                        return false;
                    }
                }

                if (!this.soloFiscal && entidad is ExtensibleObject extensible && !this.Dinamicas(extensible, profundidad))
                {
                    return false;
                }

                this.texto.Append(FinDeEntidad);
                return true;
            }

            // SetProperty guarda aqui: asi se ve isAplicaISCperUnit, que DP lee durante el calculo.
            private bool Dinamicas(ExtensibleObject extensible, int profundidad)
            {
                ParameterSet parametros = extensible.GetProperties();
                if (parametros == null)
                {
                    return true;
                }

                foreach (KeyValuePair<string, object> parametro in parametros.OrderBy(p => p.Key, StringComparer.Ordinal))
                {
                    if (AnotacionesDeDp.Contains(parametro.Key))
                    {
                        continue;
                    }

                    this.texto.Append('#').Append(parametro.Key).Append('=');
                    if (!this.Valor(parametro.Value, profundidad + 1))
                    {
                        return false;
                    }
                }

                return true;
            }
        }

        private sealed class ComparadorPorReferencia : IEqualityComparer<object>
        {
            public static readonly ComparadorPorReferencia Instancia = new ComparadorPorReferencia();

            bool IEqualityComparer<object>.Equals(object x, object y) => ReferenceEquals(x, y);

            int IEqualityComparer<object>.GetHashCode(object obj) => RuntimeHelpers.GetHashCode(obj);
        }
    }
}
