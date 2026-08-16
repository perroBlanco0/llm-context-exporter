# Contexto para otra IA — Chat Persistente

Documento de contexto para que otra IA (o desarrollador) pueda continuar
este proyecto sin leer todo el código.

## Resumen

Aplicación web de chat **persistente** con link para compartir.
Se crea una sala → se obtiene un link único (`/c/{slug}`) → cualquiera
con el link chatea en la sala. Todo el historial se guarda en MySQL y se
recupera al reabrir el link (requisito explícito del usuario: *"de nada
me sirve perder la sesión"*).

## Stack (requisitos duros del usuario)

| Capa       | Tecnología | Restricción |
|------------|-----------|-------------|
| Backend    | CodeIgniter 4 (v4.6, appstarter) | Solo **modelos y controladores** como marco de trabajo; `Routes.php` limpio y comentado |
| Frontend   | Bootstrap 4.6 (CDN) + jQuery 3.7 (CDN) | AJAX solo con jQuery (`$.ajax`) |
| Base datos | MySQL 8 | **Cada petición pasa por un procedimiento almacenado** — los modelos solo hacen `CALL sp_...`, nunca SQL directo |
| Config     | `.env` **fuera del repo** | Linux: `~/chat-app.env` (symlink a `chat-app/.env`); Windows: `%USERPROFILE%\chat-app.env` (copiado). Gitignorado |
| Setup      | Scripts **idempotentes con reintentos** | `setup.sh` (Linux/Mac) y `setup.ps1`/`setup.bat` (Windows) |
| Costo      | Todo gratis / open source | |

## Estructura

```
chat-app/
├── app/
│   ├── Config/Routes.php        # 5 rutas, comentadas
│   ├── Controllers/
│   │   ├── Home.php             # GET /  y  POST /rooms (crear sala, AJAX)
│   │   └── Chat.php             # GET /c/{slug}, GET+POST /c/{slug}/messages
│   ├── Models/
│   │   ├── RoomModel.php        # createRoom(), findBySlug() → CALL sp_*
│   │   └── MessageModel.php     # send(), fetch() → CALL sp_*
│   └── Views/
│       ├── home.php             # portada: crear sala + copiar link
│       └── chat.php             # sala: burbujas, polling AJAX cada 2 s
├── database/schema.sql          # idempotente: CREATE IF NOT EXISTS + DROP/CREATE PROCEDURE
├── setup.sh                     # setup Linux/Mac (retry() con 5 intentos, backoff)
├── setup.ps1 + setup.bat        # setup Windows (winget si faltan deps; detecta XAMPP)
└── manual cortapaloss.txt       # manual de usuario
```

## Modelo de datos

```sql
rooms    (id, slug UNIQUE, name, created_at)
messages (id, room_id FK→rooms ON DELETE CASCADE, sender, content, created_at)
```

- `slug`: 16 hex chars (`bin2hex(random_bytes(8))`), generado en `Home::createRoom`
  con hasta 3 reintentos ante colisión.
- No hay usuarios/login: cada visitante escribe su nombre (se recuerda en
  `localStorage` clave `chat_nombre`).

## Procedimientos almacenados (únicos con acceso a tablas)

| SP | Firma | Hace |
|----|-------|------|
| `sp_room_create` | (slug, name) | INSERT sala y devuelve la fila |
| `sp_room_get` | (slug) | SELECT sala por slug |
| `sp_message_send` | (slug, sender, content) | valida sala (SIGNAL 45000 si no existe), INSERT y devuelve la fila |
| `sp_messages_fetch` | (slug, after_id) | mensajes con `id > after_id` ASC, LIMIT 500. `after_id=0` = historial completo |

## API (JSON)

- `POST /rooms` — body `name` → `{ok, slug, url}`
- `GET /c/{slug}` — HTML de la sala (404 si no existe)
- `GET /c/{slug}/messages?after_id=N` → `{ok, messages:[{id,sender,content,created_at}]}`
- `POST /c/{slug}/messages` — body `sender`, `content` → `{ok, message}` (422 campos vacíos, 404 sala inexistente)

## Frontend (chat.php)

- Polling con `setInterval(traerMensajes, 2000)`; guarda `ultimoId` y pide
  solo `after_id=ultimoId` (incremental, la primera carga trae todo).
- Escape XSS en cliente con `$('<div>').text(x).html()`; el servidor guarda
  el texto crudo y las vistas PHP escapan con `esc()`.
- Burbujas: mensajes propios (mismo `sender`) a la derecha en azul.

## Decisiones y trampas conocidas

1. **CSRF está desactivado** (default del appstarter). Si se activa el filtro
   `csrf`, hay que añadir el token a los `$.ajax` POST.
2. `app.indexPage = ''` en el `.env` para links limpios sin `index.php`
   (funciona con `php spark serve`; con Apache se necesita el rewrite de `public/`).
3. Los modelos extienden `CodeIgniter\Model` pero **no** usan su query builder,
   solo `$this->db->query('CALL ...')` + `freeResult()` (obligatorio: sin
   `freeResult()` los resultsets de los SP dejan la conexión MySQLi colgada).
4. Polling, no WebSockets — requisito de simplicidad y "todo gratis";
   latencia máx. ~2 s.
5. Identidad = nombre libre, sin auth. Dos personas con el mismo nombre se
   ven como "propias" mutuamente (limitación aceptada).
6. `vendor/` no se versiona; `composer install` corre en el setup.
7. El setup crea el usuario MySQL `chat_user` con password aleatorio
   guardado solo en el `.env` externo.

## Cómo continuar

- **Correr**: `bash setup.sh` (o `setup.bat` en Windows) → `php spark serve` → `http://localhost:8080`.
- **Añadir un campo/consulta**: crear/alterar SP en `database/schema.sql`
  (patrón `DROP PROCEDURE IF EXISTS` + `CREATE`), re-ejecutar el setup,
  y exponerlo vía método en el modelo → controlador → ruta comentada.
- **Tests**: PHPUnit viene en el appstarter (`vendor/bin/phpunit`), sin tests propios aún.
