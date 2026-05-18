from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = (
        ('user', 'Пользователь'),
        ('renter', 'Собственник'),
        ('administration', 'Администрация'),
        ('system_admin', 'Системный администратор'),
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user')
    phone = models.CharField(max_length=20, blank=True)

    @property
    def is_renter(self):
        return self.role == 'renter' or self.is_staff or self.is_superuser

    @property
    def is_administration(self):
        return self.role == 'administration' or self.is_staff or self.is_superuser

    @property
    def is_system_admin(self):
        return self.role == 'system_admin' or self.is_superuser

    def __str__(self):
        return f"{self.email} ({self.role})"


class ActionLog(models.Model):
    ACTION_CHOICES = (
        ('view', 'Просмотр'),
        ('create', 'Создание'),
        ('update', 'Редактирование'),
        ('delete', 'Удаление'),
        ('booking_create', 'Создание бронирования'),
        ('booking_cancel', 'Отмена бронирования'),
        ('review_create', 'Создание отзыва'),
        ('review_update', 'Редактирование отзыва'),
        ('review_response', 'Ответ на отзыв'),
        ('image_upload', 'Загрузка фото'),
        ('image_update', 'Изменение фото'),
        ('image_delete', 'Удаление фото'),
    )

    actor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='action_logs',
    )
    action = models.CharField(max_length=40, choices=ACTION_CHOICES)
    entity_type = models.CharField(max_length=80)
    entity_id = models.PositiveIntegerField(null=True, blank=True)
    facility = models.ForeignKey(
        'facilities.Facility',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='action_logs',
    )
    description = models.CharField(max_length=255, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['facility', 'action']),
            models.Index(fields=['actor', 'created_at']),
            models.Index(fields=['entity_type', 'entity_id']),
        ]

    def __str__(self):
        actor = self.actor.username if self.actor_id else 'Гость'
        return f'{actor}: {self.action} {self.entity_type}#{self.entity_id}'
