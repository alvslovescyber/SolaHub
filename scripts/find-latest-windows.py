#!/usr/bin/env python3
"""Print the latest Windows installer version available on R2.

Walks a hard-coded candidate list from newest to oldest and prints the
first version whose *-setup.exe HEAD request returns 200.  Falls back to
0.1.6 if none are found.

Usage:
    python3 scripts/find-latest-windows.py
    # reads R2_PUBLIC_BASE from env
"""
import os, sys, urllib.request

r2_base = os.environ.get('R2_PUBLIC_BASE', '').rstrip('/')
candidates = [
    '0.1.9', '0.1.8', '0.1.7', '0.1.6', '0.1.5',
    '0.1.4', '0.1.3', '0.1.2', '0.1.1', '0.1.0',
]

for v in candidates:
    url = f'{r2_base}/SolaHub_{v}_x64-setup.exe'
    try:
        urllib.request.urlopen(urllib.request.Request(url, method='HEAD'), timeout=10)
        print(v)
        sys.exit(0)
    except Exception:
        continue

print('0.1.6')
