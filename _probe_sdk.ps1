$ErrorActionPreference='Continue'
$root='C:\Proyecto - store comerce-SUNAT\store-commerce-DY-'
Write-Output '== All DLLs in project =='
Get-ChildItem -Recurse -Path $root -Filter '*.dll' -ErrorAction SilentlyContinue | ForEach-Object -Process { $PSItem.FullName.Replace($root,'') } | Select-Object -First 200
