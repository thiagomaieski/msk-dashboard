<?php
/**
 * MSK DASHBOARD - UPLOAD SEGURO
 * Sistema de upload com isolamento de diretórios, chave de API e validação MIME.
 */

require_once __DIR__ . '/auth-helper.php';

header('Content-Type: application/json; charset=utf-8');
handleCors();

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
    http_response_code(400);
    echo json_encode(['error' => 'ID do usuário não fornecido']);
    exit;
}

// 2.5 Validação Criptográfica do Firebase ID Token (RS256)
$auth = requireFirebaseToken($userId);
$userId = $auth['userId'];

// 3. Validação do Arquivo
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'Erro no recebimento do arquivo']);
    exit;
}

$file = $_FILES['file'];
$tmpPath = $file['tmp_name'];

// 3.5 Limite de Tamanho Máximo (25MB)
define('MAX_UPLOAD_SIZE', 25 * 1024 * 1024);
if ($file['size'] > MAX_UPLOAD_SIZE) {
    http_response_code(400);
    echo json_encode(['error' => 'Arquivo excede o tamanho máximo permitido de 25MB']);
    exit;
}

// 4. Validação de MIME Type (Mais seguro que apenas extensão)
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mimeType = $finfo->file($tmpPath);

$allowedMimeTypes = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
    'application/pdf', 'application/zip', 'application/x-zip-compressed',
    'text/plain', 'video/mp4', 'video/webm'
];

if (!in_array($mimeType, $allowedMimeTypes, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Tipo MIME de arquivo não permitido: ' . $mimeType]);
    exit;
}

// 5. Geração de Nome Aleatório e Validação de Extensão Físíca (Defense in Depth)
$originalName = basename($file['name']);
$fileExt = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

// Rejeição estrita de scripts executáveis (.php, .phtml, .phar, etc.)
if (preg_match('/\.(php|phtml|phar|cgi|pl|py)/i', $originalName) || in_array($fileExt, ['php', 'phtml', 'phar', 'cgi', 'pl', 'py'], true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Executáveis e scripts PHP são estritamente proibidos']);
    exit;
}

$allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'pdf', 'zip', 'txt', 'mp4', 'webm'];
if (!in_array($fileExt, $allowedExtensions, true)) {
    http_response_code(400);
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
        http_response_code(500);
        echo json_encode(['error' => 'Falha ao criar pastas de destino']);
        exit;
    }
}

$targetPath = $targetDir . $randomName;

// 7. Finalização
if (move_uploaded_file($tmpPath, $targetPath)) {
    @chmod($targetPath, 0644);

    if (defined('PUBLIC_BASE_URL') && !empty(PUBLIC_BASE_URL)) {
        $fullUrl = rtrim(PUBLIC_BASE_URL, '/') . '/' . ltrim($targetPath, '/');
    } else {
        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
        $rawHost = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $cleanHost = preg_replace('/[^a-zA-Z0-9.:_-]/', '', $rawHost);
        $requestUri = explode('upload.php', $_SERVER['REQUEST_URI'] ?? '')[0];
        $fullUrl = $protocol . $cleanHost . '/' . trim($requestUri, '/') . (trim($requestUri, '/') ? '/' : '') . ltrim($targetPath, '/');
    }

    echo json_encode([
        'success' => true, 
        'url' => $fullUrl, 
        'path' => $targetPath,
        'name' => $originalName
    ]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Erro interno ao mover arquivo']);
}
