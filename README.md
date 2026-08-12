# Store Commerce — Terranova (Trujillo Perú E-Invoicing)

Extensión de Dynamics 365 Commerce para el CSU: **API de facturación electrónica** +
**módulo POS de clientes SUNAT** + integración de la localización Perú (DP).

## Componentes

| Componente | Qué hace |
|---|---|
| `src/CommerceRuntime` | API CRT: `TRU_SalesTransactions` (consultas con filtros/paginación), `TRU_ElectronicDocuments` (TXT FE), `TRU_GeographicData/ResolveUbigeo` (nombres SUNAT → códigos D365), `TRU_Diagnostics` (sondas del channel DB), `PosExtensionPackagesService` (descubrimiento del paquete POS) |
| `src/PosExtension` | Módulo clientes en el POS: botón **Consultar SUNAT** (RUC/DNI → datos + padrones + dirección automática validada) y **SunatPadronesControl** (8 padrones editables con refresco en vivo) |
| `src/ScaleUnit.Api` | Empaquetador: genera el `CloudScaleUnitExtensionPackage.zip` para LCS. Incluye `dp-overrides/` (guard anti descarga duplicada del TXT + fixes del DP) |
| `10.0.47-4/` | Entrega de la localización DP que el build fusiona al paquete (DLL CRT + POS + 13 SQL) |

## Requisitos

- Visual Studio 2019+ (MSBuild) · .NET SDK/runtime 8 · Node.js LTS
- El feed NuGet del Commerce SDK ya está en `nuget.config` (los `Microsoft.Dynamics.Commerce.Sdk.*` **no** están en nuget.org)

## Cómo generar el paquete

Ver la guía completa en **[`docs/empaquetado-deploy.md`](docs/empaquetado-deploy.md)**. Resumen:

```powershell
$msb = "C:\Program Files (x86)\Microsoft Visual Studio\2019\Community\MSBuild\Current\Bin\MSBuild.exe"

# Primera vez en una máquina (restore separado — juntos, el empaquetado no corre):
& $msb src\ScaleUnit.Api\Trujillo.PeruEInvoicing.ScaleUnit.csproj /t:Restore /p:Configuration=Release

# Paquete COMPLETO (API + módulo clientes POS):
& $msb src\ScaleUnit.Api\Trujillo.PeruEInvoicing.ScaleUnit.csproj /t:Build /p:Configuration=Release /p:IncludePos=true

# Paquete API-ONLY (sin módulo clientes — perfil de producción histórico):
& $msb src\ScaleUnit.Api\Trujillo.PeruEInvoicing.ScaleUnit.csproj /t:Build /p:Configuration=Release
```

Salida: `src\ScaleUnit.Api\bin\Release\netstandard2.0\CloudScaleUnitExtensionPackage.zip`

⚠ Antes de cada build para deploy: **bump de `<PackageVersion>`** en
`src/ScaleUnit.Api/Trujillo.PeruEInvoicing.ScaleUnit.csproj`.

## Deploy y prueba

1. LCS → entorno → Commerce deployment & setup → scale unit → **Update extension** → subir el ZIP (20–40 min, con downtime).
2. Validar por API (sin tocar cajas): `GET {rs}/Commerce/TRU_GeographicData/ResolveUbigeo(departamento='ANCASH',provincia='HUARAZ',distrito='HUARAZ')` responde → versión viva.
3. En la caja: **cerrar Store Commerce por completo y reabrir** (descarga la extensión nueva).
4. Prueba del módulo clientes: Nuevo cliente → Consultar SUNAT → datos/padrones/dirección automáticos → Guardar.

## Consumo de la API desde afuera

OAuth client_credentials (scope `api://{clientId}/.default`) + header `OUN` del canal.
Ejemplos y endpoints externos (perudevs RUC/DNI): [`docs/api-perudevs-curl.txt`](docs/api-perudevs-curl.txt).

## Historia y contexto

Migrado del repo `storecommerce` (solo la funcionalidad desplegada en UAT, línea v2.9.x).
El conocimiento completo del proyecto (arquitectura, gotchas, template genérico) vive en
el kit de documentación `store-commerce-project`.
