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

class Facility(models.Model):
    FACILITY_TYPES = (
        ('football', 'Футбольное поле'),
        ('tennis', 'Теннисный корт'),
        ('gym', 'Спортзал'),
        ('pool', 'Бассейн'),
    )
    complex = models.ForeignKey(SportsComplex, on_delete=models.CASCADE, related_name='facilities')
    name = models.CharField(max_length=100)
    type = models.CharField(max_length=20, choices=FACILITY_TYPES)
    price_per_hour = models.DecimalField(max_digits=10, decimal_places=2)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.0)

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
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('facility', 'client') # Один отзыв на одну площадку от клиента
        ordering = ['-created_at']

    def __str__(self):
        return f"Review {self.rating}★ for {self.facility.name}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.facility.update_rating()

    def delete(self, *args, **kwargs):
        super().delete(*args, **kwargs)
        self.facility.update_rating()