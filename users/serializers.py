from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import ActionLog, User

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    """
    Сериализатор для модели пользователя.
    Скрывает пароль при выводе данных.
    """
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'phone', 'first_name', 'last_name', 'is_staff', 'is_superuser']
        read_only_fields = ['id', 'role', 'is_staff', 'is_superuser']


class AdminUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, min_length=6)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'password', 'role', 'phone',
            'first_name', 'last_name', 'is_active', 'is_staff', 'is_superuser'
        ]
        read_only_fields = ['id']

    def validate(self, attrs):
        if self.instance is None and not attrs.get('password'):
            raise serializers.ValidationError({'password': 'Укажите пароль для нового пользователя.'})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class ActionLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source='actor.username', read_only=True)
    facility_name = serializers.CharField(source='facility.name', read_only=True)

    class Meta:
        model = ActionLog
        fields = [
            'id', 'actor', 'actor_name', 'action', 'entity_type', 'entity_id',
            'facility', 'facility_name', 'description', 'metadata', 'created_at'
        ]
        read_only_fields = fields

class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Сериализатор для регистрации нового пользователя.
    Принимает пароль и хеширует его.
    """
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'role', 'phone']

    def validate_role(self, value):
        if value not in ['user', 'renter']:
            raise serializers.ValidationError('При регистрации можно выбрать только пользователя или собственника.')
        return value

    def create(self, validated_data):
        # Используем метод create_user, чтобы пароль автоматически захешировался
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            role=validated_data.get('role', 'user'),
            phone=validated_data.get('phone', '')
        )
        return user
