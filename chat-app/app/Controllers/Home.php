<?php

namespace App\Controllers;

use App\Models\RoomModel;

/**
 * Portada: crear una sala nueva o entrar con un link existente.
 */
class Home extends BaseController
{
    /**
     * Muestra la portada.
     */
    public function index(): string
    {
        return view('home');
    }

    /**
     * Crea una sala (AJAX POST) y devuelve el link para compartir.
     */
    public function createRoom()
    {
        $name = trim((string) $this->request->getPost('name'));
        if ($name === '') {
            $name = 'Sala de chat';
        }
        $name = mb_substr($name, 0, 100);

        $rooms = new RoomModel();

        // Reintenta ante una colision (improbable) de slug.
        $room = null;
        for ($i = 0; $i < 3 && $room === null; $i++) {
            try {
                $room = $rooms->createRoom(bin2hex(random_bytes(8)), $name);
            } catch (\Throwable $e) {
                $room = null;
            }
        }

        if ($room === null) {
            return $this->response->setStatusCode(500)->setJSON([
                'ok'    => false,
                'error' => 'No se pudo crear la sala',
            ]);
        }

        return $this->response->setJSON([
            'ok'   => true,
            'slug' => $room['slug'],
            'url'  => url_to('chat.room', $room['slug']),
        ]);
    }
}
