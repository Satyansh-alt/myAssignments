"""
Entry point for the Railway Cron Job service.
Runs hourly; emails any user whose local time is currently 8am about
assignments due today, if the digest is enabled for them.
"""

from app.database import SessionLocal
from app.services.digest_service import run_daily_digest

if __name__ == "__main__":
    db = SessionLocal()
    try:
        result = run_daily_digest(db)
        print(f"Digest run complete. Sent: {result['sent']}, skipped (nothing due): {result['skipped_empty']}")
    finally:
        db.close()
