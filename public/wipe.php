<?php
/**
 * MSK DASHBOARD - WIPE SEGURO (LGPD)
 * Exclui recursivamente todos os arquivos e pastas da conta do usuário.
 */

define('ALLOWED_ORIGIN', '*');
define('STORAGE_API_KEY', 'msk_storage_6a2d9b4c1f8e'); 
define('BASE_UPLOAD_DIR', 'uploads');

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: ' . ALLOWED_ORIGIN);
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Storage-API-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método não permitido']);
    exit;
}

// 1. Receber dados
$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, TRUE);

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
    echo json_encode(['error' => 'Parâmetros insuficientes para purga']);
    exit;
}

// 3.5 Validação JWT Firebase (Evita Spoofing)
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
$jwt = '';
if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    $jwt = $matches[1];
}

function shallowVerifyToken($jwt, $expectedUserId) {
    if (empty($jwt)) return ['valid' => false, 'error' => 'Token ausente'];
    $parts = explode('.', $jwt);
    if (count($parts) !== 3) return ['valid' => false, 'error' => 'Token malformado'];
    
    $payloadData = base64_decode(strtr($parts[1], '-_', '+/'));
    if ($payloadData === false) return ['valid' => false, 'error' => 'Payload inválido'];
    
    $payload = json_decode($payloadData, true);
    if (!$payload) return ['valid' => false, 'error' => 'JSON inválido no token'];
    
    if (isset($payload['exp']) && time() >= $payload['exp']) {
        return ['valid' => false, 'error' => 'Token expirado'];
    }
    
    $sub = $payload['sub'] ?? '';
    if (empty($sub) || $sub !== $expectedUserId) {
         return ['valid' => false, 'error' => 'Identidade forjada. UID divergente.'];
    }
    
    return ['valid' => true];
}

$val = shallowVerifyToken($jwt, $userId);
if (!$val['valid']) {
    http_response_code(403);
    echo json_encode(['error' => 'Auth JWT Falhou: ' . $val['error']]);
    exit;
}

// 4. Deleção Recursiva (WIPE)
$targetDir = BASE_UPLOAD_DIR . '/' . $userId;

if (!file_exists($targetDir)) {
    echo json_encode(['success' => true, 'message' => 'Nenhuma mídia encontrada para este usuário.']);
    exit;
}

function deleteDirectory($dir) {
    if (!file_exists($dir)) return true;
    if (!is_dir($dir)) return unlink($dir);
    
    foreach (scandir($dir) as $item) {
        if ($item == '.' || $item == '..') continue;
        if (!deleteDirectory($dir . DIRECTORY_SEPARATOR . $item)) {
            return false;
        }
    }
    return rmdir($dir);
}

if (deleteDirectory($targetDir)) {
    echo json_encode(['success' => true, 'message' => 'Pasta do usuário completamente purgada.']);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Falha técnica ao excluir a pasta. Arquivos parcialmente removidos.']);
}
