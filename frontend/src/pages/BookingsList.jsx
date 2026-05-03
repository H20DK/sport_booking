import { useEffect, useState } from 'react';
import api from '../services/api';

function BookingsList() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // В реальном проекте нужен токен авторизации
    api.get('bookings/')
      .then(response => {
        setBookings(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Ошибка загрузки:", error);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Загрузка...</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h1>Мои бронирования</h1>
      {bookings.length === 0 ? (
        <p>Нет активных бронирований.</p>
      ) : (
        <ul>
          {bookings.map(booking => (
            <li key={booking.id} style={{ marginBottom: '10px', border: '1px solid #ccc', padding: '10px' }}>
              <strong>Объект:</strong> {booking.slot_details?.facility_name}<br/>
              <strong>Время:</strong> {new Date(booking.slot_details.start_time).toLocaleString()}<br/>
              <strong>Статус:</strong> {booking.status}<br/>
              <strong>Цена:</strong> {booking.total_price} руб.
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default BookingsList;