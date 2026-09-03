# VERSION DEL MANIFEST vs HUELLA QUE IMPRIME LA CAJA
# ==================================================
#
# El trigger de arranque escribe en consola una linea con la version del paquete. Es lo unico
# que dice, mirando una caja, que reglas trae el paquete cargado; sin ella ya se depuro un
# problema que estaba resuelto porque la caja corria un paquete anterior.
#
# El POS no expone la version del paquete en runtime (no hay API), asi que esa linea es una
# COPIA A MANO del manifest y se descuadra sola: paso dos veces en dos pulls seguidos, cuando
# se subio la version sin tocar el trigger. Este chequeo rompe el build en ese momento, en vez
# de dejar que el desfase llegue a la caja y anuncie una version distinta de la que corre.

param(
    [Parameter(Mandatory = $true)][string]$Raiz
)

$ErrorActionPreference = 'Stop'

$rutaManifest = Join-Path $Raiz 'manifest.json'
$rutaTrigger  = Join-Path $Raiz 'Triggers\CustomerPanelAddressTrigger.ts'

foreach ($ruta in @($rutaManifest, $rutaTrigger)) {
    if (-not (Test-Path $ruta)) {
        Write-Host "ERROR: no se encuentra $ruta"
        exit 1
    }
}

$versionManifest = (Get-Content $rutaManifest -Raw | ConvertFrom-Json).version

# La huella se busca por su forma, no por su posicion: el texto de las reglas cambia seguido.
$coincidencia = [regex]::Match((Get-Content $rutaTrigger -Raw), 'RegenerateFE ([0-9][0-9.]*) activo')

if (-not $coincidencia.Success) {
    Write-Host ''
    Write-Host 'ERROR: no se encontro la huella de version en CustomerPanelAddressTrigger.ts.'
    Write-Host 'Se esperaba una linea con el texto:  RegenerateFE <version> activo'
    Write-Host 'Esa linea es la que dice, mirando una caja, que paquete esta corriendo.'
    Write-Host ''
    exit 1
}

$versionHuella = $coincidencia.Groups[1].Value

if ($versionManifest -ne $versionHuella) {
    Write-Host ''
    Write-Host '--------------------------------------------------------------------'
    Write-Host " La version del manifest y la huella de la caja NO COINCIDEN"
    Write-Host ''
    Write-Host "   manifest.json                   : $versionManifest"
    Write-Host "   huella en CustomerPanelAddress. : $versionHuella"
    Write-Host ''
    Write-Host ' Si se despliega asi, la caja anuncia una version y corre otra, y no'
    Write-Host ' hay forma de saber que paquete esta cargado.'
    Write-Host ''
    Write-Host ' Para arreglarlo, en src/PosExtension/Triggers/CustomerPanelAddressTrigger.ts:'
    Write-Host "   RegenerateFE $versionHuella activo   ->   RegenerateFE $versionManifest activo"
    Write-Host '--------------------------------------------------------------------'
    Write-Host ''
    exit 1
}

Write-Host "Huella de version verificada: manifest y caja dicen $versionManifest."
exit 0
