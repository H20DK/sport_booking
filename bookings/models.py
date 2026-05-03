from django.db import models
from users.models import User
from facilities.models import Facility

class TimeSlot(models.Model):
    facility = models.ForeignKey(Facility, on_delete=models.CASCADE, related_name='slots')
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    is_booked = models.BooleanField(default=False)

    class Meta:
        unique_together = ('facility', 'start_time', 'end_time')

    def __str__(self):
        return f"{self.facility.name} [{self.start_time}]"

class Booking(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Ожидает оплаты'),
        ('confirmed', 'Подтверждено'),
        ('cancelled', 'Отменено'),
    )
    client = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookings')
    slot = models.OneToOneField(TimeSlot, on_delete=models.CASCADE, related_name='booking')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)

    def cancel(self):
        if self.status != 'cancelled':
            self.status = 'cancelled'
            self.slot.is_booked = False
            self.save()
            self.slot.save()
