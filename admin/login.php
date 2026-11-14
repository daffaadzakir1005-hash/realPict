<?php
require_once __DIR__ . '/auth.php';
startAdminSession();

if (isAdminLoggedIn()) {
    header('Location: laporan.php');
    exit;
}

$configuredUsername = getenv('REALPICT_ADMIN_USERNAME');
$configuredPasswordHash = getenv('REALPICT_ADMIN_PASSWORD_HASH');
$isConfigured = is_string($configuredUsername)
    && $configuredUsername !== ''
    && is_string($configuredPasswordHash)
    && password_get_info($configuredPasswordHash)['algoName'] !== 'unknown';
$error = '';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    $csrfToken = $_POST['csrf_token'] ?? '';

    if (!isValidAdminCsrfToken($csrfToken)) {
        $error = 'Sesi formulir tidak valid. Muat ulang halaman dan coba lagi.';
    } elseif (!$isConfigured) {
        $error = 'Autentikasi belum dikonfigurasi. Atur REALPICT_ADMIN_USERNAME dan REALPICT_ADMIN_PASSWORD_HASH di lingkungan server.';
    } else {
        $username = $_POST['username'] ?? '';
        $password = $_POST['password'] ?? '';

        if (is_string($username)
            && is_string($password)
            && hash_equals($configuredUsername, $username)
            && password_verify($password, $configuredPasswordHash)) {
            session_regenerate_id(true);
            $_SESSION['admin_logged_in'] = true;
            $_SESSION['admin_csrf_token'] = bin2hex(random_bytes(32));
            header('Location: laporan.php');
            exit;
        }

        $error = 'Username atau password salah.';
    }
}

$csrfToken = getAdminCsrfToken();
function escapeAdminLoginValue($value)
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login Admin - RealPict</title>
    <link rel="stylesheet" href="../assets/css/style.css">
    <link rel="stylesheet" href="../assets/css/admin.css">
</head>
<body>
    <main class="admin-page">
        <section class="admin-login-card">
            <a class="admin-back-link" href="../index.php">← Kembali ke RealPict</a>
            <h1>Login Admin</h1>
            <p class="admin-muted">Masuk untuk mengelola laporan yang diterima.</p>
            <?php if ($error !== ''): ?>
                <div class="admin-alert" role="alert"><?= escapeAdminLoginValue($error) ?></div>
            <?php endif; ?>
            <?php if (!$isConfigured): ?>
                <div class="admin-alert" role="status">
                    Login belum dikonfigurasi. Atur variabel lingkungan
                    <code>REALPICT_ADMIN_USERNAME</code> dan
                    <code>REALPICT_ADMIN_PASSWORD_HASH</code> pada server.
                    Hash password dapat dibuat dengan
                    <code>php -r "echo password_hash('password-anda', PASSWORD_DEFAULT);"</code>.
                </div>
            <?php endif; ?>
            <form method="post" class="admin-login-form">
                <input type="hidden" name="csrf_token" value="<?= escapeAdminLoginValue($csrfToken) ?>">
                <label for="username">Username</label>
                <input id="username" name="username" type="text" autocomplete="username" required>
                <label for="password">Password</label>
                <input id="password" name="password" type="password" autocomplete="current-password" required>
                <button class="btn btn-primary" type="submit">Masuk</button>
            </form>
        </section>
    </main>
</body>
</html>
