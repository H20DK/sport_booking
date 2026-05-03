from rest_framework import serializers
from .models import SportsComplex, Facility, FacilityImage, Review

class FacilityImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = FacilityImage
        fields = ['id', 'image', 'is_main']

class ReviewSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.username', read_only=True)
    facility_name = serializers.CharField(source='facility.name', read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'facility', 'facility_name', 'client_name', 'rating', 'comment', 'created_at']
        read_only_fields = ['client', 'created_at']

class FacilitySerializer(serializers.ModelSerializer):
    """Сериализатор для Площадки"""
    complex_name = serializers.CharField(source='complex.name', read_only=True)
    complex_address = serializers.CharField(source='complex.address', read_only=True)
    images = FacilityImageSerializer(many=True, read_only=True)
    reviews_count = serializers.SerializerMethodField()

    class Meta:
        model = Facility
        fields = [
            'id', 'complex', 'complex_name', 'complex_address',
            'name', 'type', 'price_per_hour', 'rating', 'reviews_count', 'images'
        ]

    def get_reviews_count(self, obj):
        return obj.reviews.count()

class SportsComplexSerializer(serializers.ModelSerializer):
    """Сериализатор для Комплекса"""
    owner_name = serializers.CharField(source='owner.username', read_only=True)
    # Если нужно видеть площадки внутри комплекса при запросе к /api/complexes/
    facilities = FacilitySerializer(many=True, read_only=True) 

    class Meta:
        model = SportsComplex
        fields = [
            'id', 'owner', 'owner_name', 'name', 'address', 
            'description', 'created_at', 'facilities'
        ]
