<?php
// «Живая Казань» — мини-сервер для своего хостинга (Beget и любой PHP 7.4+).
// a=ping  — проверка; a=sync — позиции игроков + общий/личный чат; a=llm — ответы жителей через OpenAI-совместимый API.
// Настройки — в config.php рядом (ключ API в браузер не уходит).
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
mb_internal_encoding('UTF-8');

$cfg = is_file(__DIR__ . '/config.php') ? include __DIR__ . '/config.php' : [];
if (!is_array($cfg)) $cfg = [];
$DATA = __DIR__ . '/data';
if (!is_dir($DATA)) @mkdir($DATA, 0755, true);

function out($x) { echo json_encode($x, JSON_UNESCAPED_UNICODE); exit; }
function clean($s, $n) {
    if (!is_string($s)) return '';
    $s = preg_replace('/[\x00-\x1F\x7F]/u', ' ', $s);
    return mb_substr(trim($s), 0, $n);
}
function idstr($s) { return is_string($s) ? substr(preg_replace('/[^a-f0-9]/', '', strtolower($s)), 0, 32) : ''; }

// Состояние хранится в .php-файле: первая строка не даёт прочитать его по прямой ссылке.
const GUARD = "<?php exit; ?>\n";
function load_state($fp) {
    rewind($fp);
    $raw = stream_get_contents($fp);
    if (strpos($raw, GUARD) === 0) $raw = substr($raw, strlen(GUARD));
    $st = json_decode($raw, true);
    if (!is_array($st)) $st = [];
    $st += ['players' => [], 'msgs' => [], 'seq' => 0, 'rate' => []];
    return $st;
}
function save_state($fp, $st) {
    ftruncate($fp, 0); rewind($fp);
    fwrite($fp, GUARD . json_encode($st, JSON_UNESCAPED_UNICODE));
    fflush($fp);
}

$raw = file_get_contents('php://input');
$in = $raw ? json_decode($raw, true) : [];
if (!is_array($in)) $in = [];
$a = $_GET['a'] ?? ($in['a'] ?? '');

if ($a === 'ping') out(['ok' => 1, 'llm' => !empty($cfg['api_key'])]);

if ($a === 'sync') {
    $id = idstr($in['id'] ?? '');
    if (strlen($id) < 8) out(['err' => 'bad_id']);
    $p = $in['p'] ?? null;
    if (!is_array($p) || strlen(json_encode($p)) > 6000) $p = null;
    if ($p) { $p['n'] = clean($p['n'] ?? 'Игрок', 24); unset($p['m']); }

    $fp = fopen($GLOBALS['DATA'] . '/state.php', 'c+');
    if (!$fp) out(['err' => 'storage']);
    flock($fp, LOCK_EX);
    $st = load_state($fp);
    $now = microtime(true);
    if ($p) $st['players'][$id] = ['p' => $p, 't' => $now];
    foreach ($st['players'] as $k => $v) if ($now - $v['t'] > 15) unset($st['players'][$k]);

    // не больше 6 сообщений за 10 секунд с одного игрока
    $st['rate'][$id] = array_values(array_filter($st['rate'][$id] ?? [], fn($t) => $now - $t < 10));
    foreach (array_slice(is_array($in['out'] ?? null) ? $in['out'] : [], 0, 6) as $m) {
        if (count($st['rate'][$id]) >= 6) break;
        $text = clean($m['t'] ?? '', 240);
        if ($text === '') continue;
        $to = isset($m['to']) && $m['to'] ? idstr($m['to']) : null;
        $st['seq']++;
        $st['msgs'][] = ['i' => $st['seq'], 'from' => $id, 'n' => $p['n'] ?? 'Игрок', 'to' => $to, 't' => $text, 'ts' => time()];
        $st['rate'][$id][] = $now;
    }
    foreach ($st['rate'] as $k => $v) if (!isset($st['players'][$k]) && !$v) unset($st['rate'][$k]);
    if (count($st['msgs']) > 400) $st['msgs'] = array_slice($st['msgs'], -400);
    save_state($fp, $st);
    flock($fp, LOCK_UN); fclose($fp);

    $since = intval($in['since'] ?? 0);
    $mine = [];
    foreach ($st['msgs'] as $m) {
        if ($m['i'] <= $since) continue;
        if ($m['to'] === null || $m['to'] === $id || $m['from'] === $id) $mine[] = $m; // личные видит только адресат и автор
    }
    if ($since === 0) $mine = array_slice($mine, -30);
    $players = [];
    foreach ($st['players'] as $k => $v) if ($k !== $id && $v['p']) $players[] = ['id' => $k, 'p' => $v['p']];
    out(['players' => $players, 'msgs' => array_values($mine), 'seq' => $st['seq']]);
}

if ($a === 'llm') {
    if (empty($cfg['api_key'])) out(['err' => 'no_llm']);
    // не больше 30 запросов в минуту с одного адреса
    $ip = preg_replace('/[^0-9a-f:.]/i', '', $_SERVER['REMOTE_ADDR'] ?? 'x');
    $rf = $GLOBALS['DATA'] . '/rate_' . md5($ip) . '.php';
    $hits = [];
    if (is_file($rf)) { $hits = json_decode(substr(file_get_contents($rf), strlen(GUARD)), true) ?: []; }
    $now = time();
    $hits = array_values(array_filter($hits, fn($t) => $now - $t < 60));
    if (count($hits) >= 30) out(['err' => 'rate_limited']);
    $hits[] = $now;
    file_put_contents($rf, GUARD . json_encode($hits));

    $msgs = [];
    foreach (array_slice(is_array($in['messages'] ?? null) ? $in['messages'] : [], -16) as $m) {
        $role = ($m['role'] ?? '') === 'assistant' ? 'assistant' : 'user';
        $c = clean($m['content'] ?? '', 6000);
        if ($c !== '') $msgs[] = ['role' => $role, 'content' => $c];
    }
    if (!$msgs) out(['err' => 'empty']);
    $body = ['model' => $cfg['model'] ?? 'gpt-4o-mini', 'messages' => $msgs, 'max_tokens' => 300, 'temperature' => 0.8];
    if (!empty($in['json'])) $body['response_format'] = ['type' => 'json_object'];
    $base = rtrim($cfg['api_base'] ?? 'https://api.openai.com/v1', '/');
    $ch = curl_init($base . '/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 40,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . $cfg['api_key']],
        CURLOPT_POSTFIELDS => json_encode($body, JSON_UNESCAPED_UNICODE),
    ]);
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $j = $res ? json_decode($res, true) : null;
    $text = $j['choices'][0]['message']['content'] ?? null;
    if ($code !== 200 || !is_string($text)) out(['err' => 'upstream_error', 'code' => $code]);
    out(['text' => trim($text)]);
}

out(['err' => 'unknown_action']);
