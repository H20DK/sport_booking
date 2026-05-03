import { Card, Image, Text, Group, Badge, Button, Stack } from '@mantine/core';
import { IconMapPin, IconStar, IconClock } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

export function FacilityCard({ facility }) {
  // Если нет фото, ставим заглушку
  const imageUrl = facility.images && facility.images.length > 0 
    ? `http://127.0.0.1:8000${facility.images[0].image}` 
    : 'https://placehold.co/600x400?text=No+Image';

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
      <Card.Section>
        <Image src={imageUrl} height={200} alt={facility.name} />
      </Card.Section>

      <Group justify="space-between" mt="md" mb="xs">
        <Text fw={500} size="lg" lineClamp={2}>{facility.name}</Text>
        <Badge color="blue" variant="light">
          {facility.type === 'football' ? 'Футбол' : 
           facility.type === 'tennis' ? 'Теннис' : 
           facility.type === 'gym' ? 'Зал' : 'Бассейн'}
        </Badge>
      </Group>

      <Text size="lg" fw={700} c="blue">
          {facility.price_per_hour} ₽ / час
      </Text>
      
      <Text size="sm" c="dimmed" lineClamp={2}>
        {facility.complex_name}
      </Text>
      <Group gap="xs" mt="sm">
        <IconMapPin size={14} />
        <Text size="xs" c="dimmed">{facility.complex_address}</Text>
      </Group>
      
      <Group justify="space-between" mt="auto" pt="md">
        <Group gap="xs">
          {/* Используем новый компонент или просто иконку */}
          <IconStar size={16} color="#fcc419" fill="#fcc419" />
          <Text size="sm" fw={500}>
            {facility.complex_rating 
              ? Number(facility.complex_rating).toFixed(1) 
              : 'Нет оценок'}
          </Text>
        </Group>
        
        <Text size="lg" fw={700} c="blue">
          {facility.price_per_hour} ₽ / час
        </Text>
      </Group>

      <Button fullWidth mt="md" radius="md" component={Link} to={`/facility/${facility.id}`}>
        Подробнее и бронь
      </Button>
    </Card>
  );
}