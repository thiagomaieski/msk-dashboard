<?php
/**
 * proxy.php — Proxy seguro de APIs de terceiros com limites de uso por ação e por dia.
 * Suporta: pagespeed, instagram, screenshot, cnpj.
 * As chaves de API ficam no servidor (config.php), nunca expostas no front-end.
 */

require_once __DIR__ . '/auth-helper.php';

header('Content-Type: application/json; charset=utf-8');
handleCors();

// 1. Autenticação obrigatória com Firebase ID Token criptograficamente verificado (RS256)
$auth = requireFirebaseToken();
$userId = $auth['userId'];

// 2. Leitura dos parâmetros (aceita GET e POST/JSON)
$inputJSON = @file_get_contents('php://input');
$jsonBody = json_decode($inputJSON, true) ?: [];

$action = strtolower(trim($_REQUEST['action'] ?? $jsonBody['action'] ?? ''));
$url = trim($_REQUEST['url'] ?? $jsonBody['url'] ?? $jsonBody['siteUrl'] ?? $jsonBody['instagramUrl'] ?? '');
$leadId = preg_replace('/[^a-zA-Z0-9_-]/', '', $_REQUEST['leadId'] ?? $jsonBody['leadId'] ?? '');

if (empty($action)) {
    http_response_code(400);
    echo json_encode(['error' => 'Ação não especificada']);
    exit;
}

$validActions = ['pagespeed', 'instagram', 'screenshot', 'cnpj'];
if (!in_array($action, $validActions, true)) {
    http_response_code(400);
    echo json_encode(['error' => "Ação inválida: '{$action}'"]);
    exit;
}

// 3. Limite diário por ação e por usuário
function enforceUserRateLimit($userId, $action) {
    $limits = [
        'pagespeed'  => 300,
        'instagram'  => 150,
        'screenshot' => 150,
        'cnpj'       => 200,
    ];

    $maxDaily = $limits[$action] ?? 150;

    $cacheDir = getCacheDir() . '/rate_limits';
    if (!is_dir($cacheDir)) {
        @mkdir($cacheDir, 0700, true);
        @chmod($cacheDir, 0700);
    }

    $safeUserId = preg_replace('/[^a-zA-Z0-9_-]/', '', $userId);
    $safeAction = preg_replace('/[^a-zA-Z0-9_-]/', '', $action);
    $rateFile = $cacheDir . '/rate_' . $safeAction . '_' . $safeUserId . '_' . date('Ymd') . '.txt';

    $count = 0;
    if (file_exists($rateFile)) {
        $count = (int)@file_get_contents($rateFile);
    }

    if ($count >= $maxDaily) {
        http_response_code(429);
        echo json_encode([
            'error' => "Limite diário para a ação '{$action}' excedido ({$maxDaily} requisições/dia). Tente novamente amanhã."
        ]);
        exit;
    }

    @file_put_contents($rateFile, (string)($count + 1));
    @chmod($rateFile, 0600);
}

enforceUserRateLimit($userId, $action);

// 4. Validador de URL (máx 2048 chars, esquema http/https)
function validateRequestUrl($rawUrl) {
    if (empty($rawUrl)) {
        return 'URL não fornecida';
    }
    if (strlen($rawUrl) > 2048) {
        return 'URL excede o limite máximo permitido de 2048 caracteres';
    }
    if (!filter_var($rawUrl, FILTER_VALIDATE_URL)) {
        return 'URL inválida ou malformada';
    }
    $parsed = parse_url($rawUrl);
    $scheme = strtolower($parsed['scheme'] ?? '');
    if (!in_array($scheme, ['http', 'https'], true) || empty($parsed['host'])) {
        return 'Protocolo de URL inválido. Apenas http e https são permitidos';
    }
    return null;
}

// ── Ação 1: PageSpeed Insights ────────────────────────────────────────────────
if ($action === 'pagespeed') {
    $urlErr = validateRequestUrl($url);
    if ($urlErr) {
        echo json_encode(['mobile' => null, 'desktop' => null, 'score' => null, 'error' => $urlErr]);
        exit;
    }

    $apiKey = defined('PAGESPEED_API_KEY') ? PAGESPEED_API_KEY : getenv('PAGESPEED_API_KEY');
    if (empty($apiKey)) {
        echo json_encode(['mobile' => null, 'desktop' => null, 'score' => null, 'error' => 'PAGESPEED_API_KEY não configurada no servidor']);
        exit;
    }

    $strategy = strtolower(trim($_REQUEST['strategy'] ?? $jsonBody['strategy'] ?? ''));

    // Quando informado o parâmetro strategy, busca uma única nota
    if (!empty($strategy)) {
        if (!in_array($strategy, ['mobile', 'desktop'], true)) {
            http_response_code(400);
            echo json_encode(['error' => "Estratégia inválida: '{$strategy}'. Use 'mobile' ou 'desktop'."]);
            exit;
        }

        $base = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
        $endpoint = $base . '?url=' . urlencode($url) . '&strategy=' . $strategy . '&key=' . urlencode($apiKey);
        $raw = httpGet($endpoint, ["User-Agent: MSK-Dashboard/1.0"], 30);
        if (!$raw) {
            echo json_encode(['score' => null, $strategy => null, 'error' => "Falha ao obter pontuação PageSpeed ({$strategy})"]);
            exit;
        }

        $data = json_decode($raw, true);
        $score = $data['lighthouseResult']['categories']['performance']['score'] ?? null;
        $scoreInt = ($score !== null) ? (int)round($score * 100) : null;

        echo json_encode([
            'score'    => $scoreInt,
            'strategy' => $strategy,
            $strategy  => $scoreInt
        ]);
        exit;
    }

    // Sem o parâmetro strategy, executa as duas estratégias em paralelo via curl_multi
    $scores = ['mobile' => null, 'desktop' => null];
    $base = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
    $strategies = ['mobile', 'desktop'];

    if (function_exists('curl_multi_init')) {
        $mh = curl_multi_init();
        $handles = [];

        foreach ($strategies as $strat) {
            $endpoint = $base . '?url=' . urlencode($url) . '&strategy=' . $strat . '&key=' . urlencode($apiKey);
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $endpoint);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 30);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
            curl_setopt($ch, CURLOPT_USERAGENT, 'MSK-Dashboard/1.0');
            curl_multi_add_handle($mh, $ch);
            $handles[$strat] = $ch;
        }

        $running = null;
        do {
            $mrc = curl_multi_exec($mh, $running);
            if ($running) {
                curl_multi_select($mh, 0.5);
            }
        } while ($running > 0 && $mrc == CURLM_OK);

        foreach ($strategies as $strat) {
            $ch = $handles[$strat];
            $content = curl_multi_getcontent($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_multi_remove_handle($mh, $ch);
            curl_close($ch);

            if ($httpCode === 200 && $content) {
                $parsed = json_decode($content, true);
                $sc = $parsed['lighthouseResult']['categories']['performance']['score'] ?? null;
                $scores[$strat] = ($sc !== null) ? (int)round($sc * 100) : null;
            }
        }
        curl_multi_close($mh);
    } else {
        // Fallback sequencial se curl_multi não estiver habilitado
        foreach ($strategies as $strat) {
            $endpoint = $base . '?url=' . urlencode($url) . '&strategy=' . $strat . '&key=' . urlencode($apiKey);
            $raw = httpGet($endpoint, ["User-Agent: MSK-Dashboard/1.0"], 30);
            if ($raw) {
                $parsed = json_decode($raw, true);
                $sc = $parsed['lighthouseResult']['categories']['performance']['score'] ?? null;
                $scores[$strat] = ($sc !== null) ? (int)round($sc * 100) : null;
            }
        }
    }

    echo json_encode($scores);
    exit;
}

// ── Ação 2: Instagram (Apify) ─────────────────────────────────────────────────
if ($action === 'instagram') {
    if (!preg_match('#^https?://#i', $url)) {
        $url = 'https://' . ltrim($url, '/');
    }

    $urlErr = validateRequestUrl($url);
    if ($urlErr) {
        echo json_encode(['followers' => null, 'bio' => null, 'lastPost' => null, 'bioLink' => null, 'error' => $urlErr]);
        exit;
    }

    $apiKey = defined('APIFY_API_KEY') ? APIFY_API_KEY : (defined('APIFY_TOKEN') ? APIFY_TOKEN : getenv('APIFY_API_KEY'));
    if (empty($apiKey)) {
        echo json_encode(['followers' => null, 'bio' => null, 'lastPost' => null, 'bioLink' => null, 'error' => 'APIFY_API_KEY não configurada no servidor']);
        exit;
    }

    if (!preg_match('/instagram\.com\/@?([a-zA-Z0-9._]+)/i', $url, $m)) {
        echo json_encode(['followers' => null, 'bio' => null, 'lastPost' => null, 'bioLink' => null, 'error' => 'Username do Instagram inválido']);
        exit;
    }
    $username = $m[1];

    $apifyEndpoint = 'https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=' . urlencode($apiKey);
    $payload = json_encode(['usernames' => [$username]]);

    $raw = null;
    if (function_exists('curl_init')) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $apifyEndpoint);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 45);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'User-Agent: MSK-Dashboard/1.0'
        ]);
        $raw = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($httpCode < 200 || $httpCode >= 300) {
            $raw = null;
        }
    }

    if (!$raw) {
        $ctx = stream_context_create([
            'http' => [
                'method'  => 'POST',
                'header'  => "Content-Type: application/json\r\nUser-Agent: MSK-Dashboard/1.0\r\n",
                'content' => $payload,
                'timeout' => 45
            ],
            'ssl' => [
                'verify_peer' => true,
                'verify_peer_name' => true,
            ]
        ]);
        $raw = @file_get_contents($apifyEndpoint, false, $ctx);
    }

    if (!$raw) {
        echo json_encode(['followers' => null, 'bio' => null, 'lastPost' => null, 'bioLink' => null, 'error' => 'Falha ao consultar perfil no Apify']);
        exit;
    }

    $items = json_decode($raw, true);
    $profile = is_array($items) && isset($items[0]) ? $items[0] : null;

    if (!$profile) {
        echo json_encode(['followers' => null, 'bio' => null, 'lastPost' => null, 'bioLink' => null]);
        exit;
    }

    $followers = $profile['followersCount'] ?? $profile['followers'] ?? null;
    $bio = $profile['biography'] ?? $profile['bio'] ?? null;
    $bioLink = $profile['externalUrl'] ?? $profile['external_url'] ?? $profile['bioLink'] ?? null;

    $lastPost = null;
    $allPosts = [];
    if (isset($profile['latestPosts']) && is_array($profile['latestPosts'])) $allPosts = array_merge($allPosts, $profile['latestPosts']);
    if (isset($profile['posts']) && is_array($profile['posts'])) $allPosts = array_merge($allPosts, $profile['posts']);
    if (isset($profile['latestIgtvVideos']) && is_array($profile['latestIgtvVideos'])) $allPosts = array_merge($allPosts, $profile['latestIgtvVideos']);
    if (isset($profile['edge_owner_to_timeline_media']['edges']) && is_array($profile['edge_owner_to_timeline_media']['edges'])) {
        foreach ($profile['edge_owner_to_timeline_media']['edges'] as $edge) {
            if (!empty($edge['node'])) $allPosts[] = $edge['node'];
        }
    }

    $postsWithDates = [];
    foreach ($allPosts as $p) {
        if (!is_array($p)) continue;
        $rawTime = $p['timestamp'] ?? $p['taken_at_timestamp'] ?? $p['taken_at'] ?? $p['created_at'] ?? null;
        if (!$rawTime) continue;

        $parsedMs = null;
        if (is_numeric($rawTime)) {
            $parsedMs = ($rawTime < 10000000000) ? ((float)$rawTime * 1000) : (float)$rawTime;
        } elseif (is_string($rawTime)) {
            $ts = strtotime($rawTime);
            if ($ts !== false) {
                $parsedMs = (float)$ts * 1000;
            }
        }

        if ($parsedMs !== null) {
            $postsWithDates[] = ['raw' => $rawTime, 'ms' => $parsedMs];
        }
    }

    if (!empty($postsWithDates)) {
        usort($postsWithDates, function($a, $b) {
            return $b['ms'] <=> $a['ms'];
        });
        $best = $postsWithDates[0];
        $lastPost = (is_numeric($best['raw']) && $best['raw'] < 10000000000) ? ($best['raw'] * 1000) : $best['raw'];
    }

    echo json_encode([
        'followers' => $followers !== null ? (int)$followers : null,
        'bio'       => $bio,
        'lastPost'  => $lastPost,
        'bioLink'   => $bioLink
    ]);
    exit;
}

// ── Ação 3: Screenshot (ScreenshotMachine) ────────────────────────────────────
if ($action === 'screenshot') {
    if (empty($leadId)) {
        http_response_code(400);
        echo json_encode(['url' => null, 'path' => null, 'error' => 'Parâmetro leadId é obrigatório para captura de screenshot']);
        exit;
    }

    $urlErr = validateRequestUrl($url);
    if ($urlErr) {
        echo json_encode(['url' => null, 'path' => null, 'error' => $urlErr]);
        exit;
    }

    $apiKey = defined('SCREENSHOT_API_KEY') ? SCREENSHOT_API_KEY : getenv('SCREENSHOT_API_KEY');
    if (empty($apiKey)) {
        echo json_encode(['url' => null, 'path' => null, 'error' => 'SCREENSHOT_API_KEY não configurada no servidor']);
        exit;
    }

    $ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    $endpoint = 'https://api.screenshotmachine.com/?key=' . urlencode($apiKey) .
                '&url=' . urlencode($url) .
                '&dimension=1920xfull' .
                '&device=desktop' .
                '&user-agent=' . urlencode($ua) .
                '&format=jpg' .
                '&delay=5000' .
                '&cacheLimit=0';

    $imgData = httpGet($endpoint, ["User-Agent: MSK-Dashboard/1.0"], 35);
    if (!$imgData || strlen($imgData) < 500) {
        echo json_encode(['url' => null, 'path' => null, 'error' => 'Falha ao capturar imagem da ScreenshotMachine']);
        exit;
    }

    // Validação estrita dos bytes mágicos de JPEG (FF D8 FF)
    $magicBytes = bin2hex(substr($imgData, 0, 3));
    if (strcasecmp($magicBytes, 'ffd8ff') !== 0) {
        echo json_encode(['url' => null, 'path' => null, 'error' => 'Imagem capturada inválida (não corresponde ao formato JPEG: bytes mágicos FFD8FF ausentes)']);
        exit;
    }

    // Salva o screenshot no storage PHP do usuário
    $targetDir = BASE_UPLOAD_DIR . '/' . $userId . '/prequal';
    if (!file_exists($targetDir)) {
        if (!mkdir($targetDir, 0755, true)) {
            echo json_encode(['url' => null, 'path' => null, 'error' => 'Falha ao criar diretório de destino']);
            exit;
        }
    }

    // Nome fixo {leadId}_screenshot.jpg (sobrescreve o screenshot anterior)
    $fileName = $leadId . '_screenshot.jpg';
    $targetPath = $targetDir . '/' . $fileName;

    if (@file_put_contents($targetPath, $imgData) === false) {
        echo json_encode(['url' => null, 'path' => null, 'error' => 'Falha ao salvar arquivo no storage']);
        exit;
    }
    @chmod($targetPath, 0644);

    $ts = time();
    if (defined('PUBLIC_BASE_URL') && !empty(PUBLIC_BASE_URL)) {
        $fullUrl = rtrim(PUBLIC_BASE_URL, '/') . '/' . ltrim($targetPath, '/') . '?v=' . $ts;
    } else {
        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
        $rawHost = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $cleanHost = preg_replace('/[^a-zA-Z0-9.:_-]/', '', $rawHost);
        $scriptPrefix = explode('proxy.php', $_SERVER['REQUEST_URI'] ?? '')[0];
        $fullUrl = $protocol . $cleanHost . '/' . trim($scriptPrefix, '/') . (trim($scriptPrefix, '/') ? '/' : '') . ltrim($targetPath, '/') . '?v=' . $ts;
    }

    echo json_encode([
        'url'  => $fullUrl,
        'path' => $targetPath
    ]);
    exit;
}

// ── Ação 4: Consulta de CNPJ (BrasilAPI) ──────────────────────────────────────
if ($action === 'cnpj') {
    $cnpj = preg_replace('/\D/', '', $_REQUEST['cnpj'] ?? $jsonBody['cnpj'] ?? '');
    if (strlen($cnpj) !== 14) {
        http_response_code(400);
        echo json_encode(['error' => 'CNPJ deve conter 14 dígitos']);
        exit;
    }

    $endpoint = 'https://brasilapi.com.br/api/cnpj/v1/' . $cnpj;
    $raw = httpGet($endpoint, ["User-Agent: MSK-Dashboard/1.0", "Accept: application/json"], 15);
    if (!$raw) {
        http_response_code(404);
        echo json_encode(['error' => 'CNPJ não encontrado ou serviço temporariamente indisponível']);
        exit;
    }

    $data = json_decode($raw, true);
    if (!is_array($data) || isset($data['message'])) {
        http_response_code(404);
        echo json_encode(['error' => $data['message'] ?? 'CNPJ não encontrado']);
        exit;
    }

    echo json_encode($data);
    exit;
}
