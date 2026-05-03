from django.contrib import admin
from .models import SportsComplex, Facility, FacilityImage

@admin.register(SportsComplex)
class SportsComplexAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'created_at')
    search_fields = ('name', 'address')

@admin.register(Facility)
class FacilityAdmin(admin.ModelAdmin):
    list_display = ('name', 'complex', 'type', 'price_per_hour')
    list_filter = ('type', 'complex')

@admin.register(FacilityImage)
class FacilityImageAdmin(admin.ModelAdmin):
    list_display = ('facility', 'is_main')