$ErrorActionPreference = 'Stop'

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

Write-Host "GET /products"
try{
  $prod = Invoke-RestMethod -Uri http://localhost:3000/products -WebSession $session
  $prod | ConvertTo-Json -Depth 5 | Out-File products.json -Encoding utf8
  Write-Host "PRODUCTS_OK"
}catch{
  Write-Host "PRODUCTS_ERR: $($_.Exception.Message)"
}

Write-Host "POST /api/signup (create admin)"
$bodyObj = @{ username='auto_admin_test'; email='auto_admin@example.local'; password='AdminPass!2024'; role='admin' }
$body = $bodyObj | ConvertTo-Json
try{
  $signup = Invoke-RestMethod -Uri http://localhost:3000/api/signup -Method Post -Body $body -ContentType 'application/json' -WebSession $session
  $signup | ConvertTo-Json -Depth 5 | Out-File signup_response.json -Encoding utf8
  Write-Host "SIGNUP_OK"
}catch{
  $body = $_.Exception.Message
  if ($_.Exception.Response) {
    try {
      $body = $_.Exception.Response.Content.ReadAsStringAsync().Result
    } catch {
      $body = $_.Exception.Message
    }
  }
  Write-Host "SIGNUP_ERR: $body"
}

Write-Host "GET /api/users"
try{
  $users = Invoke-RestMethod -Uri http://localhost:3000/api/users -WebSession $session
  $users | ConvertTo-Json -Depth 5 | Out-File users_response.json -Encoding utf8
  Write-Host "USERS_OK"
}catch{
  Write-Host "USERS_ERR: $($_.Exception.Message)"
}

Write-Host "POST /migrate_users with migration secret header"
$payload = '[{"username":"mike_mig","email":"mike_mig@example.com","password":"migpass"}]'
try{
  $headers = @{ 'x-migration-secret' = 'dev-migrate-secret-12345' }
  $mres = Invoke-RestMethod -Uri http://localhost:3000/migrate_users -Method Post -Body $payload -ContentType 'application/json' -Headers $headers -WebSession $session
  $mres | ConvertTo-Json -Depth 5 | Out-File migrate_response.json -Encoding utf8
  Write-Host "MIGRATE_OK"
}catch{
  Write-Host "MIGRATE_ERR: $($_.Exception.Message)"
}

Write-Host "GET /api/me"
try{
  $me = Invoke-RestMethod -Uri http://localhost:3000/api/me -WebSession $session
  $me | ConvertTo-Json -Depth 5 | Out-File me_response.json -Encoding utf8
  Write-Host "ME_OK"
}catch{
  Write-Host "ME_ERR: $($_.Exception.Message)"
}
