from .models import ActionLog


def log_action(request, action, instance=None, facility=None, description='', metadata=None):
    user = getattr(request, 'user', None)
    actor = user if getattr(user, 'is_authenticated', False) else None
    entity_type = instance.__class__.__name__ if instance is not None else ''
    entity_id = getattr(instance, 'id', None)

    if facility is None and instance is not None:
        facility = getattr(instance, 'facility', None)
        if facility is None and hasattr(instance, 'slot'):
            facility = getattr(instance.slot, 'facility', None)

    ActionLog.objects.create(
        actor=actor,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        facility=facility,
        description=description,
        metadata=metadata or {},
    )
