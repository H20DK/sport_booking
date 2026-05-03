import { useEffect, useState } from 'react';
import { Badge, Button, Center, Container, Loader, Table, Text, Title } from '@mantine/core';
import dayjs from 'dayjs';
import { Header } from '../components/Header';
import api from '../services/api';

export function ProfileBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/bookings/')
      .then((response) => setBookings(response.data))
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = async (id) => {
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
        <Title order={2} mb="lg">Бронирования</Title>
        {bookings.length === 0 ? (
          <Text c="dimmed">У вас пока нет бронирований.</Text>
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
                  <Table.Td>{booking.slot_details?.facility_name || `№${booking.slot}`}</Table.Td>
                  <Table.Td>{dayjs(booking.slot_details?.start_time).format('DD.MM.YYYY HH:mm')}</Table.Td>
                  <Table.Td>
                    <Badge color={booking.status === 'confirmed' ? 'green' : booking.status === 'pending' ? 'yellow' : 'red'}>
                      {booking.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{booking.total_price} ₽</Table.Td>
                  <Table.Td>
                    {booking.status !== 'cancelled' && (
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
