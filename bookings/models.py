from django.db import models
from django.db.models import Sum
from users.models import User
from facilities.models import Facility

class TimeSlot(models.Model):
    facility = models.ForeignKey(Facility, on_delete=models.CASCADE, related_name='slots')
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    title = models.CharField(max_length=120, blank=True)
    trainer_name = models.CharField(max_length=120, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    capacity = models.PositiveIntegerField(default=1)
    is_booked = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('facility', 'start_time', 'end_time')

    def __str__(self):
        return f"{self.facility.name} [{self.start_time}]"

    @property
    def booked_count(self):
        return self.bookings.exclude(status='cancelled').aggregate(total=Sum('seats'))['total'] or 0

    @property
    def available_spots(self):
        return max(self.capacity - self.booked_count, 0)

    def refresh_booking_state(self):
        self.is_booked = self.available_spots <= 0
        self.save(update_fields=['is_booked'])

class Booking(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Ожидает оплаты'),
        ('confirmed', 'Подтверждено'),
        ('cancelled', 'Отменено'),
    )
    client = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookings')
    slot = models.ForeignKey(TimeSlot, on_delete=models.CASCADE, related_name='bookings')
    seats = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)

    def cancel(self):
        if self.status != 'cancelled':
            self.status = 'cancelled'
            self.save()
            if self.slot:
                self.slot.refresh_booking_state()
