import { useCallback, useEffect, useState } from 'react';
import { Container, Title, SimpleGrid, Loader, Center, Select, Stack, Text } from '@mantine/core';
import { FacilityCard } from '../components/FacilityCard';
import { Header } from '../components/Header';
import api from '../services/api';

export function HomePage() {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState(null);

  // Типы спорта для фильтра
  const sportTypes = [
    { value: 'football', label: 'Футбольные поля' },
    { value: 'tennis', label: 'Теннисные корты' },
    { value: 'gym', label: 'Спортзалы' },
    { value: 'pool', label: 'Бассейны' },
  ];

  const fetchFacilities = useCallback(async () => {
    setLoading(true);
    try {
      // Формируем URL с фильтром, если выбран тип
      const url = selectedType ? `/facilities/?type=${selectedType}` : '/facilities/';
      const response = await api.get(url);
      setFacilities(response.data);
    } catch (error) {
      console.error("Ошибка загрузки объектов:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedType]);

  useEffect(() => {
    fetchFacilities();
  }, [fetchFacilities]);

  return (
    <div>
      <Header />
      
      {/* Герой-блок */}
      <div style={{ background: '#f8f9fa', padding: '4rem 0', textAlign: 'center' }}>
        <Container size="md">
          <Title order={1} size="h1" mb="md">Найди идеальное место для игры</Title>
          <Text size="lg" c="dimmed" mb="xl">
            Аренда спортивных площадок онлайн за пару кликов. Футбол, теннис, бассейны и многое другое.
          </Text>
          
          {/* Фильтр */}
          <Select
            placeholder="Выберите вид спорта"
            data={sportTypes}
            clearable
            value={selectedType}
            onChange={setSelectedType}
            size="lg"
            style={{ maxWidth: '400px', margin: '0 auto' }}
          />
        </Container>
      </div>

      {/* Список объектов */}
      <Container size="xl" py="xl">
        <Title order={2} mb="lg">Доступные площадки</Title>
        
        {loading ? (
          <Center h={300}><Loader /></Center>
        ) : facilities.length === 0 ? (
          <Center h={300}>
            <Text size="lg" c="dimmed">Объекты не найдены. Попробуйте изменить фильтр.</Text>
          </Center>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="lg">
            {facilities.map((facility) => (
              <FacilityCard key={facility.id} facility={facility} />
            ))}
          </SimpleGrid>
        )}
      </Container>

      {/* Подвал */}
      <footer style={{ borderTop: '1px solid #e9ecef', padding: '2rem 0', marginTop: '4rem', background: '#f8f9fa' }}>
        <Container size="xl">
          <Text ta="center" c="dimmed" size="sm">
            © 2026 SportBooking. Курсовой проект.
          </Text>
        </Container>
      </footer>
    </div>
  );
}
