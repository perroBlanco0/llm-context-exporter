<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * Acceso a salas. Toda consulta pasa por procedimientos almacenados.
 */
class RoomModel extends Model
{
    protected $table = 'rooms';

    /**
     * Crea una sala y devuelve la fila creada.
     */
    public function createRoom(string $slug, string $name): ?array
    {
        $query = $this->db->query('CALL sp_room_create(?, ?)', [$slug, $name]);
        $row   = $query->getRowArray();
        $query->freeResult();

        return $row ?: null;
    }

    /**
     * Busca una sala por su slug.
     */
    public function findBySlug(string $slug): ?array
    {
        $query = $this->db->query('CALL sp_room_get(?)', [$slug]);
        $row   = $query->getRowArray();
        $query->freeResult();

        return $row ?: null;
    }
}
