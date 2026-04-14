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

// 5. Construção do Caminho
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

// 6. Geração de Nome Aleatório (MD5 + Uniqid)
$originalName = basename($file['name']);
$fileExt = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

// Gera um hash único baseado no conteúdo e tempo
$randomName = md5(uniqid($originalName, true)) . '.' . $fileExt;
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
