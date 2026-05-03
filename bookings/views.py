from django.shortcuts import render
from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db import transaction
from django.utils import timezone
from .models import Booking, TimeSlot
from .serializers import BookingSerializer

class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Booking.objects.select_related('client', 'slot__facility__complex__owner')

        if user.role == 'admin':
            return queryset
        if user.role == 'owner':
            return queryset.filter(slot__facility__complex__owner=user)
        return queryset.filter(client=user)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        slot_id = request.data.get('slot_id')
        try:
            # Блокировка строки для защиты от гонки
            slot = TimeSlot.objects.select_for_update().get(pk=slot_id)
        except TimeSlot.DoesNotExist:
            return Response({"error": "Слот не найден"}, status=status.HTTP_404_NOT_FOUND)

        if slot.is_booked:
            return Response({"error": "Слот уже занят"}, status=status.HTTP_409_CONFLICT)

        if slot.start_time < timezone.now():
            return Response({"error": "Нельзя бронировать прошлое"}, status=status.HTTP_400_BAD_REQUEST)

        booking = Booking.objects.create(
            client=request.user,
            slot=slot,
            total_price=slot.facility.price_per_hour,
            status='confirmed' # Для упрощения сразу подтверждаем
        )
        
        slot.is_booked = True
        slot.save()

        serializer = self.get_serializer(booking)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        booking = self.get_object()
        # Проверка прав: только владелец брони или админ
        can_manage_as_owner = (
            request.user.role == 'owner'
            and booking.slot.facility.complex.owner_id == request.user.id
        )
        if booking.client != request.user and request.user.role != 'admin' and not can_manage_as_owner:
            return Response({"detail": "Нет прав"}, status=403)
        
        booking.cancel()
        return Response({"status": "Бронь отменена"})
