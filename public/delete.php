<?php
/**
 * MSK DASHBOARD - DELETE SEGURO
 * Sistema de exclusão com validação criptográfica, isolamento via realpath() e prune de pastas.
 */

require_once __DIR__ . '/auth-helper.php';

header('Content-Type: application/json; charset=utf-8');
handleCors();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método não permitido']);
    exit;
}

// 1. Receber dados
$inputJSON = @file_get_contents('php://input');
$input = json_decode($inputJSON, true) ?: [];

$clientKey = $_SERVER['HTTP_X_STORAGE_API_KEY'] ?? $input['apiKey'] ?? $_POST['apiKey'] ?? '';
$userId = preg_replace('/[^a-zA-Z0-9_-]/', '', $input['userId'] ?? $_POST['userId'] ?? '');
$targetPath = $input['path'] ?? $_POST['path'] ?? null;

// 2. Validação da Chave de API
if ($clientKey !== STORAGE_API_KEY) {
    http_response_code(403);
    echo json_encode(['error' => 'Acesso negado: Chave de API inválida']);
    exit;
}

// 3. Validação de Parâmetros
if (empty($userId) || empty($targetPath)) {
    http_response_code(400);
    echo json_encode(['error' => 'Parâmetros insuficientes para deleção']);
    exit;
}

// 3.5 Validação Criptográfica do Firebase ID Token (RS256)
$auth = requireFirebaseToken($userId);
$userId = $auth['userId'];

// 4. SEGURANÇA E ISOLAMENTO VIA REALPATH
$userDir = __DIR__ . '/' . BASE_UPLOAD_DIR . '/' . $userId;
$realUserDir = realpath($userDir);

$directory = dirname($targetPath);
$filename = basename($targetPath);
$safeFinalPath = $directory . '/' . $filename;
$fullCandidate = __DIR__ . '/' . $safeFinalPath;

if (file_exists($fullCandidate)) {
    $realTarget = realpath($fullCandidate);
    if (!$realUserDir || !$realTarget || strpos($realTarget, $realUserDir . DIRECTORY_SEPARATOR) !== 0) {
        http_response_code(403);
        echo json_encode(['error' => 'Acesso negado: Tentativa de violação de diretório fora de uploads/' . $userId]);
        exit;
    }

    if (is_dir($realTarget)) {
        http_response_code(400);
        echo json_encode(['error' => 'Operação inválida para diretórios']);
        exit;
    }

    if (unlink($realTarget)) {
        // --- LIMPEZA DE PASTAS VAZIAS (Poda) ---
        function pruneEmptyDirs($dir, $stopDir) {
            if (!file_exists($dir) || !is_dir($dir)) return;
            $realDir = realpath($dir);
            $realStop = realpath($stopDir);
            if (!$realDir || !$realStop || strpos($realDir, $realStop . DIRECTORY_SEPARATOR) !== 0 || $realDir === $realStop) {
                return;
            }
            $files = array_diff(scandir($realDir), ['.', '..']);
            if (empty($files)) {
                if (@rmdir($realDir)) {
                    pruneEmptyDirs(dirname($realDir), $stopDir);
                }
            }
        }

        pruneEmptyDirs(dirname($realTarget), $realUserDir);

        echo json_encode(['success' => true, 'message' => 'Arquivo removido e pastas vazias limpas.']);
        exit;
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Falha técnica ao remover arquivo']);
        exit;
    }
} else {
    // Validação estrita se o arquivo não existe mais
    $expectedPrefix = BASE_UPLOAD_DIR . '/' . $userId . '/';
    if (strpos($targetPath, '..') !== false || strpos($targetPath, $expectedPrefix) !== 0) {
        http_response_code(403);
        echo json_encode(['error' => 'Acesso negado: Tentativa de violação de diretório']);
        exit;
    }

    echo json_encode(['success' => true, 'message' => 'Arquivo já inexistente']);
    exit;
}
