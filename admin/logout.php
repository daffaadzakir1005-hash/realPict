<?php
require_once __DIR__ . '/auth.php';
startAdminSession();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST'
    || !isAdminLoggedIn()
    || !isValidAdminCsrfToken($_POST['csrf_token'] ?? '')) {
    http_response_code(403);
    exit('Permintaan tidak valid.');
}

$_SESSION = [];
$cookie = session_get_cookie_params();
if (ini_get('session.use_cookies')) {
    setcookie(session_name(), '', [
        'expires' => time() - 42000,
        'path' => $cookie['path'],
        'domain' => $cookie['domain'],
        'secure' => $cookie['secure'],
        'httponly' => $cookie['httponly'],
        'samesite' => $cookie['samesite']
    ]);
}
session_destroy();
header('Location: login.php');
exit;
