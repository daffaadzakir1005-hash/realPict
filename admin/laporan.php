<?php
require_once __DIR__ . '/auth.php';
startAdminSession();
requireAdminLogin();
$csrfToken = getAdminCsrfToken();
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kelola Laporan - RealPict</title>
    <link rel="stylesheet" href="../assets/css/style.css">
    <link rel="stylesheet" href="../assets/css/admin.css">
</head>
<body>
    <main class="admin-page">
        <div class="admin-content">
            <header class="admin-header">
                <div>
                    <a class="admin-back-link" href="../index.php">← Kembali ke RealPict</a>
                    <h1>Kelola Laporan</h1>
                    <p class="admin-muted">Tinjau laporan yang diterima, ubah status, atau hapus laporan.</p>
                </div>
                <form method="post" action="logout.php">
                    <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrfToken, ENT_QUOTES, 'UTF-8') ?>">
                    <button class="btn btn-secondary" type="submit">Keluar</button>
                </form>
            </header>
            <div id="adminReports" data-csrf-token="<?= htmlspecialchars($csrfToken, ENT_QUOTES, 'UTF-8') ?>" aria-live="polite">
                <p class="admin-muted">Memuat laporan...</p>
            </div>
        </div>
    </main>
    <div id="adminToast" class="admin-toast" role="status"></div>
    <script src="../assets/js/admin-reports.js"></script>
</body>
</html>
