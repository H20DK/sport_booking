from django.shortcuts import render
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import User
from .serializers import UserRegistrationSerializer

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [] # Регистрация доступна всем

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Можно сразу вернуть токен после регистрации, но пока просто успех
        return Response({
            "user": UserRegistrationSerializer(user).data,
            "message": "Пользователь успешно создан. Теперь войдите в систему."
        }, status=status.HTTP_201_CREATED)
