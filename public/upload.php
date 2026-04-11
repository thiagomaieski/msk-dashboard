<?php
// Define que a resposta será JSON
header('Content-Type: application/json; charset=utf-8');

// Permite requisições de origem cruzada se necessário (opcional se for no mesmo domínio)
header('Access-Control-Allow-Origin: *');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['error' => 'Método inválido']);
    exit;
}

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['error' => 'Nenhum arquivo recebido ou erro no upload']);
    exit;
}

// Pasta base de uploads (certifique-se que essa pasta exista e tenha permissão de escrita 755 ou 777)
$baseDir = 'uploads/projetos';

// Opcional: Separar por ID do projeto (se vier no POST)
$projectId = isset($_POST['projectId']) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST['projectId']) : 'geral';
$targetDir = $baseDir . '/' . $projectId . '/';

if (!file_exists($targetDir)) {
    if (!mkdir($targetDir, 0777, true)) {
        echo json_encode(['error' => 'Falha ao criar diretório no servidor']);
        exit;
    }
}

// Pegar o arquivo e higienizar o nome
$file = $_FILES['file'];
$fileName = basename($file['name']);
$fileExt = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

// Extensões proibidas (Segurança)
$forbiddenExts = ['php', 'php3', 'php4', 'php5', 'phtml', 'exe', 'sh', 'bat'];
if (in_array($fileExt, $forbiddenExts)) {
    echo json_encode(['error' => 'Tipo de arquivo não permitido']);
    exit;
}

// Gera um nome único para não substituir
$newFileName = time() . '_' . rand(100, 999) . '_' . preg_replace('/[^a-zA-Z0-9_-]/', '', pathinfo($fileName, PATHINFO_FILENAME)) . '.' . $fileExt;
$targetPath = $targetDir . $newFileName;

if (move_uploaded_file($file['tmp_name'], $targetPath)) {
    // Retorna a URL relativa ao servidor (mágica)
    // Se o site for dominio.com, o link será dominio.com/uploads/projetos/...
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
    $host = $_SERVER['HTTP_HOST'];
    // Ajuste: pegar a base URL onde o upload.php está rodando
    $requestUri = explode('upload.php', $_SERVER['REQUEST_URI'])[0];
    
    $fullUrl = $protocol . $host . $requestUri . $targetPath;
    
    echo json_encode(['success' => true, 'url' => $fullUrl, 'path' => $targetPath]);
} else {
    echo json_encode(['error' => 'Falha ao mover arquivo']);
}
?>
