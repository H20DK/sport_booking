from django.db import models
from users.models import User

class SportsComplex(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='complexes')
    name = models.CharField(max_length=255)
    address = models.TextField()
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name

class FacilityKind(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=60, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

class SportType(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=60, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

class Facility(models.Model):
    complex = models.ForeignKey(SportsComplex, on_delete=models.CASCADE, related_name='facilities')
    kind = models.ForeignKey(FacilityKind, on_delete=models.SET_NULL, null=True, blank=True, related_name='facilities')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    type = models.CharField(max_length=60)
    price_per_hour = models.DecimalField(max_digits=10, decimal_places=2)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.0)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    def __str__(self):
        return f"{self.complex.name} - {self.name}"

    def update_rating(self):
        """Пересчет среднего рейтинга для этой площадки"""
        from django.db.models import Avg
        avg = self.reviews.aggregate(Avg('rating'))['rating__avg']
        self.rating = avg if avg else 0.0
        self.save(update_fields=['rating'])
    
class FacilityImage(models.Model):
    facility = models.ForeignKey(Facility, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='facilities/')
    is_main = models.BooleanField(default=False)

class Review(models.Model):
    """Отзыв клиента к спортивному объекту"""
    facility = models.ForeignKey(Facility, on_delete=models.CASCADE, related_name='reviews')
    client = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)]) # 1-5 звезд
    title = models.CharField(max_length=120, blank=True)
    comment = models.TextField(blank=True)
    visit_date = models.DateField(null=True, blank=True)
    would_recommend = models.BooleanField(default=True)
    owner_response = models.TextField(blank=True)
    owner_response_updated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Review {self.rating}★ for {self.facility.name}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.facility.update_rating()

    def delete(self, *args, **kwargs):
        super().delete(*args, **kwargs)
        self.facility.update_rating()
