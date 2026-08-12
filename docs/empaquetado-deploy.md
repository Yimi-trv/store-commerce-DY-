# 06 — Empaquetado y deploy

## El proyecto empaquetador (`ScaleUnit.Api`)

Referencia los otros dos y genera el ZIP:

```xml
<ItemGroup>
  <ProjectReference Include="..\CommerceRuntime\MyCompany.CommerceRuntime.csproj" />
  <!-- POS solo en builds que lo pidan explícitamente -->
  <ProjectReference Include="..\PosExtension\MyCompany.PosExtension.csproj"
                    Condition="'$(IncludePos)' == 'true'" />
</ItemGroup>
```

### El patrón de build dual (recomendado)
- **Default** (`msbuild /t:Build /p:Configuration=Release`): paquete **API-only** — para
  producción mientras el POS está en prueba.
- **Con POS** (`... /p:IncludePos=true`): paquete completo.
- Beneficio: nadie manda features POS a producción por accidente; el flag es explícito.
- Si una clase CRT solo tiene sentido con el POS (ej. el auto-reporte del paquete POS),
  excluila del build API-only:
  ```xml
  <ItemGroup Condition="'$(IncludePos)' != 'true'">
    <Compile Remove="Services\PosExtensionPackagesService.cs" />
  </ItemGroup>
  ```
  (la propiedad `/p:` es global: llega a todos los proyectos referenciados).

## Comandos

```powershell
$msb = "C:\Program Files (x86)\Microsoft Visual Studio\2019\Community\MSBuild\Current\Bin\MSBuild.exe"
# 1) restaurar + compilar + empaquetar (POS incluido)
& $msb src\ScaleUnit.Api\MyCompany.ScaleUnit.csproj /t:Restore,Build /p:Configuration=Release /p:IncludePos=true /v:minimal
# Resultado:
# src\ScaleUnit.Api\bin\Release\netstandard2.0\CloudScaleUnitExtensionPackage.zip
```
Consejo: copiá el ZIP a una carpeta `dist\` con nombre descriptivo
(`PROD_v1.2.0_ApiOnly.zip`) — `/t:Rebuild` borra `bin\` y se lleva tus copias.

## Checklist ANTES de cada build

1. **Bump de `PackageVersion`** en el csproj empaquetador (LCS distingue por versión;
   la misma versión con contenido distinto = caos).
2. Verificar el CONTENIDO del ZIP, no solo el build verde:
   - ¿Está tu DLL en `RetailServer/Code/bin/ext/`?
   - ¿`CommerceRuntime.ext.config` lista todas las assemblies esperadas?
   - ¿La carpeta POS trae tus `.js` compilados y el `manifest.json` correcto?
   - ¿Los SQL están en `Data/Upgrade/Custom/`?

## Deploy en LCS

1. LCS → entorno → **Commerce deployment & setup** → scale unit → **Update extension**.
2. Subir el ZIP → aplicar. Duración típica **20–40 min, CON downtime** del Retail Server.
3. Esperar estado **Success** (Servicing information muestra versión de extensión aplicada).

### Después del deploy
- **Config de identidad/OAuth nueva** → correr CDX **1110** en HQ y **Restart** del CSU
  *después* del 1110 (el orden importa: restart antes del 1110 = config vieja).
- **POS**: cerrar la app POR COMPLETO y reabrir (baja la extensión nueva del CSU). Logout
  solo no siempre alcanza. Si el manifest POS de un tercero no cambió de `version`, las
  cajas pueden servir caché — bump del campo `version` del manifest lo invalida.
- **Validar por API antes de tocar una caja** (30 segundos, sin downtime sorpresa):
  un endpoint tuyo que solo exista en la versión nueva responde = deploy vivo;
  `GetExtensionPackageDefinitions` lista tu paquete POS = descubrimiento OK.

## Rollback
Re-aplicar el ZIP de la versión anterior por el mismo flujo (por eso `dist\` guarda los
ZIPs versionados). Los scripts SQL ya ejecutados NO se revierten: escribilos siempre
aditivos/idempotentes.
