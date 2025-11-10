#!/usr/bin/env python
"""
Import prefix data JSON into PostgreSQL.

Primary source: carrier_backup/prefix_data.json (canonical NANPA export).
Optional helper: carrier_backup/data.json (legacy cache with curated labels).

The importer keeps NANPA data authoritative while borrowing any helpful
fallback fields from the legacy cache when the canonical record is blank.
"""

import argparse
import json
import os
import sys
from collections import Counter
from typing import Dict, Iterable, List, Optional, Tuple

import django

# Ensure the Django settings module can be discovered before importing models.
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "god_bless_pro.settings")
django.setup()

from django.db import connection  # noqa: E402
from phone_number_validator.models import PhonePrefix  # noqa: E402

BATCH_SIZE = 1000
DEFAULT_JSON_PATH = os.path.join("carrier_backup", "prefix_data.json")
DEFAULT_LEGACY_PATH = os.path.join("carrier_backup", "data.json")


def iter_chunks(items: List[Tuple[dict, Optional[dict]]], chunk_size: int) -> Iterable[List[Tuple[dict, Optional[dict]]]]:
    """Yield fixed-sized chunks from the provided list."""
    for index in range(0, len(items), chunk_size):
        yield items[index : index + chunk_size]


def skip_reason(raw: dict, legacy: Optional[dict]) -> Optional[str]:
    """Determine whether a record should be skipped and why."""
    prefix = (raw.get("prefix") or "").strip()
    if not prefix:
        return "missing_prefix"

    carrier = (raw.get("carrier") or raw.get("company") or "").strip()
    if not carrier and legacy:
        carrier = (legacy.get("carrier") or "").strip()
    if not carrier:
        return "missing_carrier"

    last_source = (raw.get("last_source") or "").lower()
    if "available" in last_source:
        return "unassigned_prefix"

    return None


def choose_value(primary: str, fallback: str, *, allow_unknown: bool = False) -> str:
    """Return the primary value unless it is blank (or Unknown* when allowed)."""
    primary = (primary or "").strip()
    fallback = (fallback or "").strip()

    if not primary:
        return fallback or primary

    if allow_unknown and primary.lower().startswith("unknown"):
        return fallback or primary

    return primary


def normalise_record(raw: dict, legacy: Optional[dict], stats: Counter) -> PhonePrefix:
    """Convert a JSON record to a PhonePrefix instance, enriched with legacy metadata."""
    prefix = (raw.get("prefix") or "").strip()
    carrier = (raw.get("carrier") or raw.get("company") or "").strip()
    city = (raw.get("city") or raw.get("rate_center") or "").strip()
    state = (raw.get("state") or "").strip()
    line_type = (raw.get("line_type") or raw.get("type") or "").strip()

    legacy_carrier = (legacy.get("carrier") or legacy.get("company") or "").strip() if legacy else ""
    legacy_city = (legacy.get("city") or "").strip() if legacy else ""
    legacy_state = (legacy.get("state") or "").strip() if legacy else ""
    legacy_type = (legacy.get("type") or legacy.get("line_type") or "").strip() if legacy else ""

    if not carrier and legacy_carrier:
        carrier = legacy_carrier
        stats["legacy_carrier"] += 1

    if not prefix:
        raise ValueError("Prefix is required for each record")
    if not carrier:
        raise ValueError("Carrier is required for each record")

    merged_city = choose_value(city, legacy_city, allow_unknown=True) or "Unknown City"
    merged_state = choose_value(state, legacy_state, allow_unknown=True) or "Unknown State"
    merged_type = choose_value(line_type, legacy_type, allow_unknown=True) or "Unknown Type"

    if merged_city != city and legacy_city:
        stats["legacy_city"] += 1
    if merged_state != state and legacy_state:
        stats["legacy_state"] += 1
    if merged_type != line_type and legacy_type:
        stats["legacy_type"] += 1

    return PhonePrefix(
        prefix=prefix,
        carrier=carrier,
        city=merged_city,
        state=merged_state,
        line_type=merged_type,
    )


def load_json_records(path: str) -> List[dict]:
    """Load and flatten JSON records from file."""
    with open(path, "r", encoding="utf-8") as json_file:
        payload = json.load(json_file)

    if isinstance(payload, dict):
        records = list(payload.values())
    elif isinstance(payload, list):
        records = payload
    else:
        raise ValueError("Unsupported JSON structure; expected dict or list")

    return records


def load_legacy_lookup(path: str) -> Dict[str, dict]:
    """Load legacy data.json so we can borrow friendlier fields."""
    if not path or not os.path.exists(path):
        print(f"[info] No legacy cache found at {path}; continuing without it.")
        return {}

    with open(path, "r", encoding="utf-8") as json_file:
        payload = json.load(json_file)

    if isinstance(payload, dict):
        return payload

    lookup: Dict[str, dict] = {}
    for item in payload:
        prefix = (item.get("prefix") or "").strip()
        if prefix:
            lookup[prefix] = item
    return lookup


def clear_existing_prefixes(record_total: int) -> None:
    """Drop existing rows quickly before bulk re-import."""
    table_name = PhonePrefix._meta.db_table
    vendor = connection.vendor

    if vendor == "postgresql":
        quoted_table = connection.ops.quote_name(table_name)
        with connection.cursor() as cursor:
            cursor.execute(f"TRUNCATE TABLE {quoted_table} RESTART IDENTITY CASCADE;")
        print(f"[info] Truncated {record_total} existing records (PostgreSQL fast path).")
    else:
        PhonePrefix.objects.all().delete()
        print(f"[info] Cleared {record_total} existing records.")


def import_prefixes(path: str, legacy_path: Optional[str]) -> None:
    """Import prefix data into PostgreSQL."""
    if not os.path.exists(path):
        print(f"[error] JSON file not found at {path}")
        return

    print(f"[info] Loading prefix data from {path}")
    try:
        records = load_json_records(path)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"[error] Failed to load JSON: {exc}")
        return

    if not records:
        print("[warn] No records found in JSON; nothing to import.")
        return

    legacy_lookup = load_legacy_lookup(legacy_path) if legacy_path else {}
    if legacy_lookup:
        print(f"[info] Loaded {len(legacy_lookup):,} legacy cache entries for enrichment.")

    skip_counters = Counter()
    filtered_records: List[Tuple[dict, Optional[dict]]] = []
    for raw in records:
        prefix = (raw.get("prefix") or "").strip()
        legacy = legacy_lookup.get(prefix)
        reason = skip_reason(raw, legacy)
        if reason:
            skip_counters[reason] += 1
            continue
        filtered_records.append((raw, legacy))

    skipped_total = sum(skip_counters.values())
    if skipped_total:
        reason_summary = ", ".join(f"{reason}: {count}" for reason, count in skip_counters.items())
        print(f"[warn] Skipped {skipped_total} records ({reason_summary}).")

    if not filtered_records:
        print("[error] No eligible carrier records remain after filtering; aborting import.")
        return

    existing_count = PhonePrefix.objects.count()
    if existing_count > 0:
        clear_existing_prefixes(existing_count)

    print(f"[info] Preparing {len(filtered_records)} carrier records for import (from {len(records)} source rows)...")

    imported = 0
    enrichment_stats = Counter()
    for chunk in iter_chunks(filtered_records, BATCH_SIZE):
        prefixes = []
        for raw, legacy in chunk:
            try:
                prefixes.append(normalise_record(raw, legacy, enrichment_stats))
            except ValueError as exc:
                print(f"[warn] Skipping record due to error: {exc}")

        if not prefixes:
            continue

        PhonePrefix.objects.bulk_create(prefixes, ignore_conflicts=True)
        imported += len(prefixes)
        progress = (imported / len(filtered_records)) * 100
        print(f"[info] Imported {imported}/{len(filtered_records)} records ({progress:.1f}%).")

    final_count = PhonePrefix.objects.count()
    print(f"[success] Import complete. Database now contains {final_count} records.")

    if enrichment_stats:
        summary = ", ".join(f"{field}: {count}" for field, count in enrichment_stats.items())
        print(f"[info] Legacy cache contributed -> {summary}")

    sample = PhonePrefix.objects.all()[:3]
    if sample:
        print("[info] Sample records:")
        for record in sample:
            print(f"   {record.prefix} -> {record.carrier} ({record.city}, {record.state}) [{record.line_type}]")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import prefix_data.json into PostgreSQL.")
    parser.add_argument(
        "--path",
        default=DEFAULT_JSON_PATH,
        help="Path to prefix JSON file (default: carrier_backup/prefix_data.json).",
    )
    parser.add_argument(
        "--legacy-path",
        default=DEFAULT_LEGACY_PATH,
        help="Optional path to legacy data.json for enrichment (default: carrier_backup/data.json).",
    )
    return parser.parse_args()


if __name__ == "__main__":
    arguments = parse_args()
    import_prefixes(arguments.path, arguments.legacy_path)
