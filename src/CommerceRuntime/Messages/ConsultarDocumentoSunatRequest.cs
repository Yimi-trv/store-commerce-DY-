using System.Runtime.Serialization;
using Microsoft.Dynamics.Commerce.Runtime.Messages;

namespace Trujillo.PeruEInvoicing.CommerceRuntime.Messages
{
    /// <summary>
    /// Consulta un DNI (8 dígitos) o un RUC (11) contra los proveedores configurados.
    /// El número llega ya normalizado desde el POS; aquí se vuelve a validar el largo.
    /// </summary>
    [DataContract]
    public sealed class ConsultarDocumentoSunatRequest : Request
    {
        [DataMember]
        public string Documento { get; private set; }

        public ConsultarDocumentoSunatRequest(string documento)
        {
            Documento = documento;
        }
    }
}
