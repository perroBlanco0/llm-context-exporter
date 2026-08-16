#!/usr/bin/env bash
# =====================================================================
# Setup idempotente del Chat Persistente (Linux / Ubuntu-Debian, y Mac
# con Homebrew para las dependencias). Se puede ejecutar N veces.
#
# - Instala PHP, Composer y MySQL si faltan (con reintentos).
# - Crea la base de datos, usuario y procedimientos almacenados.
# - Genera el .env FUERA del repo ($HOME/chat-app.env) y lo enlaza.
#
# Uso:  bash setup.sh
# =====================================================================
set -u

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_EXTERNO="$HOME/chat-app.env"
DB_NAME="chat_persistente"
DB_USER="chat_user"

# --- reintentos: ejecuta el comando hasta 5 veces con espera creciente ---
retry() {
    local intento=1
    until "$@"; do
        if [ "$intento" -ge 5 ]; then
            echo "ERROR: fallo tras 5 intentos: $*" >&2
            return 1
        fi
        echo "Reintentando ($intento/5): $*"
        sleep $((intento * 2))
        intento=$((intento + 1))
    done
}

echo "==> [1/6] Dependencias (PHP, Composer, MySQL)"
if command -v apt-get >/dev/null 2>&1; then
    faltan=""
    command -v php      >/dev/null 2>&1 || faltan="$faltan php-cli php-intl php-mbstring php-xml php-curl php-mysql php-zip"
    command -v composer >/dev/null 2>&1 || faltan="$faltan composer unzip"
    command -v mysql    >/dev/null 2>&1 || faltan="$faltan mysql-server"
    if [ -n "$faltan" ]; then
        retry sudo apt-get update -qq
        # shellcheck disable=SC2086
        retry sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq $faltan
    else
        echo "    Ya instaladas, no se hace nada."
    fi
elif command -v brew >/dev/null 2>&1; then
    command -v php      >/dev/null 2>&1 || retry brew install php
    command -v composer >/dev/null 2>&1 || retry brew install composer
    command -v mysql    >/dev/null 2>&1 || retry brew install mysql
else
    echo "    Instala PHP 8.1+, Composer y MySQL manualmente y vuelve a correr el script."
fi

echo "==> [2/6] Arrancar MySQL"
if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files 2>/dev/null | grep -q '^mysql'; then
    sudo systemctl start mysql 2>/dev/null || true
elif command -v service >/dev/null 2>&1; then
    sudo service mysql start 2>/dev/null || true
elif command -v brew >/dev/null 2>&1; then
    brew services start mysql 2>/dev/null || true
fi
retry mysqladmin ping --silent

echo "==> [3/6] .env fuera del repo ($ENV_EXTERNO)"
if [ ! -f "$ENV_EXTERNO" ]; then
    DB_PASS="$(head -c 16 /dev/urandom | od -An -tx1 | tr -d ' \n')"
    cat > "$ENV_EXTERNO" <<EOF
#--------------------------------------------------------------------
# Chat Persistente - configuracion (fuera del repo, NO se versiona)
#--------------------------------------------------------------------
CI_ENVIRONMENT = development

app.baseURL = 'http://localhost:8080/'
app.indexPage = ''

database.default.hostname = 127.0.0.1
database.default.database = ${DB_NAME}
database.default.username = ${DB_USER}
database.default.password = ${DB_PASS}
database.default.DBDriver = MySQLi
database.default.port = 3306
EOF
    chmod 600 "$ENV_EXTERNO"
    echo "    Creado con password aleatorio."
else
    echo "    Ya existe, se reutiliza."
fi
DB_PASS="$(grep 'database.default.password' "$ENV_EXTERNO" | sed 's/.*= *//')"

# El proyecto usa el .env externo mediante un symlink (queda ignorado por git)
ln -sf "$ENV_EXTERNO" "$APP_DIR/.env"

echo "==> [4/6] Usuario y permisos de MySQL"
retry sudo mysql -e "
    CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
    ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
    GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
    FLUSH PRIVILEGES;"

echo "==> [5/6] Esquema y procedimientos almacenados (idempotente)"
retry sudo mysql < "$APP_DIR/database/schema.sql"

echo "==> [6/6] Dependencias PHP (composer install)"
if [ ! -d "$APP_DIR/vendor" ]; then
    retry composer install --no-interaction --working-dir="$APP_DIR"
else
    echo "    vendor/ ya existe, no se hace nada."
fi

echo ""
echo "=============================================="
echo " Listo. Para arrancar el chat:"
echo "   cd $APP_DIR && php spark serve"
echo " y abre http://localhost:8080"
echo "=============================================="
