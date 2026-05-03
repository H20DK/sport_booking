import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Title, Table, Badge, Button, Group, Text, Loader, Center, Notification } from '@mantine/core';
import { Header } from '../components/Header';
import api from '../services/api';
import dayjs from 'dayjs';

export function ProfilePage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Получаем свои брони
        const bookingsRes = await api.get('/bookings/');
        setBookings(bookingsRes.data);
        
        // Получаем данные пользователя (можно сохранить при логине, но тут запросим для примера)
        // Для этого нужен эндпоинт /api/users/me/, пока обойдемся тем, что есть в localStorage или заглушкой
        setUser({ username: localStorage.getItem('username') || 'Пользователь' }); 
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/');
  };

  const handleCancel = async (id) => {
    if(!confirm('Отменить бронь?')) return;
    try {
      await api.post(`/bookings/${id}/cancel/`); // Нужен action в ViewSet
      setBookings(prev => prev.filter(b => b.id !== id));
    } catch {
      alert('Не удалось отменить');
    }
  };

  if (loading) return <Center h="100vh"><Loader /></Center>;

  return (
    <div>
      <Header />
      <Container size="xl" py="xl">
        <Group justify="space-between" mb="xl">
          <Title>Личный кабинет: {user?.username}</Title>
          <Button color="gray" variant="outline" onClick={handleLogout}>Выйти</Button>
        </Group>

        <Title order={3} mb="md">Мои бронирования</Title>
        {bookings.length === 0 ? (
          <Text c="dimmed">У вас пока нет активных бронирований.</Text>
        ) : (
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Объект</Table.Th>
                <Table.Th>Дата и время</Table.Th>
                <Table.Th>Статус</Table.Th>
                <Table.Th>Цена</Table.Th>
                <Table.Th>Действия</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {bookings.map((booking) => (
                <Table.Tr key={booking.id}>
                  <Table.Td>{booking.slot_details?.facility_name || '№' + booking.slot}</Table.Td>
                  <Table.Td>
                    {dayjs(booking.slot_details?.start_time).format('DD.MM.YYYY HH:mm')}
                  </Table.Td>
                  <Table.Td>
                    <Badge color={
                      booking.status === 'confirmed' ? 'green' : 
                      booking.status === 'pending' ? 'yellow' : 'red'
                    }>
                      {booking.status === 'confirmed' ? 'Подтверждено' : 
                       booking.status === 'pending' ? 'Ожидает' : 'Отменено'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{booking.total_price} ₽</Table.Td>
                  <Table.Td>
                    {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                      <Button size="xs" color="red" variant="light" onClick={() => handleCancel(booking.id)}>
                        Отменить
                      </Button>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Container>
    </div>
  );
}