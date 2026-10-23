<?php
/**
 * proxy.php — Proxy seguro de APIs de terceiros com limitação diária de uso.
 * Suporta: pagespeed, instagram, screenshot.
 * As chaves de API ficam no servidor (config.php), nunca expostas no front-end.
 */

require_once __DIR__ . '/auth-helper.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Storage-API-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// 1. Autenticação obrigatória com Firebase ID Token criptograficamente verificado (RS256)
$auth = requireFirebaseToken();
$userId = $auth['userId'];

// 2. Limite simples de taxa por usuário por dia (arquivo contador)
function enforceUserRateLimit($userId, $maxDaily = 150) {
    $tempDir = sys_get_temp_dir();
    $safeUserId = preg_replace('/[^a-zA-Z0-9_-]/', '', $userId);
    $rateFile = $tempDir . '/msk_rate_' . $safeUserId . '_' . date('Ymd') . '.txt';

    $count = 0;
    if (file_exists($rateFile)) {
        $count = (int)@file_get_contents($rateFile);
    }

    if ($count >= $maxDaily) {
        http_response_code(429);
        echo json_encode(['error' => 'Limite diário de requisições excedido (' . $maxDaily . ' requisições/dia). Tente novamente amanhã.']);
        exit;
    }

    @file_put_contents($rateFile, (string)($count + 1));
}

enforceUserRateLimit($userId);

// 3. Leitura dos parâmetros (aceita tanto GET quanto POST/JSON)
$inputJSON = @file_get_contents('php://input');
$jsonBody = json_decode($inputJSON, true) ?: [];

$action = $_REQUEST['action'] ?? $jsonBody['action'] ?? '';
$url = trim($_REQUEST['url'] ?? $jsonBody['url'] ?? $jsonBody['siteUrl'] ?? $jsonBody['instagramUrl'] ?? '');
$leadId = preg_replace('/[^a-zA-Z0-9_-]/', '', $_REQUEST['leadId'] ?? $jsonBody['leadId'] ?? '');

if (empty($action)) {
    http_response_code(400);
    echo json_encode(['error' => 'Ação não especificada']);
    exit;
}

// ── Ação 1: PageSpeed Insights ────────────────────────────────────────────────
if ($action === 'pagespeed') {
    if (empty($url)) {
        echo json_encode(['mobile' => null, 'desktop' => null, 'error' => 'URL não fornecida']);
        exit;
    }

    $apiKey = defined('PAGESPEED_API_KEY') ? PAGESPEED_API_KEY : getenv('PAGESPEED_API_KEY');
    if (empty($apiKey)) {
        echo json_encode(['mobile' => null, 'desktop' => null, 'error' => 'PAGESPEED_API_KEY não configurada no servidor']);
        exit;
    }

    $base = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

    $fetchStrategy = function($strategy) use ($base, $url, $apiKey) {
        $endpoint = $base . '?url=' . urlencode($url) . '&strategy=' . $strategy . '&key=' . urlencode($apiKey);
        $ctx = stream_context_create([
            'http' => ['timeout' => 25, 'header' => "User-Agent: MSK-Dashboard/1.0\r\n"]
        ]);
        $res = @file_get_contents($endpoint, false, $ctx);
        if (!$res) return null;
        $json = json_decode($res, true);
        $score = $json['lighthouseResult']['categories']['performance']['score'] ?? null;
        return $score !== null ? (int)round($score * 100) : null;
    };

    $mobile = $fetchStrategy('mobile');
    $desktop = $fetchStrategy('desktop');

    echo json_encode(['mobile' => $mobile, 'desktop' => $desktop]);
    exit;
}

// ── Ação 2: Instagram (Apify) ─────────────────────────────────────────────────
if ($action === 'instagram') {
    if (empty($url)) {
        echo json_encode(['followers' => null, 'bio' => null, 'lastPost' => null, 'bioLink' => null, 'error' => 'URL do Instagram não fornecida']);
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

    $ctx = stream_context_create([
        'http' => [
            'method'  => 'POST',
            'header'  => "Content-Type: application/json\r\nUser-Agent: MSK-Dashboard/1.0\r\n",
            'content' => $payload,
            'timeout' => 45
        ]
    ]);

    $raw = @file_get_contents($apifyEndpoint, false, $ctx);
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
    if (empty($url)) {
        echo json_encode(['url' => null, 'path' => null, 'error' => 'URL não fornecida']);
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

    $ctx = stream_context_create([
        'http' => ['timeout' => 35, 'header' => "User-Agent: MSK-Dashboard/1.0\r\n"]
    ]);

    $imgData = @file_get_contents($endpoint, false, $ctx);
    if (!$imgData || strlen($imgData) < 500) {
        echo json_encode(['url' => null, 'path' => null, 'error' => 'Falha ao capturar imagem da ScreenshotMachine']);
        exit;
    }

    // Salva o screenshot no storage PHP do usuário
    $targetDir = BASE_UPLOAD_DIR . '/' . $userId . '/prequal';
    if (!empty($leadId)) {
        $targetDir .= '/' . $leadId;
    }

    if (!file_exists($targetDir)) {
        if (!mkdir($targetDir, 0755, true)) {
            echo json_encode(['url' => null, 'path' => null, 'error' => 'Falha ao criar diretório de destino']);
            exit;
        }
    }

    $randomName = 'screenshot_' . ($leadId ?: 'lead') . '_' . md5(uniqid(time(), true)) . '.jpg';
    $targetPath = $targetDir . '/' . $randomName;

    if (@file_put_contents($targetPath, $imgData) === false) {
        echo json_encode(['url' => null, 'path' => null, 'error' => 'Falha ao salvar arquivo no storage']);
        exit;
    }

    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
    $host = $_SERVER['HTTP_HOST'];
    $requestUri = explode('proxy.php', $_SERVER['REQUEST_URI'])[0];
    $fullUrl = $protocol . $host . $requestUri . $targetPath;

    echo json_encode([
        'url'  => $fullUrl,
        'path' => $targetPath
    ]);
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'Ação desconhecida: ' . $action]);
