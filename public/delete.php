<?php
/**
 * MSK DASHBOARD - DELETE SEGURO
 * Sistema de exclusão com validação de posse via userId e basename().
 */

// Configurações
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
$targetPath = $input['path'] ?? $_POST['path'] ?? null;

// 2. Validação da Chave de API
if ($clientKey !== STORAGE_API_KEY) {
    http_response_code(403);
    echo json_encode(['error' => 'Acesso negado: Chave de API inválida']);
    exit;
}

// 3. Validação de Parâmetros
if (empty($userId) || empty($targetPath)) {
    echo json_encode(['error' => 'Parâmetros insuficientes para deleção']);
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

// 4. SEGURANÇA E ISOLAMENTO
// O caminho deve obrigatoriamente começar com "uploads/{userId}/"
$expectedPrefix = BASE_UPLOAD_DIR . '/' . $userId . '/';

// Usamos realpath() para normalizar caminhos ou strpos para prefixo
if (strpos($targetPath, '..') !== false || strpos($targetPath, $expectedPrefix) !== 0) {
    http_response_code(403);
    echo json_encode(['error' => 'Acesso negado: Tentativa de violação de diretório']);
    exit;
}

// 5. Basename focal (Reforço solicitado pelo usuário)
// Garantimos que estamos operando sobre o arquivo final de forma segura
$directory = dirname($targetPath);
$filename = basename($targetPath);
$safeFinalPath = $directory . '/' . $filename;

// 6. Execução
if (file_exists($safeFinalPath)) {
    if (is_dir($safeFinalPath)) {
        echo json_encode(['error' => 'Operação inválida para diretórios']);
        exit;
    }

    if (unlink($safeFinalPath)) {
        // --- LIMPEZA DE PASTAS VAZIAS (Poda) ---
        function pruneEmptyDirs($dir, $stopDir) {
            // Se o diretório não existe ou não está dentro da pasta uploads do usuário, para.
            if (!file_exists($dir) || !is_dir($dir) || strpos($dir, $stopDir) !== 0 || $dir === $stopDir) {
                return;
            }
            $files = array_diff(scandir($dir), array('.', '..'));
            if (empty($files)) {
                if (rmdir($dir)) {
                    pruneEmptyDirs(dirname($dir), $stopDir);
                }
            }
        }
        
        // Começa a limpar a partir da pasta onde o arquivo estava
        pruneEmptyDirs($directory, $expectedPrefix);
        
        echo json_encode(['success' => true, 'message' => 'Arquivo removido e pastas vazias limpas.']);
    } else {
        echo json_encode(['error' => 'Falha técnica ao remover arquivo']);
    }
} else {
    echo json_encode(['success' => true, 'message' => 'Arquivo já inexistente']);
}
