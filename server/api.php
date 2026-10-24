<?php
// «Живая Казань» — мини-сервер для своего хостинга (Beget и любой PHP 7.4+).
// a=ping  — проверка; a=sync — позиции игроков + общий/личный чат; a=llm — ответы жителей через OpenAI-совместимый API.
// a=login/load/save/reset — аккаунт (имя + PIN); a=tglogin/tglink — вход из мини-приложения Телеги и привязка аккаунта сайта.
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

// ---------- бот: вебхук для ответа на /start (ставится сам один раз, когда в config.php появился токен) ----------
function tg_api($method, $params) {
    $tok = $GLOBALS['cfg']['tg_bot_token'] ?? ''; if (!$tok) return null;
    $ch = curl_init('https://api.telegram.org/bot' . $tok . '/' . $method);
    curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 6, CURLOPT_CONNECTTIMEOUT => 4, CURLOPT_HTTPHEADER => ['Content-Type: application/json'], CURLOPT_POSTFIELDS => json_encode($params, JSON_UNESCAPED_UNICODE)]);
    $r = curl_exec($ch); curl_close($ch); return $r ? json_decode($r, true) : null;
}
function tg_secret() { return substr(hash('sha256', 'wh:' . ($GLOBALS['cfg']['tg_bot_token'] ?? '')), 0, 40); }
function game_url() { $dir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/kazan/api.php')), '/'); return 'https://' . ($_SERVER['HTTP_HOST'] ?? 'iks-ai-systems.ru') . $dir . '/'; }
function tg_ensure_webhook() {
    $tok = $GLOBALS['cfg']['tg_bot_token'] ?? ''; if (!$tok) return;
    $flag = $GLOBALS['DATA'] . '/tgwh_' . substr(sha1($tok), 0, 12) . '.php'; if (is_file($flag)) return;
    $try = $flag . '.try'; if (is_file($try) && time() - filemtime($try) < 600) return;   // не получилось — повторим не раньше чем через 10 минут
    touch($try);
    // вебхук уже смотрит на другой сервер (игра переехала на VPS) — не перебиваем его
    $info = tg_api('getWebhookInfo', []);
    if (!empty($info['ok']) && !empty($info['result']['url']) && $info['result']['url'] !== game_url() . 'api.php?a=tgwebhook') { file_put_contents($flag, GUARD . time()); @unlink($try); return; }
    $r = tg_api('setWebhook', ['url' => game_url() . 'api.php?a=tgwebhook', 'secret_token' => tg_secret(), 'allowed_updates' => ['message'], 'drop_pending_updates' => true]);
    if (!empty($r['ok'])) { file_put_contents($flag, GUARD . time()); @unlink($try); }
}
if ($a === 'ping') { tg_ensure_webhook(); out(['ok' => 1, 'llm' => !empty($cfg['api_key']), 'acct' => true, 'tg' => !empty($cfg['tg_bot_token'])]); }
if ($a === 'tgwebhook') {
    if (empty($cfg['tg_bot_token']) || !hash_equals(tg_secret(), $_SERVER['HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN'] ?? '')) { http_response_code(403); out(['err' => 'forbidden']); }
    $msg = $in['message'] ?? null; $text = is_array($msg) ? ($msg['text'] ?? '') : '';
    if (is_array($msg) && isset($msg['chat']['id']) && preg_match('~^/(start|play|help)~', $text)) {
        $name = clean($msg['from']['first_name'] ?? '', 40);
        // отвечаем прямо в ответе на вебхук: самому серверу не нужно ходить в api.telegram.org
        out(['method' => 'sendMessage', 'chat_id' => $msg['chat']['id'],
            'text' => ($name ? $name . ', добро' : 'Добро') . " пожаловать в «Живую Казань»!\n\nНастоящий центр Казани: Баумана, Кремль, метро, кафе. Жители живут своей жизнью, вы — своей: работа, квартира, банк, знакомства. Все игроки — в одном городе.\n\nЖмите «Играть» 👇",
            'reply_markup' => ['inline_keyboard' => [[['text' => '▶️ Играть', 'web_app' => ['url' => game_url()]]]]]]);
    }
    out(['ok' => 1]);
}

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

// ---------- аккаунты: файлы в data/acc, data/tok, data/tgm (каждый с защитной строкой, по ссылке не читаются) ----------
function jread($f) { if (!is_file($f)) return null; $r = file_get_contents($f); if (strpos($r, GUARD) === 0) $r = substr($r, strlen(GUARD)); $j = json_decode($r, true); return is_array($j) ? $j : null; }
function jwrite($f, $x) { $d = dirname($f); if (!is_dir($d)) @mkdir($d, 0755, true); $tmp = $f . '.' . getmypid() . '.tmp'; file_put_contents($tmp, GUARD . json_encode($x, JSON_UNESCAPED_UNICODE)); rename($tmp, $f); }
function acc_file($k) { return $GLOBALS['DATA'] . '/acc/' . sha1($k) . '.php'; }
function tok_file($t) { return $GLOBALS['DATA'] . '/tok/' . hash('sha256', $t) . '.php'; }
function tgm_file($id) { return $GLOBALS['DATA'] . '/tgm/' . preg_replace('/\D/', '', (string)$id) . '.php'; }
function new_token($k) { $t = bin2hex(random_bytes(24)); jwrite(tok_file($t), ['k' => $k, 't' => time()]); return $t; }
function acc_by_token($t) { if (!is_string($t) || strlen($t) < 20 || !ctype_xdigit($t)) return null; $m = jread(tok_file($t)); if (!$m) return null; return jread(acc_file($m['k'])); }
function acc_out($a, $extra = []) { return $extra + ['ok' => 1, 'name' => $a['name'], 'tg' => !empty($a['tg']), 'state' => $a['state'] ?? null, 'profile' => $a['profile'] ?? null, 'city' => $a['city'] ?? null, 'updated' => $a['updated'] ?? 0]; }
// не чаще $limit раз за $win секунд по ключу
function allow($key, $limit, $win) {
    $f = $GLOBALS['DATA'] . '/rate_' . md5($key) . '.php'; $now = time();
    $hits = jread($f) ?: []; $hits = array_values(array_filter($hits, fn($t) => $now - $t < $win));
    if (count($hits) >= $limit) return false; $hits[] = $now; jwrite($f, $hits); return true;
}
$IP = preg_replace('/[^0-9a-f:.]/i', '', $_SERVER['REMOTE_ADDR'] ?? 'x');
// вход по имени и PIN; первого входа достаточно, чтобы создать игрока
function check_pin($name, $pin, $create) {
    global $IP;
    $name = clean($name, 24); $pin = is_string($pin) || is_int($pin) ? (string)$pin : '';
    if (mb_strlen($name) < 2 || strpos($name, ':') !== false) return ['err' => 'name'];
    if (!preg_match('/^\d{4,8}$/', $pin)) return ['err' => 'pin'];
    if (!allow('login:' . $IP, 10, 60)) return ['err' => 'rate_limited'];
    $k = 'n:' . mb_strtolower($name); $f = acc_file($k); $a = jread($f);
    if (!$a) {
        if (!$create) return ['err' => 'no_account'];
        if (!allow('create:' . $IP, 5, 3600)) return ['err' => 'rate_limited'];
        $a = ['k' => $k, 'name' => $name, 'pin' => password_hash($pin, PASSWORD_DEFAULT), 'created' => time(), 'updated' => 0, 'fails' => 0, 'lock' => 0, 'state' => null, 'profile' => null, 'city' => null];
        jwrite($f, $a); return ['acc' => $a, 'created' => true];
    }
    if (($a['lock'] ?? 0) > time()) return ['err' => 'locked'];
    if (!password_verify($pin, $a['pin'] ?? '')) { $a['fails'] = ($a['fails'] ?? 0) + 1; if ($a['fails'] >= 8) { $a['fails'] = 0; $a['lock'] = time() + 900; } jwrite($f, $a); return ['err' => 'wrong_pin']; }
    if (($a['fails'] ?? 0) > 0) { $a['fails'] = 0; jwrite($f, $a); }
    return ['acc' => $a, 'created' => false];
}
// подпись initData мини-приложения: HMAC-SHA256 с ключом от токена бота
function tg_verify($initData, $botToken) {
    if (!is_string($initData) || strlen($initData) > 4096 || !$botToken) return null;
    $pairs = []; $hash = '';
    foreach (explode('&', $initData) as $kv) { $p = explode('=', $kv, 2); if (count($p) < 2) continue; $k = urldecode($p[0]); $v = urldecode($p[1]); if ($k === 'hash') $hash = $v; else $pairs[$k] = $v; }
    if (!$hash) return null;
    $secret = hash_hmac('sha256', $botToken, 'WebAppData', true);
    $ok = false;
    foreach ([$pairs, array_diff_key($pairs, ['signature' => 1])] as $set) {   // поле signature в разных версиях то входит в строку проверки, то нет
        ksort($set); $dcs = implode("\n", array_map(fn($k) => $k . '=' . $set[$k], array_keys($set)));
        if (hash_equals(hash_hmac('sha256', $dcs, $secret), strtolower($hash))) { $ok = true; break; }
    }
    if (!$ok) return null;
    if (time() - intval($pairs['auth_date'] ?? 0) > 86400) return null;    // initData старше суток не принимаем
    $u = json_decode($pairs['user'] ?? '', true);
    if (!is_array($u) || empty($u['id'])) return null;
    return ['id' => (string)intval($u['id']), 'name' => clean(trim(($u['first_name'] ?? '') . ' ' . ($u['last_name'] ?? '')), 24) ?: 'Игрок', 'start' => clean($pairs['start_param'] ?? '', 64)];
}

// жалоба на игрока: копится в data/reports.php (модератор смотрит файл); на VPS — ещё и автоотключение чата
if ($a === 'report') {
    if (!allow('rep:' . $IP, 10, 3600)) out(['err' => 'rate_limited']);
    $rec = ['t' => time(), 'from' => clean($in['id'] ?? '', 32), 'ip' => $IP, 'target' => clean($in['target'] ?? '', 32), 'name' => clean($in['name'] ?? '', 24), 'kind' => clean($in['kind'] ?? 'chat', 10), 'text' => clean($in['text'] ?? '', 240)];
    $f = $DATA . '/reports.php'; if (!is_file($f)) { @mkdir($DATA, 0755, true); file_put_contents($f, GUARD); }
    file_put_contents($f, json_encode($rec, JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX);
    out(['ok' => 1]);
}
if ($a === 'login') {
    $r = check_pin($in['name'] ?? '', $in['pin'] ?? '', true);
    if (isset($r['err'])) out($r);
    out(acc_out($r['acc'], ['token' => new_token($r['acc']['k']), 'created' => $r['created']]));
}
if ($a === 'load') { $acc = acc_by_token($in['token'] ?? ''); if (!$acc) out(['err' => 'auth']); $inv = $acc['invites'] ?? []; if ($inv) { $acc['invites'] = []; jwrite(acc_file($acc['k']), $acc); } out(acc_out($acc, ['invites' => $inv])); }
if ($a === 'save') {
    $acc = acc_by_token($in['token'] ?? ''); if (!$acc) out(['err' => 'auth']);
    $st = $in['state'] ?? null; $pr = $in['profile'] ?? null; $ci = $in['city'] ?? null;
    if (strlen(json_encode($st)) > 150000 || strlen(json_encode($pr)) > 12000 || strlen(json_encode($ci)) > 60000) out(['err' => 'too_big']);
    if (!allow('save:' . $acc['k'], 30, 60)) out(['err' => 'rate_limited']);
    $f = acc_file($acc['k']); $fp = fopen($f, 'c+'); flock($fp, LOCK_EX);
    $cur = jread($f) ?: $acc;
    if ($st !== null) $cur['state'] = $st; if ($pr !== null) $cur['profile'] = $pr; if ($ci !== null) $cur['city'] = $ci;
    $cur['updated'] = time(); jwrite($f, $cur); flock($fp, LOCK_UN); fclose($fp);
    out(['ok' => 1]);
}
// «начать заново»: стирает только прогресс этого игрока, имя и вход остаются
if ($a === 'reset') {
    $acc = acc_by_token($in['token'] ?? ''); if (!$acc) out(['err' => 'auth']);
    $acc['state'] = null; $acc['city'] = null; $acc['updated'] = time(); jwrite(acc_file($acc['k']), $acc); out(['ok' => 1]);
}
if ($a === 'tglogin') {
    if (empty($cfg['tg_bot_token'])) out(['err' => 'no_tg']);
    if (!allow('tg:' . $IP, 30, 60)) out(['err' => 'rate_limited']);
    $u = tg_verify($in['initData'] ?? '', $cfg['tg_bot_token']); if (!$u) out(['err' => 'tg_bad']);
    $map = jread(tgm_file($u['id'])); $k = $map['k'] ?? ('tg:' . $u['id']);
    $acc = jread(acc_file($k)); $created = false; $invitedBy = null;
    if (!$acc) {
        $acc = ['k' => $k, 'name' => $u['name'], 'tg' => $u['id'], 'created' => time(), 'updated' => 0, 'state' => null, 'profile' => null, 'city' => null]; $created = true;
        // новый игрок пришёл по ссылке друга: ref_<id Телеги друга>
        if (preg_match('/^ref_(\d{3,15})$/', $u['start'], $m) && $m[1] !== $u['id']) {
            $im = jread(tgm_file($m[1])); $ik = $im['k'] ?? ('tg:' . $m[1]); $inv = jread(acc_file($ik));
            if ($inv) { $acc['refBy'] = $ik; $invitedBy = $inv['name']; $inv['invites'] = array_slice(array_merge($inv['invites'] ?? [], [['name' => $u['name'], 't' => time()]]), -20); jwrite(acc_file($ik), $inv); }
        }
        jwrite(acc_file($k), $acc);
    }
    $invites = $acc['invites'] ?? [];   // кто пришёл по ссылке этого игрока, пока он не заходил
    if ($invites && !$created) { $acc['invites'] = []; jwrite(acc_file($k), $acc); }
    out(acc_out($acc, ['token' => new_token($k), 'created' => $created, 'tgName' => $u['name'], 'start' => $u['start'], 'invitedBy' => $invitedBy, 'invites' => $invites]));
}
// в Телеге: «у меня уже есть игрок на сайте» — имя + PIN, дальше Телега открывает именно его
if ($a === 'tglink') {
    $cur = acc_by_token($in['token'] ?? ''); if (!$cur || empty($cur['tg'])) out(['err' => 'auth']);
    $r = check_pin($in['name'] ?? '', $in['pin'] ?? '', false); if (isset($r['err'])) out($r);
    $acc = $r['acc']; $acc['tg'] = $cur['tg']; jwrite(acc_file($acc['k']), $acc);
    jwrite(tgm_file($cur['tg']), ['k' => $acc['k']]);
    out(acc_out($acc, ['token' => new_token($acc['k']), 'linked' => true]));
}

out(['err' => 'unknown_action']);
