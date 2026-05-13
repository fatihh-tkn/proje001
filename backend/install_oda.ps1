# ODA File Converter Windows Kurulum Scripti
# Yonetici olarak calistirin: powershell -ExecutionPolicy Bypass -File install_oda.ps1

$odaUrl  = "https://www.opendesign.com/guestfiles/get?filename=ODAFileConverter_QT5_dll_win64_24.9.exe"
$odaTmp  = "$env:TEMP\ODAFileConverter_setup.exe"
$odaExe  = "C:\Program Files\ODA\ODAFileConverter\ODAFileConverter.exe"

if (Test-Path $odaExe) {
    Write-Host "ODA File Converter zaten kurulu: $odaExe" -ForegroundColor Green
    exit 0
}

Write-Host "ODA File Converter indiriliyor..." -ForegroundColor Cyan
try {
    Invoke-WebRequest -Uri $odaUrl -OutFile $odaTmp -UseBasicParsing
} catch {
    Write-Host "Indirme basarisiz: $_" -ForegroundColor Red
    Write-Host "Manuel indirin: https://www.opendesign.com/guestfiles/oda_file_converter" -ForegroundColor Yellow
    exit 1
}

Write-Host "Kuruluyor (sessiz mod)..." -ForegroundColor Cyan
Start-Process -FilePath $odaTmp -ArgumentList "/S" -Wait

if (Test-Path $odaExe) {
    Write-Host "Kurulum tamamlandi: $odaExe" -ForegroundColor Green
} else {
    Write-Host "Kurulum tamamlandi ama exe bulunamadi, manuel kontrol edin." -ForegroundColor Yellow
    Write-Host "Beklenen konum: $odaExe" -ForegroundColor Yellow
}

Remove-Item $odaTmp -ErrorAction SilentlyContinue
