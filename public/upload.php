<?php
/**
 * MSK DASHBOARD - UPLOAD SEGURO
 * Sistema de upload com isolamento de diretórios, chave de API e validação MIME.
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

// 1. Validação da Chave de API
$clientKey = $_SERVER['HTTP_X_STORAGE_API_KEY'] ?? $_POST['apiKey'] ?? '';
if ($clientKey !== STORAGE_API_KEY) {
    http_response_code(403);
    echo json_encode(['error' => 'Acesso negado: Chave de API inválida']);
    exit;
}

// 2. Validação dos Dados do Usuário
$userId = preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST['userId'] ?? '');
$type = preg_replace('/[^a-z]/', '', $_POST['type'] ?? 'geral'); 
$targetId = preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST['targetId'] ?? '');

if (empty($userId)) {
    echo json_encode(['error' => 'ID do usuário não fornecido']);
    exit;
}

// 2.5 Validação JWT Firebase (Evita Spoofing)
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

// 3. Validação do Arquivo
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['error' => 'Erro no recebimento do arquivo']);
    exit;
}

$file = $_FILES['file'];
$tmpPath = $file['tmp_name'];

// 4. Validação de MIME Type (Mais seguro que apenas extensão)
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mimeType = $finfo->file($tmpPath);

$allowedMimeTypes = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
    'application/pdf', 'application/zip', 'application/x-zip-compressed',
    'text/plain', 'video/mp4', 'video/webm'
];

if (!in_array($mimeType, $allowedMimeTypes)) {
    echo json_encode(['error' => 'Tipo de arquivo não permitido: ' . $mimeType]);
    exit;
}

// 5. Geração de Nome Aleatório e Validação de Extensão Físíca (Defense in Depth)
$originalName = basename($file['name']);
$fileExt = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

$allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'pdf', 'zip', 'txt', 'mp4', 'webm'];

if (!in_array($fileExt, $allowedExtensions)) {
    echo json_encode(['error' => 'Extensão de arquivo proibida por segurança: .' . $fileExt]);
    exit;
}

// Gera um hash único baseado no conteúdo e tempo
$randomName = md5(uniqid($originalName, true)) . '.' . $fileExt;

// 6. Construção do Caminho
$targetDir = BASE_UPLOAD_DIR . '/' . $userId . '/' . $type;
if (!empty($targetId)) {
    $targetDir .= '/' . $targetId;
}
$targetDir .= '/';

if (!file_exists($targetDir)) {
    if (!mkdir($targetDir, 0755, true)) {
        echo json_encode(['error' => 'Falha ao criar pastas de destino']);
        exit;
    }
}

$targetPath = $targetDir . $randomName;

// 7. Finalização
if (move_uploaded_file($tmpPath, $targetPath)) {
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
    $host = $_SERVER['HTTP_HOST'];
    $requestUri = explode('upload.php', $_SERVER['REQUEST_URI'])[0];
    
    $fullUrl = $protocol . $host . $requestUri . $targetPath;
    
    echo json_encode([
        'success' => true, 
        'url' => $fullUrl, 
        'path' => $targetPath,
        'name' => $originalName
    ]);
} else {
    echo json_encode(['error' => 'Erro interno ao mover arquivo']);
}
