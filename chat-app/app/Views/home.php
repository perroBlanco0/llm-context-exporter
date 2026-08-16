<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Chat Persistente</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css">
</head>
<body class="bg-light">
<div class="container py-5" style="max-width: 560px;">
    <div class="card shadow-sm">
        <div class="card-body">
            <h1 class="h4 mb-1">💬 Chat Persistente</h1>
            <p class="text-muted">Crea una sala y comparte el link. El historial queda guardado: al volver a abrir el link recuperas toda la conversación.</p>

            <form id="form-crear">
                <div class="form-group">
                    <label for="nombre-sala">Nombre de la sala</label>
                    <input type="text" class="form-control" id="nombre-sala" maxlength="100" placeholder="Ej: Equipo de trabajo">
                </div>
                <button type="submit" class="btn btn-primary btn-block" id="btn-crear">Crear sala</button>
            </form>

            <div id="resultado" class="mt-4 d-none">
                <div class="alert alert-success mb-2">Sala creada. Comparte este link:</div>
                <div class="input-group">
                    <input type="text" class="form-control" id="link-sala" readonly>
                    <div class="input-group-append">
                        <button class="btn btn-outline-secondary" type="button" id="btn-copiar">Copiar</button>
                    </div>
                </div>
                <a href="#" id="ir-sala" class="btn btn-success btn-block mt-3">Entrar a la sala</a>
            </div>

            <div id="error" class="alert alert-danger mt-3 d-none"></div>
        </div>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js"></script>
<script>
$(function () {
    // Crear sala por AJAX y mostrar el link para compartir
    $('#form-crear').on('submit', function (e) {
        e.preventDefault();
        $('#btn-crear').prop('disabled', true);
        $('#error').addClass('d-none');

        $.ajax({
            url: '<?= url_to('rooms.create') ?>',
            method: 'POST',
            data: { name: $('#nombre-sala').val() },
            dataType: 'json'
        }).done(function (res) {
            $('#link-sala').val(res.url);
            $('#ir-sala').attr('href', res.url);
            $('#resultado').removeClass('d-none');
        }).fail(function () {
            $('#error').text('No se pudo crear la sala. Intenta de nuevo.').removeClass('d-none');
        }).always(function () {
            $('#btn-crear').prop('disabled', false);
        });
    });

    // Copiar link al portapapeles
    $('#btn-copiar').on('click', function () {
        var input = document.getElementById('link-sala');
        input.select();
        document.execCommand('copy');
        $(this).text('¡Copiado!');
        setTimeout(function () { $('#btn-copiar').text('Copiar'); }, 1500);
    });
});
</script>
</body>
</html>
