$content = Get-Content "server.js" -Raw
$pattern = '(?s)// .*? WHITEBOARD AUDIO CONTROL .*?// .*? TEACHER DASHBOARD STATS API'
$newContent = $content -replace $pattern, "`r`n`r`n"
Set-Content -Path "server.js" -Value $newContent -Encoding UTF8
Write-Host "Server.js fixed via PowerShell"
