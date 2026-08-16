<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?= esc($room['name']) ?> · Chat Persistente</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css">
    <style>
        #mensajes { height: 60vh; overflow-y: auto; background: #fff; }
        .burbuja { max-width: 75%; border-radius: 1rem; }
        .burbuja.mia { background: #007bff; color: #fff; }
        .burbuja.otra { background: #e9ecef; }
    </style>
</head>
<body class="bg-light">
<div class="container py-4" style="max-width: 720px;">
    <div class="card shadow-sm">
        <div class="card-header d-flex justify-content-between align-items-center">
            <div>
                <strong><?= esc($room['name']) ?></strong>
                <small class="text-muted d-block">Historial guardado — comparte el link para invitar</small>
            </div>
            <button class="btn btn-sm btn-outline-secondary" id="btn-copiar">Copiar link</button>
        </div>

        <div id="mensajes" class="p-3"></div>

        <div class="card-footer">
            <form id="form-enviar">
                <div class="form-row">
                    <div class="col-3">
                        <input type="text" class="form-control" id="nombre" maxlength="50" placeholder="Tu nombre" required>
                    </div>
                    <div class="col">
                        <input type="text" class="form-control" id="contenido" maxlength="2000" placeholder="Escribe un mensaje..." autocomplete="off" required>
                    </div>
                    <div class="col-auto">
                        <button type="submit" class="btn btn-primary">Enviar</button>
                    </div>
                </div>
            </form>
        </div>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js"></script>
<script>
$(function () {
    var urlMensajes = '<?= url_to('chat.messages', $room['slug']) ?>';
    var urlEnviar   = '<?= url_to('chat.send', $room['slug']) ?>';
    var shareUrl    = '<?= $shareUrl ?>';
    var ultimoId    = 0;

    // Recordar el nombre del usuario entre visitas
    $('#nombre').val(localStorage.getItem('chat_nombre') || '');

    function escapar(texto) {
        return $('<div>').text(texto).html();
    }

    function pintar(mensajes) {
        var miNombre = $('#nombre').val().trim();
        mensajes.forEach(function (m) {
            ultimoId = Math.max(ultimoId, parseInt(m.id, 10));
            var mia = m.sender === miNombre;
            var burbuja =
                '<div class="d-flex mb-2 ' + (mia ? 'justify-content-end' : 'justify-content-start') + '">' +
                  '<div class="burbuja px-3 py-2 ' + (mia ? 'mia' : 'otra') + '">' +
                    '<small class="d-block font-weight-bold">' + escapar(m.sender) + '</small>' +
                    '<span>' + escapar(m.content) + '</span>' +
                    '<small class="d-block text-right" style="opacity:.7">' + m.created_at + '</small>' +
                  '</div>' +
                '</div>';
            $('#mensajes').append(burbuja);
        });
        if (mensajes.length) {
            $('#mensajes').scrollTop($('#mensajes')[0].scrollHeight);
        }
    }

    // Polling: trae solo los mensajes nuevos (after_id = ultimo id pintado)
    function traerMensajes() {
        $.ajax({
            url: urlMensajes,
            method: 'GET',
            data: { after_id: ultimoId },
            dataType: 'json'
        }).done(function (res) {
            pintar(res.messages);
        });
    }

    // Enviar mensaje por AJAX
    $('#form-enviar').on('submit', function (e) {
        e.preventDefault();
        var nombre    = $('#nombre').val().trim();
        var contenido = $('#contenido').val().trim();
        if (!nombre || !contenido) { return; }

        localStorage.setItem('chat_nombre', nombre);
        $('#contenido').val('');

        $.ajax({
            url: urlEnviar,
            method: 'POST',
            data: { sender: nombre, content: contenido },
            dataType: 'json'
        }).done(function () {
            traerMensajes();
        });
    });

    // Copiar link de la sala
    $('#btn-copiar').on('click', function () {
        var tmp = $('<input>').val(shareUrl).appendTo('body');
        tmp[0].select();
        document.execCommand('copy');
        tmp.remove();
        $(this).text('¡Copiado!');
        setTimeout(function () { $('#btn-copiar').text('Copiar link'); }, 1500);
    });

    traerMensajes();               // carga el historial completo al entrar
    setInterval(traerMensajes, 2000); // y luego revisa cada 2 segundos
});
</script>
</body>
</html>
