#!/usr/bin/env python3
"""Generate the Tauri updater latest.json from signed release artifacts."""

from __future__ import annotations

import argparse
import datetime as dt
import json
from pathlib import Path


def read_signature(path: Path) -> str:
    value = path.read_text(encoding="utf-8").strip()
    if not value:
        raise SystemExit(f"Signature file is empty: {path}")
    return value


def require_file(path: Path) -> Path:
    if not path.is_file():
        raise SystemExit(f"Required updater artifact is missing: {path}")
    return path


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build latest.json for Tauri updater releases."
    )
    parser.add_argument("--dist", default="dist", help="Directory containing release assets.")
    parser.add_argument("--tag", required=True, help="Release tag, for example v0.1.5.")
    parser.add_argument("--r2-base", required=True, help="Public R2 base URL.")
    parser.add_argument("--output", default="dist/latest.json", help="Output JSON path.")
    parser.add_argument(
        "--windows-optional",
        action="store_true",
        help="Skip Windows platform if artifacts are absent (macOS-only release).",
    )
    args = parser.parse_args()

    dist = Path(args.dist)
    output = Path(args.output)
    version = args.tag.removeprefix("v")
    r2_base = args.r2_base.rstrip("/")

    if not dist.is_dir():
        raise SystemExit(f"Release artifact directory does not exist: {dist}")

    mac_arm_archive = require_file(dist / "SolaHub_aarch64.app.tar.gz")
    mac_arm_sig = require_file(dist / "SolaHub_aarch64.app.tar.gz.sig")
    mac_x64_archive = require_file(dist / "SolaHub_x64.app.tar.gz")
    mac_x64_sig = require_file(dist / "SolaHub_x64.app.tar.gz.sig")

    windows_sigs = sorted(dist.glob("*.nsis.zip.sig"))
    if not windows_sigs and not args.windows_optional:
        raise SystemExit("Required Windows updater signature is missing: *.nsis.zip.sig")
    if len(windows_sigs) > 1:
        names = ", ".join(path.name for path in windows_sigs)
        raise SystemExit(f"Expected one Windows updater signature, found: {names}")

    platforms: dict[str, dict[str, str]] = {
        "darwin-aarch64": {
            "signature": read_signature(mac_arm_sig),
            "url": f"{r2_base}/{mac_arm_archive.name}",
        },
        "darwin-x86_64": {
            "signature": read_signature(mac_x64_sig),
            "url": f"{r2_base}/{mac_x64_archive.name}",
        },
    }

    if windows_sigs:
        windows_sig = windows_sigs[0]
        windows_archive = require_file(dist / windows_sig.name.removesuffix(".sig"))
        platforms["windows-x86_64"] = {
            "signature": read_signature(windows_sig),
            "url": f"{r2_base}/{windows_archive.name}",
        }
    else:
        print("Windows artifacts absent — publishing macOS-only latest.json")

    data = {
        "version": version,
        "notes": "See the changelog for details.",
        "pub_date": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "platforms": platforms,
    }

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"Generated {output}")


if __name__ == "__main__":
    main()
