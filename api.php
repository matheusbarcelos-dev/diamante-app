<?php
declare(strict_types=1);
/* ============================================================
   Diamante App - API (PHP 8 + SQLite)
   Todas as respostas são JSON. Cada usuário só enxerga os próprios dados;
   a conta admin enxerga a produção de todos.
   ============================================================ */
ini_set('display_errors', '0');
require __DIR__ . '/config.php';
date_default_timezone_set(TZ);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

const RANKS = ['Consultor', 'Manager', 'Director', 'Executive', 'Elite', 'Premier', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Blue Diamond', 'Presidential Diamond'];
const LEAD_STATUS = ['novo', 'chamado', 'respondeu', 'interessado', 'cliente', 'sem_interesse'];
const CRM_STATUS = ['novo', 'contatado', 'conversando', 'cliente', 'perdido'];
const CLUBE_META_SEMANA = 3; // pessoas que precisam concluir a inscrição no Clube por semana
const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

function out($data, int $code = 200): never {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}
function fail(string $msg, int $code = 400): never { out(['ok' => false, 'erro' => $msg], $code); }

/* ---------- banco ---------- */
function db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    $dir = DATA_DIR !== '' ? rtrim(DATA_DIR, '/\\') : __DIR__ . '/data';
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    if (!is_writable($dir)) fail('A pasta de dados não tem permissão de escrita. Veja o LEIA-ME.', 500);
    $pdo = new PDO('sqlite:' . $dir . '/' . DB_FILE, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $pdo->exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 8000;');
    migrate($pdo);
    return $pdo;
}
function migrate(PDO $p): void {
    $p->exec("
    CREATE TABLE IF NOT EXISTS users(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL, email TEXT NOT NULL UNIQUE, whatsapp TEXT NOT NULL DEFAULT '',
      rank TEXT NOT NULL DEFAULT 'Consultor', role TEXT NOT NULL DEFAULT 'user',
      pass_hash TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
      ativo INTEGER NOT NULL DEFAULT 1, ov_equipe REAL NOT NULL DEFAULT 0, ov_mes TEXT NOT NULL DEFAULT '',
      criado TEXT NOT NULL, ultimo_login TEXT NOT NULL DEFAULT '');
    CREATE TABLE IF NOT EXISTS sessions(
      h TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      criado TEXT NOT NULL, expira INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS tentativas(id INTEGER PRIMARY KEY AUTOINCREMENT, chave TEXT NOT NULL, tipo TEXT NOT NULL, ts INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS ix_tent ON tentativas(chave, tipo, ts);
    CREATE TABLE IF NOT EXISTS config(chave TEXT PRIMARY KEY, valor TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS listas(
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      nome TEXT NOT NULL, criado TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS leads(
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lista_id INTEGER NOT NULL REFERENCES listas(id) ON DELETE CASCADE,
      nome TEXT NOT NULL, telefone TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'novo',
      obs TEXT NOT NULL DEFAULT '', atualizado TEXT NOT NULL DEFAULT '');
    CREATE INDEX IF NOT EXISTS ix_leads ON leads(user_id, lista_id, status);
    CREATE TABLE IF NOT EXISTS vendas(
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      cliente TEXT NOT NULL, whatsapp TEXT NOT NULL DEFAULT '', sku TEXT NOT NULL DEFAULT '', produto TEXT NOT NULL,
      qtd INTEGER NOT NULL DEFAULT 1, valor REAL NOT NULL DEFAULT 0, pv REAL NOT NULL DEFAULT 0,
      data TEXT NOT NULL, dias INTEGER NOT NULL DEFAULT 30, followup TEXT NOT NULL DEFAULT '',
      fu_status TEXT NOT NULL DEFAULT 'pendente', obs TEXT NOT NULL DEFAULT '');
    CREATE INDEX IF NOT EXISTS ix_vendas ON vendas(user_id, data);
    CREATE INDEX IF NOT EXISTS ix_fu ON vendas(user_id, fu_status, followup);
    CREATE TABLE IF NOT EXISTS estoque(
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sku TEXT NOT NULL, nome TEXT NOT NULL, qtd INTEGER NOT NULL DEFAULT 0, minimo INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY(user_id, sku));
    CREATE TABLE IF NOT EXISTS prospeccao(
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, dia TEXT NOT NULL,
      chamados INTEGER NOT NULL DEFAULT 0, interessados INTEGER NOT NULL DEFAULT 0, vendas INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY(user_id, dia));
    CREATE TABLE IF NOT EXISTS ana(
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sid TEXT NOT NULL, nome TEXT NOT NULL DEFAULT '', whatsapp TEXT NOT NULL DEFAULT '',
      etapa INTEGER NOT NULL DEFAULT 0, total INTEGER NOT NULL DEFAULT 0, completo INTEGER NOT NULL DEFAULT 0,
      dados TEXT NOT NULL DEFAULT '{}', crm TEXT NOT NULL DEFAULT 'novo', nota TEXT NOT NULL DEFAULT '',
      criado TEXT NOT NULL, atualizado TEXT NOT NULL, UNIQUE(user_id, sid));
    CREATE TABLE IF NOT EXISTS clube(
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sid TEXT NOT NULL, nome TEXT NOT NULL DEFAULT '', telefone TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '',
      nascimento TEXT NOT NULL DEFAULT '', cpf TEXT NOT NULL DEFAULT '', pass_hash TEXT NOT NULL DEFAULT '',
      cep TEXT NOT NULL DEFAULT '', rua TEXT NOT NULL DEFAULT '', numero TEXT NOT NULL DEFAULT '', complemento TEXT NOT NULL DEFAULT '',
      bairro TEXT NOT NULL DEFAULT '', cidade TEXT NOT NULL DEFAULT '', uf TEXT NOT NULL DEFAULT '',
      etapa INTEGER NOT NULL DEFAULT 0, total INTEGER NOT NULL DEFAULT 0, completo INTEGER NOT NULL DEFAULT 0, concluido TEXT NOT NULL DEFAULT '',
      consentimento TEXT NOT NULL DEFAULT '', crm TEXT NOT NULL DEFAULT 'novo', nota TEXT NOT NULL DEFAULT '',
      criado TEXT NOT NULL, atualizado TEXT NOT NULL, UNIQUE(user_id, sid));
    CREATE INDEX IF NOT EXISTS ix_clube ON clube(user_id, completo, concluido);
    CREATE TABLE IF NOT EXISTS arquivo(
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, tabela TEXT NOT NULL, dados TEXT NOT NULL, apagado_em TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS depoimentos(
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tema TEXT NOT NULL, texto TEXT NOT NULL, autor TEXT NOT NULL DEFAULT '');
    ");
    /* migração: senha cifrada (só o administrador consegue ver) */
    $cols = array_column($p->query("PRAGMA table_info(clube)")->fetchAll(PDO::FETCH_ASSOC), 'name');
    if (!in_array('pass_enc', $cols, true)) $p->exec("ALTER TABLE clube ADD COLUMN pass_enc TEXT NOT NULL DEFAULT ''");
}

/* ---------- utilidades ---------- */
function now(): string { return date('Y-m-d H:i:s'); }
function hoje(): string { return date('Y-m-d'); }
/* IP real do visitante. Atrás do Cloudflare, o REMOTE_ADDR é o do Cloudflare; só confiamos no
   cabeçalho CF-Connecting-IP quando a conexão vem mesmo de um IP do Cloudflare (senão qualquer um poderia forjá-lo). */
function ip_in_cidr(string $ip, string $cidr): bool {
    [$net, $bits] = explode('/', $cidr); $a = @inet_pton($ip); $b = @inet_pton($net);
    if ($a === false || $b === false || strlen($a) !== strlen($b)) return false;
    $bits = (int)$bits; $full = intdiv($bits, 8); $rest = $bits % 8;
    if ($full && substr($a, 0, $full) !== substr($b, 0, $full)) return false;
    if ($rest) { $m = (0xFF << (8 - $rest)) & 0xFF; if ((ord($a[$full]) & $m) !== (ord($b[$full]) & $m)) return false; }
    return true;
}
function ip(): string {
    static $r = null; if ($r !== null) return $r;
    $ra = (string)($_SERVER['REMOTE_ADDR'] ?? '0');
    $cf = (string)($_SERVER['HTTP_CF_CONNECTING_IP'] ?? '');
    if ($cf !== '' && filter_var($cf, FILTER_VALIDATE_IP)) {
        foreach (['173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22', '141.101.64.0/18', '108.162.192.0/18', '190.93.240.0/20',
                  '188.114.96.0/20', '197.234.240.0/22', '198.41.128.0/17', '162.158.0.0/15', '104.16.0.0/13', '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
                  '2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32', '2405:8100::/32', '2a06:98c0::/29', '2c0f:f248::/32'] as $c) {
            if (ip_in_cidr($ra, $c)) return $r = substr($cf, 0, 60);
        }
    }
    return $r = substr($ra, 0, 60);
}
function body(): array {
    static $b = null;
    if ($b !== null) return $b;
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') return $b = [];
    if (strlen($raw) > 400000) fail('Dados grandes demais.', 413);
    $j = json_decode($raw, true);
    return $b = is_array($j) ? $j : [];
}
function s(mixed $v, int $max = 200): string {
    if (!is_string($v) && !is_numeric($v)) return '';
    $v = trim((string)$v);
    $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', '', $v) ?? '';
    return mb_substr($v, 0, $max);
}
function n(mixed $v, float $min = 0, float $max = 1e9): float {
    if (is_string($v)) $v = str_replace(',', '.', $v);
    $f = is_numeric($v) ? (float)$v : 0.0;
    return max($min, min($max, $f));
}
function phone(string $raw): string {
    $d = preg_replace('/\D+/', '', $raw) ?? '';
    $d = ltrim($d, '0');
    if (strlen($d) === 10 || strlen($d) === 11) $d = '55' . $d;
    return (strlen($d) >= 12 && strlen($d) <= 13 && str_starts_with($d, '55')) ? $d : '';
}
function q(string $sql, array $args = []): PDOStatement { $st = db()->prepare($sql); $st->execute($args); return $st; }
function one(string $sql, array $args = []): ?array { $r = q($sql, $args)->fetch(); return $r ?: null; }
function all(string $sql, array $args = []): array { return q($sql, $args)->fetchAll(); }

function https(): bool {
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
}
function need_csrf(): void {
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'diamante') fail('Requisição inválida.', 403);
}
function limite(string $chave, string $tipo, int $max, int $janelaSeg): void {
    q('DELETE FROM tentativas WHERE ts < ?', [time() - 86400]);
    $c = one('SELECT COUNT(*) c FROM tentativas WHERE chave=? AND tipo=? AND ts>?', [$chave, $tipo, time() - $janelaSeg]);
    if (($c['c'] ?? 0) >= $max) fail('Muitas tentativas. Aguarde alguns minutos e tente de novo.', 429);
}
function registra(string $chave, string $tipo): void { q('INSERT INTO tentativas(chave,tipo,ts) VALUES(?,?,?)', [$chave, $tipo, time()]); }

function set_cookie_sessao(string $token, int $exp): void {
    setcookie('dsid', $token, ['expires' => $exp, 'path' => '/', 'secure' => https(), 'httponly' => true, 'samesite' => 'Lax']);
}
function abre_sessao(int $uid): void {
    $t = bin2hex(random_bytes(32));
    $exp = time() + 60 * 86400;
    q('INSERT INTO sessions(h,user_id,criado,expira) VALUES(?,?,?,?)', [hash('sha256', $t), $uid, now(), $exp]);
    q('UPDATE users SET ultimo_login=? WHERE id=?', [now(), $uid]);
    set_cookie_sessao($t, $exp);
}
function user_atual(): ?array {
    static $u = false;
    if ($u !== false) return $u;
    $t = $_COOKIE['dsid'] ?? '';
    if (!is_string($t) || !preg_match('/^[a-f0-9]{64}$/', $t)) return $u = null;
    $r = one('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.h=? AND s.expira>? AND u.ativo=1', [hash('sha256', $t), time()]);
    return $u = $r;
}
function need_user(): array { $u = user_atual(); if (!$u) fail('Sua sessão expirou. Entre novamente.', 401); return $u; }
function need_admin(): array { $u = need_user(); if ($u['role'] !== 'admin') fail('Acesso restrito ao administrador.', 403); return $u; }
function pub_user(array $u): array {
    return ['id' => (int)$u['id'], 'nome' => $u['nome'], 'email' => $u['email'], 'whatsapp' => $u['whatsapp'], 'rank' => $u['rank'],
        'role' => $u['role'], 'slug' => $u['slug'], 'ativo' => (int)$u['ativo'], 'criado' => $u['criado'], 'ultimo_login' => $u['ultimo_login']];
}
function valida_senha(string $p): void {
    if (mb_strlen($p) < 8) fail('A senha precisa ter pelo menos 8 caracteres.');
    if (mb_strlen($p) > 100) fail('Senha longa demais.');
    if (!preg_match('/\pL/u', $p) || !preg_match('/\d/', $p)) fail('Use letras e números na senha.');
}
/* Senha do Clube: guardada CIFRADA (AES-256-GCM) com a DADOS_KEY do config.local.php, que fica fora do banco e dos backups.
   Só o administrador consegue ver (rota admin_clube_senha). Sem a chave, a senha não é guardada de forma legível. */
function dados_key(): string { return strlen(DADOS_KEY) >= 32 ? hash('sha256', 'diamante|senha|' . DADOS_KEY, true) : ''; }
function senha_cifra(string $p): string {
    $k = dados_key(); if ($k === '') return '';
    $iv = random_bytes(12); $tag = '';
    $c = openssl_encrypt($p, 'aes-256-gcm', $k, OPENSSL_RAW_DATA, $iv, $tag);
    return $c === false ? '' : base64_encode($iv . $tag . $c);
}
function senha_decifra(string $b): ?string {
    $k = dados_key(); $raw = base64_decode($b, true);
    if ($k === '' || $raw === false || strlen($raw) < 29) return null;
    $r = openssl_decrypt(substr($raw, 28), 'aes-256-gcm', $k, OPENSSL_RAW_DATA, substr($raw, 0, 12), substr($raw, 12, 16));
    return $r === false ? null : $r;
}
function valida_user(array $b, bool $comEmail = true): array {
    $nome = s($b['nome'] ?? '', 120);
    if (count(preg_split('/\s+/u', $nome, -1, PREG_SPLIT_NO_EMPTY) ?: []) < 2) fail('Digite seu nome completo (nome e sobrenome).');
    $r = ['nome' => $nome];
    if ($comEmail) {
        $email = mb_strtolower(s($b['email'] ?? '', 160));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Esse e-mail parece incorreto. Confira e tente de novo.');
        $r['email'] = $email;
    }
    $w = phone(s($b['whatsapp'] ?? '', 30));
    if ($w === '') fail('WhatsApp inválido. Digite com DDD, por exemplo: (62) 99999-9999.');
    $r['whatsapp'] = $w;
    $rank = s($b['rank'] ?? 'Consultor', 20);
    if (!in_array($rank, RANKS, true)) fail('Escolha um rank válido.');
    $r['rank'] = $rank;
    return $r;
}
function novo_slug(): string {
    do { $s = bin2hex(random_bytes(5)); } while (one('SELECT 1 FROM users WHERE slug=?', [$s]));
    return $s;
}
function pros_inc(int $uid, string $campo, int $delta): void {
    if (!in_array($campo, ['chamados', 'interessados', 'vendas'], true)) return;
    $d = hoje();
    q('INSERT OR IGNORE INTO prospeccao(user_id,dia) VALUES(?,?)', [$uid, $d]);
    q("UPDATE prospeccao SET $campo = MAX(0, $campo + ?) WHERE user_id=? AND dia=?", [$delta, $uid, $d]);
}
function config_get(): array {
    $r = one("SELECT valor FROM config WHERE chave='ranks'");
    $j = $r ? json_decode($r['valor'], true) : null;
    return ['ranks' => is_array($j) ? $j : null];
}


/* ---------- Clube de Vantagens, arquivo permanente, histórico e backup ---------- */
function cpf_ok(string $raw): string {
    $c = preg_replace('/\D+/', '', $raw) ?? '';
    if (strlen($c) !== 11 || preg_match('/^(\d)\1{10}$/', $c)) return '';
    for ($t = 9; $t < 11; $t++) {
        $sum = 0; for ($i = 0; $i < $t; $i++) $sum += (int)$c[$i] * ($t + 1 - $i);
        if ((int)$c[$t] !== (((10 * $sum) % 11) % 10)) return '';
    }
    return $c;
}
function nasc_ok(string $v): string {
    if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $v, $m) || !checkdate((int)$m[2], (int)$m[3], (int)$m[1])) return '';
    $idade = (int)date('Y') - (int)$m[1] - ((date('md') < $m[2] . $m[3]) ? 1 : 0);
    return ($idade >= 18 && $idade <= 110) ? $v : '';
}
/* Limpa e valida os campos do Clube. Campo inválido ou vazio vira '' (e não apaga o que já estava salvo). */
function clube_limpa(array $d): array {
    $nome = s($d['nome'] ?? '', 120);
    if (count(preg_split('/\s+/u', $nome, -1, PREG_SPLIT_NO_EMPTY) ?: []) < 2) $nome = '';
    $email = mb_strtolower(s($d['email'] ?? '', 160));
    $cep = preg_replace('/\D+/', '', s($d['cep'] ?? '', 12)) ?? '';
    $uf = strtoupper(s($d['uf'] ?? '', 2));
    return ['nome' => $nome, 'telefone' => phone(s($d['telefone'] ?? '', 40)),
        'email' => filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : '',
        'nascimento' => nasc_ok(s($d['nascimento'] ?? '', 10)), 'cpf' => cpf_ok(s($d['cpf'] ?? '', 20)),
        'cep' => strlen($cep) === 8 ? $cep : '', 'rua' => s($d['rua'] ?? '', 120), 'numero' => s($d['numero'] ?? '', 20),
        'complemento' => s($d['complemento'] ?? '', 80), 'bairro' => s($d['bairro'] ?? '', 80), 'cidade' => s($d['cidade'] ?? '', 80),
        'uf' => in_array($uf, UFS, true) ? $uf : ''];
}
const CLUBE_CAMPOS = ['nome', 'telefone', 'email', 'nascimento', 'cpf', 'cep', 'rua', 'numero', 'bairro', 'cidade', 'uf'];
function semana_ini(?string $dia = null): string {
    $t = strtotime($dia ?? hoje());
    return date('Y-m-d', strtotime('-' . ((int)date('N', $t) - 1) . ' days', $t));
}
function clube_semana(int $uid, ?string $ini = null): int {
    $ini = $ini ?? semana_ini(); $fim = date('Y-m-d', strtotime($ini . ' +6 days'));
    $r = one("SELECT COUNT(DISTINCT cpf) c FROM clube WHERE user_id=? AND completo=1 AND substr(concluido,1,10) BETWEEN ? AND ?", [$uid, $ini, $fim]);
    return (int)($r['c'] ?? 0);
}
/* Nada é apagado de verdade: antes de qualquer exclusão, a cópia vai para o arquivo permanente. */
function arquiva(int $uid, string $tabela, array $row): void {
    q('INSERT INTO arquivo(user_id,tabela,dados,apagado_em) VALUES(?,?,?,?)', [$uid, $tabela, json_encode($row, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE), now()]);
}
function http_get_json(string $url): ?array {
    $raw = false;
    if (function_exists('curl_init')) {
        $ch = curl_init($url); curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 5, CURLOPT_CONNECTTIMEOUT => 3, CURLOPT_PROTOCOLS => CURLPROTO_HTTPS]);
        $raw = curl_exec($ch); curl_close($ch);
    } elseif (ini_get('allow_url_fopen')) {
        $raw = @file_get_contents($url, false, stream_context_create(['http' => ['timeout' => 5]]));
    }
    $j = is_string($raw) ? json_decode($raw, true) : null;
    return is_array($j) ? $j : null;
}
/* Histórico por mês. $uid = null → todos (usado só pelo admin). */
function hist_meses(?int $uid): array {
    $w = $uid ? 'WHERE user_id=?' : ''; $a = $uid ? [$uid] : []; $m = [];
    $z = ['chamados' => 0, 'interessados' => 0, 'vendas' => 0, 'valor' => 0.0, 'pv' => 0.0, 'ana' => 0, 'ana_ok' => 0, 'clube' => 0, 'clube_ok' => 0];
    foreach (all("SELECT substr(dia,1,7) m, SUM(chamados) c, SUM(interessados) i FROM prospeccao $w GROUP BY m", $a) as $r) { $m[$r['m']] = ($m[$r['m']] ?? $z); $m[$r['m']]['chamados'] = (int)$r['c']; $m[$r['m']]['interessados'] = (int)$r['i']; }
    foreach (all("SELECT substr(data,1,7) m, COUNT(*) n, SUM(valor) v, SUM(pv) p FROM vendas $w GROUP BY m", $a) as $r) { $m[$r['m']] = ($m[$r['m']] ?? $z); $m[$r['m']]['vendas'] = (int)$r['n']; $m[$r['m']]['valor'] = (float)$r['v']; $m[$r['m']]['pv'] = (float)$r['p']; }
    foreach (all("SELECT substr(criado,1,7) m, COUNT(*) n, SUM(completo) c FROM ana $w GROUP BY m", $a) as $r) { $m[$r['m']] = ($m[$r['m']] ?? $z); $m[$r['m']]['ana'] = (int)$r['n']; $m[$r['m']]['ana_ok'] = (int)$r['c']; }
    foreach (all("SELECT substr(criado,1,7) m, COUNT(*) n FROM clube $w GROUP BY m", $a) as $r) { $m[$r['m']] = ($m[$r['m']] ?? $z); $m[$r['m']]['clube'] = (int)$r['n']; }
    foreach (all("SELECT substr(concluido,1,7) m, COUNT(DISTINCT cpf) n FROM clube WHERE completo=1 " . ($uid ? 'AND user_id=? ' : '') . "GROUP BY m", $a) as $r) { if ($r['m'] === '') continue; $m[$r['m']] = ($m[$r['m']] ?? $z); $m[$r['m']]['clube_ok'] = (int)$r['n']; }
    $m[date('Y-m')] = $m[date('Y-m')] ?? $z;
    krsort($m);
    $o = []; foreach ($m as $k => $v) { if (preg_match('/^\d{4}-\d{2}$/', (string)$k)) $o[] = ['mes' => $k] + $v; }
    return $o;
}
function csv_texto(array $head, array $rows): string {
    $safe = function ($v): string { $v = (string)($v ?? ''); if ($v !== '' && strpos("=+-@\t\r", $v[0]) !== false) $v = "'" . $v; return '"' . str_replace('"', '""', $v) . '"'; };
    $out = "\xEF\xBB\xBF" . implode(';', array_map($safe, $head)) . "\r\n";
    foreach ($rows as $r) $out .= implode(';', array_map($safe, $r)) . "\r\n";
    return $out;
}
/* Monta o ZIP do backup: banco inteiro + planilhas separadas por mês. Devolve o caminho do arquivo temporário. */
function backup_zip(): string {
    if (!class_exists('ZipArchive')) fail('O servidor não tem a extensão ZIP ativa. Peça à Hostinger para ativar (zip) no PHP.', 500);
    $tmp = tempnam(sys_get_temp_dir(), 'dbk'); $snap = $tmp . '.sqlite'; $zip = new ZipArchive();
    if ($zip->open($tmp, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) fail('Não foi possível montar o backup.', 500);
    $pdo = db();
    try { $pdo->exec('VACUUM INTO ' . $pdo->quote($snap)); } catch (Throwable $e) {
        $dir = DATA_DIR !== '' ? rtrim(DATA_DIR, '/\\') : __DIR__ . '/data'; @copy($dir . '/' . DB_FILE, $snap);
    }
    if (is_file($snap)) $zip->addFile($snap, 'banco/diamante.sqlite');
    $U = 'u.nome AS consultor, u.email AS consultor_email';
    $tabs = [
        'prospeccao' => ["SELECT p.dia, $U, p.chamados, p.interessados, p.vendas FROM prospeccao p JOIN users u ON u.id=p.user_id ORDER BY p.dia", 'dia', ['Dia', 'Consultor', 'E-mail do consultor', 'Chamados', 'Interessados', 'Vendas']],
        'vendas' => ["SELECT v.data, $U, v.cliente, v.whatsapp, v.produto, v.sku, v.qtd, v.valor, v.pv, v.followup, v.fu_status, v.obs FROM vendas v JOIN users u ON u.id=v.user_id ORDER BY v.data", 'data', ['Data', 'Consultor', 'E-mail do consultor', 'Cliente', 'WhatsApp', 'Produto', 'SKU', 'Qtd', 'Valor', 'PV', 'Follow-up', 'Status do follow-up', 'Obs']],
        'anamneses' => ["SELECT a.criado, $U, a.nome, a.whatsapp, a.etapa, a.total, a.completo, a.crm, a.nota, a.dados, a.atualizado FROM ana a JOIN users u ON u.id=a.user_id ORDER BY a.criado", 'criado', ['Criado em', 'Consultor', 'E-mail do consultor', 'Nome', 'WhatsApp', 'Etapa', 'Total de etapas', 'Completa', 'Andamento', 'Anotação', 'Respostas (JSON)', 'Atualizado em']],
        'clube' => ["SELECT c.criado, $U, c.nome, c.telefone, c.email, c.nascimento, c.cpf, c.cep, c.rua, c.numero, c.complemento, c.bairro, c.cidade, c.uf, c.etapa, c.completo, c.concluido, c.consentimento, c.crm, c.nota, c.atualizado FROM clube c JOIN users u ON u.id=c.user_id ORDER BY c.criado", 'criado', ['Criado em', 'Consultor', 'E-mail do consultor', 'Nome', 'Telefone', 'E-mail', 'Nascimento', 'CPF', 'CEP', 'Rua', 'Número', 'Complemento', 'Bairro', 'Cidade', 'UF', 'Etapa', 'Concluiu', 'Concluído em', 'Autorização em', 'Andamento', 'Anotação', 'Atualizado em']],
        'contatos' => ["SELECT le.atualizado, $U, l.nome AS lista, le.nome, le.telefone, le.status, le.obs FROM leads le JOIN listas l ON l.id=le.lista_id JOIN users u ON u.id=le.user_id ORDER BY le.atualizado", 'atualizado', ['Atualizado em', 'Consultor', 'E-mail do consultor', 'Lista', 'Nome', 'Telefone', 'Status', 'Obs']],
        'apagados' => ["SELECT x.apagado_em, $U, x.tabela, x.dados FROM arquivo x LEFT JOIN users u ON u.id=x.user_id ORDER BY x.apagado_em", 'apagado_em', ['Apagado em', 'Consultor', 'E-mail do consultor', 'Tabela', 'Dados (JSON)']],
    ];
    foreach ($tabs as $nome => [$sql, $col, $head]) {
        $rows = all($sql); $porMes = [];
        foreach ($rows as $r) { $porMes[substr((string)($r[$col] ?? ''), 0, 7) ?: 'sem-data'][] = array_values($r); }
        $zip->addFromString("todos/$nome.csv", csv_texto($head, array_map('array_values', $rows)));
        foreach ($porMes as $mes => $lin) $zip->addFromString("mensal/$mes/$nome.csv", csv_texto($head, $lin));
    }
    $zip->addFromString('todos/usuarios.csv', csv_texto(['ID', 'Nome', 'E-mail', 'WhatsApp', 'Rank', 'Perfil', 'Ativa', 'Criada em', 'Último acesso'],
        array_map('array_values', all('SELECT id,nome,email,whatsapp,rank,role,ativo,criado,ultimo_login FROM users ORDER BY id'))));
    $zip->addFromString('LEIA-ME.txt', "BACKUP DIAMANTE APP - " . now() . "\r\n\r\nbanco/diamante.sqlite  = cópia completa do banco (abre no DB Browser for SQLite). Para restaurar, coloque este arquivo na pasta de dados do site com o nome do banco atual.\r\nmensal/AAAA-MM/       = planilhas (CSV) de cada mês: prospecção, vendas, anamneses, clube, contatos e apagados.\r\ntodos/                = as mesmas planilhas com o histórico inteiro.\r\n\r\nATENÇÃO: contém dados pessoais (CPF, endereço, telefone). Guarde em local privado.\r\n");
    $zip->close();
    return $tmp;
}
function backup_envia(): never {
    $tmp = backup_zip(); $snap = $tmp . '.sqlite';
    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="diamante-backup-' . date('Y-m-d_His') . '.zip"');
    header('Content-Length: ' . filesize($tmp));
    readfile($tmp); @unlink($tmp); @unlink($snap); exit;
}

/* ---------- roteamento ---------- */
$a = (string)($_GET['a'] ?? '');
need_csrf();

try {
    switch ($a) {

    /* ===== sessão ===== */
    case 'me': {
        $u = user_atual();
        $setup = !one("SELECT 1 FROM users WHERE role='admin'");
        out(['ok' => true, 'user' => $u ? pub_user($u) : null, 'precisa_setup' => $setup, 'config' => config_get()]);
    }
    case 'setup_admin': {
        if (one("SELECT 1 FROM users WHERE role='admin'")) fail('O administrador já foi configurado.', 403);
        $b = body();
        limite(ip(), 'setup', 10, 3600); registra(ip(), 'setup');
        if (strlen(SETUP_KEY) < 12) fail('A chave de configuração ainda não foi definida no servidor. Veja o LEIA-ME (arquivo config.local.php).', 403);
        if (!hash_equals(SETUP_KEY, (string)($b['chave'] ?? ''))) fail('Chave de configuração incorreta. Ela está no arquivo config.local.php.', 403);
        $d = valida_user($b);
        $pw = (string)($b['senha'] ?? ''); valida_senha($pw);
        if (one('SELECT 1 FROM users WHERE email=?', [$d['email']])) fail('Esse e-mail já está cadastrado.');
        q('INSERT INTO users(nome,email,whatsapp,rank,role,pass_hash,slug,criado) VALUES(?,?,?,?,?,?,?,?)',
          [$d['nome'], $d['email'], $d['whatsapp'], $d['rank'], 'admin', password_hash($pw, PASSWORD_DEFAULT), novo_slug(), now()]);
        abre_sessao((int)db()->lastInsertId());
        out(['ok' => true]);
    }
    case 'register': {
        $b = body();
        limite(ip(), 'reg', 12, 3600); registra(ip(), 'reg');
        $d = valida_user($b);
        $pw = (string)($b['senha'] ?? ''); valida_senha($pw);
        if (one('SELECT 1 FROM users WHERE email=?', [$d['email']])) fail('Esse e-mail já tem conta. Toque em "Já tenho conta" para entrar.');
        q('INSERT INTO users(nome,email,whatsapp,rank,role,pass_hash,slug,criado) VALUES(?,?,?,?,?,?,?,?)',
          [$d['nome'], $d['email'], $d['whatsapp'], $d['rank'], 'user', password_hash($pw, PASSWORD_DEFAULT), novo_slug(), now()]);
        abre_sessao((int)db()->lastInsertId());
        out(['ok' => true]);
    }
    case 'login': {
        $b = body();
        $email = mb_strtolower(s($b['email'] ?? '', 160));
        $pw = (string)($b['senha'] ?? '');
        limite($email, 'login', 6, 900); limite(ip(), 'login', 30, 900);
        $u = $email !== '' ? one('SELECT * FROM users WHERE email=?', [$email]) : null;
        if (!$u || !password_verify($pw, $u['pass_hash'])) {
            registra($email, 'login'); registra(ip(), 'login');
            fail('E-mail ou senha incorretos.', 401);
        }
        if (!(int)$u['ativo']) fail('Esta conta está desativada. Fale com o administrador.', 403);
        if (password_needs_rehash($u['pass_hash'], PASSWORD_DEFAULT)) q('UPDATE users SET pass_hash=? WHERE id=?', [password_hash($pw, PASSWORD_DEFAULT), $u['id']]);
        q('DELETE FROM tentativas WHERE chave=? AND tipo=?', [$email, 'login']);
        abre_sessao((int)$u['id']);
        out(['ok' => true]);
    }
    case 'logout': {
        $t = $_COOKIE['dsid'] ?? '';
        if (is_string($t) && preg_match('/^[a-f0-9]{64}$/', $t)) q('DELETE FROM sessions WHERE h=?', [hash('sha256', $t)]);
        set_cookie_sessao('', time() - 3600);
        out(['ok' => true]);
    }
    case 'perfil_salvar': {
        $u = need_user(); $b = body();
        $d = valida_user($b, false);
        q('UPDATE users SET nome=?, whatsapp=?, rank=? WHERE id=?', [$d['nome'], $d['whatsapp'], $d['rank'], $u['id']]);
        out(['ok' => true, 'user' => pub_user(one('SELECT * FROM users WHERE id=?', [$u['id']]))]);
    }
    case 'senha_trocar': {
        $u = need_user(); $b = body();
        limite((string)$u['id'], 'senha', 8, 900); registra((string)$u['id'], 'senha');
        if (!password_verify((string)($b['atual'] ?? ''), $u['pass_hash'])) fail('A senha atual está incorreta.');
        $nova = (string)($b['nova'] ?? ''); valida_senha($nova);
        q('UPDATE users SET pass_hash=? WHERE id=?', [password_hash($nova, PASSWORD_DEFAULT), $u['id']]);
        $t = $_COOKIE['dsid'] ?? '';
        q('DELETE FROM sessions WHERE user_id=? AND h<>?', [$u['id'], hash('sha256', (string)$t)]);
        out(['ok' => true]);
    }

    /* ===== resumo da tela inicial ===== */
    case 'resumo': {
        $u = need_user(); $uid = (int)$u['id'];
        $p = one('SELECT chamados,interessados,vendas FROM prospeccao WHERE user_id=? AND dia=?', [$uid, hoje()]) ?: ['chamados' => 0, 'interessados' => 0, 'vendas' => 0];
        $fu = one("SELECT COUNT(*) c FROM vendas WHERE user_id=? AND fu_status='pendente' AND followup<>'' AND followup<=?", [$uid, hoje()]);
        $baixo = one('SELECT COUNT(*) c FROM estoque WHERE user_id=? AND qtd<=minimo', [$uid]);
        $leads = one("SELECT COUNT(*) c FROM leads WHERE user_id=? AND status='novo'", [$uid]);
        $ana = one("SELECT COUNT(*) c FROM ana WHERE user_id=? AND crm='novo'", [$uid]);
        $cl = one("SELECT COUNT(*) c FROM clube WHERE user_id=? AND completo=1 AND crm='novo'", [$uid]);
        out(['ok' => true, 'hoje' => $p,
            'followups' => (int)$fu['c'], 'estoque_baixo' => (int)$baixo['c'], 'leads_novos' => (int)$leads['c'], 'ana_novas' => (int)$ana['c'],
            'clube_semana' => clube_semana($uid), 'clube_meta' => CLUBE_META_SEMANA, 'clube_novos' => (int)$cl['c']]);
    }

    /* ===== listas e leads ===== */
    case 'listas': {
        $u = need_user();
        $r = all("SELECT l.id, l.nome, l.criado,
            COUNT(le.id) total,
            SUM(CASE WHEN le.status='novo' THEN 1 ELSE 0 END) novos,
            SUM(CASE WHEN le.status='interessado' THEN 1 ELSE 0 END) interessados,
            SUM(CASE WHEN le.status='cliente' THEN 1 ELSE 0 END) clientes
            FROM listas l LEFT JOIN leads le ON le.lista_id=l.id WHERE l.user_id=? GROUP BY l.id ORDER BY l.id DESC", [$u['id']]);
        out(['ok' => true, 'listas' => $r]);
    }
    case 'lista_criar': {
        $u = need_user(); $b = body();
        $nome = s($b['nome'] ?? '', 80);
        if ($nome === '') fail('Dê um nome para a lista (ex.: "Amigos da igreja").');
        $cs = $b['contatos'] ?? [];
        if (!is_array($cs) || !count($cs)) fail('Nenhum contato para importar.');
        if (count($cs) > 3000) fail('Importe no máximo 3.000 contatos por lista.');
        $pdo = db(); $pdo->beginTransaction();
        try {
            q('INSERT INTO listas(user_id,nome,criado) VALUES(?,?,?)', [$u['id'], $nome, now()]);
            $lid = (int)$pdo->lastInsertId();
            $vistos = []; $ok = 0; $inval = 0; $dup = 0;
            $ins = $pdo->prepare('INSERT INTO leads(user_id,lista_id,nome,telefone,atualizado) VALUES(?,?,?,?,?)');
            foreach ($cs as $c) {
                if (!is_array($c)) continue;
                $nm = s($c['nome'] ?? '', 100); $tel = phone(s($c['telefone'] ?? '', 40));
                if ($nm === '' || $tel === '') { $inval++; continue; }
                if (isset($vistos[$tel])) { $dup++; continue; }
                $vistos[$tel] = 1; $ins->execute([$u['id'], $lid, $nm, $tel, now()]); $ok++;
            }
            if ($ok === 0) { $pdo->rollBack(); fail('Nenhum contato válido encontrado. Confira se os telefones têm DDD.'); }
            $pdo->commit();
        } catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $e; }
        out(['ok' => true, 'id' => $lid, 'importados' => $ok, 'invalidos' => $inval, 'duplicados' => $dup]);
    }
    case 'lista_apagar': {
        $u = need_user(); $b = body();
        $lid = (int)($b['id'] ?? 0);
        if ($l = one('SELECT * FROM listas WHERE id=? AND user_id=?', [$lid, $u['id']])) {
            arquiva((int)$u['id'], 'listas', $l);
            foreach (all('SELECT * FROM leads WHERE lista_id=? AND user_id=?', [$lid, $u['id']]) as $x) arquiva((int)$u['id'], 'leads', $x);
            q('DELETE FROM listas WHERE id=? AND user_id=?', [$lid, $u['id']]);
        }
        out(['ok' => true]);
    }
    case 'leads': {
        $u = need_user(); $b = body();
        $lid = (int)($b['lista_id'] ?? 0);
        if (!one('SELECT 1 FROM listas WHERE id=? AND user_id=?', [$lid, $u['id']])) fail('Lista não encontrada.', 404);
        out(['ok' => true, 'leads' => all('SELECT id,nome,telefone,status,obs FROM leads WHERE lista_id=? AND user_id=? ORDER BY id', [$lid, $u['id']])]);
    }
    case 'lead_status': {
        $u = need_user(); $b = body();
        $id = (int)($b['id'] ?? 0); $st = s($b['status'] ?? '', 20);
        if (!in_array($st, LEAD_STATUS, true)) fail('Status inválido.');
        $l = one('SELECT * FROM leads WHERE id=? AND user_id=?', [$id, $u['id']]);
        if (!$l) fail('Contato não encontrado.', 404);
        $antes = $l['status'];
        $obs = array_key_exists('obs', $b) ? s($b['obs'], 500) : $l['obs'];
        q('UPDATE leads SET status=?, obs=?, atualizado=? WHERE id=?', [$st, $obs, now(), $id]);
        if ($antes === 'novo' && $st !== 'novo') pros_inc((int)$u['id'], 'chamados', 1);
        $int = ['interessado', 'cliente'];
        if (!in_array($antes, $int, true) && in_array($st, $int, true)) pros_inc((int)$u['id'], 'interessados', 1);
        out(['ok' => true]);
    }

    /* ===== prospecção diária ===== */
    case 'pros': {
        $u = need_user();
        $r = all('SELECT dia,chamados,interessados,vendas FROM prospeccao WHERE user_id=? AND dia>=? ORDER BY dia', [$u['id'], date('Y-m-d', strtotime('-29 days'))]);
        out(['ok' => true, 'dias' => $r, 'hoje' => hoje()]);
    }
    case 'pros_ajusta': {
        $u = need_user(); $b = body();
        $c = s($b['campo'] ?? '', 20); $d = (int)($b['delta'] ?? 0);
        if (!in_array($c, ['chamados', 'interessados', 'vendas'], true) || ($d !== 1 && $d !== -1)) fail('Pedido inválido.');
        pros_inc((int)$u['id'], $c, $d);
        out(['ok' => true]);
    }

    /* ===== vendas e follow-up ===== */
    case 'venda_add': {
        $u = need_user(); $b = body();
        $cliente = s($b['cliente'] ?? '', 100); $produto = s($b['produto'] ?? '', 160);
        if ($cliente === '') fail('Digite o nome do cliente.');
        if ($produto === '') fail('Escolha o produto vendido.');
        $qtd = (int)n($b['qtd'] ?? 1, 1, 999);
        $valor = n($b['valor'] ?? 0, 0, 1000000); $pv = n($b['pv'] ?? 0, 0, 100000);
        $dias = (int)n($b['dias'] ?? 30, 0, 365);
        $data = s($b['data'] ?? hoje(), 10);
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $data) || !strtotime($data)) fail('Data inválida.');
        $tel = trim((string)($b['whatsapp'] ?? '')) === '' ? '' : phone(s($b['whatsapp'], 40));
        if (trim((string)($b['whatsapp'] ?? '')) !== '' && $tel === '') fail('WhatsApp do cliente inválido (use DDD).');
        $sku = s($b['sku'] ?? '', 20);
        $fu = $dias > 0 ? date('Y-m-d', strtotime($data . " +$dias days")) : '';
        q('INSERT INTO vendas(user_id,cliente,whatsapp,sku,produto,qtd,valor,pv,data,dias,followup,obs) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
          [$u['id'], $cliente, $tel, $sku, $produto, $qtd, $valor, $pv, $data, $dias, $fu, s($b['obs'] ?? '', 300)]);
        $id = (int)db()->lastInsertId();
        if (!empty($b['baixar_estoque']) && $sku !== '') q('UPDATE estoque SET qtd=MAX(0,qtd-?) WHERE user_id=? AND sku=?', [$qtd, $u['id'], $sku]);
        if ($data === hoje()) pros_inc((int)$u['id'], 'vendas', 1);
        out(['ok' => true, 'id' => $id, 'followup' => $fu]);
    }
    case 'vendas': {
        $u = need_user();
        out(['ok' => true, 'vendas' => all('SELECT * FROM vendas WHERE user_id=? ORDER BY data DESC, id DESC LIMIT 400', [$u['id']])]);
    }
    case 'venda_apagar': {
        $u = need_user(); $b = body();
        if ($v = one('SELECT * FROM vendas WHERE id=? AND user_id=?', [(int)($b['id'] ?? 0), $u['id']])) { arquiva((int)$u['id'], 'vendas', $v); q('DELETE FROM vendas WHERE id=? AND user_id=?', [$v['id'], $u['id']]); }
        out(['ok' => true]);
    }
    case 'followup': {
        $u = need_user(); $b = body();
        $id = (int)($b['id'] ?? 0); $ac = s($b['acao'] ?? '', 10);
        $v = one('SELECT * FROM vendas WHERE id=? AND user_id=?', [$id, $u['id']]);
        if (!$v) fail('Venda não encontrada.', 404);
        if ($ac === 'feito') q("UPDATE vendas SET fu_status='feito' WHERE id=?", [$id]);
        elseif ($ac === 'adiar') {
            $d = (int)n($b['dias'] ?? 7, 1, 180);
            q("UPDATE vendas SET followup=?, fu_status='pendente' WHERE id=?", [date('Y-m-d', strtotime("+$d days")), $id]);
        } else fail('Ação inválida.');
        out(['ok' => true]);
    }

    /* ===== estoque ===== */
    case 'estoque': {
        $u = need_user();
        out(['ok' => true, 'itens' => all('SELECT sku,nome,qtd,minimo FROM estoque WHERE user_id=? ORDER BY nome', [$u['id']])]);
    }
    case 'estoque_salvar': {
        $u = need_user(); $b = body();
        $sku = s($b['sku'] ?? '', 20); $nome = s($b['nome'] ?? '', 160);
        if ($sku === '' || $nome === '') fail('Produto inválido.');
        $qtd = (int)n($b['qtd'] ?? 0, 0, 99999); $min = (int)n($b['minimo'] ?? 1, 0, 99999);
        q('INSERT INTO estoque(user_id,sku,nome,qtd,minimo) VALUES(?,?,?,?,?) ON CONFLICT(user_id,sku) DO UPDATE SET nome=excluded.nome, qtd=excluded.qtd, minimo=excluded.minimo',
          [$u['id'], $sku, $nome, $qtd, $min]);
        out(['ok' => true]);
    }
    case 'estoque_apagar': {
        $u = need_user(); $b = body();
        q('DELETE FROM estoque WHERE user_id=? AND sku=?', [$u['id'], s($b['sku'] ?? '', 20)]);
        out(['ok' => true]);
    }

    /* ===== anamnese: lado do consultor ===== */
    case 'ana_lista': {
        $u = need_user();
        $r = all('SELECT id,nome,whatsapp,etapa,total,completo,dados,crm,nota,criado,atualizado FROM ana WHERE user_id=? ORDER BY atualizado DESC LIMIT 500', [$u['id']]);
        foreach ($r as &$x) { $x['dados'] = json_decode($x['dados'], true) ?: new stdClass(); }
        out(['ok' => true, 'itens' => $r]);
    }
    case 'ana_crm': {
        $u = need_user(); $b = body();
        $st = s($b['crm'] ?? '', 20);
        if (!in_array($st, CRM_STATUS, true)) fail('Status inválido.');
        q('UPDATE ana SET crm=?, nota=? WHERE id=? AND user_id=?', [$st, s($b['nota'] ?? '', 800), (int)($b['id'] ?? 0), $u['id']]);
        out(['ok' => true]);
    }
    case 'ana_apagar': {
        $u = need_user(); $b = body();
        if ($x = one('SELECT * FROM ana WHERE id=? AND user_id=?', [(int)($b['id'] ?? 0), $u['id']])) { arquiva((int)$u['id'], 'ana', $x); q('DELETE FROM ana WHERE id=? AND user_id=?', [$x['id'], $u['id']]); }
        out(['ok' => true]);
    }
    case 'depo_lista': {
        $u = need_user();
        out(['ok' => true, 'itens' => all('SELECT id,tema,texto,autor FROM depoimentos WHERE user_id=? ORDER BY id DESC', [$u['id']])]);
    }
    case 'depo_salvar': {
        $u = need_user(); $b = body();
        $tema = s($b['tema'] ?? '', 30); $texto = s($b['texto'] ?? '', 500);
        if ($tema === '' || $texto === '') fail('Escolha o tema e escreva o depoimento.');
        if (one('SELECT COUNT(*) c FROM depoimentos WHERE user_id=?', [$u['id']])['c'] >= 60) fail('Limite de 60 depoimentos.');
        q('INSERT INTO depoimentos(user_id,tema,texto,autor) VALUES(?,?,?,?)', [$u['id'], $tema, $texto, s($b['autor'] ?? '', 60)]);
        out(['ok' => true]);
    }
    case 'depo_apagar': {
        $u = need_user(); $b = body();
        if ($x = one('SELECT * FROM depoimentos WHERE id=? AND user_id=?', [(int)($b['id'] ?? 0), $u['id']])) { arquiva((int)$u['id'], 'depoimentos', $x); q('DELETE FROM depoimentos WHERE id=? AND user_id=?', [$x['id'], $u['id']]); }
        out(['ok' => true]);
    }

    /* ===== anamnese: lado público (quem responde) ===== */
    case 'ana_info': {
        $slug = s($_GET['c'] ?? '', 20);
        $c = $slug !== '' ? one('SELECT id,nome,whatsapp,rank FROM users WHERE slug=? AND ativo=1', [$slug]) : null;
        if (!$c) fail('Link inválido ou expirado.', 404);
        $primeiro = explode(' ', trim($c['nome']))[0];
        out(['ok' => true, 'consultor' => $primeiro, 'whatsapp' => $c['whatsapp'], 'rank' => $c['rank'],
             'depoimentos' => all('SELECT tema,texto,autor FROM depoimentos WHERE user_id=?', [$c['id']])]);
    }
    case 'ana_salvar': {
        $b = body();
        limite(ip(), 'ana', 600, 3600); registra(ip(), 'ana');
        $slug = s($b['c'] ?? '', 20);
        $c = $slug !== '' ? one('SELECT id FROM users WHERE slug=? AND ativo=1', [$slug]) : null;
        if (!$c) fail('Link inválido.', 404);
        $sid = (string)($b['sid'] ?? '');
        if (!preg_match('/^[A-Za-z0-9]{16,40}$/', $sid)) fail('Sessão inválida.');
        $dados = $b['dados'] ?? [];
        if (!is_array($dados)) $dados = [];
        $json = json_encode($dados, JSON_UNESCAPED_UNICODE);
        if ($json === false || strlen($json) > 60000) fail('Respostas grandes demais.');
        if (!in_array('sim', is_array($dados['aceite'] ?? null) ? $dados['aceite'] : [], true)) fail('Para continuar, autorize o uso das suas respostas.');
        $nome = s($dados['nome'] ?? '', 80); $tel = phone(s($dados['whatsapp'] ?? '', 40));
        $etapa = (int)n($b['etapa'] ?? 0, 0, 100); $total = (int)n($b['total'] ?? 0, 0, 100);
        $comp = !empty($b['completo']) ? 1 : 0;
        $ex = one('SELECT id,etapa,completo FROM ana WHERE user_id=? AND sid=?', [$c['id'], $sid]);
        if ($ex) {
            q('UPDATE ana SET nome=?, whatsapp=?, etapa=?, total=?, completo=?, dados=?, atualizado=? WHERE id=?',
              [$nome, $tel, max((int)$ex['etapa'], $etapa), $total, max((int)$ex['completo'], $comp), $json, now(), $ex['id']]);
        } else {
            q('INSERT INTO ana(user_id,sid,nome,whatsapp,etapa,total,completo,dados,criado,atualizado) VALUES(?,?,?,?,?,?,?,?,?,?)',
              [$c['id'], $sid, $nome, $tel, $etapa, $total, $comp, $json, now(), now()]);
        }
        out(['ok' => true]);
    }


    /* ===== Clube de Vantagens: lado do consultor ===== */
    case 'clube_lista': {
        $u = need_user(); $uid = (int)$u['id'];
        $r = all("SELECT id,nome,telefone,email,nascimento,cpf,cep,rua,numero,complemento,bairro,cidade,uf,etapa,total,completo,concluido,crm,nota,criado,atualizado FROM clube WHERE user_id=? ORDER BY atualizado DESC LIMIT 500", [$uid]);
        $ini = semana_ini(); $semanas = [];
        for ($i = 7; $i >= 0; $i--) { $w = date('Y-m-d', strtotime("$ini -" . (7 * $i) . ' days')); $semanas[] = ['inicio' => $w, 'concluidos' => clube_semana($uid, $w)]; }
        out(['ok' => true, 'itens' => $r, 'semana' => ['inicio' => $ini, 'fim' => date('Y-m-d', strtotime($ini . ' +6 days')), 'concluidos' => clube_semana($uid), 'meta' => CLUBE_META_SEMANA], 'semanas' => $semanas]);
    }
    case 'clube_crm': {
        $u = need_user(); $b = body();
        $st = s($b['crm'] ?? '', 20);
        if (!in_array($st, CRM_STATUS, true)) fail('Status inválido.');
        q('UPDATE clube SET crm=?, nota=? WHERE id=? AND user_id=?', [$st, s($b['nota'] ?? '', 800), (int)($b['id'] ?? 0), $u['id']]);
        out(['ok' => true]);
    }
    case 'clube_apagar': {
        $u = need_user(); $b = body();
        if ($x = one('SELECT * FROM clube WHERE id=? AND user_id=?', [(int)($b['id'] ?? 0), $u['id']])) { arquiva((int)$u['id'], 'clube', $x); q('DELETE FROM clube WHERE id=? AND user_id=?', [$x['id'], $u['id']]); }
        out(['ok' => true]);
    }

    /* ===== Clube de Vantagens: lado público (quem faz a inscrição) ===== */
    case 'clube_info': {
        $slug = s($_GET['c'] ?? '', 20);
        $c = $slug !== '' ? one('SELECT nome,whatsapp FROM users WHERE slug=? AND ativo=1', [$slug]) : null;
        if (!$c) fail('Link inválido ou expirado.', 404);
        out(['ok' => true, 'consultor' => explode(' ', trim($c['nome']))[0], 'whatsapp' => $c['whatsapp']]);
    }
    case 'clube_cep': {
        $b = body();
        limite(ip(), 'cep', 60, 3600); registra(ip(), 'cep');
        $cep = preg_replace('/\D+/', '', s($b['cep'] ?? '', 12)) ?? '';
        if (strlen($cep) !== 8) fail('CEP inválido.');
        $j = http_get_json('https://viacep.com.br/ws/' . $cep . '/json/');
        if (!$j || !empty($j['erro'])) fail('Não encontramos esse CEP. Preencha o endereço manualmente.', 404);
        out(['ok' => true, 'rua' => s($j['logradouro'] ?? '', 120), 'bairro' => s($j['bairro'] ?? '', 80), 'cidade' => s($j['localidade'] ?? '', 80), 'uf' => s($j['uf'] ?? '', 2)]);
    }
    case 'clube_salvar': {
        $b = body();
        limite(ip(), 'clube', 200, 3600); registra(ip(), 'clube');
        $slug = s($b['c'] ?? '', 20);
        $c = $slug !== '' ? one('SELECT id FROM users WHERE slug=? AND ativo=1', [$slug]) : null;
        if (!$c) fail('Link inválido.', 404);
        $sid = (string)($b['sid'] ?? '');
        if (!preg_match('/^[A-Za-z0-9]{16,40}$/', $sid)) fail('Sessão inválida.');
        $f = clube_limpa(is_array($b['dados'] ?? null) ? $b['dados'] : []);
        $f['complemento'] = s(($b['dados']['complemento'] ?? ''), 80);
        $ex = one('SELECT * FROM clube WHERE user_id=? AND sid=?', [$c['id'], $sid]);
        if (!$ex) {
            if (empty($b['consent'])) fail('Para continuar, autorize o uso dos seus dados.');
            if ($f['nome'] === '') fail('Digite seu nome completo para continuar.');
        }
        $senha = (string)($b['senha'] ?? ''); $hash = $ex['pass_hash'] ?? '';
        if ($senha !== '') { valida_senha($senha); $hash = password_hash($senha, PASSWORD_DEFAULT); }
        $m = []; foreach (array_merge(CLUBE_CAMPOS, ['complemento']) as $k) $m[$k] = $f[$k] !== '' ? $f[$k] : ($ex[$k] ?? '');
        $etapa = (int)n($b['etapa'] ?? 0, 0, 20); $total = (int)n($b['total'] ?? 0, 0, 20);
        $comp = (int)($ex['completo'] ?? 0); $conc = (string)($ex['concluido'] ?? '');
        if (!empty($b['completo']) && !$comp) {
            $falta = []; foreach (['nome' => 'nome completo', 'telefone' => 'telefone', 'email' => 'e-mail', 'nascimento' => 'data de nascimento (18 anos ou mais)', 'cpf' => 'CPF',
                'cep' => 'CEP', 'rua' => 'rua', 'numero' => 'número', 'bairro' => 'bairro', 'cidade' => 'cidade', 'uf' => 'estado'] as $k => $rot) if ($m[$k] === '') $falta[] = $rot;
            if ($hash === '') $falta[] = 'senha';
            if ($falta) fail('Ainda falta preencher: ' . implode(', ', $falta) . '.');
            $comp = 1; $conc = now();
        }
        if ($ex) {
            q('UPDATE clube SET nome=?,telefone=?,email=?,nascimento=?,cpf=?,pass_hash=?,cep=?,rua=?,numero=?,complemento=?,bairro=?,cidade=?,uf=?,etapa=?,total=?,completo=?,concluido=?,atualizado=? WHERE id=?',
              [$m['nome'], $m['telefone'], $m['email'], $m['nascimento'], $m['cpf'], $hash, $m['cep'], $m['rua'], $m['numero'], $m['complemento'], $m['bairro'], $m['cidade'], $m['uf'],
               max((int)$ex['etapa'], $etapa), $total, $comp, $conc, now(), $ex['id']]);
        } else {
            q('INSERT INTO clube(user_id,sid,nome,telefone,email,nascimento,cpf,pass_hash,cep,rua,numero,complemento,bairro,cidade,uf,etapa,total,completo,concluido,consentimento,criado,atualizado) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
              [$c['id'], $sid, $m['nome'], $m['telefone'], $m['email'], $m['nascimento'], $m['cpf'], $hash, $m['cep'], $m['rua'], $m['numero'], $m['complemento'], $m['bairro'], $m['cidade'], $m['uf'],
               $etapa, $total, $comp, $conc, now(), now(), now()]);
        }
        if ($senha !== '' && ($enc = senha_cifra($senha)) !== '') q('UPDATE clube SET pass_enc=? WHERE user_id=? AND sid=?', [$enc, $c['id'], $sid]);
        out(['ok' => true, 'tem_senha' => $hash !== '', 'concluido' => (bool)$comp]);
    }

    /* ===== histórico por mês (cada consultor vê o seu) ===== */
    case 'historico': {
        $u = need_user();
        out(['ok' => true, 'meses' => hist_meses((int)$u['id'])]);
    }

    /* ===== admin: Clube de Vantagens de todos + senha do inscrito ===== */
    case 'admin_clube': {
        need_admin();
        $r = all("SELECT c.id, u.nome AS consultor, c.nome, c.telefone, c.email, c.cpf, c.completo, c.concluido, c.etapa, c.total, c.atualizado,
                  (c.pass_enc<>'') AS tem_senha, (c.pass_hash<>'') AS definiu_senha FROM clube c JOIN users u ON u.id=c.user_id ORDER BY c.atualizado DESC LIMIT 1000");
        out(['ok' => true, 'itens' => $r, 'chave_ok' => dados_key() !== '']);
    }
    case 'admin_clube_senha': {
        $adm = need_admin(); $b = body();
        limite(ip(), 'cs', 60, 3600); registra(ip(), 'cs');
        $x = one('SELECT nome,pass_enc FROM clube WHERE id=?', [(int)($b['id'] ?? 0)]);
        if (!$x) fail('Inscrito não encontrado.', 404);
        $p = $x['pass_enc'] !== '' ? senha_decifra($x['pass_enc']) : null;
        if ($p === null) fail('Esta senha não está disponível (a inscrição é anterior ao recurso, ou a DADOS_KEY foi alterada).', 404);
        out(['ok' => true, 'nome' => $x['nome'], 'senha' => $p]);
    }

    /* ===== admin ===== */
    case 'admin_users': {
        need_admin();
        $mes = date('Y-m'); $d30 = date('Y-m-d', strtotime('-29 days'));
        $us = all('SELECT * FROM users ORDER BY role DESC, nome');
        $lista = [];
        foreach ($us as $x) {
            $id = (int)$x['id'];
            $p = one('SELECT COALESCE(SUM(chamados),0) c, COALESCE(SUM(interessados),0) i, COALESCE(SUM(vendas),0) v FROM prospeccao WHERE user_id=? AND dia>=?', [$id, $d30]);
            $h = one('SELECT COALESCE(chamados,0) c FROM prospeccao WHERE user_id=? AND dia=?', [$id, hoje()]);
            $v = one("SELECT COALESCE(SUM(pv),0) pv, COALESCE(SUM(valor),0) valor FROM vendas WHERE user_id=? AND substr(data,1,7)=?", [$id, $mes]);
            $an = one('SELECT COUNT(*) t, COALESCE(SUM(completo),0) c FROM ana WHERE user_id=?', [$id]);
            $ld = one('SELECT COUNT(*) c FROM leads WHERE user_id=?', [$id]);
            $fu = one("SELECT COUNT(*) c FROM vendas WHERE user_id=? AND fu_status='pendente' AND followup<>'' AND followup<=?", [$id, hoje()]);
            $lista[] = pub_user($x) + ['chamados_hoje' => (int)($h['c'] ?? 0), 'chamados_30d' => (int)$p['c'], 'interessados_30d' => (int)$p['i'], 'vendas_30d' => (int)$p['v'],
                'pv_mes' => (float)$v['pv'], 'valor_mes' => (float)$v['valor'], 'ana_total' => (int)$an['t'], 'ana_completas' => (int)$an['c'],
                'contatos' => (int)$ld['c'], 'followups_atrasados' => (int)$fu['c'], 'clube_semana' => clube_semana($id), 'clube_total' => (int)one('SELECT COUNT(DISTINCT cpf) c FROM clube WHERE user_id=? AND completo=1', [$id])['c']];
        }
        out(['ok' => true, 'usuarios' => $lista]);
    }
    case 'admin_user': {
        need_admin(); $b = body(); $id = (int)($b['id'] ?? 0);
        $x = one('SELECT * FROM users WHERE id=?', [$id]);
        if (!$x) fail('Usuário não encontrado.', 404);
        out(['ok' => true, 'user' => pub_user($x),
            'dias' => all('SELECT dia,chamados,interessados,vendas FROM prospeccao WHERE user_id=? AND dia>=? ORDER BY dia DESC', [$id, date('Y-m-d', strtotime('-29 days'))]),
            'vendas' => all('SELECT data,cliente,produto,qtd,valor,pv FROM vendas WHERE user_id=? ORDER BY data DESC, id DESC LIMIT 30', [$id]),
            'listas' => all("SELECT l.nome, COUNT(le.id) total, COALESCE(SUM(CASE WHEN le.status='novo' THEN 0 ELSE 1 END),0) trabalhados FROM listas l LEFT JOIN leads le ON le.lista_id=l.id WHERE l.user_id=? GROUP BY l.id", [$id]),
            'ana' => all('SELECT nome,completo,etapa,total,atualizado,crm FROM ana WHERE user_id=? ORDER BY atualizado DESC LIMIT 30', [$id])]);
    }
    case 'admin_salvar': {
        $adm = need_admin(); $b = body(); $id = (int)($b['id'] ?? 0);
        $x = one('SELECT * FROM users WHERE id=?', [$id]);
        if (!$x) fail('Usuário não encontrado.', 404);
        $d = valida_user($b);
        if (($d['email'] !== $x['email']) && one('SELECT 1 FROM users WHERE email=? AND id<>?', [$d['email'], $id])) fail('Esse e-mail já pertence a outra conta.');
        $ativo = !empty($b['ativo']) ? 1 : 0;
        $role = ($b['role'] ?? $x['role']) === 'admin' ? 'admin' : 'user';
        if ($id === (int)$adm['id'] && (!$ativo || $role !== 'admin')) fail('Você não pode desativar nem rebaixar a sua própria conta de administrador.');
        q('UPDATE users SET nome=?, email=?, whatsapp=?, rank=?, ativo=?, role=? WHERE id=?', [$d['nome'], $d['email'], $d['whatsapp'], $d['rank'], $ativo, $role, $id]);
        if (!$ativo) q('DELETE FROM sessions WHERE user_id=?', [$id]);
        out(['ok' => true]);
    }
    case 'admin_senha': {
        need_admin(); $b = body(); $id = (int)($b['id'] ?? 0);
        if (!one('SELECT 1 FROM users WHERE id=?', [$id])) fail('Usuário não encontrado.', 404);
        $nova = (string)($b['senha'] ?? ''); valida_senha($nova);
        q('UPDATE users SET pass_hash=? WHERE id=?', [password_hash($nova, PASSWORD_DEFAULT), $id]);
        q('DELETE FROM sessions WHERE user_id=?', [$id]);
        q('DELETE FROM tentativas');
        out(['ok' => true]);
    }
    case 'admin_apagar': {
        need_admin();
        fail('Por segurança, nenhuma conta é apagada: todos os dados ficam guardados para sempre. Desative a conta em "Conta ativa".', 403);
    }

    case 'admin_historico': {
        need_admin(); $b = body();
        $mes = s($b['mes'] ?? date('Y-m'), 7);
        if (!preg_match('/^\d{4}-\d{2}$/', $mes)) fail('Mês inválido.');
        $us = all('SELECT id,nome,email,rank,ativo FROM users ORDER BY nome'); $z = [];
        foreach ($us as $x) $z[(int)$x['id']] = ['id' => (int)$x['id'], 'nome' => $x['nome'], 'email' => $x['email'], 'rank' => $x['rank'], 'ativo' => (int)$x['ativo'],
            'chamados' => 0, 'interessados' => 0, 'vendas' => 0, 'valor' => 0.0, 'pv' => 0.0, 'ana' => 0, 'ana_ok' => 0, 'clube' => 0, 'clube_ok' => 0];
        foreach (all('SELECT user_id, SUM(chamados) c, SUM(interessados) i FROM prospeccao WHERE substr(dia,1,7)=? GROUP BY user_id', [$mes]) as $r) if (isset($z[$r['user_id']])) { $z[$r['user_id']]['chamados'] = (int)$r['c']; $z[$r['user_id']]['interessados'] = (int)$r['i']; }
        foreach (all('SELECT user_id, COUNT(*) n, SUM(valor) v, SUM(pv) p FROM vendas WHERE substr(data,1,7)=? GROUP BY user_id', [$mes]) as $r) if (isset($z[$r['user_id']])) { $z[$r['user_id']]['vendas'] = (int)$r['n']; $z[$r['user_id']]['valor'] = (float)$r['v']; $z[$r['user_id']]['pv'] = (float)$r['p']; }
        foreach (all('SELECT user_id, COUNT(*) n, SUM(completo) c FROM ana WHERE substr(criado,1,7)=? GROUP BY user_id', [$mes]) as $r) if (isset($z[$r['user_id']])) { $z[$r['user_id']]['ana'] = (int)$r['n']; $z[$r['user_id']]['ana_ok'] = (int)$r['c']; }
        foreach (all('SELECT user_id, COUNT(*) n FROM clube WHERE substr(criado,1,7)=? GROUP BY user_id', [$mes]) as $r) if (isset($z[$r['user_id']])) $z[$r['user_id']]['clube'] = (int)$r['n'];
        foreach (all('SELECT user_id, COUNT(DISTINCT cpf) n FROM clube WHERE completo=1 AND substr(concluido,1,7)=? GROUP BY user_id', [$mes]) as $r) if (isset($z[$r['user_id']])) $z[$r['user_id']]['clube_ok'] = (int)$r['n'];
        out(['ok' => true, 'mes' => $mes, 'meses' => array_column(hist_meses(null), 'mes'), 'usuarios' => array_values($z)]);
    }
    case 'admin_backup_status': {
        need_admin();
        $r = one("SELECT valor FROM config WHERE chave='ultimo_backup_auto'");
        out(['ok' => true, 'ultimo_auto' => $r ? $r['valor'] : '', 'token_ok' => strlen(BACKUP_TOKEN) >= 32]);
    }
    case 'admin_backup': {   // download manual (GET, precisa estar logado como admin)
        need_admin();
        backup_envia();
    }
    case 'backup_auto': {    // download automático por token (PC / Google Drive). Só GET, token no cabeçalho.
        limite(ip(), 'bk', 10, 3600);
        $t = (string)($_SERVER['HTTP_X_BACKUP_TOKEN'] ?? '');
        if (strlen(BACKUP_TOKEN) < 32 || !hash_equals(BACKUP_TOKEN, $t)) { registra(ip(), 'bk'); fail('Não autorizado.', 403); }
        q("INSERT INTO config(chave,valor) VALUES('ultimo_backup_auto',?) ON CONFLICT(chave) DO UPDATE SET valor=excluded.valor", [now()]);
        backup_envia();
    }
    case 'config_salvar': {
        need_admin(); $b = body();
        $r = $b['ranks'] ?? null;
        if ($r === null) { q("DELETE FROM config WHERE chave='ranks'"); out(['ok' => true]); }
        if (!is_array($r)) fail('Configuração inválida.');
        $clean = [];
        foreach (RANKS as $rk) {
            $x = $r[$rk] ?? null; if (!is_array($x)) continue;
            $o = ['ov' => n($x['ov'] ?? 0, 0, 1000000)]; if (isset($x['contatos'])) $o['contatos'] = (int)n($x['contatos'], 1, 100); $clean[$rk] = $o;
        }
        q("INSERT INTO config(chave,valor) VALUES('ranks',?) ON CONFLICT(chave) DO UPDATE SET valor=excluded.valor", [json_encode($clean)]);
        out(['ok' => true]);
    }

    default:
        fail('Ação desconhecida.', 404);
    }
} catch (PDOException $e) {
    error_log('Diamante PDO: ' . $e->getMessage());
    fail('Erro ao acessar o banco de dados. Tente novamente.', 500);
} catch (Throwable $e) {
    error_log('Diamante erro: ' . $e->getMessage());
    fail('Algo deu errado. Tente novamente.', 500);
}
