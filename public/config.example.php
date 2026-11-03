<?php
/**
 * config.example.php — Modelo de configuração do backend PHP na Hostinger.
 *
 * INSTRUÇÕES:
 * 1. No servidor (Hostinger), copie este arquivo para 'config.php' no mesmo diretório.
 * 2. Preencha os valores reais das chaves de API, URLs e segredos.
 * 3. NUNCA faça commit do arquivo 'config.php' real no repositório Git.
 */

// Identificador do projeto Firebase
define('FIREBASE_PROJECT_ID', 'msk-dashboard-8a6dd');

// Chave secreta de autenticação interna da API de storage
define('STORAGE_API_KEY', 'SUA_CHAVE_STORAGE_AQUI');

// Chaves das APIs de Pré-qualificação de Leads (usadas pelo proxy.php)
define('PAGESPEED_API_KEY', 'SUA_CHAVE_GOOGLE_PAGESPEED_AQUI');
define('SCREENSHOT_API_KEY', 'SUA_CHAVE_SCREENSHOTMACHINE_AQUI');
define('APIFY_API_KEY', 'SUA_CHAVE_APIFY_AQUI');

// URL pública base da aplicação (usada para compor links públicos de mídias/screenshots)
define('PUBLIC_BASE_URL', 'https://dashboard.thiagomaieski.com');

// Origens permitidas para CORS (separadas por vírgula se mais de uma)
define('ALLOWED_ORIGIN', 'https://dashboard.thiagomaieski.com');

// Chave secreta para execução dos scripts de Cron via HTTP (?key=...)
define('CRON_SECRET', 'SUA_CHAVE_SECRETA_DO_CRON_AQUI');

// Diretório base para uploads
define('BASE_UPLOAD_DIR', 'uploads');

// Configuração de IA (Fase 4 — usadas apenas pelo ai.php no servidor)
define('GEMINI_API_KEY', 'SUA_CHAVE_GEMINI_AQUI');
define('GEMINI_MODEL', 'gemini-2.5-flash-lite');
define('AI_DAILY_LIMIT', 60);

