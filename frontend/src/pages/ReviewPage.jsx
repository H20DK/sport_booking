import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Title, Paper, Rating, Textarea, Button, Notification, Stack, Text, Loader, Center } from '@mantine/core';
import { Header } from '../components/Header';
import api from '../services/api';

export function ReviewPage() {
  const { id } = useParams(); // ID площадки
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [facilityName, setFacilityName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/facilities/${id}/`)
      .then(res => setFacilityName(res.data.name))
      .catch(() => setError('Объект не найден'));
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      setError('Поставьте оценку');
      return;
    }
    
    setLoading(true);
    try {
      await api.post('/reviews/', {
        facility: id,
        rating,
        comment
      });
      setSuccess(true);
      setTimeout(() => navigate(`/facility/${id}`), 2000);
    } catch {
      setError('Ошибка отправки. Возможно, вы уже оставляли отзыв.');
    } finally {
      setLoading(false);
    }
  };

  if (error && !success) return <Center h="100vh"><Text c="red">{error}</Text></Center>;

  return (
    <div>
      <Header />
      <Container size={600} py="xl">
        <Title order={2} ta="center" mb="md">Ваш отзыв</Title>
        <Text ta="center" c="dimmed" mb="xl">Объект: <b>{facilityName}</b></Text>

        {success ? (
          <Notification color="teal" title="Спасибо!" onClose={() => navigate(`/facility/${id}`)}>
            Ваш отзыв успешно опубликован.
          </Notification>
        ) : (
          <Paper withBorder shadow="md" p={30} radius="md">
            <form onSubmit={handleSubmit}>
              <Stack>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <Rating value={rating} onChange={setRating} size="xl" />
                </div>
                <Text size="sm" c="dimmed" ta="center">
                  {rating > 0 ? `Вы выбрали ${rating} из 5 звезд` : 'Выберите оценку'}
                </Text>
                
                <Textarea
                  label="Комментарий (необязательно)"
                  placeholder="Расскажите, что вам понравилось или не понравилось..."
                  minRows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />

                <Button fullWidth type="submit" loading={loading} disabled={rating === 0}>
                  Опубликовать отзыв
                </Button>
                
                <Button variant="subtle" fullWidth onClick={() => navigate(-1)}>
                  Отмена
                </Button>
              </Stack>
            </form>
          </Paper>
        )}
      </Container>
    </div>
  );
}
