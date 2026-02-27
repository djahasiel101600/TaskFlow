"""
Run periodically (e.g. every minute via cron) to create notifications for reminder_datetime and deadline.
With Redis/Celery in place, prefer using Celery Beat instead; this command remains for manual runs and dry-run.
"""
from django.core.management.base import BaseCommand
from tasks.reminders import process_reminders_and_deadlines


class Command(BaseCommand):
    help = "Create notifications for tasks with reminder_datetime or deadline reached."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Only print what would be done.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        reminders_created, deadlines_created = process_reminders_and_deadlines(dry_run=dry_run)
        if dry_run:
            self.stdout.write("Dry run: no notifications created.")
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Created {reminders_created} reminder(s) and {deadlines_created} deadline notification(s)."
                )
            )
