#!/usr/bin/env python
"""
Import prefix data JSON into PostgreSQL.

The script targets `carrier_backup/prefix_data.json` by default, but a custom
path can be supplied via `--path`. Run inside the Django project root once the
database is ready (migrations applied, settings configured).
"""

import argparse
import json
import os
import sys
from collections import Counter
from typing import Iterable, List, Optional

import django

# Ensure the Django settings module can be discovered before importing models.
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'god_bless_pro.settings')
django.setup()

from django.db import connection  # noqa: E402
from phone_number_validator.models import PhonePrefix  # noqa: E402

BATCH_SIZE = 1000
DEFAULT_JSON_PATH = os.path.join('carrier_backup', 'prefix_data.json')


def iter_chunks(items: List[dict], chunk_size: int) -> Iterable[List[dict]]:
    """Yield fixed-sized chunks from the provided list."""
    for index in range(0, len(items), chunk_size):
        yield items[index:index + chunk_size]


def skip_reason(raw: dict) -> Optional[str]:
    """Determine whether a record should be skipped and why."""
    prefix = (raw.get('prefix') or '').strip()
    if not prefix:
        return 'missing_prefix'

    carrier = (raw.get('carrier') or raw.get('company') or '').strip()
    if not carrier:
        return 'missing_carrier'

    last_source = (raw.get('last_source') or '').lower()
    if 'available' in last_source:
        return 'unassigned_prefix'

    return None


def normalise_record(raw: dict) -> PhonePrefix:
    """Convert a JSON record to a PhonePrefix instance."""
    prefix = (raw.get('prefix') or '').strip()
    carrier = (raw.get('carrier') or raw.get('company') or '').strip()
    city = (raw.get('city') or raw.get('rate_center') or '').strip()
    state = (raw.get('state') or '').strip()
    line_type = (raw.get('line_type') or raw.get('type') or '').strip()

    if not prefix:
        raise ValueError('Prefix is required for each record')

    if not carrier:
        raise ValueError('Carrier is required for each record')

    return PhonePrefix(
        prefix=prefix,
        carrier=carrier,
        city=city or 'Unknown City',
        state=state or 'Unknown State',
        line_type=line_type or 'Unknown Type',
    )


def load_json_records(path: str) -> List[dict]:
    """Load and flatten JSON records from file."""
    with open(path, 'r', encoding='utf-8') as json_file:
        payload = json.load(json_file)

    if isinstance(payload, dict):
        records = list(payload.values())
    elif isinstance(payload, list):
        records = payload
    else:
        raise ValueError('Unsupported JSON structure; expected dict or list')

    return records


def clear_existing_prefixes(record_total: int) -> None:
    """Drop existing rows quickly before bulk re-import."""
    table_name = PhonePrefix._meta.db_table
    vendor = connection.vendor

    # Prefer TRUNCATE for PostgreSQL because it is significantly faster
    # than row-by-row deletion and resets sequences.
    if vendor == 'postgresql':
        quoted_table = connection.ops.quote_name(table_name)
        with connection.cursor() as cursor:
            cursor.execute(f'TRUNCATE TABLE {quoted_table} RESTART IDENTITY CASCADE;')
        print(f'🧹 Truncated {record_total} existing records (PostgreSQL fast path).')
    else:
        PhonePrefix.objects.all().delete()
        print(f'🗑️  Cleared {record_total} existing records.')


def import_prefixes(path: str) -> None:
    """Import prefix data into PostgreSQL."""
    if not os.path.exists(path):
        print(f'❌ JSON file not found at {path}')
        return

    print(f'📂 Loading prefix data from {path}')
    try:
        records = load_json_records(path)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f'❌ Failed to load JSON: {exc}')
        return

    if not records:
        print('⚠️  No records found in JSON; nothing to import.')
        return

    # Filter out entries with missing carrier information or unassigned prefixes.
    skip_counters = Counter()
    filtered_records = []
    for raw in records:
        reason = skip_reason(raw)
        if reason:
            skip_counters[reason] += 1
            continue
        filtered_records.append(raw)

    skipped_total = sum(skip_counters.values())
    if skipped_total:
        reason_summary = ', '.join(f'{reason}: {count}' for reason, count in skip_counters.items())
        print(f'⚠️  Skipped {skipped_total} records ({reason_summary}).')

    if not filtered_records:
        print('❌ No eligible carrier records remain after filtering; aborting import.')
        return

    existing_count = PhonePrefix.objects.count()
    if existing_count > 0:
        clear_existing_prefixes(existing_count)

    print(f'📊 Preparing {len(filtered_records)} carrier records for import (from {len(records)} source rows)...')

    imported = 0
    for chunk in iter_chunks(filtered_records, BATCH_SIZE):
        prefixes = []
        for raw in chunk:
            try:
                prefixes.append(normalise_record(raw))
            except ValueError as exc:
                print(f'⚠️  Skipping record due to error: {exc}')

        if not prefixes:
            continue

        PhonePrefix.objects.bulk_create(prefixes, ignore_conflicts=True)
        imported += len(prefixes)
        progress = (imported / len(filtered_records)) * 100
        print(f'📈 Imported {imported}/{len(filtered_records)} records ({progress:.1f}%).')

    final_count = PhonePrefix.objects.count()
    print(f'✅ Import complete. Database now contains {final_count} records.')

    sample = PhonePrefix.objects.all()[:3]
    if sample:
        print('📋 Sample records:')
        for record in sample:
            print(
                f'   {record.prefix} -> {record.carrier} '
                f'({record.city}, {record.state}) [{record.line_type}]'
            )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description='Import prefix_data.json into PostgreSQL.'
    )
    parser.add_argument(
        '--path',
        default=DEFAULT_JSON_PATH,
        help='Path to prefix JSON file (default: carrier_backup/prefix_data.json).',
    )
    return parser.parse_args()


if __name__ == '__main__':
    arguments = parse_args()
    import_prefixes(arguments.path)
