from django.core import serializers as django_serializers
from django.http import HttpResponse
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from bookings.models import Booking, TimeSlot
from facilities.models import Facility, FacilityImage, FacilityKind, Review, SportsComplex, SportType
from .logging import log_action
from .models import ActionLog, User
from .serializers import ActionLogSerializer, AdminUserSerializer, UserRegistrationSerializer, UserSerializer


class IsAdministration(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_administration


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = []

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        return Response({
            'user': UserRegistrationSerializer(user).data,
            'message': 'Пользователь успешно создан. Теперь войдите в систему.',
        }, status=status.HTTP_201_CREATED)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('id')
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdministration]

    def perform_create(self, serializer):
        user = serializer.save()
        log_action(self.request, 'create', user, description=f'Создан пользователь {user.username}')

    def perform_update(self, serializer):
        user = serializer.save()
        log_action(self.request, 'update', user, description=f'Обновлен пользователь {user.username}')

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user == request.user:
            return Response({'detail': 'Нельзя удалить свой аккаунт администратора.'}, status=status.HTTP_400_BAD_REQUEST)
        log_action(request, 'delete', user, description=f'Удален пользователь {user.username}')
        return super().destroy(request, *args, **kwargs)


class ActionLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ActionLogSerializer
    permission_classes = [IsAdministration]

    def get_queryset(self):
        return ActionLog.objects.select_related('actor', 'facility')


@api_view(['GET', 'POST'])
@permission_classes([IsAdministration])
def admin_data_view(request):
    export_models = [User, SportsComplex, FacilityKind, SportType, Facility, FacilityImage, Review, TimeSlot, Booking, ActionLog]

    if request.method == 'GET':
        data = django_serializers.serialize('json', [
            obj
            for model in export_models
            for obj in model.objects.all()
        ])
        response = HttpResponse(data, content_type='application/json')
        response['Content-Disposition'] = 'attachment; filename="sport_booking_export.json"'
        return response

    raw_data = request.data.get('data')
    if raw_data is None:
        return Response({'detail': 'Передайте JSON в поле data.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        objects = list(django_serializers.deserialize('json', raw_data))
        for deserialized_object in objects:
            deserialized_object.save()
    except Exception as exc:
        return Response({'detail': f'Не удалось импортировать данные: {exc}'}, status=status.HTTP_400_BAD_REQUEST)

    return Response({'imported': len(objects)})
