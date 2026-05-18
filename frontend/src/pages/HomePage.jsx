import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Center,
  Container,
  Group,
  HoverCard,
  Loader,
  NumberInput,
  Radio,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import {
  IconArrowsSort,
  IconCalendar,
  IconChevronDown,
  IconChevronUp,
  IconBuilding,
  IconCurrencyRubel,
  IconMap,
  IconRun,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { FacilityCard } from '../components/FacilityCard';
import { FacilitiesMap } from '../components/FacilitiesMap';
import { Header } from '../components/Header';
import api from '../services/api';

const SORT_OPTIONS = [
  { value: 'popular', label: 'По популярности' },
  { value: 'rating', label: 'По рейтингу' },
  { value: 'priceAsc', label: 'По возрастанию цены' },
  { value: 'priceDesc', label: 'По убыванию цены' },
  { value: 'newest', label: 'По новинкам' },
];

function getFacilityPrice(facility) {
  return Number(facility.min_price ?? facility.price_per_hour);
}

function FilterButton({ icon, label, active, opened }) {
  return (
    <Button
      variant="light"
      color={active ? 'blue' : 'gray'}
      radius="xl"
      leftSection={icon}
      rightSection={opened ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
      styles={{
        root: {
          backgroundColor: active ? '#e7f5ff' : '#f1f3f5',
          color: active ? '#1971c2' : '#1f2937',
          border: 0,
        },
      }}
    >
      {label}
    </Button>
  );
}

export function HomePage() {
  const [facilities, setFacilities] = useState([]);
  const [sportTypes, setSportTypes] = useState([]);
  const [facilityKinds, setFacilityKinds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availableFacilityIds, setAvailableFacilityIds] = useState(null);
  const [sortBy, setSortBy] = useState('rating');
  const [sportType, setSportType] = useState('all');
  const [facilityKind, setFacilityKind] = useState('all');
  const [priceFrom, setPriceFrom] = useState('');
  const [priceTo, setPriceTo] = useState('');
  const [availabilityDate, setAvailabilityDate] = useState(null);
  const [mapOpened, setMapOpened] = useState(false);

  const fetchFacilities = useCallback(async () => {
    setLoading(true);
    try {
      const [facilitiesRes, sportTypesRes, kindsRes] = await Promise.all([
        api.get('/facilities/'),
        api.get('/sport-types/'),
        api.get('/facility-kinds/'),
      ]);
      setFacilities(facilitiesRes.data);
      setSportTypes(sportTypesRes.data);
      setFacilityKinds(kindsRes.data);
    } catch (error) {
      console.error('Ошибка загрузки объектов:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFacilities();
  }, [fetchFacilities]);

  useEffect(() => {
    if (!availabilityDate || facilities.length === 0) {
      setAvailableFacilityIds(null);
      return;
    }

    let cancelled = false;

    const fetchAvailableFacilities = async () => {
      setLoadingAvailability(true);
      const date = dayjs(availabilityDate).format('YYYY-MM-DD');

      try {
        const results = await Promise.all(
          facilities.map(async (facility) => {
            try {
              const response = await api.get(`/facilities/${facility.id}/slots/`, { params: { date } });
              const hasFreeSlot = response.data.some((slot) => !slot.is_booked);
              return hasFreeSlot ? facility.id : null;
            } catch {
              return null;
            }
          })
        );

        if (!cancelled) {
          setAvailableFacilityIds(new Set(results.filter(Boolean)));
        }
      } finally {
        if (!cancelled) {
          setLoadingAvailability(false);
        }
      }
    };

    fetchAvailableFacilities();

    return () => {
      cancelled = true;
    };
  }, [availabilityDate, facilities]);

  const visibleFacilities = useMemo(() => {
    const minPrice = priceFrom === '' ? null : Number(priceFrom);
    const maxPrice = priceTo === '' ? null : Number(priceTo);

    return facilities
      .filter((facility) => sportType === 'all' || facility.type === sportType)
      .filter((facility) => facilityKind === 'all' || String(facility.kind) === String(facilityKind))
      .filter((facility) => {
        const price = getFacilityPrice(facility);
        if (minPrice !== null && price < minPrice) return false;
        if (maxPrice !== null && price > maxPrice) return false;
        return true;
      })
      .filter((facility) => {
        if (!availableFacilityIds) return true;
        return availableFacilityIds.has(facility.id);
      })
      .sort((a, b) => {
        if (sortBy === 'popular') return Number(b.popularity_score || 0) - Number(a.popularity_score || 0);
        if (sortBy === 'rating') return Number(b.rating || 0) - Number(a.rating || 0);
        if (sortBy === 'priceAsc') return getFacilityPrice(a) - getFacilityPrice(b);
        if (sortBy === 'priceDesc') return getFacilityPrice(b) - getFacilityPrice(a);
        return Number(b.id) - Number(a.id);
      });
  }, [availableFacilityIds, facilities, facilityKind, priceFrom, priceTo, sortBy, sportType]);

  const sortLabel = SORT_OPTIONS.find((option) => option.value === sortBy)?.label || 'Сортировка';
  const sportOptions = useMemo(
    () => [{ value: 'all', label: 'Все виды спорта' }, ...sportTypes.map((item) => ({ value: item.slug, label: item.name }))],
    [sportTypes]
  );
  const sportLabel = sportOptions.find((option) => option.value === sportType)?.label || 'Вид спорта';
  const kindOptions = useMemo(
    () => [{ value: 'all', label: 'Все виды площадок' }, ...facilityKinds.map((item) => ({ value: String(item.id), label: item.name }))],
    [facilityKinds]
  );
  const kindLabel = kindOptions.find((option) => option.value === facilityKind)?.label || 'Вид площадки';
  const priceActive = priceFrom !== '' || priceTo !== '';
  const dateActive = Boolean(availabilityDate);

  return (
    <div>
      <Header />

      <Container size="xl" py="xl">
        <Group justify="space-between" align="flex-start" mb="lg">
          <Stack gap={4}>
            <Title order={2}>Доступные площадки</Title>
            <Text size="sm" c="dimmed">
              Найдено: {visibleFacilities.length}
            </Text>
          </Stack>

          <Group gap="sm" wrap="wrap">
            <HoverCard width={300} shadow="md" radius="md" openDelay={80} closeDelay={180}>
              <HoverCard.Target>
                <div>
                  <FilterButton
                    icon={<IconArrowsSort size={18} />}
                    label={sortLabel}
                    active={sortBy !== 'rating'}
                  />
                </div>
              </HoverCard.Target>
              <HoverCard.Dropdown>
                <Radio.Group value={sortBy} onChange={setSortBy}>
                  <Stack gap="md">
                    {SORT_OPTIONS.map((option) => (
                      <Radio key={option.value} value={option.value} label={option.label} color="blue" />
                    ))}
                  </Stack>
                </Radio.Group>
              </HoverCard.Dropdown>
            </HoverCard>

            <HoverCard width={310} shadow="md" radius="md" openDelay={80} closeDelay={180}>
              <HoverCard.Target>
                <div>
                  <FilterButton
                    icon={<IconCurrencyRubel size={18} />}
                    label="Цена, ₽"
                    active={priceActive}
                  />
                </div>
              </HoverCard.Target>
              <HoverCard.Dropdown>
                <Group grow mb="md">
                  <NumberInput
                    label="От"
                    min={0}
                    hideControls
                    value={priceFrom}
                    onChange={(value) => setPriceFrom(value ?? '')}
                    placeholder="100"
                  />
                  <NumberInput
                    label="До"
                    min={0}
                    hideControls
                    value={priceTo}
                    onChange={(value) => setPriceTo(value ?? '')}
                    placeholder="3500"
                  />
                </Group>
                <Button fullWidth color="blue" radius="md">
                  Готово
                </Button>
              </HoverCard.Dropdown>
            </HoverCard>

            <HoverCard width={280} shadow="md" radius="md" openDelay={80} closeDelay={180}>
              <HoverCard.Target>
                <div>
                  <FilterButton
                    icon={<IconRun size={18} />}
                    label={sportLabel}
                    active={sportType !== 'all'}
                  />
                </div>
              </HoverCard.Target>
              <HoverCard.Dropdown>
                <Radio.Group value={sportType} onChange={setSportType}>
                  <Stack gap="md">
                    {sportOptions.map((option) => (
                      <Radio key={option.value} value={option.value} label={option.label} color="blue" />
                    ))}
                  </Stack>
                </Radio.Group>
              </HoverCard.Dropdown>
            </HoverCard>

            <HoverCard width={280} shadow="md" radius="md" openDelay={80} closeDelay={180}>
              <HoverCard.Target>
                <div>
                  <FilterButton
                    icon={<IconBuilding size={18} />}
                    label={kindLabel}
                    active={facilityKind !== 'all'}
                  />
                </div>
              </HoverCard.Target>
              <HoverCard.Dropdown>
                <Radio.Group value={facilityKind} onChange={setFacilityKind}>
                  <Stack gap="md">
                    {kindOptions.map((option) => (
                      <Radio key={option.value} value={option.value} label={option.label} color="blue" />
                    ))}
                  </Stack>
                </Radio.Group>
              </HoverCard.Dropdown>
            </HoverCard>

            <HoverCard width={310} shadow="md" radius="md" openDelay={80} closeDelay={180}>
              <HoverCard.Target>
                <div>
                  <FilterButton
                    icon={<IconCalendar size={18} />}
                    label={availabilityDate ? dayjs(availabilityDate).format('DD.MM.YYYY') : 'Дата брони'}
                    active={dateActive}
                  />
                </div>
              </HoverCard.Target>
              <HoverCard.Dropdown>
                <Stack>
                  <DateInput
                    label="Свободная дата"
                    placeholder="Выберите дату"
                    value={availabilityDate}
                    onChange={setAvailabilityDate}
                    minDate={dayjs().format('YYYY-MM-DD')}
                    clearable
                  />
                  <Button
                    fullWidth
                    variant="light"
                    color="gray"
                    disabled={!availabilityDate}
                    onClick={() => setAvailabilityDate(null)}
                  >
                    Сбросить дату
                  </Button>
                </Stack>
              </HoverCard.Dropdown>
            </HoverCard>
            <Button
              variant="light"
              color={mapOpened ? 'blue' : 'gray'}
              radius="xl"
              leftSection={<IconMap size={18} />}
              onClick={() => setMapOpened((opened) => !opened)}
              styles={{
                root: {
                  backgroundColor: mapOpened ? '#e7f5ff' : '#f1f3f5',
                  color: mapOpened ? '#1971c2' : '#1f2937',
                  border: 0,
                },
              }}
            >
              {mapOpened ? 'Скрыть карту' : 'Карта'}
            </Button>
          </Group>
        </Group>

        {loading || loadingAvailability ? (
          <Center h={300}><Loader /></Center>
        ) : visibleFacilities.length === 0 ? (
          <Center h={300}>
            <Text size="lg" c="dimmed">Площадки не найдены. Попробуйте изменить фильтры.</Text>
          </Center>
        ) : (
          <Stack gap="lg">
            {mapOpened && <FacilitiesMap facilities={visibleFacilities} title="Объекты после фильтров" />}
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="lg">
              {visibleFacilities.map((facility) => (
                <FacilityCard key={facility.id} facility={facility} />
              ))}
            </SimpleGrid>
          </Stack>
        )}
      </Container>

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
