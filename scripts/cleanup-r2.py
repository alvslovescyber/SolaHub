#!/usr/bin/env python3
"""Delete old versioned installer files from R2, keeping the N most recent.

Reads CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN from env.
Keeps the 2 most recent macOS DMGs and 1 most recent Windows installer.
Never touches: downloads.html, latest.json, or the unversioned .app.tar.gz updater files.

Usage:
    python3 scripts/cleanup-r2.py --bucket solahub-downloads [--keep 2] [--dry-run]
"""
import argparse, os, re, sys, urllib.request, urllib.parse, json

VERSIONED = re.compile(
    r'^SolaHub_(\d+\.\d+\.\d+)_(aarch64\.dmg|x64\.dmg|x64-setup\.exe|x64_en-US\.msi'
    r'|aarch64\.app\.tar\.gz(?:\.sig)?|x64\.app\.tar\.gz(?:\.sig)?'
    r'|x64-setup\.nsis\.zip(?:\.sig)?)$'
)

def cf_api(path, method='GET', body=None):
    account_id = os.environ['CLOUDFLARE_ACCOUNT_ID']
    token = os.environ['CLOUDFLARE_API_TOKEN']
    url = f'https://api.cloudflare.com/client/v4/accounts/{account_id}{path}'
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method,
                                  headers={'Authorization': f'Bearer {token}',
                                           'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def list_objects(bucket):
    objects, cursor = [], None
    while True:
        qs = f'?limit=1000' + (f'&cursor={cursor}' if cursor else '')
        resp = cf_api(f'/r2/buckets/{bucket}/objects{qs}')
        objects += [o['key'] for o in resp.get('result', {}).get('objects', [])]
        if not resp.get('result', {}).get('truncated'):
            break
        cursor = resp['result']['cursor']
    return objects

def delete_object(bucket, key, dry_run):
    if dry_run:
        print(f'  [dry-run] would delete: {key}')
        return
    cf_api(f'/r2/buckets/{bucket}/objects/{urllib.parse.quote(key, safe="")}', method='DELETE')
    print(f'  deleted: {key}')

def parse_version(v):
    return tuple(int(x) for x in v.split('.'))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--bucket', default='solahub-downloads')
    ap.add_argument('--keep', type=int, default=2,
                    help='number of recent versions to keep per installer type')
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()

    print(f'Listing objects in {args.bucket}...')
    keys = list_objects(args.bucket)
    print(f'  {len(keys)} objects found')

    # Group versioned files by suffix
    by_suffix: dict[str, list[tuple]] = {}
    for key in keys:
        m = VERSIONED.match(key)
        if not m:
            continue
        version, suffix = m.group(1), m.group(2)
        by_suffix.setdefault(suffix, []).append((parse_version(version), version, key))

    to_delete = []
    for suffix, entries in by_suffix.items():
        entries.sort(reverse=True)  # newest first
        # Windows: keep only the 1 most recent (no CI build, manually uploaded)
        keep = 1 if 'setup' in suffix or 'msi' in suffix or 'nsis' in suffix else args.keep
        old = entries[keep:]
        for _, ver, key in old:
            to_delete.append(key)

    if not to_delete:
        print('Nothing to delete.')
        return

    print(f'\nDeleting {len(to_delete)} old object(s):')
    for key in sorted(to_delete):
        delete_object(args.bucket, key, args.dry_run)

    print('\nDone.')

if __name__ == '__main__':
    main()
