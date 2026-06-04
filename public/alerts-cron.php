<?php
/**
 * MSK DASHBOARD - ALERTS CRON JOB
 * Processa todos os arquivos em uploads/alerts/ e envia os e-mails diários de resumo.
 * Configure na Hostinger para rodar 1x ao dia (ex: 08:00 AM)
 */
date_default_timezone_set('America/Sao_Paulo');

define('BASE_UPLOAD_DIR', __DIR__ . '/uploads/alerts');
define('LOG_FILE', __DIR__ . '/uploads/alerts_cron.log');

function logAction($msg) {
    $date = date('Y-m-d H:i:s');
    file_put_contents(LOG_FILE, "[$date] $msg\n", FILE_APPEND);
    echo "[$date] $msg<br>";
}

if (!file_exists(BASE_UPLOAD_DIR)) {
    logAction("Nenhum diretório de alertas encontrado. Abortando.");
    exit;
}

$files = glob(BASE_UPLOAD_DIR . '/*.json');

function getDaysDiff($dateStr) {
    if (empty($dateStr)) return null;
    try {
        $d = new DateTime($dateStr);
        $d->setTime(0,0,0);
        $n = new DateTime();
        $n->setTime(0,0,0);
        return (int)$n->diff($d)->format('%R%a');
    } catch (Exception $e) { return null; }
}

function checkRecur($rec) {
    if ($rec['periodicidade'] === 'Mensal') {
        $venc = (int)($rec['vencimento'] ?? 0);
        if (!$venc) return null;
        $n = new DateTime();
        $target = clone $n;
        
        $lastDayOfMonth = (int)date('t', strtotime($n->format('Y-m-d')));
        $safeVenc = min($venc, $lastDayOfMonth);
        
        $target->setDate((int)$n->format('Y'), (int)$n->format('m'), $safeVenc);
        $target->setTime(0,0,0);
        $n->setTime(0,0,0);
        
        $diff = (int)$n->diff($target)->format('%R%a');
        if ($diff < 0) {
            $target->modify('+1 month');
            $diff = (int)$n->diff($target)->format('%R%a');
        }
        return $diff;
    } else if ($rec['periodicidade'] === 'Anual' && !empty($rec['renovacao'])) {
        return getDaysDiff($rec['renovacao']);
    }
    return null;
}

function formatGroup($title, $items, $color) {
    if (empty($items)) return '';
    $html = "<div style='margin-bottom: 24px;'>
        <div style='font-size: 14px; font-weight: bold; color: {$color}; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; border-bottom: 1px solid #2E2E2E; padding-bottom: 6px;'>
            {$title}
        </div>";
    foreach ($items as $it) {
        $extra = !empty($it['sub']) ? "<span style='color:#737373; font-size: 12px; margin-left: 8px;'>{$it['sub']}</span>" : "";
        $html .= "<div style='background: #171717; border: 1px solid #2E2E2E; border-radius: 8px; padding: 14px; margin-bottom: 8px;'>
            <div style='color: #FCFCFA; font-size: 15px; font-weight: 500; font-family: sans-serif;'>{$it['label']} {$extra}</div>
        </div>";
    }
    $html .= "</div>";
    return $html;
}

$domain = $_SERVER['HTTP_HOST'] ?? 'seudominio.com.br';

foreach ($files as $file) {
    $data = json_decode(file_get_contents($file), true);
    if (!$data || empty($data['email'])) continue;
    
    $email = $data['email'];
    $hoje = [];
    $atrasados = [];
    $proximos = []; // até 3 dias
    
    // 1. Lembretes
    foreach ($data['lembretes'] ?? [] as $item) {
        $diff = getDaysDiff($item['prazo']);
        if ($diff === null) continue;
        $label = "Tarefa: " . $item['titulo'];
        $sub = $item['horario'] ? "às {$item['horario']}" : "";
        if ($diff < 0) $atrasados[] = ['label' => $label, 'sub' => $sub];
        else if ($diff === 0) $hoje[] = ['label' => $label, 'sub' => $sub];
        else if ($diff <= 3) $proximos[] = ['label' => $label, 'sub' => "Daqui a {$diff} dia(s)"];
    }
    
    // 2. Projetos
    foreach ($data['projetos'] ?? [] as $item) {
        $diff = getDaysDiff($item['prazo']);
        if ($diff === null) continue;
        $label = "Projeto: " . $item['descricao'];
        if ($diff < 0) $atrasados[] = ['label' => $label, 'sub' => "Atrasado há " . abs($diff) . " dia(s)"];
        else if ($diff === 0) $hoje[] = ['label' => $label, 'sub' => "Prazo Final Hoje"];
        else if ($diff <= 3) $proximos[] = ['label' => $label, 'sub' => "Prazo em {$diff} dia(s)"];
    }
    
    // 3. NFs
    foreach ($data['nfs'] ?? [] as $item) {
        $diff = getDaysDiff($item['data']);
        if ($diff === null) continue;
        $label = "NF Pendente: " . $item['descricao'];
        if ($diff < 0) $atrasados[] = ['label' => $label, 'sub' => "Atrasada"];
        else if ($diff === 0) $hoje[] = ['label' => $label, 'sub' => "Emitir Hoje"];
        else if ($diff <= 3) $proximos[] = ['label' => $label, 'sub' => "Emitir em {$diff} dia(s)"];
    }
    
    // 4. Recorrencias
    foreach ($data['recorrencia'] ?? [] as $item) {
        $diff = checkRecur($item);
        if ($diff === null) continue;
        $label = "Recorrência: " . $item['cliente'];
        $sub = ($item['plano'] ?? 'Plano') . " (R$ " . number_format((float)($item['valor'] ?? 0), 2, ',', '.') . ")";
        if ($diff === 0) $hoje[] = ['label' => $label, 'sub' => "Vence Hoje - " . $sub];
        else if ($diff <= 3) $proximos[] = ['label' => $label, 'sub' => "Vence em {$diff} dia(s) - " . $sub];
    }
    
    $leads = count($data['leads'] ?? []);
    if ($leads > 0) {
        $proximos[] = ['label' => "{$leads} Lead(s) Aguardando", 'sub' => "Qualificados com observações pendentes"];
    }
    
    $total = count($hoje) + count($atrasados) + count($proximos);
    if ($total === 0) {
        logAction("Nenhuma pendência para $email. E-mail ignorado.");
        continue;
    }
    
    // --- CONSTRUIR EMAIL HTML ---
    $htmlContent = "";
    $htmlContent .= formatGroup("⚠️ Atrasados & Urgentes", $atrasados, "#ef4444");
    $htmlContent .= formatGroup("⚡ Para Hoje", $hoje, "#00C573");
    $htmlContent .= formatGroup("⏳ Próximos Dias", $proximos, "#3b82f6");
    
    $body = "
    <!DOCTYPE html>
    <html>
    <head><meta charset='UTF-8'></head>
    <body style='background-color: #121212; margin: 0; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif;'>
        <table width='100%' cellpadding='0' cellspacing='0' border='0'>
            <tr>
                <td align='center'>
                    <table width='100%' style='max-width: 500px;' cellpadding='0' cellspacing='0' border='0'>
                        <tr>
                            <td align='center' style='padding-bottom: 30px;'>
                                <img src='https://dashboard.thiagomaieski.com/assets/dashboard-logo-BYo9Ql_Z.svg' alt='MSK Dashboard' style='height: 32px; display: block; border: 0;' />
                                <div style='color: #FCFCFA; font-size: 20px; font-weight: bold; margin-top: 20px;'>Resumo do seu Dia</div>
                                <div style='color: #9F9F9F; font-size: 14px; margin-top: 8px;'>Você tem {$total} pendência(s) que precisam de atenção.</div>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                {$htmlContent}
                            </td>
                        </tr>
                        <tr>
                            <td align='center' style='padding-top: 30px;'>
                                <a href='https://dashboard.thiagomaieski.com' style='display: inline-block; background-color: #00C573; color: #121212; font-weight: bold; padding: 12px 24px; border-radius: 99px; text-decoration: none; font-size: 14px;'>Acessar Dashboard</a>
                                <div style='color: #737373; font-size: 12px; margin-top: 24px;'>
                                    Este é um e-mail automático diário do seu painel MSK Dashboard.<br>
                                    As pendências são baseadas no último sincronismo automático.
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
    
    $subject = "☀️ Resumo do Dia - Você tem {$total} pendência(s)";
    
    $headers  = "MIME-Version: 1.0\r\n";
    $headers .= "Content-type: text/html; charset=UTF-8\r\n";
    $headers .= "From: MSK Alertas <no-reply@{$domain}>\r\n";
    $headers .= "Reply-To: no-reply@{$domain}\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion();
    
    $success = mail($email, $subject, $body, $headers);
    if ($success) {
        logAction("E-mail diário enviado com sucesso para $email");
    } else {
        logAction("Falha ao enviar e-mail diário para $email");
    }
}

logAction("Cron Job finalizado.");
