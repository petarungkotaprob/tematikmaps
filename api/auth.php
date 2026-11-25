<?php
/**
 * Authentication & Session API
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

require_once 'db.php';

const AUTH_SESSION_TTL = 7 * 24 * 60 * 60; // 7 hari

$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

$scriptDir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/api/auth.php'));
$cookiePath = rtrim(dirname($scriptDir), '/') . '/';
if ($cookiePath === '//') {
    $cookiePath = '/';
}

if (session_status() === PHP_SESSION_NONE) {
    session_name('SILISASESSID');
    ini_set('session.gc_maxlifetime', (string) AUTH_SESSION_TTL);
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    session_set_cookie_params([
        'lifetime' => AUTH_SESSION_TTL,
        'path' => $cookiePath,
        'domain' => '',
        'secure' => $isHttps,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    if (!session_start()) {
        error_log('Session start failed.');
        authJson(['status' => 'error', 'message' => 'Sesi server tidak tersedia'], 503);
    }
}

function authJson(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload);
    exit;
}

function destroyAuthSession(): void
{
    $_SESSION = [];

    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires' => time() - 42000,
            'path' => $params['path'],
            'domain' => $params['domain'],
            'secure' => $params['secure'],
            'httponly' => $params['httponly'],
            'samesite' => $params['samesite'] ?? 'Lax',
        ]);
    }

    if (session_status() === PHP_SESSION_ACTIVE) {
        session_destroy();
    }
}

$action = isset($_GET['action']) ? trim((string) $_GET['action']) : '';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($action === 'logout') {
    if (!in_array($method, ['POST', 'GET'], true)) {
        authJson(['status' => 'error', 'message' => 'Method Not Allowed'], 405);
    }

    destroyAuthSession();
    authJson(['status' => 'success', 'message' => 'Logout berhasil']);
}

if ($action === 'session') {
    if ($method !== 'GET') {
        authJson(['status' => 'error', 'message' => 'Method Not Allowed'], 405);
    }

    $sessionUser = $_SESSION['user'] ?? null;
    $expiresAt = (int) ($_SESSION['expires_at'] ?? 0);

    if (!is_array($sessionUser) || empty($sessionUser['id']) || $expiresAt <= time()) {
        destroyAuthSession();
        authJson(['status' => 'error', 'message' => 'Sesi tidak valid atau telah berakhir'], 401);
    }

    try {
        $stmt = $pdo->prepare('SELECT id, username, role FROM users WHERE id = ?');
        $stmt->execute([(int) $sessionUser['id']]);
        $freshUser = $stmt->fetch();

        if (!$freshUser) {
            destroyAuthSession();
            authJson(['status' => 'error', 'message' => 'Akun tidak ditemukan'], 401);
        }

        $_SESSION['user'] = [
            'id' => (int) $freshUser['id'],
            'username' => $freshUser['username'],
            'role' => $freshUser['role'],
        ];

        authJson([
            'status' => 'success',
            'user' => $_SESSION['user'],
            'expires_at' => $expiresAt * 1000,
        ]);
    } catch (Throwable $e) {
        error_log('Session validation failed: ' . $e->getMessage());
        authJson(['status' => 'error', 'message' => 'Gagal memvalidasi sesi'], 500);
    }
}

if ($method !== 'POST') {
    authJson(['status' => 'error', 'message' => 'Method Not Allowed'], 405);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    $input = $_POST;
}

$username = isset($input['username']) ? trim((string) $input['username']) : '';
$password = isset($input['password']) ? (string) $input['password'] : '';

if ($username === '' || $password === '') {
    authJson(['status' => 'error', 'message' => 'Username dan Password wajib diisi'], 400);
}

try {
    $stmt = $pdo->prepare('SELECT id, username, password, role FROM users WHERE username = ?');
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    $storedPassword = $user ? (string) $user['password'] : '';
    $passwordValid = false;

    if ($storedPassword !== '') {
        if (password_verify($password, $storedPassword)) {
            $passwordValid = true;
        } elseif (hash_equals($storedPassword, $password)) {
            $passwordValid = true;
        } elseif (preg_match('/^[a-f0-9]{32}$/i', $storedPassword) && hash_equals(strtolower($storedPassword), md5($password))) {
            $passwordValid = true;
        }
    }

    if (!$user || !$passwordValid) {
        authJson(['status' => 'error', 'message' => 'Username atau Password salah!'], 401);
    }

    session_regenerate_id(true);

    $expiresAt = time() + AUTH_SESSION_TTL;
    $_SESSION['user'] = [
        'id' => (int) $user['id'],
        'username' => $user['username'],
        'role' => $user['role'],
    ];
    $_SESSION['expires_at'] = $expiresAt;

    authJson([
        'status' => 'success',
        'message' => 'Login Berhasil',
        'user' => $_SESSION['user'],
        'expires_at' => $expiresAt * 1000,
    ]);
} catch (Throwable $e) {
    error_log('Login failed: ' . $e->getMessage());
    authJson(['status' => 'error', 'message' => 'Gagal memproses login. Silakan coba lagi.'], 500);
}
