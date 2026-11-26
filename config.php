<?php
// ============================================================
//  Diamante App - configuração PADRÃO (pode ir para o GitHub: não tem segredo).
//  Os valores secretos ficam em config.local.php, que NÃO vai para o GitHub.
//  Veja config.sample.php e o LEIA-ME.
// ============================================================
$__local = __DIR__ . '/config.local.php';
if (is_file($__local)) require $__local;

// Chave usada UMA ÚNICA VEZ para criar a conta administradora (defina em config.local.php).
defined('SETUP_KEY') || define('SETUP_KEY', '');
// Pasta do banco. Vazio = pasta "data" ao lado (protegida). Melhor: uma pasta FORA do public_html.
defined('DATA_DIR') || define('DATA_DIR', '');
// Nome do arquivo do banco. Se não definir, é gerado a partir do caminho do servidor (não adivinhável de fora).
defined('DB_FILE') || define('DB_FILE', 'diamante_' . substr(hash('sha256', __DIR__ . '|diamante'), 0, 16) . '.sqlite');
// Chave para o backup automático (PC / Google Drive). Defina em config.local.php (32+ caracteres). Vazio = backup automático desligado.
defined('BACKUP_TOKEN') || define('BACKUP_TOKEN', '');
// Chave que cifra a senha dos inscritos no Clube (para o administrador poder ver). 32+ caracteres. NÃO troque depois de em uso. Vazio = senha não guardada de forma legível.
defined('DADOS_KEY') || define('DADOS_KEY', '');
// Fuso horário usado nas metas diárias.
defined('TZ') || define('TZ', 'America/Sao_Paulo');
