from rest_framework import serializers
from .models import Booking, TimeSlot
from facilities.serializers import FacilitySerializer

class TimeSlotSerializer(serializers.ModelSerializer):
    facility_name = serializers.CharField(source='facility.name', read_only=True)
    
    class Meta:
        model = TimeSlot
        fields = ['id', 'facility', 'facility_name', 'start_time', 'end_time', 'is_booked']

class BookingSerializer(serializers.ModelSerializer):
    slot_details = TimeSlotSerializer(source='slot', read_only=True)
    client = serializers.StringRelatedField(read_only=True)
    
    class Meta:
        model = Booking
        fields = ['id', 'client', 'slot', 'slot_details', 'status', 'total_price', 'created_at']
        read_only_fields = ['client', 'status', 'total_price', 'created_at']
