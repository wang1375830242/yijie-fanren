$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot
$url = "http://127.0.0.1:8765/"
Write-Host "一介凡人 · 本地服务器" -ForegroundColor Cyan
Write-Host $url
Start-Process $url
python server.py
