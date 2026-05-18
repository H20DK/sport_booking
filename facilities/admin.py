from django.contrib import admin
from .models import SportsComplex, Facility, FacilityImage, FacilityKind, Review, SportType

@admin.register(FacilityKind)
class FacilityKindAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'created_at')
    search_fields = ('name', 'slug')

@admin.register(SportType)
class SportTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'created_at')
    search_fields = ('name', 'slug')

@admin.register(SportsComplex)
class SportsComplexAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'created_at')
    search_fields = ('name', 'address')

@admin.register(Facility)
class FacilityAdmin(admin.ModelAdmin):
    list_display = ('name', 'complex', 'type', 'kind', 'price_per_hour', 'latitude', 'longitude')
    list_filter = ('type', 'kind', 'complex')

@admin.register(FacilityImage)
class FacilityImageAdmin(admin.ModelAdmin):
    list_display = ('facility', 'is_main')

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('facility', 'client', 'rating', 'created_at')
    search_fields = ('facility__name', 'client__username', 'comment', 'owner_response')
