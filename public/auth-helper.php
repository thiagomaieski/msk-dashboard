<?php
/**
 * auth-helper.php
 * Verificação criptográfica completa de Firebase ID Token (algoritmo RS256).
 * Sem dependência de composer — compatível com hospedagem compartilhada Hostinger.
 */

// Carrega configurações personalizadas se existirem (config.php fica fora de versionamento)
if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
}

if (!defined('FIREBASE_PROJECT_ID')) {
    define('FIREBASE_PROJECT_ID', 'msk-dashboard-8a6dd');
}

if (!defined('STORAGE_API_KEY')) {
    define('STORAGE_API_KEY', 'msk_storage_6a2d9b4c1f8e');
}

if (!defined('BASE_UPLOAD_DIR')) {
    define('BASE_UPLOAD_DIR', 'uploads');
}

if (!defined('ALLOWED_ORIGIN')) {
    define('ALLOWED_ORIGIN', 'https://dashboard.thiagomaieski.com');
}

/**
 * Retorna o caminho do diretório de cache local seguro (public/.cache)
 * e garante que sua estrutura e permissões estejam protegidas.
 */
function getCacheDir() {
    $dir = __DIR__ . '/.cache';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
        @chmod($dir, 0700);
    }
    $htaccess = $dir . '/.htaccess';
    if (!file_exists($htaccess)) {
        $content = "<IfModule mod_authz_core.c>\n    Require all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\n    Order deny,allow\n    Deny from all\n</IfModule>\n";
        @file_put_contents($htaccess, $content);
        @chmod($htaccess, 0600);
    }
    return $dir;
}

/**
 * Realiza requisição HTTP GET utilizando cURL com fallback para file_get_contents.
 *
 * @param string $url
 * @param array $headers
 * @param int $timeout
 * @return string|null
 */
function httpGet($url, $headers = [], $timeout = 10) {
    if (function_exists('curl_init')) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        if (!empty($headers)) {
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        }
        $output = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($output !== false && $httpCode >= 200 && $httpCode < 300) {
            return $output;
        }
    }

    // Fallback para file_get_contents
    $headerStr = !empty($headers) ? implode("\r\n", $headers) . "\r\n" : "";
    $ctx = stream_context_create([
        'http' => [
            'timeout' => $timeout,
            'header'  => $headerStr,
        ],
        'ssl' => [
            'verify_peer' => true,
            'verify_peer_name' => true,
        ]
    ]);
    $res = @file_get_contents($url, false, $ctx);
    return $res !== false ? $res : null;
}

/**
 * Configura os cabeçalhos de CORS restritos às origens autorizadas.
 * Lê ALLOWED_ORIGIN (padrão https://dashboard.thiagomaieski.com) e aceita http://localhost:5173 em desenvolvimento.
 * Devolve a origem recebida apenas se estiver na lista autorizada.
 */
function handleCors() {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $configuredOrigin = defined('ALLOWED_ORIGIN') ? ALLOWED_ORIGIN : 'https://dashboard.thiagomaieski.com';

    $allowedList = array_filter(array_map('trim', explode(',', $configuredOrigin)));
    $allowedList[] = 'https://dashboard.thiagomaieski.com';
    $allowedList[] = 'http://localhost:5173';
    $allowedList = array_unique($allowedList);

    $matchedOrigin = null;
    if (!empty($origin)) {
        foreach ($allowedList as $allowed) {
            if (strcasecmp($origin, $allowed) === 0) {
                $matchedOrigin = $origin;
                break;
            }
        }
    }

    if ($matchedOrigin) {
        header("Access-Control-Allow-Origin: {$matchedOrigin}");
    } else {
        $fallbackOrigin = !empty($allowedList) ? reset($allowedList) : 'https://dashboard.thiagomaieski.com';
        header("Access-Control-Allow-Origin: {$fallbackOrigin}");
    }

    header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Storage-API-Key');
    header('Vary: Origin');

    if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

/**
 * Obtém o cabeçalho Authorization de forma resiliente em qualquer ambiente PHP (Apache, Nginx, FastCGI).
 */
function getAuthorizationHeader() {
    if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
        return trim($_SERVER['HTTP_AUTHORIZATION']);
    }
    if (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        return trim($_SERVER['REDIRECT_HTTP_AUTHORIZATION']);
    }

    $headers = [];
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
    } elseif (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
    }

    foreach ($headers as $k => $v) {
        if (strcasecmp($k, 'Authorization') === 0) {
            return trim($v);
        }
    }

    return '';
}

/**
 * Obtém os certificados públicos do Google para tokens do Firebase (x509).
 * Armazena no cache local protegido public/.cache com TTL de 6 horas.
 * O refresh forçado é limitado a no máximo 1 vez a cada 5 minutos (300 segundos).
 */
function getGooglePublicKeys($forceRefresh = false) {
    $cacheDir = getCacheDir();
    $cacheFile = $cacheDir . '/firebase_google_pubkeys_' . md5(FIREBASE_PROJECT_ID) . '.json';
    $throttleFile = $cacheDir . '/cert_refresh_throttle.txt';
    $cacheTtl = 21600; // 6 horas

    if (!$forceRefresh && file_exists($cacheFile) && (time() - filemtime($cacheFile) < $cacheTtl)) {
        $cached = @file_get_contents($cacheFile);
        $keys = json_decode($cached, true);
        if ($keys && is_array($keys)) {
            return $keys;
        }
    }

    // Limitação de taxa para refresh forçado: no máximo 1 vez a cada 5 minutos
    if ($forceRefresh && file_exists($throttleFile)) {
        $lastRefresh = (int)@file_get_contents($throttleFile);
        if ((time() - $lastRefresh) < 300) {
            if (file_exists($cacheFile)) {
                $cached = @file_get_contents($cacheFile);
                $keys = json_decode($cached, true);
                if ($keys && is_array($keys)) {
                    return $keys;
                }
            }
            return [];
        }
    }

    $url = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
    $raw = httpGet($url, ["User-Agent: MSK-Dashboard-Auth/1.0"], 8);

    if ($forceRefresh) {
        @file_put_contents($throttleFile, (string)time());
        @chmod($throttleFile, 0600);
    }

    if (!$raw) {
        if (file_exists($cacheFile)) {
            return json_decode(@file_get_contents($cacheFile), true) ?: [];
        }
        return [];
    }

    $keys = json_decode($raw, true);
    if ($keys && is_array($keys)) {
        @file_put_contents($cacheFile, $raw);
        @chmod($cacheFile, 0600);
        return $keys;
    }

    return [];
}

/**
 * Valida o Firebase ID Token (JWT) verificando:
 * 1. Estrutura e algoritmo RS256
 * 2. Assinatura criptográfica com a chave pública x509 do Google
 * 3. Expiração (exp)
 * 4. iat e auth_time (não podem estar no futuro, com tolerância de 60 s)
 * 5. Emissor (iss == https://securetoken.google.com/<projectId>)
 * 6. Audiência (aud == <projectId>)
 * 7. Sujeito (sub não vazio e matching com $expectedUserId se fornecido)
 *
 * @param string $jwt
 * @param string|null $expectedUserId
 * @return array ['valid' => bool, 'error' => string|null, 'userId' => string|null, 'payload' => array|null]
 */
function verifyFirebaseToken($jwt, $expectedUserId = null) {
    if (empty($jwt)) {
        return ['valid' => false, 'error' => 'Token ausente'];
    }

    $parts = explode('.', $jwt);
    if (count($parts) !== 3) {
        return ['valid' => false, 'error' => 'Token malformado'];
    }

    list($headerB64, $payloadB64, $sigB64) = $parts;

    $headerJson = base64_decode(strtr($headerB64, '-_', '+/'));
    $header = json_decode($headerJson, true);
    if (!$header || ($header['alg'] ?? '') !== 'RS256' || empty($header['kid'])) {
        return ['valid' => false, 'error' => 'Cabeçalho inválido ou algoritmo diferente de RS256'];
    }

    $payloadJson = base64_decode(strtr($payloadB64, '-_', '+/'));
    $payload = json_decode($payloadJson, true);
    if (!$payload) {
        return ['valid' => false, 'error' => 'Payload JWT inválido'];
    }

    // 1. Verificações de Claims e Tempos
    $now = time();
    $clockTolerance = 60; // Tolerância de 60 segundos para desvios de relógio

    if (!isset($payload['exp']) || $now >= $payload['exp']) {
        return ['valid' => false, 'error' => 'Token expirado'];
    }

    if (isset($payload['iat']) && ($payload['iat'] > ($now + $clockTolerance))) {
        return ['valid' => false, 'error' => 'Token emitido no futuro (iat inválido)'];
    }

    if (isset($payload['auth_time']) && ($payload['auth_time'] > ($now + $clockTolerance))) {
        return ['valid' => false, 'error' => 'Tempo de autenticação no futuro (auth_time inválido)'];
    }

    $expectedIss = 'https://securetoken.google.com/' . FIREBASE_PROJECT_ID;
    if (($payload['iss'] ?? '') !== $expectedIss) {
        return ['valid' => false, 'error' => 'Emissor (iss) não corresponde ao projeto Firebase'];
    }

    if (($payload['aud'] ?? '') !== FIREBASE_PROJECT_ID) {
        return ['valid' => false, 'error' => 'Audiência (aud) não corresponde ao projeto Firebase'];
    }

    $sub = $payload['sub'] ?? '';
    if (empty($sub)) {
        return ['valid' => false, 'error' => 'Subject (sub/UID) vazio no token'];
    }

    if ($expectedUserId !== null && $sub !== $expectedUserId) {
        return ['valid' => false, 'error' => 'Identidade forjada: UID informado diverge do token assinado'];
    }

    // 2. Verificação Criptográfica da Assinatura com a chave pública do Google
    $pubKeys = getGooglePublicKeys();
    $kid = $header['kid'];

    if (!isset($pubKeys[$kid])) {
        // Tenta refresh caso tenha ocorrido rotação recente de chaves
        $pubKeys = getGooglePublicKeys(true);
        if (!isset($pubKeys[$kid])) {
            return ['valid' => false, 'error' => 'Chave pública (kid) não reconhecida pelo Google'];
        }
    }

    $cert = $pubKeys[$kid];
    $pubKey = @openssl_pkey_get_public($cert);
    if (!$pubKey) {
        return ['valid' => false, 'error' => 'Falha ao processar chave pública x509'];
    }

    $signature = base64_decode(strtr($sigB64, '-_', '+/'));
    $signedData = "$headerB64.$payloadB64";

    $verifyResult = @openssl_verify($signedData, $signature, $pubKey, OPENSSL_ALGO_SHA256);
    if ($verifyResult !== 1) {
        return ['valid' => false, 'error' => 'Assinatura criptográfica do token inválida'];
    }

    return [
        'valid'   => true,
        'userId'  => $sub,
        'payload' => $payload
    ];
}

/**
 * Garante autenticação em requisições HTTP.
 * Em caso de token inválido, encerra imediatamente com HTTP 401.
 *
 * @param string|null $expectedUserId
 * @return array
 */
function requireFirebaseToken($expectedUserId = null) {
    $authHeader = getAuthorizationHeader();
    $jwt = '';
    if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        $jwt = $matches[1];
    }

    $val = verifyFirebaseToken($jwt, $expectedUserId);
    if (!$val['valid']) {
        http_response_code(401);
        echo json_encode(['error' => 'Não autorizado: ' . $val['error']]);
        exit;
    }

    return $val;
}
