#!/usr/bin/env python3
"""Inject updater pubkey + endpoint into tauri.conf.json before a release build.

Reads SOLAHUB_UPDATER_PUBLIC_KEY from env.
Endpoint defaults to the GitHub Releases latest.json if SOLAHUB_UPDATER_ENDPOINT
is not set — swap that var to point at a website endpoint when the website is live.
No-ops silently when the pubkey is absent (local / unsigned builds).
"""
import json, os, sys

pubkey = os.environ.get('SOLAHUB_UPDATER_PUBLIC_KEY', '').strip()
if not pubkey:
    print("SOLAHUB_UPDATER_PUBLIC_KEY not set — skipping updater config injection")
    sys.exit(0)

github_repo = os.environ.get('GITHUB_REPOSITORY', 'alvslovescyber/SolaHub').strip()
default_endpoint = f"https://github.com/{github_repo}/releases/latest/download/latest.json"
endpoint = os.environ.get('SOLAHUB_UPDATER_ENDPOINT', '').strip() or default_endpoint

with open('src-tauri/tauri.conf.json') as f:
    config = json.load(f)

config.setdefault('plugins', {})['updater'] = {
    'pubkey': pubkey,
    'endpoints': [endpoint],
}

# Required for Tauri 2 to produce .nsis.zip/.app.tar.gz updater bundles.
config.setdefault('bundle', {})['createUpdaterArtifacts'] = 'v1Compatible'

with open('src-tauri/tauri.conf.json', 'w') as f:
    json.dump(config, f, indent=2)

print(f"Injected updater config — endpoint: {endpoint}")
