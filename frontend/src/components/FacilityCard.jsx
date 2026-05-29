import { Carousel } from '@mantine/carousel';
import { Badge, Box, Button, Card, Group, Image, Stack, Text } from '@mantine/core';
import { IconStar } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function getImageUrl(imagePath) {
  return imagePath.startsWith('http') ? imagePath : `${API_BASE_URL}${imagePath}`;
}

export function FacilityCard({ facility }) {
  const imageUrls = facility.images?.length
    ? facility.images.map((item) => getImageUrl(item.image))
    : ['https://placehold.co/600x400?text=No+Image'];
  const hasMultipleImages = imageUrls.length > 1;
  const facilityKind = facility.kind_name || 'Площадка';
  const rating = Number(facility.rating || 0).toFixed(1);
  const reviewsCount = facility.reviews_count || 0;
  const minPrice = facility.min_price ?? facility.price_per_hour;

  return (
    <Card
      shadow="sm"
      padding="md"
      radius="md"
      withBorder
      h="100%"
      style={{ display: 'flex', flexDirection: 'column' }}
    >
      <Card.Section>
        <Box pos="relative">
          <Carousel
            height={190}
            withControls={hasMultipleImages}
            withIndicators={hasMultipleImages}
            loop={hasMultipleImages}
            styles={{
              control: { width: 28, height: 28 },
              indicator: { width: 8, height: 8 },
            }}
          >
            {imageUrls.map((imageUrl, index) => (
              <Carousel.Slide key={`${imageUrl}-${index}`}>
                <Image src={imageUrl} height={190} alt={facility.name} fit="cover" />
              </Carousel.Slide>
            ))}
          </Carousel>

          <Badge color="blue" variant="filled" radius="sm" pos="absolute" top={12} right={12}>
            {facilityKind}
          </Badge>
        </Box>
      </Card.Section>

      <Stack gap={6} mt="md" style={{ flex: 1 }}>
        <Text fw={700} size="lg" lh={1.25} lineClamp={2} ta="left">
          {facility.name}
        </Text>

        <Text size="sm" c="dimmed" lineClamp={1} ta="left">
          {facility.complex_name}
        </Text>

        {facility.description && (
          <Text size="sm" lineClamp={2} ta="left">
            {facility.description}
          </Text>
        )}

        <Group justify="space-between" align="center" mt="sm">
          <Text size="lg" fw={800} c="blue">
            от {minPrice} ₽
          </Text>

          <Group gap={5} wrap="nowrap">
            <IconStar size={17} color="#fcc419" fill="#fcc419" />
            <Text size="sm" fw={700}>
              {rating}
            </Text>
            <Text size="sm" c="dimmed">
              ({reviewsCount})
            </Text>
          </Group>
        </Group>

        <Button fullWidth mt="auto" radius="md" component={Link} to={`/facility/${facility.id}`}>
          Подробнее и бронь
        </Button>
      </Stack>
    </Card>
  );
}
