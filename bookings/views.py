from django.shortcuts import render
from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db import transaction
from django.utils import timezone
from users.logging import log_action
from users.models import User
from .models import Booking, TimeSlot
from .serializers import BookingSerializer, TimeSlotSerializer


class TimeSlotViewSet(viewsets.ModelViewSet):
    serializer_class = TimeSlotSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = TimeSlot.objects.select_related(
            'facility', 'facility__complex', 'facility__complex__owner'
        ).prefetch_related('bookings').filter(is_active=True)

        if user.is_administration:
            return queryset
        if user.is_renter:
            return queryset.filter(facility__complex__owner=user)
        return queryset.none()

    def perform_create(self, serializer):
        facility = serializer.validated_data['facility']
        if not self.request.user.is_administration and facility.complex.owner_id != self.request.user.id:
            raise permissions.PermissionDenied('Можно создавать слоты только для своих площадок')
        slot = serializer.save()
        log_action(self.request, 'create', slot, facility=slot.facility, description=f'Создан слот {slot.facility.name}')

    def perform_update(self, serializer):
        slot = self.get_object()
        facility = serializer.validated_data.get('facility', slot.facility)
        if not self.request.user.is_administration and facility.complex.owner_id != self.request.user.id:
            raise permissions.PermissionDenied('Можно редактировать слоты только своих площадок')

        slot = serializer.save()
        log_action(self.request, 'update', slot, facility=slot.facility, description=f'Обновлен слот {slot.facility.name}')

    def destroy(self, request, *args, **kwargs):
        slot = self.get_object()
        active_bookings = slot.bookings.exclude(status='cancelled')

        for booking in active_bookings:
            booking.cancel()
            log_action(request, 'booking_cancel', booking, facility=slot.facility, description=f'Отменена бронь при удалении слота {slot.facility.name}')

        log_action(request, 'delete', slot, facility=slot.facility, description=f'Удален слот {slot.facility.name}')
        slot.is_active = False
        slot.is_booked = False
        slot.save(update_fields=['is_active', 'is_booked'])
        return Response(status=status.HTTP_204_NO_CONTENT)

class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Booking.objects.select_related('client', 'slot__facility__complex__owner')

        if user.is_administration:
            return queryset
        if user.is_renter:
            return queryset.filter(slot__facility__complex__owner=user)
        return queryset.filter(client=user)

    def perform_update(self, serializer):
        booking = serializer.save()
        if booking.status == 'cancelled':
            action = 'booking_cancel'
        else:
            action = 'update'
        booking.slot.refresh_booking_state()
        log_action(self.request, action, booking, facility=booking.slot.facility, description=f'Обновлена бронь {booking.slot.facility.name}')

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        slot_id = request.data.get('slot_id')
        try:
            # Блокировка строки для защиты от гонки
            slot = TimeSlot.objects.select_for_update().get(pk=slot_id)
        except TimeSlot.DoesNotExist:
            return Response({"error": "Слот не найден"}, status=status.HTTP_404_NOT_FOUND)

        requested_seats = request.data.get('seats', 1)
        try:
            requested_seats = int(requested_seats)
        except (TypeError, ValueError):
            return Response({"error": "Количество мест должно быть числом"}, status=status.HTTP_400_BAD_REQUEST)

        if requested_seats < 1:
            return Response({"error": "Количество мест должно быть больше нуля"}, status=status.HTTP_400_BAD_REQUEST)

        active_bookings = Booking.objects.select_for_update().filter(
            slot=slot
        ).exclude(status='cancelled')
        booked_seats = sum(booking.seats for booking in active_bookings)
        available_spots = max(slot.capacity - booked_seats, 0)

        if requested_seats > available_spots:
            slot.refresh_booking_state()
            return Response({"error": f"Свободных мест недостаточно. Доступно: {available_spots}"}, status=status.HTTP_409_CONFLICT)

        if slot.start_time < timezone.now():
            return Response({"error": "Нельзя бронировать прошлое"}, status=status.HTTP_400_BAD_REQUEST)

        client = request.user
        if request.user.is_administration and request.data.get('client_id'):
            try:
                client = User.objects.get(pk=request.data.get('client_id'))
            except User.DoesNotExist:
                return Response({"error": "Пользователь не найден"}, status=status.HTTP_404_NOT_FOUND)

        booking = Booking.objects.create(
            client=client,
            slot=slot,
            seats=requested_seats,
            total_price=(slot.price if slot.price is not None else slot.facility.price_per_hour) * requested_seats,
            status=request.data.get('status', 'confirmed') if request.user.is_administration else 'confirmed'
        )
        
        slot.refresh_booking_state()
        log_action(request, 'booking_create', booking, facility=slot.facility, description=f'Создана бронь {slot.facility.name}')

        serializer = self.get_serializer(booking)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        booking = self.get_object()
        # Проверка прав: только владелец брони или админ
        can_manage_as_owner = (
            request.user.is_renter
            and booking.slot.facility.complex.owner_id == request.user.id
        )
        if booking.client != request.user and not request.user.is_administration and not can_manage_as_owner:
            return Response({"detail": "Нет прав"}, status=403)
        
        booking.cancel()
        log_action(request, 'booking_cancel', booking, facility=booking.slot.facility, description=f'Отменена бронь {booking.slot.facility.name}')
        return Response({"status": "Бронь отменена"})
