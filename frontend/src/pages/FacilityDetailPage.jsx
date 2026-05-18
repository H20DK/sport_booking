import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Carousel } from '@mantine/carousel';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Center,
  Checkbox,
  Container,
  Divider,
  Grid,
  Group,
  Loader,
  Notification,
  Rating,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
  Tooltip,
} from '@mantine/core';
import { DateInput, DatePicker } from '@mantine/dates';
import {
  IconArrowLeft,
  IconCheck,
  IconEdit,
  IconMapPin,
  IconStar,
  IconThumbUp,
  IconX,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { FacilitiesMap } from '../components/FacilitiesMap';
import { Header } from '../components/Header';
import api from '../services/api';
import { getAccessToken } from '../services/authStorage';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function getImageUrl(imagePath) {
  return imagePath.startsWith('http') ? imagePath : `${API_BASE_URL}${imagePath}`;
}

export function FacilityDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const reviewsRef = useRef(null);
  const mapRef = useRef(null);

  const [facility, setFacility] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingSeats, setBookingSeats] = useState(1);
  const [notification, setNotification] = useState(null);
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [savingReview, setSavingReview] = useState(false);
  const [editForm, setEditForm] = useState({
    rating: 0,
    title: '',
    comment: '',
    visitDate: null,
    wouldRecommend: true,
  });

  const fetchPageData = useCallback(async () => {
    const token = getAccessToken();
    const [facilityResponse, reviewsResponse, userResponse] = await Promise.all([
      api.get(`/facilities/${id}/`),
      api.get('/reviews/', { params: { facility: id } }),
      token ? api.get('/me/', { skipAuthRedirect: true }).catch(() => null) : Promise.resolve(null),
    ]);

    setFacility(facilityResponse.data);
    setReviews(reviewsResponse.data);
    setCurrentUser(userResponse?.data || null);
  }, [id]);

  useEffect(() => {
    fetchPageData()
      .catch((error) => {
        console.error('Ошибка загрузки объекта:', error);
        setNotification({ type: 'error', message: 'Не удалось загрузить данные объекта' });
      })
      .finally(() => setLoading(false));
  }, [fetchPageData]);

  useEffect(() => {
    if (!facility) return;

    const fetchSlots = async () => {
      setLoadingSlots(true);
      const dateStr = selectedDate;

      try {
        const response = await api.get(`/facilities/${id}/slots/`, { params: { date: dateStr } });
        setSlots(response.data || []);
      } catch (error) {
        console.warn('Не удалось загрузить слоты:', error);
        setSlots([]);
      } finally {
        setLoadingSlots(false);
        setSelectedSlot(null);
        setBookingSeats(1);
      }
    };

    fetchSlots();
  }, [selectedDate, facility, id]);

  const handleBooking = async () => {
    if (!selectedSlot) return;

    if (!getAccessToken()) {
      setNotification({ type: 'error', message: 'Войдите в систему, чтобы забронировать время.' });
      return;
    }

    try {
      const response = await api.post('/bookings/', { slot_id: selectedSlot.id, seats: bookingSeats });
      setNotification({ type: 'success', message: 'Бронирование успешно создано.' });
      setSlots((prev) => prev.map((slot) => (
        slot.id === selectedSlot.id
          ? {
              ...slot,
              booked_count: (slot.booked_count || 0) + bookingSeats,
              available_spots: Math.max((slot.available_spots ?? 1) - bookingSeats, 0),
              is_booked: Math.max((slot.available_spots ?? 1) - bookingSeats, 0) <= 0,
              active_booking_id: response.data.id,
              active_booking_seats: bookingSeats,
            }
          : slot
      )));
      setSelectedSlot((prev) => (
        prev
          ? {
              ...prev,
              booked_count: (prev.booked_count || 0) + bookingSeats,
              available_spots: Math.max((prev.available_spots ?? 1) - bookingSeats, 0),
              is_booked: Math.max((prev.available_spots ?? 1) - bookingSeats, 0) <= 0,
              active_booking_id: response.data.id,
              active_booking_seats: bookingSeats,
            }
          : prev
      ));
    } catch (error) {
      const errorMsg = error.response?.data?.detail
        || error.response?.data?.error
        || 'Не удалось создать бронирование. Попробуйте другой слот.';
      setNotification({ type: 'error', message: errorMsg });
    }
  };

  const handleCancelSelectedBooking = async () => {
    if (!selectedSlot?.active_booking_id) return;

    if (!getAccessToken()) {
      setNotification({ type: 'error', message: 'Войдите в систему, чтобы отменить бронь.' });
      return;
    }

    try {
      await api.post(`/bookings/${selectedSlot.active_booking_id}/cancel/`);
      setNotification({ type: 'success', message: 'Бронь отменена.' });
      setSlots((prev) => prev.map((slot) => (
        slot.id === selectedSlot.id
          ? {
              ...slot,
              booked_count: Math.max((slot.booked_count || 1) - (selectedSlot.active_booking_seats || 1), 0),
              available_spots: (slot.available_spots ?? 0) + (selectedSlot.active_booking_seats || 1),
              is_booked: false,
              active_booking_id: null,
              active_booking_seats: 0,
            }
          : slot
      )));
      setSelectedSlot(null);
      setBookingSeats(1);
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Не удалось отменить бронь.';
      setNotification({ type: 'error', message: errorMsg });
    }
  };

  const startEditReview = (review) => {
    setEditingReviewId(review.id);
    setEditForm({
      rating: review.rating,
      title: review.title || '',
      comment: review.comment || '',
      visitDate: review.visit_date || null,
      wouldRecommend: review.would_recommend,
    });
  };

  const cancelEditReview = () => {
    setEditingReviewId(null);
    setEditForm({
      rating: 0,
      title: '',
      comment: '',
      visitDate: null,
      wouldRecommend: true,
    });
  };

  const saveReview = async (reviewId) => {
    if (!editForm.rating) {
      setNotification({ type: 'error', message: 'Поставьте оценку от 1 до 5.' });
      return;
    }

    setSavingReview(true);
    try {
      const response = await api.patch(`/reviews/${reviewId}/`, {
        rating: editForm.rating,
        title: editForm.title,
        comment: editForm.comment,
        visit_date: editForm.visitDate || null,
        would_recommend: editForm.wouldRecommend,
      });

      setReviews((prev) => prev.map((review) => (
        review.id === reviewId ? response.data : review
      )));
      await fetchPageData();
      cancelEditReview();
      setNotification({ type: 'success', message: 'Отзыв обновлён.' });
    } catch (error) {
      const message = error.response?.data?.detail || 'Не удалось сохранить отзыв.';
      setNotification({ type: 'error', message });
    } finally {
      setSavingReview(false);
    }
  };

  const updateEditField = (field) => (event) => {
    const { value } = event.currentTarget;
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateEditCheckbox = (field) => (event) => {
    const { checked } = event.currentTarget;
    setEditForm((prev) => ({ ...prev, [field]: checked }));
  };

  const scrollToReviews = () => {
    reviewsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToMap = () => {
    mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) return <Center h="100vh"><Loader size="xl" variant="dots" /></Center>;

  if (!facility) {
    return (
      <Center h="100vh">
        <Stack align="center">
          <Text>Объект не найден</Text>
          <Button onClick={() => navigate('/')}>Вернуться на главную</Button>
        </Stack>
      </Center>
    );
  }

  const imageUrls = facility.images?.length
    ? facility.images.map((item) => getImageUrl(item.image))
    : ['https://images.unsplash.com/photo-1541252260730-0412e8e2108e?q=80&w=1200&auto=format&fit=crop'];
  const hasMultipleImages = imageUrls.length > 1;
  const minPrice = facility.min_price ?? facility.price_per_hour;
  const slotPrice = selectedSlot?.price ?? facility.price_per_hour;
  const selectedSlotIsFull = Boolean(selectedSlot?.is_booked);
  const selectedSlotHasBooking = Boolean(selectedSlot?.active_booking_id);
  const maxBookingSeats = selectedSlot ? Math.max(selectedSlot.available_spots ?? 1, 1) : 1;
  const bookingTotalPrice = Number(slotPrice || 0) * bookingSeats;

  return (
    <div style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <Header />
      <Container size="xl" py="xl">
        <Group mb="lg">
          <ActionIcon variant="subtle" onClick={() => navigate(-1)} size="lg" aria-label="Назад">
            <IconArrowLeft size={24} />
          </ActionIcon>
          <Title order={1} size="h2">{facility.name}</Title>
        </Group>

        {notification && (
          <Notification
            icon={notification.type === 'success' ? <IconCheck size={18} /> : <IconX size={18} />}
            color={notification.type === 'success' ? 'teal' : 'red'}
            title={notification.type === 'success' ? 'Успешно' : 'Внимание'}
            onClose={() => setNotification(null)}
            mb="lg"
            withCloseButton
          >
            {notification.message}
          </Notification>
        )}

        <Grid gutter="xl">
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Stack>
              <Card shadow="sm" radius="md" padding={0} withBorder overflow="hidden">
                <Carousel
                  height={420}
                  withControls={hasMultipleImages}
                  withIndicators={hasMultipleImages}
                  loop={hasMultipleImages}
                  styles={{
                    control: { width: 34, height: 34 },
                    indicator: { width: 9, height: 9 },
                  }}
                >
                  {imageUrls.map((imageUrl, index) => (
                    <Carousel.Slide key={`${imageUrl}-${index}`}>
                      <img
                        src={imageUrl}
                        alt={facility.name}
                        style={{ width: '100%', height: 420, objectFit: 'cover', display: 'block' }}
                      />
                    </Carousel.Slide>
                  ))}
                </Carousel>
              </Card>

              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Group justify="space-between" align="flex-start">
                  <Stack gap={6}>
                    <Badge size="lg" variant="light" color="blue">
                      {facility.type_name || facility.type || 'Спорт'}
                    </Badge>
                    {facility.kind_name && (
                      <Badge size="lg" variant="light" color="cyan">
                        {facility.kind_name}
                      </Badge>
                    )}
                    <Button
                      variant="subtle"
                      color="gray"
                      size="compact-sm"
                      px={0}
                      leftSection={<IconMapPin size={16} />}
                      onClick={scrollToMap}
                      justify="flex-start"
                    >
                      {facility.complex_address || 'Адрес не указан'}
                    </Button>
                  </Stack>

                  <Stack gap={4} align="flex-end">
                    <Group gap={6}>
                      <IconStar size={22} color="#fcc419" fill="#fcc419" />
                      <Text fw={800} size="xl">{Number(facility.rating || 0).toFixed(1)}</Text>
                    </Group>
                    <Button variant="subtle" size="compact-sm" px={0} onClick={scrollToReviews}>
                      {facility.reviews_count || 0} отзывов
                    </Button>
                  </Stack>
                </Group>

                <Divider my="md" label="Описание" labelPosition="center" />

                <Text size="sm" style={{ lineHeight: 1.6 }}>
                  {facility.description || 'Описание объекта пока не заполнено.'}
                </Text>

                <Group mt="xl" grow>
                  <div style={{ textAlign: 'center', padding: 12, backgroundColor: '#f1f3f5', borderRadius: 8 }}>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Цена</Text>
                    <Text fw={800} size="xl" c="blue">от {minPrice} ₽/час</Text>
                  </div>
                  <div style={{ textAlign: 'center', padding: 12, backgroundColor: '#f1f3f5', borderRadius: 8 }}>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Комплекс</Text>
                    <Text fw={700} size="md" lineClamp={1}>{facility.complex_name}</Text>
                  </div>
                </Group>
              </Card>

              <div ref={mapRef}>
                <FacilitiesMap
                  facilities={[facility]}
                  title="Объект на карте"
                  selectedFacilityId={facility.id}
                />
              </div>

              <Card ref={reviewsRef} shadow="sm" padding="lg" radius="md" withBorder>
                <Group justify="space-between" mb="md" align="center">
                  <Title order={3}>Отзывы</Title>
                  <Button component={Link} to={`/review/${facility.id}`} variant="light">
                    Оставить отзыв
                  </Button>
                </Group>

                {reviews.length === 0 ? (
                  <Text c="dimmed">Отзывов пока нет. Можно стать первым.</Text>
                ) : (
                  <Stack gap="md">
                    {reviews.map((review) => {
                      const isEditing = editingReviewId === review.id;
                      const canEdit = currentUser && Number(review.client_id) === Number(currentUser.id);

                      return (
                        <Card key={review.id} withBorder radius="md" padding="md">
                          {isEditing ? (
                            <Stack>
                              <Stack gap={6} align="flex-start">
                                <Rating
                                  value={editForm.rating}
                                  onChange={(value) => setEditForm((prev) => ({ ...prev, rating: value }))}
                                  size="lg"
                                />
                                <Text size="sm" c="dimmed">Оценка: {editForm.rating || 0} из 5</Text>
                              </Stack>

                              <TextInput
                                label="Заголовок"
                                value={editForm.title}
                                onChange={updateEditField('title')}
                                maxLength={120}
                              />

                              <DateInput
                                label="Дата посещения"
                                value={editForm.visitDate}
                                onChange={(value) => setEditForm((prev) => ({ ...prev, visitDate: value }))}
                                maxDate={dayjs().format('YYYY-MM-DD')}
                                clearable
                              />

                              <Textarea
                                label="Комментарий"
                                minRows={4}
                                value={editForm.comment}
                                onChange={updateEditField('comment')}
                              />

                              <Checkbox
                                checked={editForm.wouldRecommend}
                                onChange={updateEditCheckbox('wouldRecommend')}
                                label="Я бы рекомендовал эту площадку другим"
                              />

                              <Group justify="flex-end">
                                <Button variant="subtle" onClick={cancelEditReview}>
                                  Отмена
                                </Button>
                                <Button loading={savingReview} onClick={() => saveReview(review.id)}>
                                  Сохранить
                                </Button>
                              </Group>
                            </Stack>
                          ) : (
                            <>
                              <Group justify="space-between" align="flex-start">
                                <Stack gap={4}>
                                  <Text fw={700}>{review.title || 'Отзыв о площадке'}</Text>
                                  <Text size="sm" c="dimmed">
                                    {review.client_name} · {dayjs(review.created_at).format('DD.MM.YYYY')}
                                    {review.visit_date ? ` · посещение ${dayjs(review.visit_date).format('DD.MM.YYYY')}` : ''}
                                  </Text>
                                </Stack>

                                <Group gap="sm" align="flex-start">
                                  <Rating value={review.rating} readOnly fractions={2} />
                                  {canEdit && (
                                    <Button
                                      size="xs"
                                      variant="subtle"
                                      leftSection={<IconEdit size={14} />}
                                      onClick={() => startEditReview(review)}
                                    >
                                      Редактировать
                                    </Button>
                                  )}
                                </Group>
                              </Group>

                              {review.comment && (
                                <Text mt="sm" size="sm" style={{ lineHeight: 1.55 }}>
                                  {review.comment}
                                </Text>
                              )}

                              {review.would_recommend && (
                                <Group gap={6} mt="sm">
                                  <IconThumbUp size={16} color="#12b886" />
                                  <Text size="sm" c="teal" fw={600}>Рекомендует</Text>
                                </Group>
                              )}

                              {review.owner_response && (
                                <Card mt="sm" radius="md" padding="sm" style={{ backgroundColor: '#f8f9fa' }}>
                                  <Text size="sm" fw={700}>Ответ собственника</Text>
                                  <Text size="sm" mt={4}>{review.owner_response}</Text>
                                  {review.owner_response_updated_at && (
                                    <Text size="xs" c="dimmed" mt={4}>
                                      Обновлено {dayjs(review.owner_response_updated_at).format('DD.MM.YYYY HH:mm')}
                                    </Text>
                                  )}
                                </Card>
                              )}
                            </>
                          )}
                        </Card>
                      );
                    })}
                  </Stack>
                )}
              </Card>
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 5 }}>
            <Card shadow="md" padding="lg" radius="md" withBorder style={{ position: 'sticky', top: 20 }}>
              <Title order={4} mb="md">Бронирование</Title>

              <DatePicker
                value={selectedDate}
                onChange={(value) => setSelectedDate(value || dayjs().format('YYYY-MM-DD'))}
                minDate={dayjs().format('YYYY-MM-DD')}
                fullWidth
                mb="md"
              />

              <Divider my="md" />

              <Text fw={600} mb="sm" size="sm">
                Доступное время на {dayjs(selectedDate).format('D MMMM')}:
              </Text>

              {loadingSlots ? (
                <Center py="xl"><Loader size="sm" /></Center>
              ) : (
                <Grid gutter="xs" style={{ maxHeight: 250, overflowY: 'auto', paddingRight: 5 }}>
                  {slots.map((slot) => {
                    const isSelected = selectedSlot?.id === slot.id;
                    const price = slot.price ?? facility.price_per_hour;

                    return (
                      <Grid.Col span={4} key={slot.id}>
                        <Tooltip
                          label={[
                            slot.active_booking_id
                              ? 'Нажмите, чтобы отменить свою бронь'
                              : slot.is_booked
                                ? 'Свободных мест нет'
                                : `${price} ₽ · свободно ${slot.available_spots ?? 1}`,
                            slot.title,
                            slot.trainer_name ? `Тренер: ${slot.trainer_name}` : '',
                          ].filter(Boolean).join(' · ')}
                        >
                          <Button
                            fullWidth
                            variant={isSelected ? 'filled' : 'outline'}
                            color={slot.is_booked ? 'red' : isSelected ? 'blue' : 'green'}
                            onClick={() => {
                              setSelectedSlot({ ...slot, price });
                              setBookingSeats(1);
                            }}
                            styles={{ label: { fontSize: 12 } }}
                            px={0}
                          >
                            <Stack gap={0} align="center">
                              <Text size="xs" fw={700}>{dayjs(slot.start_time).format('HH:mm')}</Text>
                              {slot.title && <Text size="10px" lineClamp={1}>{slot.title}</Text>}
                              <Text size="10px">{slot.available_spots ?? 1}/{slot.capacity || 1}</Text>
                            </Stack>
                          </Button>
                        </Tooltip>
                      </Grid.Col>
                    );
                  })}
                  {slots.length === 0 && (
                    <Grid.Col span={12}>
                      <Text c="dimmed" ta="center" py="md">Слотов не найдено</Text>
                    </Grid.Col>
                  )}
                </Grid>
              )}

              {selectedSlot && !selectedSlotHasBooking && !selectedSlotIsFull && (
                <Card withBorder radius="md" p="sm" mt="md" style={{ backgroundColor: '#f8f9fa' }}>
                  <Group justify="space-between" align="center">
                    <Stack gap={2}>
                      <Text size="sm" fw={700}>Количество мест</Text>
                      <Text size="xs" c="dimmed">Свободно: {selectedSlot.available_spots ?? 1}</Text>
                    </Stack>
                    <Group gap="xs">
                      <ActionIcon
                        variant="light"
                        color="blue"
                        disabled={bookingSeats <= 1}
                        onClick={() => setBookingSeats((value) => Math.max(value - 1, 1))}
                        aria-label="Уменьшить количество мест"
                      >
                        -
                      </ActionIcon>
                      <Text fw={800} w={28} ta="center">{bookingSeats}</Text>
                      <ActionIcon
                        variant="light"
                        color="blue"
                        disabled={bookingSeats >= maxBookingSeats}
                        onClick={() => setBookingSeats((value) => Math.min(value + 1, maxBookingSeats))}
                        aria-label="Увеличить количество мест"
                      >
                        +
                      </ActionIcon>
                    </Group>
                  </Group>
                  <Text mt="xs" size="sm" c="blue" fw={700}>
                    Итого: {bookingTotalPrice} ₽
                  </Text>
                </Card>
              )}

              <Button
                fullWidth
                mt="xl"
                size="md"
                disabled={!selectedSlot || (selectedSlotIsFull && !selectedSlotHasBooking)}
                color={selectedSlotHasBooking ? 'red' : 'blue'}
                onClick={selectedSlotHasBooking ? handleCancelSelectedBooking : handleBooking}
              >
                {selectedSlot
                  ? selectedSlotHasBooking
                    ? 'Разбронировать слот'
                    : selectedSlotIsFull
                      ? 'Свободных мест нет'
                      : `Забронировать за ${bookingTotalPrice} ₽`
                  : 'Выберите время'}
              </Button>

            </Card>
          </Grid.Col>
        </Grid>
      </Container>
    </div>
  );
}
