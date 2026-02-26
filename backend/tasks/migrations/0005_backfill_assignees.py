from django.db import migrations


def backfill_assignees(apps, schema_editor):
    Task = apps.get_model("tasks", "Task")
    for task in Task.objects.all():
        if task.assigned_to_id and not task.assignees.filter(id=task.assigned_to_id).exists():
            task.assignees.add(task.assigned_to_id)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("tasks", "0004_assignees_and_comments"),
    ]

    operations = [
        migrations.RunPython(backfill_assignees, noop),
    ]
