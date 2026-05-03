from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import User

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    """
    Сериализатор для модели пользователя.
    Скрывает пароль при выводе данных.
    """
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'phone', 'first_name', 'last_name']
        read_only_fields = ['id', 'role']

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
            raise serializers.ValidationError('При регистрации можно выбрать только пользователя или арендатора.')
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
