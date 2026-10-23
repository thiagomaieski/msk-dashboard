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
 * Realiza cache em arquivo temporário com TTL de 6 horas.
 */
function getGooglePublicKeys($forceRefresh = false) {
    $cacheFile = sys_get_temp_dir() . '/firebase_google_pubkeys_' . md5(FIREBASE_PROJECT_ID) . '.json';
    $cacheTtl = 21600; // 6 horas

    if (!$forceRefresh && file_exists($cacheFile) && (time() - filemtime($cacheFile) < $cacheTtl)) {
        $cached = @file_get_contents($cacheFile);
        $keys = json_decode($cached, true);
        if ($keys && is_array($keys)) {
            return $keys;
        }
    }

    $url = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
    $ctx = stream_context_create([
        'http' => [
            'timeout' => 8,
            'header'  => "User-Agent: MSK-Dashboard-Auth/1.0\r\n"
        ],
        'ssl' => [
            'verify_peer' => true,
            'verify_peer_name' => true,
        ]
    ]);
    $raw = @file_get_contents($url, false, $ctx);
    if (!$raw) {
        if (file_exists($cacheFile)) {
            return json_decode(@file_get_contents($cacheFile), true) ?: [];
        }
        return [];
    }

    $keys = json_decode($raw, true);
    if ($keys && is_array($keys)) {
        @file_put_contents($cacheFile, $raw);
        return $keys;
    }

    return [];
}

/**
 * Valida o Firebase ID Token (JWT) verificando:
 * 1. Estrutura e algoritmo RS256
 * 2. Assinatura criptográfica com a chave pública x509 do Google
 * 3. Expiração (exp)
 * 4. Emissor (iss == https://securetoken.google.com/<projectId>)
 * 5. Audiência (aud == <projectId>)
 * 6. Sujeito (sub não vazio e matching com $expectedUserId se fornecido)
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

    // 1. Verificações de Claims
    $now = time();
    if (!isset($payload['exp']) || $now >= $payload['exp']) {
        return ['valid' => false, 'error' => 'Token expirado'];
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
