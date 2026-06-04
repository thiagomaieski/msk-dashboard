<?php
/**
 * MSK DASHBOARD - ALERTS SYNC
 * Recebe o resumo das pendências do dashboard e salva num JSON.
 */

define('ALLOWED_ORIGIN', '*');
define('STORAGE_API_KEY', 'msk_storage_6a2d9b4c1f8e'); 
define('BASE_UPLOAD_DIR', 'uploads/alerts');

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: ' . ALLOWED_ORIGIN);
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Storage-API-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

$headers = getallheaders();
$clientKey = $headers['X-Storage-Api-Key'] ?? $_SERVER['HTTP_X_STORAGE_API_KEY'] ?? $_GET['apiKey'] ?? '';
if ($clientKey !== STORAGE_API_KEY) {
    http_response_code(403);
    echo json_encode(['error' => 'Acesso negado: Chave de API inválida']);
    exit;
}

$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, TRUE) ?: [];
$userId = preg_replace('/[^a-zA-Z0-9_-]/', '', $input['userId'] ?? '');

if (empty($userId)) {
    http_response_code(400);
    echo json_encode(['error' => 'ID do usuário não fornecido']);
    exit;
}

$authHeader = $headers['Authorization'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? '';
$jwt = '';
if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    $jwt = $matches[1];
}

function shallowVerifyToken($jwt, $expectedUserId) {
    if (empty($jwt)) return ['valid' => false, 'error' => 'Token ausente'];
    $parts = explode('.', $jwt);
    if (count($parts) !== 3) return ['valid' => false, 'error' => 'Token malformado'];
    
    $payloadData = base64_decode(strtr($parts[1], '-_', '+/'));
    $payload = json_decode($payloadData, true);
    
    $sub = $payload['sub'] ?? '';
    if (empty($sub) || $sub !== $expectedUserId) {
         return ['valid' => false, 'error' => 'UID divergente.'];
    }
    return ['valid' => true];
}

$val = shallowVerifyToken($jwt, $userId);
if (!$val['valid']) {
    http_response_code(403);
    echo json_encode(['error' => 'Auth JWT Falhou: ' . $val['error']]);
    exit;
}

if (!file_exists(BASE_UPLOAD_DIR)) {
    mkdir(BASE_UPLOAD_DIR, 0755, true);
}

$jsonFile = BASE_UPLOAD_DIR . '/' . $userId . '.json';
file_put_contents($jsonFile, json_encode($input, JSON_PRETTY_PRINT));

echo json_encode(['success' => true]);
