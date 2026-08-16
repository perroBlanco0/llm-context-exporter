<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */

// Portada: crear una sala nueva
$routes->get('/', 'Home::index');

// Crear sala (AJAX POST) -> devuelve link para compartir
$routes->post('rooms', 'Home::createRoom', ['as' => 'rooms.create']);

// Vista de la sala de chat (link para compartir)
$routes->get('c/(:segment)', 'Chat::room/$1', ['as' => 'chat.room']);

// Traer mensajes de la sala (AJAX GET, polling con ?after_id=N)
$routes->get('c/(:segment)/messages', 'Chat::messages/$1', ['as' => 'chat.messages']);

// Enviar mensaje a la sala (AJAX POST)
$routes->post('c/(:segment)/messages', 'Chat::send/$1', ['as' => 'chat.send']);
