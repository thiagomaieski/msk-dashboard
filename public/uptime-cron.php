<?php
/**
 * MSK DASHBOARD - UPTIME CRON JOB
 * Script para ser executado via Cron Job na Hostinger a cada 5-15 minutos.
 */

// Aumenta o tempo de execução caso tenham muitos sites
set_time_limit(120);

define('BASE_UPLOAD_DIR', __DIR__ . '/uploads');
define('TIMEOUT_SECONDS', 10);

// Busca todos os arquivos de configuração de uptime
$pattern = BASE_UPLOAD_DIR . '/*/uptime/data.json';
$files = glob($pattern);

if (empty($files)) {
    echo "Nenhum monitor configurado.\n";
    exit;
}

$multiCurl = curl_multi_init();
$curlHandles = [];
$map = []; // Mapeia handle_id -> [file, monitor_index]

// Lê os arquivos e prepara as requisições
$allData = [];

foreach ($files as $file) {
    $content = file_get_contents($file);
    $data = json_decode($content, true);
    
    if (!is_array($data) || empty($data['monitors'])) {
        continue;
    }
    
    $allData[$file] = $data;
    
    foreach ($data['monitors'] as $index => $monitor) {
        $url = $monitor['domain'];
        
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HEADER, false);
        curl_setopt($ch, CURLOPT_NOBODY, true); // Faz requisição HEAD para ser mais leve
        curl_setopt($ch, CURLOPT_TIMEOUT, TIMEOUT_SECONDS);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, TIMEOUT_SECONDS);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_MAXREDIRS, 3);
        curl_setopt($ch, CURLOPT_USERAGENT, 'MSK-Uptime-Monitor/1.0');
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Evita falhar por SSL inválido
        
        curl_multi_add_handle($multiCurl, $ch);
        
        $chId = (int)$ch;
        $map[$chId] = [
            'file' => $file,
            'index' => $index,
            'url' => $url,
            'label' => $monitor['label'] ?? $url
        ];
    }
}

// Executa todas as requisições em paralelo
$running = null;
do {
    curl_multi_exec($multiCurl, $running);
    curl_multi_select($multiCurl);
} while ($running > 0);

$resultsToEmail = []; // user_email => [messages]

// Coleta resultados
foreach ($map as $chId => $info) {
    // Para obter a instância original, procuramos no array de handles...
    // Na verdade, podemos usar curl_multi_info_read
}

while ($info = curl_multi_info_read($multiCurl)) {
    $ch = $info['handle'];
    $chId = (int)$ch;
    
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $totalTime = curl_getinfo($ch, CURLINFO_TOTAL_TIME);
    
    // Status online se for 2xx ou 3xx
    $isOnline = ($httpCode >= 200 && $httpCode < 400);
    $newStatus = $isOnline ? 'online' : 'offline';
    
    // Pega as referências
    $mFile = $map[$chId]['file'];
    $mIndex = $map[$chId]['index'];
    $mLabel = $map[$chId]['label'];
    $mUrl = $map[$chId]['url'];
    
    $monitor = &$allData[$mFile]['monitors'][$mIndex];
    $oldStatus = $monitor['status'] ?? 'pending';
    
    // Atualiza dados
    $monitor['status'] = $newStatus;
    $monitor['lastChecked'] = time();
    $monitor['responseTime'] = round($totalTime * 1000); // ms
    
    // Verifica mudança de estado
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
                'isOnline' => $isOnline,
                'isFirstFail' => $isFirstFail,
                'httpCode' => $httpCode,
                'responseTime' => round($totalTime * 1000)
            ];
        }
    }
    
    curl_multi_remove_handle($multiCurl, $ch);
    curl_close($ch);
}
curl_multi_close($multiCurl);

// Salva de volta nos arquivos
foreach ($allData as $file => $data) {
    file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT));
}

// Envia os e-mails
foreach ($resultsToEmail as $email => $messages) {
    $to = $email;
    $firstMsg = $messages[0];
    $statusWord = $firstMsg['isOnline'] ? 'voltou a ficar online' : 'está fora do ar';
    
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
        
        $htmlMessages .= "
        <div style='background: #171717; border: 1px solid #2E2E2E; border-radius: 12px; padding: 24px; margin-bottom: 16px;'>
            <table width='100%' cellpadding='0' cellspacing='0' border='0'>
                <tr>
                    <td valign='middle'>
                        <span style='background: {$bg}; color: {$color}; padding: 6px 12px; border-radius: 99px; font-size: 11px; font-weight: bold; letter-spacing: 0.05em; border: 1px solid {$color}; display: inline-block;'>
                            ● {$statusText}
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
                            <strong>HTTP:</strong> {$msg['httpCode']} &nbsp;|&nbsp; <strong>Resposta:</strong> {$msg['responseTime']}ms
                        </div>
                    </td>
                </tr>
            </table>
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

echo "Cron finalizado. Sites verificados com sucesso.\n";
