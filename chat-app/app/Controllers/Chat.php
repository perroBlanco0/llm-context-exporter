<?php

namespace App\Controllers;

use App\Models\MessageModel;
use App\Models\RoomModel;

/**
 * Sala de chat: vista de la sala y endpoints AJAX (enviar / traer mensajes).
 */
class Chat extends BaseController
{
    /**
     * Muestra la sala del chat (el historial se carga por AJAX).
     */
    public function room(string $slug)
    {
        $rooms = new RoomModel();
        $room  = $rooms->findBySlug($slug);

        if ($room === null) {
            throw \CodeIgniter\Exceptions\PageNotFoundException::forPageNotFound('Sala no encontrada');
        }

        return view('chat', [
            'room'     => $room,
            'shareUrl' => url_to('chat.room', $room['slug']),
        ]);
    }

    /**
     * Devuelve mensajes nuevos de la sala (AJAX GET, polling).
     * Parametro after_id: ultimo id ya mostrado (0 = todo el historial).
     */
    public function messages(string $slug)
    {
        $afterId  = max(0, (int) $this->request->getGet('after_id'));
        $messages = new MessageModel();

        return $this->response->setJSON([
            'ok'       => true,
            'messages' => $messages->fetch($slug, $afterId),
        ]);
    }

    /**
     * Envia un mensaje a la sala (AJAX POST).
     */
    public function send(string $slug)
    {
        $sender  = mb_substr(trim((string) $this->request->getPost('sender')), 0, 50);
        $content = mb_substr(trim((string) $this->request->getPost('content')), 0, 2000);

        if ($sender === '' || $content === '') {
            return $this->response->setStatusCode(422)->setJSON([
                'ok'    => false,
                'error' => 'Falta nombre o mensaje',
            ]);
        }

        try {
            $message = (new MessageModel())->send($slug, $sender, $content);
        } catch (\Throwable $e) {
            return $this->response->setStatusCode(404)->setJSON([
                'ok'    => false,
                'error' => 'Sala no encontrada',
            ]);
        }

        return $this->response->setJSON([
            'ok'      => true,
            'message' => $message,
        ]);
    }
}
