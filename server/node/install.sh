#!/usr/bin/env bash
# «Живая Казань» — установка на чистый сервер Ubuntu 22.04 / 24.04.
#   sudo bash install.sh game.iks-ai-systems.ru
# Ставит Node.js 22 (встроенный SQLite для аккаунтов), Caddy (сам получает HTTPS-сертификат), скачивает игру с GitHub,
# запускает её как службу и раз в 5 минут подтягивает обновления из ветки main.
# Перед запуском у домена должна быть A-запись на IP этого сервера.
set -euo pipefail

DOMAIN="${1:-}"
if [ -z "$DOMAIN" ]; then echo "Укажите домен: sudo bash install.sh game.example.ru"; exit 1; fi
if [ "$(id -u)" -ne 0 ]; then echo "Запустите через sudo"; exit 1; fi
REPO="${REPO:-https://github.com/itsolutionsirsh-maker/zhivaya-kazan.git}"
APP=/opt/zhivaya-kazan
ENVF=/etc/zhivaya-kazan.env

echo "== Подкачка (на сервере с 1 ГБ памяти — чтобы установка и сборка не упирались в память)"
if [ "$(swapon --show --noheadings | wc -l)" -eq 0 ] && [ "$(awk '/MemTotal/{print $2}' /proc/meminfo)" -lt 2000000 ]; then
  fallocate -l 1G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=1024 status=none
  chmod 600 /swapfile; mkswap /swapfile >/dev/null; swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -q vm.swappiness=10; echo 'vm.swappiness=10' > /etc/sysctl.d/91-zk-swap.conf
fi

echo "== Пакеты"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y git curl python3 ca-certificates gnupg debian-keyring debian-archive-keyring apt-transport-https

echo "== Node.js"
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | sed 's/v//' | cut -d. -f1)" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node -v

echo "== Caddy (HTTPS)"
if ! command -v caddy >/dev/null 2>&1; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
fi

echo "== Пользователь и код"
id zk >/dev/null 2>&1 || useradd --system --create-home --home-dir /var/lib/zk --shell /usr/sbin/nologin zk
if [ -d "$APP/.git" ]; then
  sudo -u zk git -C "$APP" pull --ff-only
else
  mkdir -p "$APP"; chown zk:zk "$APP"
  sudo -u zk git clone --depth 50 "$REPO" "$APP"
fi
sudo -u zk bash -c "cd '$APP' && python3 tools/build_deploy.py && cd server/node && (npm ci --omit=dev --no-audit --no-fund || npm install --omit=dev --no-audit --no-fund)"

echo "== Настройки"
if [ ! -f "$ENVF" ]; then
  cat > "$ENVF" <<EOF
PORT=8080
GAME_DIR=$APP/deploy/kazan
DATA_DIR=/var/lib/zk/data
# Ключ для «живых» ответов жителей (OpenAI-совместимый API). Впишите сами: sudo nano $ENVF
# затем: sudo systemctl restart zhivaya-kazan
LLM_API_KEY=
LLM_API_BASE=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
# Лимиты, чтобы счёт за ИИ не обогнал сервер: ответов на игрока в день, всего в день, длина ответа
LLM_PER_PLAYER_DAY=60
LLM_DAILY_LIMIT=20000
LLM_MAX_TOKENS=160
# Токен бота от @BotFather — для входа из мини-приложения Телеги. Впишите сами, никому не пересылайте
TG_BOT_TOKEN=
# Сколько соседей видно и в каком радиусе (м)
VIEW_K=80
VIEW_RADIUS=350
EOF
fi
# сводка по утрам, тревоги и копии базы в Телегу (добавляется и в старые настройки)
grep -q '^ADMIN_TG_ID=' "$ENVF" || printf '# Ваш id в Телеге для сводки по утрам и тревог «сервер не отвечает» (узнать у @userinfobot)\nADMIN_TG_ID=\n' >> "$ENVF"
grep -q '^BACKUP_TO_TG=' "$ENVF" || printf '# 1 — раз в сутки присылать копию базы игроков в Телегу админу (копии на сервере делаются всегда)\nBACKUP_TO_TG=0\n' >> "$ENVF"
# адрес игры: для кнопки «Играть» в боте и вебхука Телеги (обновляется при каждом запуске install.sh с новым доменом)
if grep -q '^PUBLIC_URL=' "$ENVF"; then sed -i "s|^PUBLIC_URL=.*|PUBLIC_URL=https://$DOMAIN/|" "$ENVF"; else echo "PUBLIC_URL=https://$DOMAIN/" >> "$ENVF"; fi
# ключ модератора для страницы /mod.html — создаётся один раз
if ! grep -q '^MOD_TOKEN=.\+' "$ENVF"; then sed -i '/^MOD_TOKEN=/d' "$ENVF"; echo "MOD_TOKEN=$(head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n')" >> "$ENVF"; fi
chown root:zk "$ENVF"; chmod 640 "$ENVF"
mkdir -p /var/lib/zk/data; chown -R zk:zk /var/lib/zk

echo "== Лимиты системы"
cat > /etc/sysctl.d/90-zhivaya-kazan.conf <<EOF
net.core.somaxconn=4096
net.ipv4.tcp_max_syn_backlog=4096
net.ipv4.ip_local_port_range=10240 65000
fs.file-max=200000
EOF
sysctl -p /etc/sysctl.d/90-zhivaya-kazan.conf >/dev/null || true

echo "== Служба игры"
cat > /etc/systemd/system/zhivaya-kazan.service <<EOF
[Unit]
Description=Живая Казань — игровой сервер
After=network.target

[Service]
User=zk
EnvironmentFile=$ENVF
WorkingDirectory=$APP/server/node
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=3
LimitNOFILE=65535
NoNewPrivileges=true
ProtectSystem=full
ReadWritePaths=/var/lib/zk

[Install]
WantedBy=multi-user.target
EOF

echo "== Автообновление из GitHub (каждые 5 минут) и проверка «сервер жив» (каждые 2 минуты)"
# скрипты, которые работают от root, лежат вне папки игры: её может менять служба
install -m 755 -o root -g root "$APP/server/node/update.sh" /usr/local/sbin/zk-update
install -m 755 -o root -g root "$APP/server/node/health.sh" /usr/local/sbin/zk-health
cat > /etc/systemd/system/zhivaya-kazan-update.service <<EOF
[Unit]
Description=Живая Казань — обновление из GitHub

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/zk-update
EOF
cat > /etc/systemd/system/zhivaya-kazan-health.service <<EOF
[Unit]
Description=Живая Казань — проверка «сервер жив»

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/zk-health
EOF
cat > /etc/systemd/system/zhivaya-kazan-health.timer <<EOF
[Unit]
Description=Живая Казань — проверять сервер каждые 2 минуты

[Timer]
OnBootSec=3min
OnUnitActiveSec=2min

[Install]
WantedBy=timers.target
EOF
cat > /etc/systemd/system/zhivaya-kazan-update.timer <<EOF
[Unit]
Description=Живая Казань — проверять обновления каждые 5 минут

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
EOF

echo "== Caddy: $DOMAIN → игра"
cat > /etc/caddy/Caddyfile <<EOF
$DOMAIN {
	encode gzip
	reverse_proxy 127.0.0.1:8080
}
EOF

echo "== Брандмауэр: открыты только SSH, 80 и 443"
if command -v ufw >/dev/null 2>&1; then
  SSHP=$(sshd -T 2>/dev/null | awk '/^port /{print $2; exit}'); SSHP=${SSHP:-22}
  ufw allow "$SSHP"/tcp >/dev/null; ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null; ufw allow 443/udp >/dev/null
  ufw --force enable >/dev/null
fi

systemctl daemon-reload
systemctl enable --now zhivaya-kazan
systemctl restart zhivaya-kazan
systemctl enable --now zhivaya-kazan-update.timer zhivaya-kazan-health.timer
systemctl reload caddy || systemctl restart caddy

sleep 2
if curl -fsS http://127.0.0.1:8080/health >/dev/null; then
  echo
  echo "Готово: https://$DOMAIN"
  echo "Ключ ИИ для жителей, токен бота и ваш id в Телеге (LLM_API_KEY, TG_BOT_TOKEN, ADMIN_TG_ID): sudo nano $ENVF, затем sudo systemctl restart zhivaya-kazan"
  echo "Модерация и цифры по игрокам: https://$DOMAIN/mod.html (ключ — MOD_TOKEN: sudo grep MOD_TOKEN $ENVF)"
  echo "Журнал игры: journalctl -u zhivaya-kazan -f"
else
  echo "Сервер игры не ответил. Посмотрите: journalctl -u zhivaya-kazan -n 50"
  exit 1
fi
