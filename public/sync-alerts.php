<?php
/**
 * MSK DASHBOARD - ALERTS SYNC
 * Recebe o resumo das pendências do dashboard e salva num JSON.
 */

require_once __DIR__ . '/auth-helper.php';

if (!defined('ALLOWED_ORIGIN')) define('ALLOWED_ORIGIN', '*');

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: ' . ALLOWED_ORIGIN);
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Storage-API-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

$headers = function_exists('getallheaders') ? getallheaders() : [];
$clientKey = $headers['X-Storage-Api-Key'] ?? $headers['x-storage-api-key'] ?? $_SERVER['HTTP_X_STORAGE_API_KEY'] ?? $_GET['apiKey'] ?? '';
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

// Validação Criptográfica do Firebase ID Token (RS256)
$auth = requireFirebaseToken($userId);
$userId = $auth['userId'];

$alertsDir = BASE_UPLOAD_DIR . '/alerts';
if (!file_exists($alertsDir)) {
    mkdir($alertsDir, 0755, true);
}

$jsonFile = $alertsDir . '/' . $userId . '.json';
file_put_contents($jsonFile, json_encode($input, JSON_PRETTY_PRINT));

echo json_encode(['success' => true]);
