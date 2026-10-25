#!/usr/bin/env python3
"""Собирает site/ в dev-папку с полноценным index.html (как оборачивает артефакт) для локального теста."""
import os, shutil, sys
SRC = os.path.join(os.path.dirname(__file__), '..', 'site')
DST = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/-home-claude/7b6b1109-f7dd-5c96-b96e-10033cd54b68/scratchpad/dev'
os.makedirs(DST, exist_ok=True)
body = open(os.path.join(SRC, 'zhivaya-kazan.html'), encoding='utf-8').read()
html = ('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style>'
        '</head><body>' + body + '</body></html>')
open(os.path.join(DST, 'index.html'), 'w', encoding='utf-8').write(html)
if os.path.isdir(os.path.join(DST, 'js')):
    shutil.rmtree(os.path.join(DST, 'js'))
shutil.copytree(os.path.join(SRC, 'js'), os.path.join(DST, 'js'))
shutil.copy(os.path.join(SRC, 'kazan.json'), os.path.join(DST, 'kazan.json'))
if os.path.isdir(os.path.join(DST, 'map')):
    shutil.rmtree(os.path.join(DST, 'map'))
if os.path.isdir(os.path.join(SRC, 'map')):
    shutil.copytree(os.path.join(SRC, 'map'), os.path.join(DST, 'map'))
if os.path.isdir(os.path.join(DST, 'img')):
    shutil.rmtree(os.path.join(DST, 'img'))
if os.path.isdir(os.path.join(SRC, 'img')):
    shutil.copytree(os.path.join(SRC, 'img'), os.path.join(DST, 'img'))
print('dev build →', DST)
