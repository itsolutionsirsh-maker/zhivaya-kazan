#!/bin/bash
# Загрузка центра Казани из OpenStreetMap через Overpass API (с перебором зеркал).
# bbox: юг, запад, север, восток
OUT=${1:-raw/kazan_osm.json}
mkdir -p "$(dirname "$OUT")"
S=55.780; W=49.090; N=55.806; E=49.138
BB="($S,$W,$N,$E)"
QUERY="[out:json][timeout:240][maxsize:536870912];
(
  way[\"highway\"~\"^(motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|unclassified|residential|living_street|service|pedestrian|footway|path|steps)$\"]$BB;
  way[\"building\"]$BB;
  way[\"natural\"=\"water\"]$BB;
  relation[\"natural\"=\"water\"]$BB;
  way[\"leisure\"~\"^(park|garden|playground|pitch|stadium)$\"]$BB;
  way[\"landuse\"~\"^(grass|forest|cemetery|meadow)$\"]$BB;
  way[\"natural\"=\"wood\"]$BB;
  node[\"highway\"=\"bus_stop\"]$BB;
  node[\"highway\"~\"^(crossing|traffic_signals)$\"]$BB;
  way[\"amenity\"=\"parking\"]$BB;
  node[\"railway\"=\"tram_stop\"]$BB;
  node[\"amenity\"~\"^(police|hospital|clinic|cafe|restaurant|fast_food|bar|pub|bank|atm|pharmacy|school|university|college|theatre|cinema|fuel|library|place_of_worship|marketplace)$\"]$BB;
  way[\"amenity\"~\"^(police|hospital|clinic|school|university|college|theatre|cinema|fuel|place_of_worship|marketplace)$\"]$BB;
  node[\"shop\"]$BB;
  node[\"tourism\"~\"^(attraction|museum|hotel)$\"]$BB;
  way[\"tourism\"~\"^(attraction|museum|hotel)$\"]$BB;
  node[\"office\"]$BB;
  relation[\"route\"~\"^(bus|trolleybus|tram)$\"]$BB;
);
out geom;"
MIRRORS=(
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter"
  "https://overpass.kumi.systems/api/interpreter"
  "https://overpass-api.de/api/interpreter"
)
for attempt in 1 2 3; do
  for url in "${MIRRORS[@]}"; do
    echo "[$attempt] $url"
    code=$(curl -sS -m 330 -o "$OUT.tmp" -w "%{http_code}" "$url" --data-urlencode "data=$QUERY" 2>/dev/null)
    if [ "$code" = "200" ] && python3 -c "import json,sys; d=json.load(open('$OUT.tmp')); assert len(d.get('elements',[]))>100" 2>/dev/null; then
      mv "$OUT.tmp" "$OUT"; echo "OK: $(stat -c %s "$OUT") bytes from $url"; exit 0
    fi
    echo "  не вышло (HTTP $code), $(stat -c %s "$OUT.tmp" 2>/dev/null || echo 0) bytes"
    sleep 5
  done
done
echo "FAIL: ни одно зеркало не ответило"; exit 1
