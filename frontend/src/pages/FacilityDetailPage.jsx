import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, Title, Text, Group, Badge, Loader, Center, 
  Grid, Card, Image, Button, Notification, Stack, Divider, ActionIcon, Tooltip
} from '@mantine/core';
import { Calendar } from '@mantine/dates';
import { IconMapPin, IconStar, IconClock, IconCheck, IconX, IconArrowLeft } from '@tabler/icons-react';
import { Header } from '../components/Header';
import api from '../services/api';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';

// Используйте переменную окружения для API URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export function FacilityDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [facility, setFacility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [notification, setNotification] = useState(null);

  // Генератор тестовых слотов (улучшенный)
  const generateMockSlots = useCallback((date) => {
    const times = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
    return times.map((time, index) => {
      const start = dayjs(`${date} ${time}`, 'YYYY-MM-DD HH:mm');
      return {
        id: `mock-${index}`,
        start_time: start.toISOString(),
        end_time: start.add(1, 'hour').toISOString(),
        is_booked: Math.random() < 0.3, // Случайная занятость
        price: facility?.price_per_hour || 1000
      };
    });
  }, [facility]);

  // Загрузка информации об объекте
  useEffect(() => {
    const fetchFacility = async () => {
      try {
        const response = await api.get(`/facilities/${id}/`);
        setFacility(response.data);
      } catch (error) {
        console.error("Ошибка загрузки объекта:", error);
        setNotification({ type: 'error', message: 'Не удалось загрузить данные объекта' });
      } finally {
        setLoading(false);
      }
    };
    fetchFacility();
  }, [id]);

  // Загрузка слотов
  useEffect(() => {
    if (!facility) return;

    const fetchSlots = async () => {
      setLoadingSlots(true);
      const dateStr = dayjs(selectedDate).format('YYYY-MM-DD');
      try {
        const response = await api.get(`/facilities/${id}/slots/`, { params: { date: dateStr } });
        
        if (response.data && response.data.length > 0) {
          setSlots(response.data);
        } else {
          setSlots(generateMockSlots(dateStr));
        }
      } catch (error) {
        console.warn("API не вернул слоты, используем моки:", error);
        setSlots(generateMockSlots(dateStr));
      } finally {
        setLoadingSlots(false);
        setSelectedSlot(null); // Сбрасываем выбранный слот при смене даты
      }
    };

    fetchSlots();
  }, [selectedDate, facility, id, generateMockSlots]);

  const handleBooking = async () => {
    if (!selectedSlot) return;

    // Проверка авторизации (пример)
    const token = localStorage.getItem('access_token');
    if (!token) {
      setNotification({ type: 'error', message: 'Пожалуйста, войдите в систему, чтобы забронировать.' });
      return;
    }

    try {
      await api.post('/bookings/', { 
        slot_id: selectedSlot.id
      });
      
      setNotification({ type: 'success', message: 'Бронирование успешно создано! Мы ждем вас.' });
      setSelectedSlot(null);
      
      // Имитируем обновление списка (помечаем слот как занятый локально)
      setSlots(prev => prev.map(s => s.id === selectedSlot.id ? { ...s, is_booked: true } : s));
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Ошибка бронирования. Попробуйте другой слот.';
      setNotification({ type: 'error', message: errorMsg });
    }
  };

  if (loading) return <Center h="100vh"><Loader size="xl" variant="dots" /></Center>;
  if (!facility) return <Center h="100vh"><Stack align="center"><Text>Объект не найден</Text><Button onClick={() => navigate('/')}>Вернуться на главную</Button></Stack></Center>;

  const imageUrl = facility.images?.[0]?.image 
    ? (facility.images[0].image.startsWith('http') ? facility.images[0].image : `${API_BASE_URL}${facility.images[0].image}`)
    : 'https://images.unsplash.com/photo-1541252260730-0412e8e2108e?q=80&w=1000&auto=format&fit=crop';

  return (
    <div style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <Header />
      <Container size="xl" py="xl">
        
        <Group mb="lg">
          <ActionIcon variant="subtle" onClick={() => navigate(-1)} size="lg">
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
          {/* Левая колонка */}
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Stack>
              <Card shadow="sm" radius="md" padding={0} withBorder overflow="hidden">
                <Image src={imageUrl} height={400} alt={facility.name} fallbackSrc="https://placehold.co/800x400?text=No+Image" />
              </Card>

              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Group mt="xl" justify="space-between">
                  <Stack gap="xs">
                    {/* <Text size="lg" fw={700} c="blue"> */}
                      {facility.price_per_hour} ₽ / час
                    {/* </Text> */}
                  </Stack>
                  
                  <Stack gap="xs" align="flex-end">
                    <Group gap="xs">
                      <IconStar size={24} color="#fcc419" fill="#fcc419" />
                      <Text fw={700} size="xl">{facility.rating || 0}</Text>
                    </Group>
                    <Button 
                      size="xs" 
                      variant="outline" 
                      component={Link}
                      to={`/review/${facility.id}`}
                    >
                      Написать отзыв
                    </Button>
                  </Stack>
                </Group>

                <Group justify="space-between" mb="xs">
                  <Badge size="lg" variant="light" color="blue">{facility.type || 'Спортплощадка'}</Badge>
                  <Group gap={5}>
                    <IconStar size={18} color="#fcc419" fill="#fcc419" />
                    <Text fw={700}>4.8</Text>
                    <Text size="sm" c="dimmed">(124 отзыва)</Text>
                  </Group>
                </Group>

                <Text c="dimmed" size="sm" mb="md" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <IconMapPin size={16} /> {facility.complex_address || 'Адрес не указан'}
                </Text>

                <Divider my="md" label="Описание" labelPosition="center" />
                
                <Text size="sm" style={{ lineHeight: 1.6 }}>
                  {facility.description || 'Прекрасное место для активного отдыха и тренировок. Оборудовано всем необходимым для комфортной игры.'}
                </Text>

                

                <Group mt="xl" grow>
                  <div style={{ textAlign: 'center', padding: '10px', backgroundColor: '#f1f3f5', borderRadius: '8px' }}>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Цена</Text>
                    <Text fw={700} size="xl" c="blue">{facility.price_per_hour} ₽/час</Text>
                  </div>
                  <div style={{ textAlign: 'center', padding: '10px', backgroundColor: '#f1f3f5', borderRadius: '8px' }}>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Тип</Text>
                    <Text fw={700} size="lg">Крытый</Text>
                  </div>
                </Group>
              </Card>
            </Stack>
          </Grid.Col>

          {/* Правая колонка */}
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Card shadow="md" padding="lg" radius="md" withBorder style={{ position: 'sticky', top: 20 }}>
              <Title order={4} mb="md">Бронирование</Title>
              
              <Calendar 
                value={selectedDate} 
                onChange={setSelectedDate} 
                minDate={new Date()} 
                fullWidth
                mb="md"
                locale="ru"
              />

              <Divider my="md" />

              <Text fw={600} mb="sm" size="sm">
                Доступное время на {dayjs(selectedDate).format('D MMMM')}:
              </Text>
              
              {loadingSlots ? (
                <Center py="xl"><Loader size="sm" /></Center>
              ) : (
                <Grid gutter="xs" style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '5px' }}>
                  {slots.map((slot) => {
                    const isSelected = selectedSlot?.id === slot.id;
                    return (
                      <Grid.Col span={4} key={slot.id}>
                        <Tooltip label={slot.is_booked ? "Уже занято" : `${slot.price} ₽`}>
                          <Button
                            fullWidth
                            variant={isSelected ? 'filled' : 'outline'}
                            color={slot.is_booked ? 'gray' : isSelected ? 'blue' : 'green'}
                            disabled={slot.is_booked}
                            onClick={() => setSelectedSlot(slot)}
                            styles={{ label: { fontSize: '12px' } }}
                            px={0}
                          >
                            {dayjs(slot.start_time).format('HH:mm')}
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

              <Button 
                fullWidth 
                mt="xl" 
                size="md" 
                disabled={!selectedSlot} 
                onClick={handleBooking}
                gradient={{ from: 'blue', to: 'cyan' }}
                variant="filled"
              >
                {selectedSlot ? `Забронировать за ${selectedSlot.price} ₽` : 'Выберите время'}
              </Button>
              
              <Text size="xs" c="dimmed" ta="center" mt="sm">
                Отмена бронирования возможна за 24 часа
              </Text>
            </Card>
          </Grid.Col>
        </Grid>
      </Container>
    </div>
  );
}
