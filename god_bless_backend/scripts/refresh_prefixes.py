
#!/usr/bin/env python3
"""
End-to-end prefix refresh helper.

This script stitches together the manual steps we used to run separately:
    1. Update prefix_data.json from the latest NANPA dumps.
    2. Import the canonical JSON into the PhonePrefix table.
    3. Export a slimmed JSON cache & promote it to carrier_backup/data.json.
    4. (Optionally) reload runtime services so they consume the fresh cache.

Usage examples
--------------
Run the full pipeline:
    python scripts/refresh_prefixes.py

Dry-run to see the commands without executing:
    python scripts/refresh_prefixes.py --dry-run

Skip the network-heavy updater (useful if you already dropped a new prefix_data.json):
    python scripts/refresh_prefixes.py --skip-updater

Reload Gunicorn after the refresh:
    python scripts/refresh_prefixes.py --reload-cmd "sudo systemctl restart gunicorn"
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Iterable, Optional

ROOT = Path(__file__).resolve().parent.parent
PYTHON = Path(sys.executable)
UPDATER = ROOT / "Prefix" / "nanpa_updater.py"
IMPORTER = ROOT / "import_prefix_data.py"
MANAGE = ROOT / "manage.py"
CARRIER_BACKUP = ROOT / "carrier_backup"
DATA_JSON = CARRIER_BACKUP / "data.json"


class StepError(RuntimeError):
    """Raised when a refresh step fails."""


def run_command(cmd: Iterable[str], desc: str, dry_run: bool) -> None:
    printable = " ".join(cmd)
    print(f"\n[step] {desc}\n       {printable}")
    if dry_run:
        return

    result = subprocess.run(cmd, cwd=ROOT)
    if result.returncode != 0:
        raise StepError(f"Command failed ({desc}): {printable}")


def copy_latest_simple_json(dry_run: bool) -> Path:
    simple_files = sorted(
        CARRIER_BACKUP.glob("phoneprefix_simple_*.json"),
        key=lambda path: path.stat().st_mtime,
    )
    if not simple_files:
        raise StepError("No phoneprefix_simple_*.json files found; did the export run?")

    latest = simple_files[-1]
    print(f"\n[step] Updating lightweight cache\n       {latest.name} -> {DATA_JSON.name}")
    if dry_run:
        return latest

    shutil.copy2(latest, DATA_JSON)
    return latest


def reload_service(command: Optional[str], dry_run: bool) -> None:
    if not command:
        return

    print(f"\n[step] Reloading services\n       {command}")
    if dry_run:
        return

    result = subprocess.run(command, shell=True, cwd=ROOT)
    if result.returncode != 0:
        raise StepError(f"Service reload failed: {command}")


def refresh_prefixes(
    skip_updater: bool,
    skip_import: bool,
    skip_export: bool,
    dry_run: bool,
    reload_cmd: Optional[str],
) -> None:
    if not skip_updater:
        run_command([str(PYTHON), str(UPDATER)], "Fetch + rebuild prefix_data.json", dry_run)
    else:
        print("\n[info] Skipping NANPA updater step as requested.")

    if not skip_import:
        run_command([str(PYTHON), str(IMPORTER)], "Import prefix_data.json into DB", dry_run)
    else:
        print("\n[info] Skipping database import step as requested.")

    if not skip_export:
        run_command(
            [
                str(PYTHON),
                str(MANAGE),
                "export_carrier_data",
                "--output-dir",
                str(CARRIER_BACKUP),
            ],
            "Export PhonePrefix table to JSON backups",
            dry_run,
        )
        copy_latest_simple_json(dry_run=dry_run)
    else:
        print("\n[info] Skipping export/cache refresh step as requested.")

    reload_service(reload_cmd, dry_run=dry_run)
    print("\n[done] Prefix refresh pipeline finished successfully.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Automate the NANPA prefix refresh pipeline.")
    parser.add_argument("--skip-updater", action="store_true", help="Skip running Prefix/nanpa_updater.py")
    parser.add_argument("--skip-import", action="store_true", help="Skip import_prefix_data.py")
    parser.add_argument("--skip-export", action="store_true", help="Skip export_carrier_data + cache copy")
    parser.add_argument("--dry-run", action="store_true", help="Only print commands without executing")
    parser.add_argument(
        "--reload-cmd",
        default=None,
        help="Shell command to run after the cache refresh (e.g., restart validators)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    try:
        refresh_prefixes(
            skip_updater=args.skip_updater,
            skip_import=args.skip_import,
            skip_export=args.skip_export,
            dry_run=args.dry_run,
            reload_cmd=args.reload_cmd,
        )
    except StepError as exc:
        print(f"\n[error] {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
