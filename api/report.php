<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../admin/auth.php';
startAdminSession();

$dataFile = __DIR__ . '/../data/laporan.json';
$uploadDir = __DIR__ . '/../uploads/';

if (!is_dir($uploadDir) && !mkdir($uploadDir, 0777, true) && !is_dir($uploadDir)) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Folder unggahan tidak dapat dibuat.']);
    exit;
}

function respond($httpCode, $payload)
{
    http_response_code($httpCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function getReports($dataFile)
{
    if (!file_exists($dataFile)) {
        return [];
    }

    $handle = fopen($dataFile, 'rb');
    if ($handle === false) {
        return null;
    }

    flock($handle, LOCK_SH);
    $content = stream_get_contents($handle);
    flock($handle, LOCK_UN);
    fclose($handle);

    if ($content === false) {
        return null;
    }

    $data = json_decode($content, true);
    return json_last_error() === JSON_ERROR_NONE && is_array($data) ? $data : null;
}

function modifyReports($dataFile, callable $modifier)
{
    $handle = fopen($dataFile, 'c+');
    if ($handle === false || !flock($handle, LOCK_EX)) {
        if (is_resource($handle)) {
            fclose($handle);
        }
        return ['error' => 'Data laporan tidak dapat dibuka untuk diperbarui.'];
    }

    rewind($handle);
    $content = stream_get_contents($handle);
    $reports = $content === '' ? [] : json_decode($content, true);
    if ($content === false || ($content !== '' && (json_last_error() !== JSON_ERROR_NONE || !is_array($reports)))) {
        flock($handle, LOCK_UN);
        fclose($handle);
        return ['error' => 'Data laporan tidak valid dan tidak dapat diperbarui.'];
    }

    $result = $modifier($reports);
    if (!empty($result['save'])) {
        $json = json_encode($reports, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        if ($json === false) {
            $result = ['error' => 'Data laporan gagal diproses.'];
        } else {
            rewind($handle);
            if (!ftruncate($handle, 0)
                || fwrite($handle, $json) !== strlen($json)
                || !fflush($handle)) {
                $result = ['error' => 'Perubahan laporan gagal disimpan.'];
            }
        }
    }

    flock($handle, LOCK_UN);
    fclose($handle);
    return $result;
}

function getJsonRequestBody()
{
    $body = file_get_contents('php://input');
    if ($body === false) {
        return null;
    }

    $data = json_decode($body, true);
    return json_last_error() === JSON_ERROR_NONE && is_array($data) ? $data : null;
}

if ($method === 'GET') {
    $reports = getReports($dataFile);
    if ($reports === null) {
        respond(500, ['status' => 'error', 'message' => 'Data laporan gagal dibaca.']);
    }

    respond(200, [
        'status' => 'success',
        'total' => count($reports),
        'data' => array_reverse($reports)
    ]);
}

if ($method === 'POST') {
    $category = isset($_POST['kategori']) ? trim($_POST['kategori']) : 'Hoaks / disinformasi';
    $description = isset($_POST['deskripsi']) ? trim($_POST['deskripsi']) : '';

    $savedImage = null;
    $originalName = null;

    if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
        $file = $_FILES['image'];
        $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
        $cleanName = 'report_' . time() . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
        $target = $uploadDir . $cleanName;

        if (move_uploaded_file($file['tmp_name'], $target)) {
            $savedImage = 'uploads/' . $cleanName;
            $originalName = $file['name'];
        }
    }

    $newReport = [
        'id' => 'RPT-' . strtoupper(substr(md5(uniqid(rand(), true)), 0, 8)),
        'timestamp' => date('Y-m-d H:i:s'),
        'date_formatted' => date('d M Y, H:i'),
        'kategori' => htmlspecialchars($category, ENT_QUOTES, 'UTF-8'),
        'deskripsi' => htmlspecialchars($description, ENT_QUOTES, 'UTF-8'),
        'image' => $savedImage,
        'file_name' => $originalName ? htmlspecialchars($originalName, ENT_QUOTES, 'UTF-8') : 'Tidak ada gambar',
        'status' => 'Sedang Ditinjau',
        'status_code' => 'reviewing'
    ];

    $result = modifyReports($dataFile, function (&$reports) use ($newReport) {
        $reports[] = $newReport;
        return ['save' => true];
    });

    if (isset($result['error'])) {
        if ($savedImage !== null && file_exists(__DIR__ . '/../' . $savedImage)) {
            unlink(__DIR__ . '/../' . $savedImage);
        }
        respond(500, ['status' => 'error', 'message' => $result['error']]);
    }

    respond(200, [
        'status' => 'success',
        'message' => 'Laporan berhasil dikirim dan masuk antrean tim threat intelligence RealPict.',
        'report' => $newReport
    ]);
}

if ($method === 'PATCH' || $method === 'DELETE') {
    if (!isAdminLoggedIn()) {
        respond(401, ['status' => 'error', 'message' => 'Silakan masuk sebagai admin untuk mengelola laporan.']);
    }

    $csrfToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!isValidAdminCsrfToken($csrfToken)) {
        respond(403, ['status' => 'error', 'message' => 'Token keamanan tidak valid. Muat ulang halaman admin.']);
    }

    $input = getJsonRequestBody();
    if ($input === null || !isset($input['id']) || !is_string($input['id']) || trim($input['id']) === '') {
        respond(400, ['status' => 'error', 'message' => 'Data permintaan tidak valid.']);
    }

    $reportId = trim($input['id']);
    $deletedImage = null;
    $result = modifyReports($dataFile, function (&$reports) use ($method, $input, $reportId, &$deletedImage) {
        foreach ($reports as $index => &$report) {
            if (!isset($report['id']) || $report['id'] !== $reportId) {
                continue;
            }

            if ($method === 'PATCH') {
                $statuses = [
                    'reviewing' => 'Sedang Ditinjau',
                    'reported' => 'Sudah Dilaporkan'
                ];
                $statusCode = $input['status_code'] ?? '';
                if (!is_string($statusCode) || !isset($statuses[$statusCode])) {
                    return ['http_code' => 400, 'error' => 'Status laporan tidak valid.'];
                }

                $report['status_code'] = $statusCode;
                $report['status'] = $statuses[$statusCode];
                unset($report);
                return ['save' => true, 'message' => 'Status laporan berhasil diperbarui.'];
            }

            $deletedImage = $report['image'] ?? null;
            unset($report);
            array_splice($reports, $index, 1);
            return ['save' => true, 'message' => 'Laporan berhasil dihapus.'];
        }
        unset($report);

        return ['http_code' => 404, 'error' => 'Laporan tidak ditemukan.'];
    });

    if (isset($result['error'])) {
        respond($result['http_code'] ?? 500, ['status' => 'error', 'message' => $result['error']]);
    }

    $warnings = [];
    if ($method === 'DELETE'
        && is_string($deletedImage)
        && preg_match('~^uploads/[A-Za-z0-9._-]+$~D', $deletedImage)) {
        $uploadPath = realpath($uploadDir);
        $imagePath = realpath(__DIR__ . '/../' . $deletedImage);
        if ($imagePath !== false && $uploadPath !== false && dirname($imagePath) === $uploadPath
            && is_file($imagePath) && !unlink($imagePath)) {
            $warnings[] = 'Berkas gambar terkait tidak dapat dihapus.';
        }
    }

    respond(200, [
        'status' => 'success',
        'message' => $result['message'],
        'warnings' => $warnings
    ]);
}

respond(405, ['status' => 'error', 'message' => 'Metode permintaan tidak didukung.']);
