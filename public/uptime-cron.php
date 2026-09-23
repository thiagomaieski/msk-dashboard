<?php
/**
 * MSK DASHBOARD - UPTIME CRON JOB
 * Script para ser executado via Cron Job na Hostinger a cada 5-15 minutos.
 *
 * Arquitetura Aprimorada:
 * 1. Requisição GET nativa com cabeçalhos reais de navegador (Chrome/Windows).
 * 2. Leitura parcial limitada a 64 KB via callback (evita status 206 e preserva memória).
 * 3. Ciclo de até 3 tentativas com pausa de 2.5s antes de confirmar queda (elimina falsos positivos momentâneos).
 * 4. Diagnóstico técnico detalhado (WAF/Cloudflare Challenge, status HTTP, timeouts, DNS).
 * 5. Registro de histórico com diagnóstico técnico para auditoria.
 */

// Aumenta o tempo de execução para permitir os retries seguros
set_time_limit(180);

define('BASE_UPLOAD_DIR', __DIR__ . '/uploads');
define('TIMEOUT_SECONDS', 10);
define('RETRY_DELAY_US', 2500000); // 2.5 segundos de intervalo entre retries

// Busca todos os arquivos de configuração de uptime
$pattern = BASE_UPLOAD_DIR . '/*/uptime/data.json';
$files = glob($pattern);

if (empty($files)) {
    echo "Nenhum monitor configurado.\n";
    exit;
}

/**
 * Diagnóstico técnico inteligente da resposta
 */
function diagnoseCheck($httpCode, $curlErrno, $curlError, $body = '', $headers = '') {
    if ($curlErrno !== 0) {
        if ($curlErrno === CURLE_OPERATION_TIMEDOUT || $curlErrno === 28) {
            return 'Timeout: O servidor demorou mais de ' . TIMEOUT_SECONDS . 's para responder.';
        }
        if ($curlErrno === CURLE_COULDNT_RESOLVE_HOST || $curlErrno === 6) {
            return 'Falha de DNS: Domínio não encontrado ou não resolvido.';
        }
        if ($curlErrno === CURLE_COULDNT_CONNECT || $curlErrno === 7) {
            return 'Conexão recusada: Servidor offline ou porta inacessível.';
        }
        if ($curlErrno === CURLE_SSL_CONNECT_ERROR || $curlErrno === 35) {
            return 'Erro de SSL/TLS: Falha ao negociar conexão segura.';
        }
        return 'Falha de conexão (cURL ' . $curlErrno . '): ' . ($curlError ?: 'Erro de rede');
    }

    $lowerBody = strtolower($body);
    $lowerHeaders = strtolower($headers);

    $isWafChallenge = (
        strpos($lowerBody, 'checking your browser') !== false ||
        strpos($lowerBody, 'just a moment...') !== false ||
        strpos($lowerBody, 'cf-browser-verification') !== false ||
        strpos($lowerBody, 'challenge-running') !== false ||
        strpos($lowerHeaders, 'cf-mitigated') !== false
    );
    $isCloudflareOrAutomattic = (
        strpos($lowerHeaders, 'cloudflare') !== false ||
        strpos($lowerHeaders, 'cf-ray') !== false ||
        strpos($lowerHeaders, 'automattic') !== false ||
        strpos($lowerBody, 'automattic') !== false
    );

    if ($httpCode === 403) {
        if ($isWafChallenge || $isCloudflareOrAutomattic) {
            return 'HTTP 403: Desafio de Navegador / WAF detectado (Automattic/Cloudflare).';
        }
        return 'HTTP 403: Acesso Proibido (Forbidden).';
    }

    if ($httpCode === 503) {
        if ($isWafChallenge || $isCloudflareOrAutomattic) {
            return 'HTTP 503: Proteção Ativa / Desafio WAF (Under Attack / Cloudflare).';
        }
        return 'HTTP 503: Serviço Indisponível (Sobrecarga ou Manutenção).';
    }

    if ($httpCode === 500) {
        return 'HTTP 500: Erro Interno do Servidor (Fatal Error no backend).';
    }

    if ($httpCode === 502) {
        return 'HTTP 502: Bad Gateway (Proxy/Nginx não conseguiu se comunicar com o origin).';
    }

    if ($httpCode === 504) {
        return 'HTTP 504: Gateway Timeout (Origin demorou para responder ao gateway).';
    }

    if ($httpCode === 401) {
        return 'HTTP 401: Não Autorizado (Protegido por autenticação HTTP).';
    }

    if ($httpCode === 404) {
        return 'HTTP 404: Página não encontrada.';
    }

    if ($httpCode === 405) {
        return 'HTTP 405: Método HTTP não permitido pelo servidor.';
    }

    if ($httpCode === 429) {
        return 'HTTP 429: Limite de Requisições Excedido (Rate Limit).';
    }

    if ($httpCode >= 400) {
        return "HTTP {$httpCode}: Resposta de erro do servidor.";
    }

    if ($httpCode >= 200 && $httpCode < 400) {
        return null; // Online normal
    }

    return "HTTP {$httpCode}: Resposta anômala.";
}

/**
 * Executa um lote de requisições GET em paralelo com curl_multi
 * Limitando a leitura do corpo a 64 KB via callback (sem header Range)
 */
function executeBatch($items) {
    if (empty($items)) return [];

    $multiCurl = curl_multi_init();
    $handles = [];
    $dataBuffers = []; // key => ['body' => '', 'headers' => '']

    foreach ($items as $key => $item) {
        $dataBuffers[$key] = ['body' => '', 'headers' => ''];

        $ch = curl_init($item['url']);

        $headers = [
            'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language: pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'Cache-Control: no-cache',
            'Pragma: no-cache',
            'Upgrade-Insecure-Requests: 1',
            'Sec-Fetch-Dest: document',
            'Sec-Fetch-Mode: navigate',
            'Sec-Fetch-Site: none',
            'Sec-Fetch-User: ?1',
        ];

        curl_setopt($ch, CURLOPT_HTTPGET, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_ENCODING, '');
        curl_setopt($ch, CURLOPT_TIMEOUT, TIMEOUT_SECONDS);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, TIMEOUT_SECONDS);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_MAXREDIRS, 4);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

        // Captura headers da resposta
        curl_setopt($ch, CURLOPT_HEADERFUNCTION, function($c, $header) use ($key, &$dataBuffers) {
            if (strlen($dataBuffers[$key]['headers']) < 8192) {
                $dataBuffers[$key]['headers'] .= $header;
            }
            return strlen($header);
        });

        // Leitura parcial (máximo 64 KB em memória sem enviar cabeçalho Range)
        curl_setopt($ch, CURLOPT_WRITEFUNCTION, function($c, $chunk) use ($key, &$dataBuffers) {
            $len = strlen($chunk);
            if (strlen($dataBuffers[$key]['body']) < 65536) {
                $dataBuffers[$key]['body'] .= substr($chunk, 0, 65536 - strlen($dataBuffers[$key]['body']));
            }
            return $len;
        });

        curl_multi_add_handle($multiCurl, $ch);
        $handles[(int)$ch] = [
            'key' => $key,
            'ch' => $ch
        ];
    }

    $running = null;
    do {
        $status = curl_multi_exec($multiCurl, $running);
        if ($running > 0) {
            curl_multi_select($multiCurl, 0.1);
        }
    } while ($running > 0 && $status === CURLM_OK);

    $results = [];
    while ($info = curl_multi_info_read($multiCurl)) {
        $ch = $info['handle'];
        $chId = (int)$ch;
        if (!isset($handles[$chId])) continue;

        $key = $handles[$chId]['key'];
        $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $totalTime = curl_getinfo($ch, CURLINFO_TOTAL_TIME);
        $curlErrno = $info['result'];
        $curlError = curl_error($ch);

        $body = $dataBuffers[$key]['body'] ?? '';
        $head = $dataBuffers[$key]['headers'] ?? '';

        // Sucesso estrito: 200 a 399
        $isSuccess = ($curlErrno === 0 && $httpCode >= 200 && $httpCode < 400);
        $diag = diagnoseCheck($httpCode, $curlErrno, $curlError, $body, $head);

        $results[$key] = [
            'success' => $isSuccess,
            'httpCode' => $httpCode,
            'responseTime' => round($totalTime * 1000),
            'errorDetail' => $diag,
            'curlErrno' => $curlErrno,
            'curlError' => $curlError
        ];

        curl_multi_remove_handle($multiCurl, $ch);
        curl_close($ch);
    }
    curl_multi_close($multiCurl);

    return $results;
}

// 1. Carrega todos os monitores de todos os arquivos
$allData = [];
$allItems = []; // key => ['file' => ..., 'index' => ..., 'url' => ..., 'label' => ...]

foreach ($files as $file) {
    $content = file_get_contents($file);
    $data = json_decode($content, true);

    if (!is_array($data) || empty($data['monitors'])) {
        continue;
    }

    $allData[$file] = $data;

    foreach ($data['monitors'] as $index => $monitor) {
        $url = $monitor['domain'];
        $key = $file . '::' . $index;

        $allItems[$key] = [
            'file' => $file,
            'index' => $index,
            'url' => $url,
            'label' => $monitor['label'] ?? $url
        ];
    }
}

if (empty($allItems)) {
    echo "Nenhum monitor ativo encontrado.\n";
    exit;
}

$finalResults = []; // key => resultado final com 'attempts'

// ─── RODADA 1: Tentativa inicial em paralelo ──────────────────────────────────
$round1Results = executeBatch($allItems);
$round2Queue = [];

foreach ($allItems as $key => $item) {
    $res = $round1Results[$key] ?? [
        'success' => false,
        'httpCode' => 0,
        'responseTime' => 0,
        'errorDetail' => 'Erro desconhecido na tentativa 1',
        'curlErrno' => -1
    ];

    if ($res['success']) {
        $finalResults[$key] = array_merge($res, ['attempts' => 1]);
    } else {
        $round2Queue[$key] = $item;
    }
}

// ─── RODADA 2: Repescagem após 2.5s para os que falharam ──────────────────────
if (!empty($round2Queue)) {
    usleep(RETRY_DELAY_US);
    $round2Results = executeBatch($round2Queue);
    $round3Queue = [];

    foreach ($round2Queue as $key => $item) {
        $res = $round2Results[$key] ?? [
            'success' => false,
            'httpCode' => 0,
            'responseTime' => 0,
            'errorDetail' => 'Erro na tentativa 2',
            'curlErrno' => -1
        ];

        if ($res['success']) {
            $finalResults[$key] = array_merge($res, ['attempts' => 2]);
        } else {
            $round3Queue[$key] = $item;
        }
    }

    // ─── RODADA 3: Confirmação final após mais 2.5s ────────────────────────────
    if (!empty($round3Queue)) {
        usleep(RETRY_DELAY_US);
        $round3Results = executeBatch($round3Queue);

        foreach ($round3Queue as $key => $item) {
            $res = $round3Results[$key] ?? [
                'success' => false,
                'httpCode' => 0,
                'responseTime' => 0,
                'errorDetail' => 'Erro na tentativa 3',
                'curlErrno' => -1
            ];

            // Na tentativa 3, o status é definitivo (seja sucesso recuperado ou offline confirmado)
            $finalResults[$key] = array_merge($res, ['attempts' => 3]);
        }
    }
}

// ─── Processamento dos Resultados e Alertas ───────────────────────────────────
$resultsToEmail = []; // user_email => [messages]

foreach ($allItems as $key => $item) {
    $mFile = $item['file'];
    $mIndex = $item['index'];
    $mLabel = $item['label'];
    $mUrl = $item['url'];

    $res = $finalResults[$key];
    $monitor = &$allData[$mFile]['monitors'][$mIndex];

    $oldStatus = $monitor['status'] ?? 'pending';
    $newStatus = $res['success'] ? 'online' : 'offline';

    // Atualiza o monitor com os dados ricos de diagnóstico
    $monitor['status'] = $newStatus;
    $monitor['httpCode'] = $res['httpCode'];
    $monitor['responseTime'] = $res['responseTime'];
    $monitor['attempts'] = $res['attempts'];
    $monitor['errorDetail'] = $res['errorDetail'];
    $monitor['lastChecked'] = time();

    // Verificação de mudança de estado para envio de alerta
    $statusChanged = ($oldStatus !== $newStatus);
    $isFirstFail = ($oldStatus === 'pending' && $newStatus === 'offline');

    if (($statusChanged && $oldStatus !== 'pending') || $isFirstFail) {
        $email = $allData[$mFile]['email'] ?? '';
        if (!empty($email) && filter_var($email, FILTER_VALIDATE_EMAIL)) {
            if (!isset($resultsToEmail[$email])) {
                $resultsToEmail[$email] = [];
            }

            $resultsToEmail[$email][] = [
                'label' => $mLabel,
                'url' => $mUrl,
                'isOnline' => $res['success'],
                'isFirstFail' => $isFirstFail,
                'httpCode' => $res['httpCode'],
                'responseTime' => $res['responseTime'],
                'attempts' => $res['attempts'],
                'errorDetail' => $res['errorDetail']
            ];
        }
    }
}

// Salva de volta nos arquivos data.json
foreach ($allData as $file => $data) {
    file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT));
}

// ─── Disparo dos E-mails de Alerta ────────────────────────────────────────────
foreach ($resultsToEmail as $email => $messages) {
    $to = $email;
    $firstMsg = $messages[0];
    $statusWord = $firstMsg['isOnline'] ? 'voltou a ficar online' : 'está fora do ar (confirmado)';

    if (count($messages) === 1) {
        $subject = "Alerta - O site {$firstMsg['label']} {$statusWord}";
    } else {
        $subject = "Alerta - Atualização em " . count($messages) . " sites monitorados";
    }

    $htmlMessages = '';
    foreach ($messages as $msg) {
        $color = $msg['isOnline'] ? '#22c55e' : '#ef4444';
        $bg = $msg['isOnline'] ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)';
        $statusText = $msg['isOnline'] ? 'ONLINE' : 'OFFLINE';
        if ($msg['isFirstFail']) $statusText = 'OFFLINE (FALHOU)';

        $attemptsText = $msg['isOnline']
            ? ($msg['attempts'] > 1 ? "Recuperado na tentativa {$msg['attempts']}/3" : "1/3 tentativa")
            : "Confirmado após {$msg['attempts']}/3 tentativas";

        $diagHtml = '';
        if (!empty($msg['errorDetail'])) {
            $diagHtml = "
            <div style='margin-top: 14px; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 10px 14px; color: #fca5a5; font-size: 12px; line-height: 1.5; font-family: sans-serif;'>
                <strong>Diagnóstico:</strong> {$msg['errorDetail']}
            </div>
            ";
        }

        $htmlMessages .= "
        <div style='background: #171717; border: 1px solid #2E2E2E; border-radius: 12px; padding: 24px; margin-bottom: 16px;'>
            <table width='100%' cellpadding='0' cellspacing='0' border='0'>
                <tr>
                    <td valign='middle'>
                        <span style='background: {$bg}; color: {$color}; padding: 6px 12px; border-radius: 99px; font-size: 11px; font-weight: bold; letter-spacing: 0.05em; border: 1px solid {$color}; display: inline-block;'>
                            ● {$statusText}
                        </span>
                        <span style='color: #737373; font-size: 11px; margin-left: 8px; font-family: sans-serif;'>
                            {$attemptsText}
                        </span>
                    </td>
                </tr>
                <tr>
                    <td style='padding-top: 16px;'>
                        <div style='color: #FCFCFA; font-size: 18px; font-weight: bold; margin-bottom: 4px; font-family: sans-serif;'>{$msg['label']}</div>
                        <div style='color: #9F9F9F; font-size: 13px; font-family: sans-serif;'>{$msg['url']}</div>
                    </td>
                </tr>
                <tr>
                    <td style='padding-top: 16px;'>
                        <div style='color: #737373; font-size: 12px; font-family: sans-serif;'>
                            <strong>HTTP:</strong> " . ($msg['httpCode'] ? $msg['httpCode'] : 'Sem resposta') . " &nbsp;|&nbsp; <strong>Resposta:</strong> {$msg['responseTime']}ms
                        </div>
                    </td>
                </tr>
            </table>
            {$diagHtml}
        </div>
        ";
    }

    $body = "
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='UTF-8'>
    </head>
    <body style='background-color: #121212; margin: 0; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif;'>
        <table width='100%' cellpadding='0' cellspacing='0' border='0'>
            <tr>
                <td align='center'>
                    <table width='100%' style='max-width: 500px;' cellpadding='0' cellspacing='0' border='0'>
                        <tr>
                            <td align='center' style='padding-bottom: 30px;'>
                                <img src='https://dashboard.thiagomaieski.com/assets/dashboard-logo-BYo9Ql_Z.svg' alt='MSK Dashboard' style='height: 32px; display: block; border: 0;' />
                                <div style='color: #9F9F9F; font-size: 14px; margin-top: 12px;'>Atualização de status dos seus sites</div>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                {$htmlMessages}
                            </td>
                        </tr>
                        <tr>
                            <td align='center' style='padding-top: 30px;'>
                                <div style='color: #737373; font-size: 12px;'>
                                    Este é um e-mail automático enviado pelo seu painel MSK Dashboard.<br>
                                    Não é necessário responder.
                                </div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    ";

    $domain = $_SERVER['HTTP_HOST'] ?? 'seudominio.com.br';

    $headers  = "MIME-Version: 1.0\r\n";
    $headers .= "Content-type: text/html; charset=UTF-8\r\n";
    $headers .= "From: MSK Monitor <no-reply@{$domain}>\r\n";
    $headers .= "Reply-To: no-reply@{$domain}\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion();

    mail($to, $subject, $body, $headers);
}

echo "Cron finalizado. Sites verificados com política de 3 retries e diagnóstico completo.\n";
