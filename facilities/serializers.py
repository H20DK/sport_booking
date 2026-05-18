from rest_framework import serializers
from django.db.models import Min
from users.models import ActionLog, User
from .models import SportsComplex, Facility, FacilityImage, FacilityKind, Review, SportType

class FacilityImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = FacilityImage
        fields = ['id', 'image', 'is_main']

class FacilityKindSerializer(serializers.ModelSerializer):
    class Meta:
        model = FacilityKind
        fields = ['id', 'name', 'slug', 'created_at']
        read_only_fields = ['created_at']

class SportTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = SportType
        fields = ['id', 'name', 'slug', 'created_at']
        read_only_fields = ['created_at']

class ReviewSerializer(serializers.ModelSerializer):
    client_id = serializers.IntegerField(source='client.id', read_only=True)
    client_name = serializers.CharField(source='client.username', read_only=True)
    client = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False)
    facility_name = serializers.CharField(source='facility.name', read_only=True)

    class Meta:
        model = Review
        fields = [
            'id', 'facility', 'facility_name', 'client', 'client_id', 'client_name',
            'rating', 'title', 'comment', 'visit_date', 'would_recommend',
            'owner_response', 'owner_response_updated_at', 'created_at'
        ]
        read_only_fields = ['owner_response', 'owner_response_updated_at', 'created_at']

class FacilitySerializer(serializers.ModelSerializer):
    """Сериализатор для Площадки"""
    complex_name = serializers.CharField(source='complex.name', read_only=True)
    complex_address = serializers.CharField(source='complex.address', read_only=True)
    kind_name = serializers.CharField(source='kind.name', read_only=True)
    kind_slug = serializers.CharField(source='kind.slug', read_only=True)
    type_name = serializers.SerializerMethodField()
    images = FacilityImageSerializer(many=True, read_only=True)
    reviews_count = serializers.SerializerMethodField()
    min_price = serializers.SerializerMethodField()
    popularity_score = serializers.SerializerMethodField()

    class Meta:
        model = Facility
        fields = [
            'id', 'complex', 'complex_name', 'complex_address',
            'name', 'description', 'type', 'type_name', 'kind', 'kind_name', 'kind_slug',
            'price_per_hour', 'min_price',
            'rating', 'reviews_count', 'popularity_score', 'latitude', 'longitude', 'images'
        ]

    def get_reviews_count(self, obj):
        return obj.reviews.count()

    def get_type_name(self, obj):
        sport_type = SportType.objects.filter(slug=obj.type).first()
        return sport_type.name if sport_type else obj.type

    def get_min_price(self, obj):
        slot_min_price = obj.slots.filter(is_active=True, price__isnull=False).aggregate(
            min_price=Min('price')
        )['min_price']
        if slot_min_price is None:
            return obj.price_per_hour
        return min(obj.price_per_hour, slot_min_price)

    def get_popularity_score(self, obj):
        action_weights = {
            'view': 1,
            'review_create': 4,
            'booking_create': 6,
        }
        logs = ActionLog.objects.filter(
            facility=obj,
            action__in=action_weights.keys(),
        ).values_list('action', flat=True)
        return sum(action_weights[action] for action in logs)

class SportsComplexSerializer(serializers.ModelSerializer):
    owner = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False)
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
        read_only_fields = ['created_at']
