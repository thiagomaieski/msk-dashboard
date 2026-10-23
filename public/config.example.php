<?php
/**
 * config.example.php — Modelo de configuração do backend PHP na Hostinger.
 *
 * INSTRUÇÕES:
 * 1. No servidor (Hostinger), copie este arquivo para 'config.php' no mesmo diretório.
 * 2. Preencha os valores reais das chaves de API.
 * 3. NUNCA faça commit do arquivo 'config.php' real no repositório Git.
 */

// Identificador do projeto Firebase
define('FIREBASE_PROJECT_ID', 'msk-dashboard-8a6dd');

// Chave secreta de autenticação interna da API de storage
define('STORAGE_API_KEY', 'msk_storage_6a2d9b4c1f8e');

// Chaves das APIs de Pré-qualificação de Leads (usadas pelo proxy.php)
define('PAGESPEED_API_KEY', 'SUA_CHAVE_GOOGLE_PAGESPEED_AQUI');
define('SCREENSHOT_API_KEY', 'SUA_CHAVE_SCREENSHOTMACHINE_AQUI');
define('APIFY_API_KEY', 'SUA_CHAVE_APIFY_AQUI');

// Diretório base para uploads
define('BASE_UPLOAD_DIR', 'uploads');
