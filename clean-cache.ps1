# Script de limpieza de cache para Windows PowerShell
# Elimina la carpeta .next y node_modules/.cache

Write-Host "Limpiando cache del proyecto..." -ForegroundColor Yellow

if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "Carpeta .next eliminada" -ForegroundColor Green
} else {
    Write-Host "Carpeta .next no encontrada" -ForegroundColor Gray
}

if (Test-Path "node_modules/.cache") {
    Remove-Item -Recurse -Force "node_modules/.cache"
    Write-Host "Cache de node_modules eliminado" -ForegroundColor Green
} else {
    Write-Host "Cache de node_modules no encontrado" -ForegroundColor Gray
}

Write-Host "Limpieza completada!" -ForegroundColor Green

