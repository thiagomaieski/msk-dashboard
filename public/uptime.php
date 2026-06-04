<?php
/**
 * MSK DASHBOARD - UPTIME API
 * Lê e grava os domínios monitorados do usuário.
 */

define('ALLOWED_ORIGIN', '*');
define('STORAGE_API_KEY', 'msk_storage_6a2d9b4c1f8e'); 
define('BASE_UPLOAD_DIR', 'uploads');

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: ' . ALLOWED_ORIGIN);
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Storage-API-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// 1. Validação da Chave de API
$headers = getallheaders();
$clientKey = $headers['X-Storage-Api-Key'] ?? $_SERVER['HTTP_X_STORAGE_API_KEY'] ?? $_GET['apiKey'] ?? '';
if ($clientKey !== STORAGE_API_KEY) {
    http_response_code(403);
    echo json_encode(['error' => 'Acesso negado: Chave de API inválida']);
    exit;
}

// Ler JSON payload
$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, TRUE) ?: [];

// Pode vir por GET ou POST/JSON
$userId = preg_replace('/[^a-zA-Z0-9_-]/', '', $_GET['userId'] ?? $input['userId'] ?? '');

if (empty($userId)) {
    http_response_code(400);
    echo json_encode(['error' => 'ID do usuário não fornecido']);
    exit;
}

// 2. Validação JWT Firebase (Evita Spoofing)
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
    if ($payloadData === false) return ['valid' => false, 'error' => 'Payload inválido'];
    
    $payload = json_decode($payloadData, true);
    if (!$payload) return ['valid' => false, 'error' => 'JSON inválido no token'];
    
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

// 3. Caminho do arquivo JSON
$userDir = BASE_UPLOAD_DIR . '/' . $userId;
$uptimeDir = $userDir . '/uptime';
$jsonFile = $uptimeDir . '/data.json';

// Garante que o diretório existe
if (!file_exists($uptimeDir)) {
    mkdir($uptimeDir, 0755, true);
}

// Helper para ler dados
function readData($file) {
    if (!file_exists($file)) return ['email' => '', 'monitors' => []];
    $data = json_decode(file_get_contents($file), true);
    if (!is_array($data)) return ['email' => '', 'monitors' => []];
    if (!isset($data['monitors'])) $data['monitors'] = [];
    if (!isset($data['email'])) $data['email'] = '';
    return $data;
}

// Helper para gravar dados
function saveData($file, $data) {
    file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT));
}

$method = $_SERVER['REQUEST_METHOD'];
$data = readData($jsonFile);

if ($method === 'GET') {
    // Listar monitores
    echo json_encode(['success' => true, 'data' => $data]);
    exit;
}

if ($method === 'POST') {
    $action = $input['action'] ?? 'add';
    
    // Se estiver atualizando o e-mail de alerta
    if ($action === 'set_email') {
        $email = trim($input['email'] ?? '');
        $data['email'] = $email;
        saveData($jsonFile, $data);
        echo json_encode(['success' => true, 'message' => 'Email atualizado', 'data' => $data]);
        exit;
    }
    
    if ($action === 'delete') {
        $id = trim($input['id'] ?? '');
        if (empty($id)) {
            http_response_code(400);
            echo json_encode(['error' => 'ID do monitor não fornecido']);
            exit;
        }
        
        $data['monitors'] = array_filter($data['monitors'], function($m) use ($id) {
            return $m['id'] !== $id;
        });
        $data['monitors'] = array_values($data['monitors']);
        saveData($jsonFile, $data);
        echo json_encode(['success' => true, 'message' => 'Monitor removido', 'data' => $data]);
        exit;
    }
    
    // Adicionar/Atualizar monitor
    $domain = trim($input['domain'] ?? '');
    $label = trim($input['label'] ?? '');
    
    if (empty($domain)) {
        http_response_code(400);
        echo json_encode(['error' => 'Domínio não fornecido']);
        exit;
    }
    
    // Formatar domínio
    $domain = strtolower($domain);
    if (strpos($domain, 'http') !== 0) {
        $domain = 'https://' . $domain;
    }
    
    $id = md5($domain);
    
    $exists = false;
    foreach ($data['monitors'] as &$m) {
        if ($m['id'] === $id) {
            $m['label'] = $label;
            $exists = true;
            break;
        }
    }
    
    if (!$exists) {
        $data['monitors'][] = [
            'id' => $id,
            'domain' => $domain,
            'label' => $label,
            'status' => 'pending', 
            'lastChecked' => null,
            'responseTime' => null,
            'createdAt' => time()
        ];
    }
    
    // Auto-preencher email se vazio e enviado no payload
    if (empty($data['email']) && !empty($input['userEmail'])) {
        $data['email'] = $input['userEmail'];
    }
    
    saveData($jsonFile, $data);
    echo json_encode(['success' => true, 'message' => 'Monitor salvo', 'data' => $data]);
    exit;
}

if ($method === 'DELETE') {
    // Remover monitor
    $id = trim($input['id'] ?? $_GET['id'] ?? '');
    
    if (empty($id)) {
        http_response_code(400);
        echo json_encode(['error' => 'ID do monitor não fornecido']);
        exit;
    }
    
    $data['monitors'] = array_filter($data['monitors'], function($m) use ($id) {
        return $m['id'] !== $id;
    });
    
    $data['monitors'] = array_values($data['monitors']);
    
    saveData($jsonFile, $data);
    echo json_encode(['success' => true, 'message' => 'Monitor removido', 'data' => $data]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método não suportado']);
