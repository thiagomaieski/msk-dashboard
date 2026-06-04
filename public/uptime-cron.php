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
    if ($oldStatus !== 'pending' && $oldStatus !== $newStatus) {
        $email = $allData[$mFile]['email'] ?? '';
        if (!empty($email) && filter_var($email, FILTER_VALIDATE_EMAIL)) {
            if (!isset($resultsToEmail[$email])) {
                $resultsToEmail[$email] = [];
            }
            
            $statusText = $isOnline ? '✅ VOLTOU A FICAR ONLINE' : '❌ FICOU OFFLINE';
            $resultsToEmail[$email][] = "O site {$mLabel} ({$mUrl}) {$statusText}. (Código HTTP: {$httpCode})";
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
    $subject = "Alerta de Monitoramento - MSK Dashboard";
    
    $body = "Olá!\n\nHouve atualizações nos sites que você monitora:\n\n";
    foreach ($messages as $msg) {
        $body .= "- " . $msg . "\n";
    }
    $body .= "\n\nPainel MSK Dashboard.";
    
    $headers = [
        'From' => 'no-reply@' . ($_SERVER['HTTP_HOST'] ?? 'seudominio.com.br'),
        'Reply-To' => 'no-reply@' . ($_SERVER['HTTP_HOST'] ?? 'seudominio.com.br'),
        'X-Mailer' => 'PHP/' . phpversion()
    ];
    
    // Tenta enviar o e-mail
    mail($to, $subject, $body, $headers);
}

echo "Cron finalizado. Sites verificados com sucesso.\n";
