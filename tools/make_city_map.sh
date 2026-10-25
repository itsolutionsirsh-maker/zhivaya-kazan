#!/usr/bin/env bash
# Карта всей Казани на сервере: качает OSM (Overpass) и собирает куски в /var/lib/zk/map — игра отдаёт их по адресу /map/…
# Запуск (в фоне, от пользователя игры):
#   sudo systemd-run --uid=zk --unit=zkmap --working-directory=/opt/zhivaya-kazan bash tools/make_city_map.sh
#   journalctl -u zkmap -f        — ход дела
# Качает плитками; если оборвётся — запустите снова, докачает только недостающее.
set -euo pipefail
OUT="${1:-/var/lib/zk/map}"
cd "$(dirname "$0")/.."
python3 tools/fetch_city.py --all
python3 tools/build_city.py "$OUT.new"
rm -rf "$OUT.old"; if [ -d "$OUT" ]; then mv "$OUT" "$OUT.old"; fi; mv "$OUT.new" "$OUT"; rm -rf "$OUT.old"
echo "Готово: $OUT"
