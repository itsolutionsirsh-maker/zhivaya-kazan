#!/usr/bin/env bash
# «Живая Казань» — проверка «сервер жив». Запускается таймером zhivaya-kazan-health.timer от root раз в 2 минуты.
# Две проверки подряд без ответа — перезапуск службы и сообщение админу в Телегу (ADMIN_TG_ID в /etc/zhivaya-kazan.env).
# Раз в сутки предупреждает, если диск заполнен больше чем на 90%.
set -uo pipefail
ENVF=/etc/zhivaya-kazan.env
ST=/var/lib/zk-health.state   # вне папки игры: её может менять служба, а этот скрипт работает от root
PORT=$(grep -m1 '^PORT=' "$ENVF" 2>/dev/null | cut -d= -f2); PORT=${PORT:-8080}
TOKEN=$(grep -m1 '^TG_BOT_TOKEN=' "$ENVF" 2>/dev/null | cut -d= -f2-)
ADMIN=$(grep -m1 '^ADMIN_TG_ID=' "$ENVF" 2>/dev/null | cut -d= -f2- | tr -cd '0-9')

say() {  # токен не попадает в список процессов: адрес передаётся curl через stdin
  [ -n "$TOKEN" ] && [ -n "$ADMIN" ] || return 0
  printf 'url = "https://api.telegram.org/bot%s/sendMessage"\n' "$TOKEN" |
    curl -s -m 15 -K - --data-urlencode "chat_id=$ADMIN" --data-urlencode "text=$1" >/dev/null || true
}

FAILS=$(grep -m1 '^FAILS=' "$ST" 2>/dev/null | cut -d= -f2 | tr -cd '0-9'); FAILS=${FAILS:-0}
DISKDAY=$(grep -m1 '^DISKDAY=' "$ST" 2>/dev/null | cut -d= -f2 | tr -cd '0-9-')

if curl -fsS -m 6 "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then
  [ "$FAILS" -ge 2 ] && say "✅ Живая Казань снова отвечает."
  FAILS=0
else
  FAILS=$((FAILS+1))
  if [ "$FAILS" -ge 2 ] && [ $(( (FAILS-2) % 10 )) -eq 0 ]; then   # 2-я неудача, потом каждые 20 минут
    systemctl restart zhivaya-kazan
    sleep 5
    if curl -fsS -m 6 "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then
      say "⚠️ Живая Казань не отвечала 2 проверки подряд — перезапустил, работает. Журнал: journalctl -u zhivaya-kazan -n 100"
      FAILS=0
    else
      [ "$FAILS" -eq 2 ] && say "🔴 Живая Казань не отвечает и после перезапуска. Пробую снова каждые 20 минут. Журнал: journalctl -u zhivaya-kazan -n 100"
    fi
  fi
fi

USE=$(df -P / | awk 'NR==2{gsub("%","",$5); print $5}')
TODAY=$(date +%F)
if [ "${USE:-0}" -ge 90 ] && [ "$DISKDAY" != "$TODAY" ]; then
  say "💾 Диск сервера заполнен на ${USE}%. Старые копии базы лежат в /var/lib/zk/data/backup."
  DISKDAY=$TODAY
fi

printf 'FAILS=%s\nDISKDAY=%s\n' "$FAILS" "$DISKDAY" > "$ST"
