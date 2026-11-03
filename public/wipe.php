<?php
/**
 * MSK DASHBOARD - WIPE SEGURO (LGPD)
 * Exclui recursivamente todos os arquivos e pastas da conta do usuário com isolamento realpath().
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

// 2. Validação da Chave de API
if ($clientKey !== STORAGE_API_KEY) {
    http_response_code(403);
    echo json_encode(['error' => 'Acesso negado: Chave de API inválida']);
    exit;
}

// 3. Validação de Parâmetros
if (empty($userId)) {
    http_response_code(400);
    echo json_encode(['error' => 'Parâmetros insuficientes para purga']);
    exit;
}

// 3.5 Validação Criptográfica do Firebase ID Token (RS256)
$auth = requireFirebaseToken($userId);
$userId = $auth['userId'];

// 4. Deleção Recursiva (WIPE) com isolamento realpath()
$targetDir = __DIR__ . '/' . BASE_UPLOAD_DIR . '/' . $userId;
$uploadsBaseDir = __DIR__ . '/' . BASE_UPLOAD_DIR;

if (!file_exists($targetDir)) {
    echo json_encode(['success' => true, 'message' => 'Nenhuma mídia encontrada para este usuário.']);
    exit;
}

$realUploadsBase = realpath($uploadsBaseDir);
$realTarget = realpath($targetDir);

if (!$realUploadsBase || !$realTarget || strpos($realTarget, $realUploadsBase . DIRECTORY_SEPARATOR) !== 0 || basename($realTarget) !== $userId) {
    http_response_code(403);
    echo json_encode(['error' => 'Acesso negado: Tentativa de violação de diretório fora de uploads/' . $userId]);
    exit;
}

function deleteDirectory($dir) {
    if (!file_exists($dir)) return true;
    if (!is_dir($dir)) return unlink($dir);

    foreach (scandir($dir) as $item) {
        if ($item === '.' || $item === '..') continue;
        if (!deleteDirectory($dir . DIRECTORY_SEPARATOR . $item)) {
            return false;
        }
    }
    return rmdir($dir);
}

if (deleteDirectory($realTarget)) {
    echo json_encode(['success' => true, 'message' => 'Pasta do usuário completamente purgada.']);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Falha técnica ao excluir a pasta. Arquivos parcialmente removidos.']);
}
