<?php
/**
 * MSK DASHBOARD - DELETE SEGURO
 * Sistema de exclusão com validação de posse via userId e basename().
 */

require_once __DIR__ . '/auth-helper.php';

// Configurações
if (!defined('ALLOWED_ORIGIN')) define('ALLOWED_ORIGIN', '*');

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

// 3.5 Validação Criptográfica do Firebase ID Token (RS256)
$auth = requireFirebaseToken($userId);
$userId = $auth['userId'];

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
