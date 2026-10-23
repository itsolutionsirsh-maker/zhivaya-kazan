#!/usr/bin/env bash
# Подтянуть свежий main с GitHub, пересобрать игру и перезапустить сервер — только если что-то изменилось.
# Запускается таймером zhivaya-kazan-update.timer от root.
set -euo pipefail
APP=/opt/zhivaya-kazan
cd "$APP"
OLD=$(sudo -u zk git rev-parse HEAD)
sudo -u zk git fetch -q origin main
NEW=$(sudo -u zk git rev-parse origin/main)
[ "$OLD" = "$NEW" ] && exit 0
sudo -u zk git reset -q --hard origin/main
sudo -u zk bash -c "cd '$APP' && python3 tools/build_deploy.py >/dev/null && cd server/node && (npm ci --omit=dev --no-audit --no-fund >/dev/null 2>&1 || npm install --omit=dev --no-audit --no-fund >/dev/null)"
systemctl restart zhivaya-kazan
echo "Обновлено: ${OLD:0:7} → ${NEW:0:7}"
