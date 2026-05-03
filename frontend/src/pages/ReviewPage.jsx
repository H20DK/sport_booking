import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Center,
  Checkbox,
  Container,
  Group,
  Loader,
  Notification,
  Paper,
  Rating,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import dayjs from 'dayjs';
import { Header } from '../components/Header';
import api from '../services/api';

export function ReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [facilityName, setFacilityName] = useState('');
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [visitDate, setVisitDate] = useState(null);
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/facilities/${id}/`)
      .then((res) => setFacilityName(res.data.name))
      .catch(() => setError('Объект не найден'))
      .finally(() => setPageLoading(false));
  }, [id]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (rating === 0) {
      setError('Поставьте оценку от 1 до 5.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/reviews/', {
        facility: id,
        rating,
        title,
        comment,
        visit_date: visitDate || null,
        would_recommend: wouldRecommend,
      });

      setSuccess(true);
      setTimeout(() => navigate(`/facility/${id}`), 1200);
    } catch (submitError) {
      const responseData = submitError.response?.data;
      const message = responseData?.non_field_errors?.[0]
        || responseData?.detail
        || 'Не удалось отправить отзыв. Проверьте данные и попробуйте ещё раз.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) return <Center h="100vh"><Loader /></Center>;

  return (
    <div>
      <Header />
      <Container size={680} py="xl">
        <Title order={2} ta="center" mb="xs">Ваш отзыв</Title>
        <Text ta="center" c="dimmed" mb="xl">
          Объект: <b>{facilityName}</b>
        </Text>

        {success && (
          <Notification color="teal" title="Спасибо!" mb="md" onClose={() => navigate(`/facility/${id}`)}>
            Отзыв опубликован. Возвращаемся к странице объекта.
          </Notification>
        )}

        {error && (
          <Notification color="red" title="Не получилось" mb="md" onClose={() => setError('')}>
            {error}
          </Notification>
        )}

        <Paper withBorder shadow="md" p={30} radius="md">
          <form onSubmit={handleSubmit}>
            <Stack>
              <Stack gap={6} align="center">
                <Rating value={rating} onChange={setRating} size="xl" />
                <Text size="sm" c="dimmed">
                  {rating > 0 ? `Оценка: ${rating} из 5` : 'Выберите оценку'}
                </Text>
              </Stack>

              <TextInput
                label="Короткий заголовок"
                placeholder="Например: Отличная площадка для вечерней игры"
                value={title}
                onChange={(event) => setTitle(event.currentTarget.value)}
                maxLength={120}
              />

              <DateInput
                label="Дата посещения"
                placeholder="Выберите дату"
                value={visitDate}
                onChange={setVisitDate}
                maxDate={dayjs().format('YYYY-MM-DD')}
                clearable
              />

              <Textarea
                label="Подробный комментарий"
                placeholder="Расскажите про покрытие, раздевалки, персонал, удобство бронирования..."
                minRows={5}
                value={comment}
                onChange={(event) => setComment(event.currentTarget.value)}
              />

              <Checkbox
                checked={wouldRecommend}
                onChange={(event) => setWouldRecommend(event.currentTarget.checked)}
                label="Я бы рекомендовал эту площадку другим"
              />

              <Group grow>
                <Button variant="subtle" onClick={() => navigate(-1)}>
                  Отмена
                </Button>
                <Button type="submit" loading={loading} disabled={rating === 0}>
                  Опубликовать отзыв
                </Button>
              </Group>
            </Stack>
          </form>
        </Paper>
      </Container>
    </div>
  );
}
