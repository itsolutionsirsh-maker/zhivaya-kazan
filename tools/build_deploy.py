#!/usr/bin/env python3
"""Сборка для своего сайта: deploy/kazan/ (index.html, js/, kazan.json, api.php) + kazan.zip для заливки."""
import os, shutil, zipfile, sys
ROOT = os.path.join(os.path.dirname(__file__), '..')
SITE, SERVER = os.path.join(ROOT, 'site'), os.path.join(ROOT, 'server')
OUT = os.path.join(ROOT, 'deploy', 'kazan')
shutil.rmtree(OUT, ignore_errors=True); os.makedirs(os.path.join(OUT, 'data'))
body = open(os.path.join(SITE, 'zhivaya-kazan.html'), encoding='utf-8').read()
head = ('<!doctype html><html lang="ru"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<meta name="description" content="Живая Казань — городская симуляция на реальной карте центра Казани: жители, транспорт, митинги, чат. IKS AI Systems">'
        '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style>'
        '</head><body>')
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(head + body + '</body></html>')
shutil.copytree(os.path.join(SITE, 'js'), os.path.join(OUT, 'js'))
shutil.copy(os.path.join(SITE, 'kazan.json'), OUT)
if os.path.isdir(os.path.join(SITE, 'img')):
    shutil.copytree(os.path.join(SITE, 'img'), os.path.join(OUT, 'img'))
shutil.copy(os.path.join(SERVER, 'api.php'), OUT)
shutil.copy(os.path.join(SERVER, 'config.sample.php'), OUT)
shutil.copy(os.path.join(SERVER, 'data.htaccess'), os.path.join(OUT, 'data', '.htaccess'))
zp = os.path.join(ROOT, 'deploy', 'kazan.zip')
with zipfile.ZipFile(zp, 'w', zipfile.ZIP_DEFLATED) as z:
    for d, _, fs in os.walk(OUT):
        for f in fs:
            full = os.path.join(d, f); z.write(full, os.path.relpath(full, os.path.dirname(OUT)))
print('deploy →', OUT, '| zip', os.path.getsize(zp) // 1024, 'КБ')
