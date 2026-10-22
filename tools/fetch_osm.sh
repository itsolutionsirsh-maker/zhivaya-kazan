#!/bin/bash
# Загрузка центра Казани из OpenStreetMap через Overpass API.
# bbox: юг, запад, север, восток
set -e
OUT=${1:-raw/kazan_osm.json}
mkdir -p "$(dirname "$OUT")"
S=55.780; W=49.090; N=55.806; E=49.138
BB="($S,$W,$N,$E)"
QUERY="[out:json][timeout:180][maxsize:536870912];
(
  way[\"highway\"~\"^(motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|unclassified|residential|living_street|service|pedestrian|footway|path|steps)$\"]$BB;
  way[\"building\"]$BB;
  way[\"natural\"=\"water\"]$BB;
  relation[\"natural\"=\"water\"]$BB;
  way[\"leisure\"~\"^(park|garden|playground|pitch|stadium)$\"]$BB;
  way[\"landuse\"~\"^(grass|forest|cemetery|meadow)$\"]$BB;
  way[\"natural\"=\"wood\"]$BB;
  node[\"highway\"=\"bus_stop\"]$BB;
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
echo "Запрос к Overpass..."
curl -sS -m 300 -o "$OUT" -w "HTTP %{http_code}, %{size_download} bytes\n" "https://overpass-api.de/api/interpreter" --data-urlencode "data=$QUERY"
