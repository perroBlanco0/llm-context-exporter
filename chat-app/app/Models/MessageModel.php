<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * Acceso a mensajes. Toda consulta pasa por procedimientos almacenados.
 */
class MessageModel extends Model
{
    protected $table = 'messages';

    /**
     * Inserta un mensaje en la sala y devuelve la fila creada.
     */
    public function send(string $slug, string $sender, string $content): ?array
    {
        $query = $this->db->query('CALL sp_message_send(?, ?, ?)', [$slug, $sender, $content]);
        $row   = $query->getRowArray();
        $query->freeResult();

        return $row ?: null;
    }

    /**
     * Devuelve los mensajes de la sala posteriores a $afterId
     * ($afterId = 0 trae todo el historial persistido).
     */
    public function fetch(string $slug, int $afterId = 0): array
    {
        $query = $this->db->query('CALL sp_messages_fetch(?, ?)', [$slug, $afterId]);
        $rows  = $query->getResultArray();
        $query->freeResult();

        return $rows;
    }
}
