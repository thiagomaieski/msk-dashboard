<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['error' => 'Método inválido']);
    exit;
}

// Receive payload from raw input since fetch() might send JSON
$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, TRUE);

$targetPath = isset($input['path']) ? $input['path'] : (isset($_POST['path']) ? $_POST['path'] : null);

if (!$targetPath) {
    echo json_encode(['error' => 'Caminho não especificado']);
    exit;
}

// Segurança elementar: evitar Directory Traversal (ex: ../../index.php)
if (strpos($targetPath, '..') !== false || substr($targetPath, 0, 8) !== 'uploads/') {
    echo json_encode(['error' => 'Acesso negado']);
    exit;
}

if (file_exists($targetPath)) {
    if (unlink($targetPath)) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['error' => 'Falha ao deletar arquivo (Permissão?)']);
    }
} else {
    // Retorna sucesso de qualquer forma se o arquivo já não existir
    echo json_encode(['success' => true, 'notice' => 'Arquivo já inexistente']);
}
?>
