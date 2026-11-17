<#
.SYNOPSIS
  Configure MongoDB Server sous Windows en Replica Set (rs0) pour supporter les transactions.
.DESCRIPTION
  Ce script détecte mongod.cfg, active 'replication: replSetName: rs0', redémarre le service MongoDB
  et lance l'initialisation du replica set.
.NOTES
  Doit être exécuté dans un terminal PowerShell en Administrateur ("Exécuter en tant qu'administrateur").
#>

$ErrorActionPreference = "Stop"

Write-Host "=== Configuration MongoDB Replica Set pour Stockline ===" -ForegroundColor Cyan

# 1. Vérifier les privilèges Administrateur
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ Ce script doit être exécuté en tant qu'Administrateur." -ForegroundColor Red
    Write-Host "Veuillez ouvrir PowerShell avec 'Exécuter en tant qu'administrateur' puis relancer ce script." -ForegroundColor Yellow
    Exit 1
}

# 2. Localiser mongod.cfg
$possiblePaths = @(
    Get-ChildItem -Path "C:\Program Files\MongoDB\Server" -Filter "mongod.cfg" -Recurse -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName
)

if ($possiblePaths.Count -eq 0) {
    Write-Host "❌ Fichier mongod.cfg introuvable dans C:\Program Files\MongoDB\Server." -ForegroundColor Red
    Exit 1
}

$cfgPath = $possiblePaths[0]
Write-Host "✓ Fichier de configuration trouvé : $cfgPath" -ForegroundColor Green

# 3. Mettre à jour mongod.cfg
$content = Get-Content -Path $cfgPath -Raw
if ($content -match "replSetName:\s*rs0") {
    Write-Host "✓ La configuration replSetName est déjà présente dans mongod.cfg" -ForegroundColor Green
} else {
    Write-Host "Mise à jour de mongod.cfg..." -ForegroundColor Yellow
    # Remplacer #replication: ou ajouter la section replication
    if ($content -match "#replication:") {
        $content = $content -replace "#replication:", "replication:`r`n  replSetName: rs0"
    } elseif ($content -match "replication:") {
        $content = $content -replace "replication:", "replication:`r`n  replSetName: rs0"
    } else {
        $content += "`r`n`r`nreplication:`r`n  replSetName: rs0`r`n"
    }
    Set-Content -Path $cfgPath -Value $content -Encoding UTF8
    Write-Host "✓ mongod.cfg mis à jour avec replSetName: rs0" -ForegroundColor Green
}

# 4. Redémarrer le service MongoDB
$service = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue
if ($service) {
    Write-Host "Redémarrage du service Windows MongoDB..." -ForegroundColor Yellow
    Restart-Service -Name "MongoDB" -Force
    Start-Sleep -Seconds 3
    Write-Host "✓ Service MongoDB redémarré avec succès" -ForegroundColor Green
} else {
    Write-Host "⚠️ Service Windows 'MongoDB' non trouvé. Assurez-vous que mongod est redémarré avec --replSet rs0" -ForegroundColor Yellow
}

# 5. Exécuter le script d'initialisation Node.js
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$backendDir = Split-Path -Parent $scriptDir
Push-Location $backendDir
try {
    Write-Host "Initialisation du Replica Set via Node.js..." -ForegroundColor Yellow
    node dry/scripts/setup-replica-set.js
} finally {
    Pop-Location
}

Write-Host "=== Configuration terminée avec succès ! ===" -ForegroundColor Green
