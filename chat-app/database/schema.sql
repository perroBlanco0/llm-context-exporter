-- =====================================================================
-- Chat Persistente - Esquema de base de datos (idempotente)
-- Todo acceso a datos pasa por procedimientos almacenados.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS chat_persistente
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE chat_persistente;

-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS rooms (
    id          INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    slug        VARCHAR(32)      NOT NULL,
    name        VARCHAR(100)     NOT NULL DEFAULT 'Sala',
    created_at  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_rooms_slug (slug)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS messages (
    id          BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    room_id     INT UNSIGNED     NOT NULL,
    sender      VARCHAR(50)      NOT NULL,
    content     TEXT             NOT NULL,
    created_at  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_messages_room (room_id, id),
    CONSTRAINT fk_messages_room FOREIGN KEY (room_id)
        REFERENCES rooms (id) ON DELETE CASCADE
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- Procedimientos almacenados
-- ---------------------------------------------------------------------

DROP PROCEDURE IF EXISTS sp_room_create;
DELIMITER $$
-- Crea una sala nueva con slug unico y devuelve la fila creada.
CREATE PROCEDURE sp_room_create (
    IN p_slug VARCHAR(32),
    IN p_name VARCHAR(100)
)
BEGIN
    INSERT INTO rooms (slug, name)
    VALUES (p_slug, p_name);

    SELECT id, slug, name, created_at
    FROM rooms
    WHERE id = LAST_INSERT_ID();
END $$
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_room_get;
DELIMITER $$
-- Devuelve la sala segun su slug (vacio si no existe).
CREATE PROCEDURE sp_room_get (
    IN p_slug VARCHAR(32)
)
BEGIN
    SELECT id, slug, name, created_at
    FROM rooms
    WHERE slug = p_slug;
END $$
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_message_send;
DELIMITER $$
-- Inserta un mensaje en la sala indicada y devuelve la fila creada.
CREATE PROCEDURE sp_message_send (
    IN p_slug    VARCHAR(32),
    IN p_sender  VARCHAR(50),
    IN p_content TEXT
)
BEGIN
    DECLARE v_room_id INT UNSIGNED;

    SELECT id INTO v_room_id FROM rooms WHERE slug = p_slug;

    IF v_room_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Sala no encontrada';
    END IF;

    INSERT INTO messages (room_id, sender, content)
    VALUES (v_room_id, p_sender, p_content);

    SELECT id, room_id, sender, content, created_at
    FROM messages
    WHERE id = LAST_INSERT_ID();
END $$
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_messages_fetch;
DELIMITER $$
-- Devuelve los mensajes de la sala posteriores a p_after_id
-- (usar p_after_id = 0 para traer todo el historial).
CREATE PROCEDURE sp_messages_fetch (
    IN p_slug     VARCHAR(32),
    IN p_after_id BIGINT UNSIGNED
)
BEGIN
    SELECT m.id, m.sender, m.content, m.created_at
    FROM messages m
    INNER JOIN rooms r ON r.id = m.room_id
    WHERE r.slug = p_slug
      AND m.id > p_after_id
    ORDER BY m.id ASC
    LIMIT 500;
END $$
DELIMITER ;
