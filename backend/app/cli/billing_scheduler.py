"""CLI entry point for running automated recurring billing.

Usage:
    python -m app.cli.billing_scheduler [--auto-confirm] [--date YYYY-MM-DD]

Can be invoked via Cron, systemd timer, or cloud scheduler jobs.
"""

import argparse
import sys
from datetime import datetime, timezone
from app.core.database import SessionLocal
from app.core.billing_engine import run_recurring_billing


def main():
    parser = argparse.ArgumentParser(description="Execute Brightloop recurring billing run.")
    parser.add_argument(
        "--auto-confirm",
        action="store_true",
        help="Automatically confirm generated draft invoices.",
    )
    parser.add_argument(
        "--date",
        type=str,
        default=None,
        help="Target date in ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSZ). Defaults to now.",
    )
    args = parser.parse_args()

    target_dt = None
    if args.date:
        try:
            target_dt = datetime.fromisoformat(args.date)
            if target_dt.tzinfo is None:
                target_dt = target_dt.replace(tzinfo=timezone.utc)
        except ValueError as e:
            print(f"Error: Invalid date format: {e}", file=sys.stderr)
            sys.exit(1)

    db = SessionLocal()
    try:
        print(f"Starting recurring billing run (target_date={target_dt or 'NOW'})...")
        result = run_recurring_billing(
            db=db,
            target_date=target_dt,
            auto_confirm=args.auto_confirm,
        )
        print(
            f"Billing run completed:\n"
            f"  Processed: {result['processed']}\n"
            f"  Created:   {result['created']}\n"
            f"  Skipped:   {result['skipped']}\n"
            f"  Failed:    {result['failed']}"
        )
        if result["errors"]:
            print("Errors encountered:")
            for err in result["errors"]:
                print(f"  - {err}", file=sys.stderr)
            sys.exit(1)
        sys.exit(0)
    finally:
        db.close()


if __name__ == "__main__":
    main()

