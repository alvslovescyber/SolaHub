#!/usr/bin/env python3
"""Inject updater pubkey + endpoint into tauri.conf.json before a release build.

Reads SOLAHUB_UPDATER_PUBLIC_KEY and R2_PUBLIC_BASE from env.
No-ops silently when the key is absent (local / unsigned builds).
"""
import json, os, sys

pubkey = os.environ.get('SOLAHUB_UPDATER_PUBLIC_KEY', '').strip()
if not pubkey:
    print("SOLAHUB_UPDATER_PUBLIC_KEY not set — skipping updater config injection")
    sys.exit(0)

r2_base = os.environ.get('R2_PUBLIC_BASE', '').strip()
if not r2_base:
    print("R2_PUBLIC_BASE not set — skipping updater config injection")
    sys.exit(0)

with open('src-tauri/tauri.conf.json') as f:
    config = json.load(f)

config.setdefault('plugins', {})['updater'] = {
    'pubkey': pubkey,
    'endpoints': [r2_base + '/latest.json'],
}

# Required for Tauri 2 to produce .nsis.zip/.app.tar.gz updater bundles.
config.setdefault('bundle', {})['createUpdaterArtifacts'] = 'v1Compatible'

with open('src-tauri/tauri.conf.json', 'w') as f:
    json.dump(config, f, indent=2)

print(f"Injected updater config with pubkey ending ...{pubkey[-8:]}")
