import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  Center,
  Container,
  Group,
  Loader,
  Notification,
  Paper,
  Rating,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import dayjs from 'dayjs';
import { Header } from '../components/Header';
import api from '../services/api';

const ROLE_LABELS = {
  user: 'Пользователь',
  renter: 'Собственник',
  administration: 'Администрация',
  system_admin: 'Системный администратор',
};

function getInitialTab(pathname, tabParam) {
  if (tabParam) return tabParam;
  if (pathname.endsWith('/bookings')) return 'bookings';
  if (pathname.endsWith('/reviews')) return 'reviews';
  return 'profile';
}

export function UserDashboardPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = getInitialTab(location.pathname, searchParams.get('tab'));
  const normalizedTab = ['profile', 'bookings', 'reviews'].includes(activeTab) ? activeTab : 'profile';

  const [user, setUser] = useState(null);
  const [profileForm, setProfileForm] = useState({ first_name: '', last_name: '', email: '', phone: '' });
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      const [meRes, bookingsRes, reviewsRes] = await Promise.all([
        api.get('/me/'),
        api.get('/bookings/'),
        api.get('/reviews/', { params: { mine: 1 } }),
      ]);

      if (cancelled) return;

      setUser(meRes.data);
      setProfileForm({
        first_name: meRes.data.first_name || '',
        last_name: meRes.data.last_name || '',
        email: meRes.data.email || '',
        phone: meRes.data.phone || '',
      });
      setBookings(bookingsRes.data);
      setReviews(reviewsRes.data);
      setLoading(false);
    };

    fetchData().catch(() => setLoading(false));

    return () => {
      cancelled = true;
    };
  }, []);

  const bookingsCount = useMemo(
    () => bookings.filter((booking) => booking.status !== 'cancelled').length,
    [bookings]
  );

  const handleTabChange = (value) => {
    setSearchParams(value === 'profile' ? {} : { tab: value });
  };

  const updateProfileField = (field) => (event) => {
    const { value } = event.currentTarget;
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const response = await api.patch('/me/', profileForm);
      setUser(response.data);
      setNotice({ color: 'teal', text: 'Профиль обновлён.' });
    } catch {
      setNotice({ color: 'red', text: 'Не удалось сохранить профиль.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const cancelBooking = async (id) => {
    if (!confirm('Отменить бронь?')) return;

    await api.post(`/bookings/${id}/cancel/`);
    setBookings((prev) => prev.map((booking) => (
      booking.id === id ? { ...booking, status: 'cancelled' } : booking
    )));
  };

  if (loading) return <Center h="100vh"><Loader /></Center>;

  return (
    <div>
      <Header />
      <Container size="xl" py="xl">
        <Group justify="space-between" mb="lg">
          <Stack gap={2}>
            <Title order={2}>Кабинет пользователя</Title>
            <Text size="sm" c="dimmed">Профиль, бронирования и отзывы в одном месте</Text>
          </Stack>
          <Badge size="lg" variant="light">{ROLE_LABELS[user?.role] || user?.role}</Badge>
        </Group>

        {notice && (
          <Notification color={notice.color} mb="md" onClose={() => setNotice(null)}>
            {notice.text}
          </Notification>
        )}

        <Tabs value={normalizedTab} onChange={handleTabChange}>
          <Tabs.List mb="lg">
            <Tabs.Tab value="profile">Профиль</Tabs.Tab>
            <Tabs.Tab value="bookings">Бронирования</Tabs.Tab>
            <Tabs.Tab value="reviews">Отзывы</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="profile">
            <Paper withBorder shadow="sm" radius="md" p="lg" maw={760}>
              <Stack>
                <Text c="dimmed">Логин: {user?.username}</Text>
                <TextInput label="Имя" value={profileForm.first_name} onChange={updateProfileField('first_name')} />
                <TextInput label="Фамилия" value={profileForm.last_name} onChange={updateProfileField('last_name')} />
                <TextInput label="Email" type="email" value={profileForm.email} onChange={updateProfileField('email')} />
                <TextInput label="Телефон" value={profileForm.phone} onChange={updateProfileField('phone')} />
                <Button loading={savingProfile} onClick={saveProfile}>Сохранить</Button>
              </Stack>
            </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="bookings">
            <Group justify="space-between" mb="md">
              <Title order={4}>Мои бронирования</Title>
              <Badge variant="light">Активных: {bookingsCount}</Badge>
            </Group>
            {bookings.length === 0 ? (
              <Text c="dimmed">У вас пока нет бронирований.</Text>
            ) : (
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Объект</Table.Th>
                    <Table.Th>Дата и время</Table.Th>
                    <Table.Th>Статус</Table.Th>
                    <Table.Th>Мест</Table.Th>
                    <Table.Th>Цена</Table.Th>
                    <Table.Th>Действия</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {bookings.map((booking) => (
                    <Table.Tr key={booking.id}>
                      <Table.Td>{booking.slot_details?.facility_name || `№${booking.slot}`}</Table.Td>
                      <Table.Td>{dayjs(booking.slot_details?.start_time).format('DD.MM.YYYY HH:mm')}</Table.Td>
                      <Table.Td>
                        <Badge color={booking.status === 'confirmed' ? 'green' : booking.status === 'pending' ? 'yellow' : 'red'}>
                          {booking.status}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{booking.seats || 1}</Table.Td>
                      <Table.Td>{booking.total_price} ₽</Table.Td>
                      <Table.Td>
                        {booking.status !== 'cancelled' && (
                          <Button size="xs" color="red" variant="light" onClick={() => cancelBooking(booking.id)}>
                            Отменить
                          </Button>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="reviews">
            <Group justify="space-between" mb="md">
              <Title order={4}>Мои отзывы</Title>
              <Badge variant="light">{reviews.length}</Badge>
            </Group>
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
          </Tabs.Panel>
        </Tabs>
      </Container>
    </div>
  );
}
