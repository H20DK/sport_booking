import { useEffect, useState } from 'react';
import { Button, Card, Center, Container, Group, Loader, Rating, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { Header } from '../components/Header';
import api from '../services/api';

export function ProfileReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reviews/', { params: { mine: 1 } })
      .then((response) => setReviews(response.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Center h="100vh"><Loader /></Center>;

  return (
    <div>
      <Header />
      <Container size="lg" py="xl">
        <Title order={2} mb="lg">Мои отзывы</Title>
        {reviews.length === 0 ? (
          <Text c="dimmed">Вы пока не оставляли отзывы.</Text>
        ) : (
          <Stack>
            {reviews.map((review) => (
              <Card key={review.id} withBorder radius="md" p="md">
                <Group justify="space-between" align="flex-start">
                  <Stack gap={4}>
                    <Text fw={700}>{review.title || 'Отзыв о площадке'}</Text>
                    <Text size="sm" c="dimmed">
                      {review.facility_name} · {dayjs(review.created_at).format('DD.MM.YYYY')}
                    </Text>
                    <Rating value={review.rating} readOnly />
                  </Stack>
                  <Button component={Link} to={`/facility/${review.facility}`} variant="light">
                    Открыть и редактировать
                  </Button>
                </Group>
                {review.comment && <Text mt="sm">{review.comment}</Text>}
              </Card>
            ))}
          </Stack>
        )}
      </Container>
    </div>
  );
}
