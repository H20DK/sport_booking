from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from bookings.models import TimeSlot
from users.logging import log_action
from .models import Facility, FacilityImage, FacilityKind, Review, SportsComplex, SportType
from .serializers import FacilityImageSerializer, FacilityKindSerializer, FacilitySerializer, ReviewSerializer, SportsComplexSerializer, SportTypeSerializer


class IsRenterOrAdminForWrite(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and (request.user.is_renter or request.user.is_administration)

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if request.user.is_administration:
            return True

        owner_id = getattr(obj, 'owner_id', None)
        if owner_id is None and hasattr(obj, 'complex'):
            owner_id = obj.complex.owner_id

        return owner_id == request.user.id


class IsReviewOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.client_id == request.user.id or request.user.is_administration


class IsAdminForKindWrite(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and request.user.is_administration


class FacilityKindViewSet(viewsets.ModelViewSet):
    queryset = FacilityKind.objects.all()
    serializer_class = FacilityKindSerializer
    permission_classes = [IsAdminForKindWrite]

    def perform_create(self, serializer):
        kind = serializer.save()
        log_action(self.request, 'create', kind, description=f'Создан вид площадки {kind.name}')

    def perform_update(self, serializer):
        kind = serializer.save()
        log_action(self.request, 'update', kind, description=f'Обновлен вид площадки {kind.name}')

    def perform_destroy(self, instance):
        log_action(self.request, 'delete', instance, description=f'Удален вид площадки {instance.name}')
        instance.delete()


class SportTypeViewSet(viewsets.ModelViewSet):
    queryset = SportType.objects.all()
    serializer_class = SportTypeSerializer
    permission_classes = [IsAdminForKindWrite]

    def perform_create(self, serializer):
        sport_type = serializer.save()
        log_action(self.request, 'create', sport_type, description=f'Создан вид спорта {sport_type.name}')

    def perform_update(self, serializer):
        sport_type = serializer.save()
        log_action(self.request, 'update', sport_type, description=f'Обновлен вид спорта {sport_type.name}')

    def perform_destroy(self, instance):
        log_action(self.request, 'delete', instance, description=f'Удален вид спорта {instance.name}')
        instance.delete()


class SportsComplexViewSet(viewsets.ModelViewSet):
    serializer_class = SportsComplexSerializer
    permission_classes = [IsRenterOrAdminForWrite]

    def get_queryset(self):
        queryset = SportsComplex.objects.prefetch_related('facilities')
        if self.request.query_params.get('mine') and self.request.user.is_authenticated:
            return queryset.filter(owner=self.request.user)
        return queryset

    def perform_create(self, serializer):
        if self.request.user.is_administration:
            complex_obj = serializer.save(owner=serializer.validated_data.get('owner', self.request.user))
        else:
            complex_obj = serializer.save(owner=self.request.user)
        log_action(self.request, 'create', complex_obj, description=f'Создан спорткомплекс {complex_obj.name}')

    def perform_update(self, serializer):
        if self.request.user.is_administration:
            complex_obj = serializer.save()
        else:
            complex_obj = serializer.save(owner=self.request.user)
        log_action(self.request, 'update', complex_obj, description=f'Обновлен спорткомплекс {complex_obj.name}')

    def perform_destroy(self, instance):
        log_action(self.request, 'delete', instance, description=f'Удален спорткомплекс {instance.name}')
        instance.delete()


class FacilityViewSet(viewsets.ModelViewSet):
    serializer_class = FacilitySerializer
    permission_classes = [IsRenterOrAdminForWrite]
    filterset_fields = ['type', 'kind', 'complex']

    def get_queryset(self):
        queryset = Facility.objects.select_related('complex', 'complex__owner', 'kind').prefetch_related('images')
        if self.request.query_params.get('mine') and self.request.user.is_authenticated:
            return queryset.filter(complex__owner=self.request.user)
        return queryset

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        facility = self.get_object()
        log_action(request, 'view', facility, facility=facility, description=f'Просмотр объекта {facility.name}')
        return response

    def perform_create(self, serializer):
        complex_obj = serializer.validated_data['complex']
        if not self.request.user.is_administration and complex_obj.owner_id != self.request.user.id:
            raise permissions.PermissionDenied('Можно добавлять площадки только в свои комплексы')
        facility = serializer.save()
        log_action(self.request, 'create', facility, facility=facility, description=f'Создан объект {facility.name}')

    def perform_update(self, serializer):
        complex_obj = serializer.validated_data.get('complex', serializer.instance.complex)
        if not self.request.user.is_administration and complex_obj.owner_id != self.request.user.id:
            raise permissions.PermissionDenied('Можно переносить площадки только между своими спорткомплексами')
        facility = serializer.save()
        log_action(self.request, 'update', facility, facility=facility, description=f'Обновлен объект {facility.name}')

    def perform_destroy(self, instance):
        log_action(self.request, 'delete', instance, facility=instance, description=f'Удален объект {instance.name}')
        instance.delete()

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_image(self, request, pk=None):
        facility = self.get_object()
        image_file = request.FILES.get('image')
        if not image_file:
            return Response({'detail': 'Файл изображения не передан'}, status=status.HTTP_400_BAD_REQUEST)

        is_main = str(request.data.get('is_main', '')).lower() in ['1', 'true', 'yes', 'on']
        if is_main:
            facility.images.update(is_main=False)

        image = FacilityImage.objects.create(
            facility=facility,
            image=image_file,
            is_main=is_main or not facility.images.exists(),
        )
        log_action(request, 'image_upload', image, facility=facility, description=f'Загружено фото объекта {facility.name}')
        return Response(FacilityImageSerializer(image).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path=r'images/(?P<image_id>[^/.]+)/set_main')
    def set_main_image(self, request, pk=None, image_id=None):
        facility = self.get_object()
        try:
            image = facility.images.get(pk=image_id)
        except FacilityImage.DoesNotExist:
            return Response({'detail': 'Фото не найдено'}, status=status.HTTP_404_NOT_FOUND)

        facility.images.update(is_main=False)
        image.is_main = True
        image.save(update_fields=['is_main'])
        log_action(request, 'image_update', image, facility=facility, description=f'Изменено главное фото объекта {facility.name}')
        return Response(FacilityImageSerializer(image).data)

    @action(detail=True, methods=['delete'], url_path=r'images/(?P<image_id>[^/.]+)')
    def delete_image(self, request, pk=None, image_id=None):
        facility = self.get_object()
        try:
            image = facility.images.get(pk=image_id)
        except FacilityImage.DoesNotExist:
            return Response({'detail': 'Фото не найдено'}, status=status.HTTP_404_NOT_FOUND)

        log_action(request, 'image_delete', image, facility=facility, description=f'Удалено фото объекта {facility.name}')
        image.delete()
        first_image = facility.images.order_by('id').first()
        if first_image and not facility.images.filter(is_main=True).exists():
            first_image.is_main = True
            first_image.save(update_fields=['is_main'])

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'])
    def slots(self, request, pk=None):
        facility = self.get_object()
        date_str = request.query_params.get('date')

        if not date_str:
            return Response({'error': 'Требуется параметр date'}, status=400)

        slots = TimeSlot.objects.filter(
            facility=facility,
            start_time__date=date_str,
            is_active=True,
        ).order_by('start_time')

        from bookings.serializers import TimeSlotSerializer
        serializer = TimeSlotSerializer(slots, many=True, context={'request': request})
        return Response(serializer.data)


class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        if self.action == 'respond':
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsReviewOwnerOrReadOnly()]

    def get_queryset(self):
        facility_id = self.request.query_params.get('facility')
        mine = self.request.query_params.get('mine')
        owner = self.request.query_params.get('owner')
        queryset = Review.objects.select_related('facility', 'facility__complex', 'client')

        if mine and self.request.user.is_authenticated:
            queryset = queryset.filter(client=self.request.user)
        if owner and self.request.user.is_authenticated:
            queryset = queryset.filter(facility__complex__owner=self.request.user)
        if facility_id:
            queryset = queryset.filter(facility_id=facility_id)

        return queryset

    def perform_create(self, serializer):
        if self.request.user.is_administration:
            review = serializer.save(client=serializer.validated_data.get('client', self.request.user))
        else:
            review = serializer.save(client=self.request.user)
        log_action(self.request, 'review_create', review, facility=review.facility, description=f'Создан отзыв к {review.facility.name}')

    def perform_update(self, serializer):
        review = serializer.save()
        log_action(self.request, 'review_update', review, facility=review.facility, description=f'Обновлен отзыв к {review.facility.name}')

    def perform_destroy(self, instance):
        log_action(self.request, 'delete', instance, facility=instance.facility, description=f'Удален отзыв к {instance.facility.name}')
        instance.delete()

    @action(detail=True, methods=['post'])
    def respond(self, request, pk=None):
        review = self.get_object()
        is_owner = review.facility.complex.owner_id == request.user.id
        if not request.user.is_administration and not is_owner:
            return Response({'detail': 'Можно отвечать только на отзывы к своим объектам'}, status=403)

        review.owner_response = request.data.get('owner_response', '').strip()
        review.owner_response_updated_at = timezone.now()
        review.save(update_fields=['owner_response', 'owner_response_updated_at'])
        log_action(request, 'review_response', review, facility=review.facility, description=f'Ответ на отзыв к {review.facility.name}')
        return Response(self.get_serializer(review).data)
