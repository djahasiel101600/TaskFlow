"""
Celery application for TaskFlow.
Uses Redis as broker and result backend. Celery Beat runs check_reminders_and_deadlines every minute.
"""
import sys
from celery import Celery
from celery.schedules import crontab

import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("config")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

# On Windows the default prefork pool (billiard) often hits OSError [WinError 6] / PermissionError
# (invalid handle, access denied) in worker subprocesses. Use solo pool: single process, no forks.
if sys.platform == "win32":
    app.conf.worker_pool = "solo"

# Beat schedule: run reminder/deadline check every minute
app.conf.beat_schedule = {
    "check-reminders-and-deadlines": {
        "task": "tasks.check_reminders_and_deadlines",
        "schedule": crontab(minute="*"),  # every minute
    },
}
