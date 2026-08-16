# =====================================================================
# Setup idempotente del Chat Persistente (Windows 10/11).
# Se puede ejecutar N veces sin romper nada.
#
# - Instala PHP, Composer y MySQL con winget si faltan (con reintentos).
# - Crea la base de datos, usuario y procedimientos almacenados.
# - Genera el .env FUERA del repo (%USERPROFILE%\chat-app.env) y lo
#   copia al proyecto (el .env del proyecto esta ignorado por git).
#
# Uso:  clic derecho en setup.bat -> Ejecutar, o en PowerShell:
#       powershell -ExecutionPolicy Bypass -File setup.ps1
# =====================================================================
$ErrorActionPreference = "Stop"

$AppDir     = $PSScriptRoot
$EnvExterno = Join-Path $env:USERPROFILE "chat-app.env"
$DbName     = "chat_persistente"
$DbUser     = "chat_user"

# --- reintentos: ejecuta el bloque hasta 5 veces con espera creciente ---
function Retry([scriptblock]$Bloque, [string]$Descripcion) {
    for ($i = 1; $i -le 5; $i++) {
        try { & $Bloque; return } catch {
            if ($i -eq 5) { throw "ERROR tras 5 intentos: $Descripcion - $_" }
            Write-Host "Reintentando ($i/5): $Descripcion"
            Start-Sleep -Seconds ($i * 2)
        }
    }
}

function Existe($cmd) { return [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }

# Rutas tipicas de XAMPP por si el usuario ya lo tiene instalado
if (-not (Existe "php")   -and (Test-Path "C:\xampp\php\php.exe"))         { $env:Path += ";C:\xampp\php" }
if (-not (Existe "mysql") -and (Test-Path "C:\xampp\mysql\bin\mysql.exe")) { $env:Path += ";C:\xampp\mysql\bin" }

Write-Host "==> [1/6] Dependencias (PHP, Composer, MySQL)"
if (-not (Existe "php")) {
    Retry { winget install --id PHP.PHP.8.3 -e --accept-source-agreements --accept-package-agreements } "instalar PHP"
}
if (-not (Existe "composer")) {
    Retry { winget install --id Composer.Composer -e --accept-source-agreements --accept-package-agreements } "instalar Composer"
}
if (-not (Existe "mysql")) {
    Retry { winget install --id Oracle.MySQL -e --accept-source-agreements --accept-package-agreements } "instalar MySQL"
}
# Refrescar PATH por si winget instalo algo nuevo
$env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")

Write-Host "==> [2/6] Arrancar MySQL"
$svc = Get-Service | Where-Object { $_.Name -match "mysql" } | Select-Object -First 1
if ($svc -and $svc.Status -ne "Running") { Start-Service $svc.Name }
Retry { mysqladmin ping --silent | Out-Null } "esperar a MySQL"

Write-Host "==> [3/6] .env fuera del repo ($EnvExterno)"
if (-not (Test-Path $EnvExterno)) {
    $DbPass = -join ((48..57) + (97..122) | Get-Random -Count 24 | ForEach-Object { [char]$_ })
    @"
#--------------------------------------------------------------------
# Chat Persistente - configuracion (fuera del repo, NO se versiona)
#--------------------------------------------------------------------
CI_ENVIRONMENT = development

app.baseURL = 'http://localhost:8080/'
app.indexPage = ''

database.default.hostname = 127.0.0.1
database.default.database = $DbName
database.default.username = $DbUser
database.default.password = $DbPass
database.default.DBDriver = MySQLi
database.default.port = 3306
"@ | Set-Content -Path $EnvExterno -Encoding UTF8
    Write-Host "    Creado con password aleatorio."
} else {
    Write-Host "    Ya existe, se reutiliza."
}
$DbPass = (Select-String -Path $EnvExterno -Pattern "database\.default\.password").Line -replace ".*=\s*", ""

# Copiar el .env externo al proyecto (git lo ignora)
Copy-Item $EnvExterno (Join-Path $AppDir ".env") -Force

Write-Host "==> [4/6] Usuario y permisos de MySQL"
$sqlUsuario = @"
CREATE USER IF NOT EXISTS '$DbUser'@'localhost' IDENTIFIED BY '$DbPass';
ALTER USER '$DbUser'@'localhost' IDENTIFIED BY '$DbPass';
GRANT ALL PRIVILEGES ON $DbName.* TO '$DbUser'@'localhost';
FLUSH PRIVILEGES;
"@
# Con XAMPP el root no tiene password; con MySQL oficial pedira la de root
Retry { $sqlUsuario | mysql -u root } "crear usuario MySQL"

Write-Host "==> [5/6] Esquema y procedimientos almacenados (idempotente)"
Retry { Get-Content (Join-Path $AppDir "database\schema.sql") -Raw | mysql -u root } "cargar esquema"

Write-Host "==> [6/6] Dependencias PHP (composer install)"
if (-not (Test-Path (Join-Path $AppDir "vendor"))) {
    Retry { composer install --no-interaction --working-dir="$AppDir" } "composer install"
} else {
    Write-Host "    vendor/ ya existe, no se hace nada."
}

Write-Host ""
Write-Host "=============================================="
Write-Host " Listo. Para arrancar el chat:"
Write-Host "   cd $AppDir; php spark serve"
Write-Host " y abre http://localhost:8080"
Write-Host "=============================================="
