# 08 — Consumir la API del Retail Server desde afuera

Tu extensión CRT expone endpoints OData que puede consumir cualquier sistema externo
(agentes, integraciones, monitoreo) con OAuth **client_credentials**.

## 1. Registro en Azure AD (Entra)
- App registration con **client secret**.
- En D365 HQ: **Azure Active Directory applications** → dar de alta el ClientId con un
  usuario de servicio.
- HQ → configuración del canal/identidad: el **Server Resource ID** debe ser
  `api://{clientId}` — **SIN** sufijo de scope (`/access_as_application` rompe la
  validación de audiencia; nos costó un 401 de dos días).
- Después de configurar: job CDX **1110** y **Restart del CSU** (en ese orden).

## 2. Obtener token

```powershell
$body = @{
  grant_type    = "client_credentials"
  client_id     = "<clientId>"
  client_secret = "<secret>"          # en un vault, jamás hardcodeado
  scope         = "api://<clientId>/.default"
}
$tok = (Invoke-RestMethod -Uri "https://login.microsoftonline.com/<tenantId>/oauth2/v2.0/token" `
        -Method POST -Body $body).access_token
```

## 3. Llamar a la API

```powershell
$h = @{ Authorization = "Bearer $tok"; OUN = "<numeroUnidadOperativa>" }
# OUN = Operating Unit Number COMPLETO del canal (ej. "000026-MarketJSB") — sin él: 400/401

# Function OData: TODOS los parámetros presentes (vacíos como ''):
Invoke-RestMethod -Headers $h -Uri "https://<csu>-rs.su.retail.dynamics.com/Commerce/TRU_Example/Run(mode='Views',receiptId='')"
```

- La respuesta es OData: los ítems vienen en `.value`.
- El endpoint necesita `[Authorization(...{"Application"})]` para aceptar este token.

## 4. Patrones de diseño de API que pagaron dividendos

- **Listado vs detalle** (`detail=0/1`): el listado en 1 query (JOIN), el detalle con
  enriquecimientos — evita el N+1 y los timeouts en consultas masivas.
- **`top` + `skip` + filtros combinables** (todos AND, con `OrderBy` fijo) para paginación.
- **Endpoint de diagnóstico** (`TRU_Diagnostics/Run(mode=...)`): sondas de tablas/vistas
  del channel DB para soporte en entornos sin acceso a SQL. Autenticado siempre; sin PII.
- **Validación post-deploy por API**: un endpoint nuevo respondiendo = versión viva; es tu
  smoke-test de 30 segundos antes de tocar cajas.

## 5. Seguridad
- Secret en vault + **rotación** (y rotar YA si se compartió durante debugging).
- El header OUN no es seguridad, es contexto de canal: la seguridad es el token + roles.
- Auditá qué exponen tus endpoints: los de diagnóstico, sin volcados de PII.
