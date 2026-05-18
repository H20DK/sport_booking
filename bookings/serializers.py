from rest_framework import serializers
from .models import Booking, TimeSlot
from facilities.serializers import FacilitySerializer

class TimeSlotSerializer(serializers.ModelSerializer):
    facility_name = serializers.CharField(source='facility.name', read_only=True)
    complex_name = serializers.CharField(source='facility.complex.name', read_only=True)
    active_booking_id = serializers.SerializerMethodField()
    active_booking_seats = serializers.SerializerMethodField()
    booked_count = serializers.IntegerField(read_only=True)
    available_spots = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = TimeSlot
        fields = [
            'id', 'facility', 'facility_name', 'complex_name',
            'start_time', 'end_time', 'title', 'trainer_name',
            'price', 'capacity', 'booked_count', 'available_spots',
            'is_booked', 'is_active', 'active_booking_id', 'active_booking_seats'
        ]

    def validate(self, attrs):
        start_time = attrs.get('start_time', getattr(self.instance, 'start_time', None))
        end_time = attrs.get('end_time', getattr(self.instance, 'end_time', None))

        if start_time and end_time and start_time >= end_time:
            raise serializers.ValidationError({
                'end_time': 'Время окончания должно быть позже времени начала.'
            })

        return attrs

    def get_active_booking_id(self, obj):
        request = self.context.get('request')
        queryset = obj.bookings.exclude(status='cancelled').order_by('-created_at')
        if request and request.user.is_authenticated and not request.user.is_renter and not request.user.is_administration:
            queryset = queryset.filter(client=request.user)
        booking = queryset.first()
        return booking.id if booking else None

    def get_active_booking_seats(self, obj):
        request = self.context.get('request')
        queryset = obj.bookings.exclude(status='cancelled').order_by('-created_at')
        if request and request.user.is_authenticated and not request.user.is_renter and not request.user.is_administration:
            queryset = queryset.filter(client=request.user)
        booking = queryset.first()
        return booking.seats if booking else 0

class BookingSerializer(serializers.ModelSerializer):
    slot_details = TimeSlotSerializer(source='slot', read_only=True)
    client = serializers.StringRelatedField(read_only=True)
    client_id = serializers.IntegerField(source='client.id', read_only=True)
    client_username = serializers.CharField(source='client.username', read_only=True)
    client_email = serializers.EmailField(source='client.email', read_only=True)
    client_phone = serializers.CharField(source='client.phone', read_only=True)
    
    class Meta:
        model = Booking
        fields = [
            'id', 'client', 'client_id', 'client_username', 'client_email', 'client_phone',
            'slot', 'slot_details', 'seats', 'status', 'total_price', 'created_at'
        ]
        read_only_fields = ['client', 'total_price', 'created_at']
