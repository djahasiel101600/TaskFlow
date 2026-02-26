from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User, Role


@receiver(post_save, sender=User)
def assign_admin_role_to_superuser(sender, instance, created, **kwargs):
    """When a superuser is created, assign the Administrator role."""
    if created and instance.is_superuser:
        admin_role = Role.objects.filter(name="Administrator").first()
        if admin_role:
            instance.role = admin_role
            instance.save(update_fields=["role"])
