"""
Celery tasks for TaskFlow.
"""
from celery import shared_task
from .reminders import process_reminders_and_deadlines


@shared_task(name="tasks.check_reminders_and_deadlines")
def check_reminders_and_deadlines() -> dict:
    """
    Periodic task: create notifications for tasks whose reminder_datetime
    or deadline has been reached. Run every minute via Celery Beat.
    """
    reminders_created, deadlines_created = process_reminders_and_deadlines(dry_run=False)
    return {"reminders": reminders_created, "deadlines": deadlines_created}
