<?php
// Copie este arquivo para config.local.php (no servidor) e preencha. NUNCA envie o config.local.php ao GitHub.
define('SETUP_KEY', 'TROQUE-POR-UMA-FRASE-LONGA-E-ALEATORIA');   // mín. 12 caracteres; vale só até criar o admin
// define('DATA_DIR', '/home/SEUUSUARIO/diamante-data');          // recomendado: fora do public_html
// define('DB_FILE', 'diamante_algo-aleatorio.sqlite');
// define('TZ', 'America/Sao_Paulo');
define('BACKUP_TOKEN', 'TROQUE-POR-UM-CODIGO-ALEATORIO-DE-48-CARACTERES');  // usado pelos scripts de backup (PC / Google Drive); mín. 32
define('DADOS_KEY', 'TROQUE-POR-UM-CODIGO-ALEATORIO-DE-48-CARACTERES-E-NUNCA-MUDE');  // cifra a senha dos inscritos do Clube (visível só ao admin); mín. 32; guarde uma cópia, sem ela as senhas não abrem
