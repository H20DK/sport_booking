from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = (
        ('user', 'Пользователь'),
        ('renter', 'Арендатор'),
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
