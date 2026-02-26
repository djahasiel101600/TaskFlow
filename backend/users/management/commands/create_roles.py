from django.core.management.base import BaseCommand
from users.models import Role


class Command(BaseCommand):
    help = "Create default COA roles (Auditor, Supervisor, Support Staff, Administrator)."

    def handle(self, *args, **options):
        defaults = [
            ("Auditor", {"can_view_tasks": True, "can_create_tasks": True, "can_edit_tasks": True}),
            (
                "Supervisor",
                {
                    "can_view_tasks": True,
                    "can_create_tasks": True,
                    "can_edit_tasks": True,
                    "can_assign_tasks": True,
                    "can_change_task_status": True,
                    "can_access_chat": True,
                },
            ),
            (
                "Support Staff",
                {"can_view_tasks": True, "can_create_tasks": True, "can_edit_tasks": True, "can_access_chat": True},
            ),
            (
                "Administrator",
                {
                    "can_view_tasks": True,
                    "can_create_tasks": True,
                    "can_edit_tasks": True,
                    "can_delete_tasks": True,
                    "can_assign_tasks": True,
                    "can_change_task_status": True,
                    "can_access_chat": True,
                    "can_manage_users": True,
                },
            ),
        ]
        for name, perms in defaults:
            Role.objects.update_or_create(name=name, defaults=perms)
            self.stdout.write(self.style.SUCCESS(f"Role '{name}' created/updated."))
