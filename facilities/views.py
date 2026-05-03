from django.shortcuts import render
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from bookings.models import TimeSlot
from .models import SportsComplex, Facility, Review
from .serializers import SportsComplexSerializer, FacilitySerializer, ReviewSerializer

class IsReviewOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.client_id == request.user.id or request.user.is_administration

class SportsComplexViewSet(viewsets.ModelViewSet):
    """
    API endpoint для просмотра и редактирования спортивных комплексов.
    """
    queryset = SportsComplex.objects.all()
    serializer_class = SportsComplexSerializer
    permission_classes = [permissions.AllowAny] # Пока доступно всем, потом можно ограничить

    def perform_create(self, serializer):
        # При создании комплекса автоматически присваиваем текущего пользователя владельцем
        if self.request.user.is_authenticated:
            serializer.save(owner=self.request.user)
        else:
            raise permissions.PermissionDenied("Необходимо войти в систему для создания комплекса")

class FacilityViewSet(viewsets.ModelViewSet):
    """
    API endpoint для просмотра и редактирования площадок.
    """
    queryset = Facility.objects.all()
    serializer_class = FacilitySerializer
    permission_classes = [permissions.AllowAny]
    
    # Можно добавить фильтрацию, например: ?complex=1
    filterset_fields = ['type', 'complex']

    @action(detail=True, methods=['get'])
    def slots(self, request, pk=None):
        """Получить слоты для конкретной площадки на дату"""
        facility = self.get_object()
        date_str = request.query_params.get('date')
        
        if not date_str:
            return Response({"error": "Требуется параметр date"}, status=400)
        
        # Фильтрация слотов по дате и площадке
        # Примечание: start_time__date требует Django 2.0+
        slots = TimeSlot.objects.filter(
            facility=facility,
            start_time__date=date_str
        ).order_by('start_time')
        
        from bookings.serializers import TimeSlotSerializer
        serializer = TimeSlotSerializer(slots, many=True)
        return Response(serializer.data)

class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsReviewOwnerOrReadOnly()]

    def get_queryset(self):
        facility_id = self.request.query_params.get('facility')
        mine = self.request.query_params.get('mine')
        queryset = Review.objects.select_related('facility', 'client')
        if mine and self.request.user.is_authenticated:
            queryset = queryset.filter(client=self.request.user)
        if facility_id:
            return queryset.filter(facility_id=facility_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(client=self.request.user)
