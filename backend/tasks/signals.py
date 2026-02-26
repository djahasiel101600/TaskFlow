from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Task
from audit_logs.models import AuditLog


@receiver(post_save, sender=Task)
def task_audit_on_create(sender, instance, created, **kwargs):
    if created:
        AuditLog.objects.create(
            user_id=instance.created_by_id,
            action=AuditLog.ACTION_CREATE,
            model_name="task",
            object_id=instance.id,
            changes={"title": instance.title, "status": instance.status},
        )
