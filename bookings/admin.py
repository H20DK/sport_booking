from django.contrib import admin
from .models import TimeSlot, Booking

@admin.register(TimeSlot)
class TimeSlotAdmin(admin.ModelAdmin):
    list_display = ('facility', 'start_time', 'end_time', 'is_booked')
    list_filter = ('is_booked', 'facility')

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('id', 'client', 'slot', 'status', 'total_price', 'created_at')
    list_filter = ('status', 'created_at')
    readonly_fields = ('created_at',)