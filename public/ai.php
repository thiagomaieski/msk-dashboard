<?php
/**
 * ai.php — Proxy seguro de IA (Gemini Flash-Lite) para qualificação de leads e geração de mensagens.
 *
 * Regras de segurança e custo:
 * 1. Valida obrigatoriamente o Firebase ID Token (RS256) via requireFirebaseToken().
 * 2. Aplica teto diário por usuário (padrão 60 chamadas/dia) em uploads/{uid}/ai-usage.json.
 * 3. Mantém GEMINI_API_KEY e GEMINI_MODEL exclusivamente no servidor (config.php).
 * 4. Limita tamanho de entrada e aplica timeout estrito.
 */

require_once __DIR__ . '/auth-helper.php';

header('Content-Type: application/json; charset=utf-8');
handleCors();

// 1. Autenticação obrigatória via Firebase ID Token (RS256)
$auth = requireFirebaseToken();
$userId = preg_replace('/[^a-zA-Z0-9_-]/', '', $auth['userId']);

if (empty($userId)) {
    http_response_code(401);
    echo json_encode(['error' => 'Usuário inválido']);
    exit;
}

// 2. Limite de tamanho do payload bruto (máx 1.5 MB para permitir print JPEG ~768px se enviado)
$rawInput = @file_get_contents('php://input');
if ($rawInput !== false && strlen($rawInput) > 1572864) {
    http_response_code(413);
    echo json_encode(['error' => 'Payload excede o tamanho máximo permitido (1.5 MB)']);
    exit;
}

$body = json_decode($rawInput ?: '{}', true);
if (!is_array($body)) {
    $body = [];
}

$action = strtolower(trim($_REQUEST['action'] ?? $body['action'] ?? ''));
$validActions = ['usage', 'qualify', 'message'];

if (!in_array($action, $validActions, true)) {
    http_response_code(400);
    echo json_encode(['error' => "Ação inválida. Use 'qualify', 'message' ou 'usage'."]);
    exit;
}

// 3. Gerenciamento do contador diário em uploads/{uid}/ai-usage.json
$dailyLimit = (defined('AI_DAILY_LIMIT') && (int)AI_DAILY_LIMIT > 0) ? (int)AI_DAILY_LIMIT : 60;
$userDir = BASE_UPLOAD_DIR . '/' . $userId;
if (!is_dir($userDir)) {
    @mkdir($userDir, 0755, true);
}
$usageFile = $userDir . '/ai-usage.json';
$today = date('Y-m-d');

function getAiUsage($usageFile, $today, $dailyLimit) {
    $used = 0;
    if (file_exists($usageFile)) {
        $data = json_decode(@file_get_contents($usageFile), true);
        if (is_array($data) && ($data['date'] ?? '') === $today) {
            $used = max(0, (int)($data['used'] ?? 0));
        }
    }
    return [
        'date'  => $today,
        'used'  => $used,
        'limit' => $dailyLimit,
    ];
}

function incrementAiUsage($usageFile, $today, $dailyLimit) {
    $current = getAiUsage($usageFile, $today, $dailyLimit);
    $current['used'] = $current['used'] + 1;
    @file_put_contents($usageFile, json_encode([
        'date'      => $today,
        'used'      => $current['used'],
        'updatedAt' => date('c'),
    ], JSON_PRETTY_PRINT));
    @chmod($usageFile, 0600);
    return $current;
}

$currentUsage = getAiUsage($usageFile, $today, $dailyLimit);

// Ação de consulta de uso (não consome cota)
if ($action === 'usage') {
    echo json_encode([
        'ok'    => true,
        'usage' => $currentUsage,
    ]);
    exit;
}

// Verifica teto diário antes de chamar o modelo
if ($currentUsage['used'] >= $dailyLimit) {
    http_response_code(429);
    echo json_encode([
        'error' => "Limite diário de IA atingido ({$dailyLimit}/{$dailyLimit} chamadas hoje). O contador reinicia à meia-noite.",
        'code'  => 'DAILY_LIMIT_REACHED',
        'usage' => $currentUsage,
    ]);
    exit;
}

// 4. Verifica chave da API Gemini no config.php
$apiKey = defined('GEMINI_API_KEY') ? GEMINI_API_KEY : getenv('GEMINI_API_KEY');
if (empty($apiKey) || $apiKey === 'SUA_CHAVE_GEMINI_AQUI') {
    http_response_code(503);
    echo json_encode([
        'error' => 'Chave GEMINI_API_KEY não configurada no config.php do servidor.',
        'code'  => 'MISSING_API_KEY',
        'usage' => $currentUsage,
    ]);
    exit;
}

$primaryModel = (defined('GEMINI_MODEL') && !empty(GEMINI_MODEL)) ? GEMINI_MODEL : 'gemini-2.5-flash-lite';

function truncStr($val, $max = 500) {
    $s = trim((string)($val ?? ''));
    return mb_substr($s, 0, $max, 'UTF-8');
}

function callGemini($apiKey, $model, $parts, $expectJson = false) {
    $endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' . urlencode($model) . ':generateContent?key=' . urlencode($apiKey);
    $generationConfig = [
        'temperature'     => $expectJson ? 0.2 : 0.6,
        'maxOutputTokens' => 500,
    ];
    if ($expectJson) {
        $generationConfig['responseMimeType'] = 'application/json';
    }

    $payload = json_encode([
        'contents' => [
            ['role' => 'user', 'parts' => $parts]
        ],
        'generationConfig' => $generationConfig,
    ]);

    $ch = curl_init($endpoint);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 25);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 8);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'User-Agent: MSK-Dashboard-AI/1.0',
    ]);

    $response = curl_exec($ch);
    $curlErr = curl_error($ch);
    $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return [
        'httpCode' => $httpCode,
        'body'     => $response,
        'curlErr'  => $curlErr,
    ];
}

function executeGeminiWithFallback($apiKey, $primaryModel, $parts, $expectJson = false) {
    $res = callGemini($apiKey, $primaryModel, $parts, $expectJson);
    // Se o modelo primário retornar 404, tenta fallback para gemini-2.0-flash-lite
    if ($res['httpCode'] === 404 && $primaryModel !== 'gemini-2.0-flash-lite') {
        $res = callGemini($apiKey, 'gemini-2.0-flash-lite', $parts, $expectJson);
    }
    return $res;
}

// ── Ação: qualify ─────────────────────────────────────────────────────────────
if ($action === 'qualify') {
    $lead = is_array($body['lead'] ?? null) ? $body['lead'] : [];
    $nome = truncStr($lead['nome'] ?? '', 120);
    $nicho = truncStr($lead['nicho'] ?? '', 80);
    $cidade = truncStr($lead['cidade'] ?? '', 80);
    $site = truncStr($lead['site'] ?? '', 250);
    $telefone = truncStr($lead['telefone'] ?? '', 40);
    $obs = truncStr($lead['observacoes'] ?? '', 500);
    $mobileScore = isset($lead['pagespeedMobile']) && is_numeric($lead['pagespeedMobile']) ? (int)$lead['pagespeedMobile'] : null;
    $desktopScore = isset($lead['pagespeedDesktop']) && is_numeric($lead['pagespeedDesktop']) ? (int)$lead['pagespeedDesktop'] : null;
    $instaFollowers = isset($lead['instaFollowers']) && is_numeric($lead['instaFollowers']) ? (int)$lead['instaFollowers'] : null;
    $instaBio = truncStr($lead['instaBio'] ?? '', 300);
    $instaBioLink = truncStr($lead['instaBioLink'] ?? '', 200);

    $prompt = "Você é um assistente de pré-qualificação comercial para venda de criação e otimização de sites profissionais.\n"
        . "Analise os dados públicos da empresa abaixo (e a captura de tela do site, se anexada) e retorne APENAS um objeto JSON válido com o formato exato:\n"
        . "{\"chips\": [\"...\"], \"resumo\": \"...\", \"prioridade\": \"alta|media|baixa\"}\n\n"
        . "Regras:\n"
        . "1. O array \"chips\" só pode conter valores escolhidos entre: [\"sem_ssl\", \"lento_mobile\", \"visual_antigo\", \"sem_whatsapp\", \"sem_site\"].\n"
        . "   - Use \"sem_ssl\" se a URL começar com http://.\n"
        . "   - Use \"lento_mobile\" se PageSpeed Mobile < 55.\n"
        . "   - Use \"visual_antigo\" se o print mostrar layout datado, amador, quebrado ou pouco profissional.\n"
        . "   - Use \"sem_whatsapp\" se não houver telefone/WhatsApp ou se o site não exibir CTA claro de contato.\n"
        . "   - Use \"sem_site\" se a empresa não tiver site próprio (apenas Instagram ou vazio).\n"
        . "2. \"resumo\" deve ter no máximo 2 frases curtas (até 220 caracteres) em português, diretas e práticas, destacando o principal argumento de venda.\n"
        . "3. \"prioridade\" deve ser \"alta\", \"media\" ou \"baixa\" conforme o potencial de venda.\n\n"
        . "Dados do Lead:\n"
        . "- Nome: {$nome}\n"
        . "- Nicho: {$nicho}\n"
        . "- Cidade: {$cidade}\n"
        . "- Site/Link: " . ($site ?: 'Não informado') . "\n"
        . "- Telefone: " . ($telefone ?: 'Não informado') . "\n"
        . "- PageSpeed Mobile: " . ($mobileScore !== null ? $mobileScore . '/100' : 'N/A') . "\n"
        . "- PageSpeed Desktop: " . ($desktopScore !== null ? $desktopScore . '/100' : 'N/A') . "\n"
        . "- Instagram Seguidores: " . ($instaFollowers !== null ? $instaFollowers : 'N/A') . "\n"
        . "- Instagram Bio: " . ($instaBio ?: 'N/A') . "\n"
        . "- Instagram Link na Bio: " . ($instaBioLink ?: 'N/A') . "\n"
        . "- Observações prévias: " . ($obs ?: 'Nenhuma') . "\n";

    $parts = [['text' => $prompt]];

    // Se o front enviou imageBase64 (JPEG reduzido ~768px), anexa ao prompt multimodal
    $imageBase64 = $body['imageBase64'] ?? '';
    if (is_string($imageBase64) && !empty($imageBase64) && strlen($imageBase64) < 1200000) {
        if (strpos($imageBase64, 'base64,') !== false) {
            $imageBase64 = explode('base64,', $imageBase64, 2)[1];
        }
        $parts[] = [
            'inlineData' => [
                'mimeType' => 'image/jpeg',
                'data'     => $imageBase64,
            ]
        ];
    }

    $res = executeGeminiWithFallback($apiKey, $primaryModel, $parts, true);
    if ($res['httpCode'] < 200 || $res['httpCode'] >= 300 || empty($res['body'])) {
        $errDetail = $res['curlErr'] ?: ('HTTP ' . $res['httpCode']);
        $parsedErr = json_decode($res['body'] ?: '{}', true);
        if (!empty($parsedErr['error']['message'])) {
            $errDetail = $parsedErr['error']['message'];
        }
        http_response_code(502);
        echo json_encode([
            'error' => 'Falha ao consultar IA: ' . $errDetail,
            'code'  => 'AI_UPSTREAM_ERROR',
            'usage' => $currentUsage,
        ]);
        exit;
    }

    $updatedUsage = incrementAiUsage($usageFile, $today, $dailyLimit);
    $geminiData = json_decode($res['body'], true);
    $rawText = $geminiData['candidates'][0]['content']['parts'][0]['text'] ?? '{}';
    $rawText = preg_replace('/^```(?:json)?\s*|\s*```$/i', '', trim($rawText));
    $parsed = json_decode($rawText, true);

    $allowedChips = ['sem_ssl', 'lento_mobile', 'visual_antigo', 'sem_whatsapp', 'sem_site'];
    $chips = [];
    if (is_array($parsed['chips'] ?? null)) {
        foreach ($parsed['chips'] as $c) {
            if (is_string($c) && in_array($c, $allowedChips, true) && !in_array($c, $chips, true)) {
                $chips[] = $c;
            }
        }
    }

    $prioridade = strtolower(trim((string)($parsed['prioridade'] ?? 'media')));
    if (!in_array($prioridade, ['alta', 'media', 'baixa'], true)) {
        $prioridade = 'media';
    }

    $resumo = truncStr($parsed['resumo'] ?? 'Análise concluída.', 320);

    echo json_encode([
        'ok'         => true,
        'chips'      => $chips,
        'resumo'     => $resumo,
        'prioridade' => $prioridade,
        'usage'      => $updatedUsage,
    ]);
    exit;
}

// ── Ação: message ─────────────────────────────────────────────────────────────
if ($action === 'message') {
    $lead = is_array($body['lead'] ?? null) ? $body['lead'] : [];
    $tipo = truncStr($body['tipo'] ?? 'abordagem_inicial', 40);
    $instrucoes = truncStr($body['instrucoes'] ?? '', 800);

    $nome = truncStr($lead['nome'] ?? '', 120);
    $nicho = truncStr($lead['nicho'] ?? '', 80);
    $cidade = truncStr($lead['cidade'] ?? '', 80);
    $site = truncStr($lead['site'] ?? '', 250);
    $obs = truncStr($lead['observacoes'] ?? '', 500);
    $aiResumo = truncStr($lead['aiResumo'] ?? '', 350);
    $qualChips = is_array($lead['qualChips'] ?? null) ? implode(', ', array_map('strval', $lead['qualChips'])) : '';
    $mobileScore = isset($lead['pagespeedMobile']) && is_numeric($lead['pagespeedMobile']) ? (int)$lead['pagespeedMobile'] : null;

    $prompt = "Você escreve mensagens curtas, naturais e humanas de prospecção no WhatsApp para um desenvolvedor/web designer oferecendo criação ou reformulação de sites.\n"
        . "Gere APENAS o texto final da mensagem (sem aspas em volta, sem explicações antes ou depois).\n\n"
        . "Diretrizes:\n"
        . "- Tipo de mensagem: {$tipo} (se 'abordagem_inicial', primeiro contato; se 'follow_up', retomada amigável).\n"
        . "- Seja breve (3 a 5 linhas curtas), conversacional, sem parecer robô ou spam.\n"
        . "- Use um detalhe concreto do diagnóstico do lead se houver (ex: velocidade no celular, falta de site, visual, etc.) sem ser ofensivo.\n"
        . "- Termine com uma pergunta leve e fácil de responder.\n";

    if (!empty($instrucoes)) {
        $prompt .= "\nInstruções personalizadas do usuário:\n{$instrucoes}\n";
    }

    $prompt .= "\nDados do Lead:\n"
        . "- Nome/Empresa: {$nome}\n"
        . "- Nicho: {$nicho}\n"
        . "- Cidade: {$cidade}\n"
        . "- Site: " . ($site ?: 'Não possui') . "\n"
        . "- Pontos diagnosticados: " . ($qualChips ?: 'Nenhum chip marcado') . "\n"
        . "- PageSpeed Mobile: " . ($mobileScore !== null ? $mobileScore . '/100' : 'N/A') . "\n"
        . "- Resumo/Observações: " . ($aiResumo ?: $obs ?: 'Nenhuma') . "\n";

    $res = executeGeminiWithFallback($apiKey, $primaryModel, [['text' => $prompt]], false);
    if ($res['httpCode'] < 200 || $res['httpCode'] >= 300 || empty($res['body'])) {
        $errDetail = $res['curlErr'] ?: ('HTTP ' . $res['httpCode']);
        $parsedErr = json_decode($res['body'] ?: '{}', true);
        if (!empty($parsedErr['error']['message'])) {
            $errDetail = $parsedErr['error']['message'];
        }
        http_response_code(502);
        echo json_encode([
            'error' => 'Falha ao gerar mensagem com IA: ' . $errDetail,
            'code'  => 'AI_UPSTREAM_ERROR',
            'usage' => $currentUsage,
        ]);
        exit;
    }

    $updatedUsage = incrementAiUsage($usageFile, $today, $dailyLimit);
    $geminiData = json_decode($res['body'], true);
    $mensagem = trim((string)($geminiData['candidates'][0]['content']['parts'][0]['text'] ?? ''));

    echo json_encode([
        'ok'       => true,
        'mensagem' => $mensagem,
        'usage'    => $updatedUsage,
    ]);
    exit;
}
