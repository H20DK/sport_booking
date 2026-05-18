import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Center,
  Container,
  FileInput,
  Group,
  Loader,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Textarea,
  Title,
  Tooltip,
} from '@mantine/core';
import { DateInput, TimeInput } from '@mantine/dates';
import { IconPencil, IconStar, IconTrash } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { Header } from '../components/Header';
import api from '../services/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const emptySlotForm = {
  facility: '',
  date: dayjs().format('YYYY-MM-DD'),
  start: '10:00',
  end: '11:00',
  title: '',
  trainerName: '',
  price: '',
  capacity: 1,
};

const emptyComplexForm = { name: '', address: '', description: '' };
const emptyFacilityForm = {
  complex: '',
  name: '',
  description: '',
  type: 'football',
  kind: '',
  price_per_hour: 1000,
  latitude: '',
  longitude: '',
};

function slotToForm(slot, basePrice = '') {
  return {
    facility: String(slot.facility),
    date: dayjs(slot.start_time).format('YYYY-MM-DD'),
    start: dayjs(slot.start_time).format('HH:mm'),
    end: dayjs(slot.end_time).format('HH:mm'),
    title: slot.title || '',
    trainerName: slot.trainer_name || '',
    price: slot.price ?? basePrice ?? '',
    capacity: slot.capacity || 1,
  };
}

function formToSlotPayload(form) {
  return {
    facility: form.facility,
    start_time: `${form.date}T${form.start}:00`,
    end_time: `${form.date}T${form.end}:00`,
    title: form.title,
    trainer_name: form.trainerName,
    price: form.price === '' || form.price === null ? null : form.price,
    capacity: form.capacity || 1,
  };
}

function isSlotTimeRangeValid(form) {
  if (!form.date || !form.start || !form.end) return true;
  return dayjs(`${form.date}T${form.start}:00`).isBefore(dayjs(`${form.date}T${form.end}:00`));
}

function formToFacilityPayload(form) {
  return {
    ...form,
    latitude: form.latitude === '' || form.latitude === null ? null : form.latitude,
    longitude: form.longitude === '' || form.longitude === null ? null : form.longitude,
  };
}

function getImageUrl(imagePath) {
  return imagePath.startsWith('http') ? imagePath : `${API_BASE_URL}${imagePath}`;
}

export function RenterDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'objects';
  const [loading, setLoading] = useState(true);
  const [complexes, setComplexes] = useState([]);
  const [sportTypes, setSportTypes] = useState([]);
  const [facilityKinds, setFacilityKinds] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [slots, setSlots] = useState([]);
  const [complexForm, setComplexForm] = useState(emptyComplexForm);
  const [facilityForm, setFacilityForm] = useState(emptyFacilityForm);
  const [editingComplexId, setEditingComplexId] = useState(null);
  const [editingFacilityId, setEditingFacilityId] = useState(null);
  const [facilityImageFiles, setFacilityImageFiles] = useState([]);
  const [facilityImageNotice, setFacilityImageNotice] = useState('');
  const [complexNotice, setComplexNotice] = useState('');
  const [slotForm, setSlotForm] = useState(emptySlotForm);
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [scheduleFacility, setScheduleFacility] = useState('');
  const [scheduleDate, setScheduleDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [bookingFacilityFilter, setBookingFacilityFilter] = useState('all');
  const [bookingDateFilter, setBookingDateFilter] = useState(null);
  const [bookingStatusFilter, setBookingStatusFilter] = useState('all');
  const [responses, setResponses] = useState({});
  const [scheduleNotice, setScheduleNotice] = useState('');

  const fetchData = useCallback(async () => {
    const [complexesRes, sportTypesRes, facilityKindsRes, facilitiesRes, reviewsRes, bookingsRes, slotsRes] = await Promise.all([
      api.get('/complexes/', { params: { mine: 1 } }),
      api.get('/sport-types/'),
      api.get('/facility-kinds/'),
      api.get('/facilities/', { params: { mine: 1 } }),
      api.get('/reviews/', { params: { owner: 1 } }),
      api.get('/bookings/'),
      api.get('/timeslots/'),
    ]);

    setComplexes(complexesRes.data);
    setSportTypes(sportTypesRes.data);
    setFacilityKinds(facilityKindsRes.data);
    setFacilities(facilitiesRes.data);
    setReviews(reviewsRes.data);
    setBookings(bookingsRes.data);
    setSlots(slotsRes.data);
    setResponses(Object.fromEntries(reviewsRes.data.map((review) => [review.id, review.owner_response || ''])));

    if (!scheduleFacility && facilitiesRes.data.length > 0) {
      const firstFacility = facilitiesRes.data[0];
      setScheduleFacility(String(firstFacility.id));
      setSlotForm((prev) => ({
        ...prev,
        facility: String(firstFacility.id),
        price: prev.price === '' ? firstFacility.price_per_hour : prev.price,
      }));
    }
  }, [scheduleFacility]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchData().finally(() => setLoading(false));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchData]);

  const facilityOptions = useMemo(
    () => facilities.map((item) => ({ value: String(item.id), label: item.name })),
    [facilities]
  );
  const sportTypeOptions = useMemo(
    () => sportTypes.map((item) => ({ value: item.slug, label: item.name })),
    [sportTypes]
  );

  const editingFacility = useMemo(
    () => facilities.find((facility) => Number(facility.id) === Number(editingFacilityId)),
    [editingFacilityId, facilities]
  );

  const visibleSlots = useMemo(() => (
    slots
      .filter((slot) => !scheduleFacility || String(slot.facility) === String(scheduleFacility))
      .filter((slot) => dayjs(slot.start_time).format('YYYY-MM-DD') === scheduleDate)
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
  ), [scheduleDate, scheduleFacility, slots]);

  const visibleBookings = useMemo(() => (
    bookings
      .filter((booking) => {
        if (bookingFacilityFilter === 'all') return true;
        return String(booking.slot_details?.facility) === String(bookingFacilityFilter);
      })
      .filter((booking) => {
        if (!bookingDateFilter) return true;
        return dayjs(booking.slot_details?.start_time).format('YYYY-MM-DD') === dayjs(bookingDateFilter).format('YYYY-MM-DD');
      })
      .filter((booking) => bookingStatusFilter === 'all' || booking.status === bookingStatusFilter)
      .sort((a, b) => new Date(b.slot_details?.start_time || 0) - new Date(a.slot_details?.start_time || 0))
  ), [bookingDateFilter, bookingFacilityFilter, bookingStatusFilter, bookings]);

  const getFacilityBasePrice = (facilityId) => {
    const facility = facilities.find((item) => String(item.id) === String(facilityId));
    return facility?.price_per_hour;
  };

  const getSlotDisplayPrice = (slot) => slot.price ?? getFacilityBasePrice(slot.facility);

  const getSlotFormDefaults = (facilityId = scheduleFacility, date = scheduleDate) => ({
    ...emptySlotForm,
    facility: facilityId,
    date,
    price: getFacilityBasePrice(facilityId) ?? '',
  });

  const createComplex = async () => {
    setComplexNotice('');
    try {
      if (editingComplexId) {
        await api.patch(`/complexes/${editingComplexId}/`, complexForm);
        setComplexNotice('Спорткомплекс обновлён.');
      } else {
        await api.post('/complexes/', complexForm);
        setComplexNotice('Спорткомплекс добавлен.');
      }
      setEditingComplexId(null);
      setComplexForm(emptyComplexForm);
      await fetchData();
    } catch (error) {
      const data = error.response?.data;
      const message = data?.detail || data?.owner?.[0] || data?.name?.[0] || data?.address?.[0] || 'Не удалось сохранить спорткомплекс.';
      setComplexNotice(message);
    }
  };

  const createFacility = async () => {
    const payload = formToFacilityPayload(facilityForm);
    let facilityId = editingFacilityId;
    if (editingFacilityId) {
      await api.patch(`/facilities/${editingFacilityId}/`, payload);
    } else {
      const response = await api.post('/facilities/', payload);
      facilityId = response.data.id;
    }

    if (facilityId && facilityImageFiles.length > 0) {
      for (const file of facilityImageFiles) {
        const formData = new FormData();
        formData.append('image', file);
        await api.post(`/facilities/${facilityId}/upload_image/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
    }

    setEditingFacilityId(null);
    setFacilityForm(emptyFacilityForm);
    setFacilityImageFiles([]);
    setFacilityImageNotice('');
    await fetchData();
  };

  const editComplex = (complex) => {
    setEditingComplexId(complex.id);
    setComplexNotice('');
    setComplexForm({
      name: complex.name || '',
      address: complex.address || '',
      description: complex.description || '',
    });
  };

  const cancelComplexEdit = () => {
    setEditingComplexId(null);
    setComplexForm(emptyComplexForm);
    setComplexNotice('');
  };

  const deleteComplex = async (complex) => {
    const facilitiesCount = complex.facilities?.length || facilities.filter((facility) => Number(facility.complex) === Number(complex.id)).length;
    const message = facilitiesCount > 0
      ? `Удалить спорткомплекс "${complex.name}" и все его объекты?`
      : `Удалить спорткомплекс "${complex.name}"?`;

    if (!confirm(message)) return;

    await api.delete(`/complexes/${complex.id}/`);
    if (Number(editingComplexId) === Number(complex.id)) {
      cancelComplexEdit();
    }
    await fetchData();
  };

  const editFacility = (facility) => {
    setEditingFacilityId(facility.id);
    setFacilityImageFiles([]);
    setFacilityImageNotice('');
    setFacilityForm({
      complex: String(facility.complex),
      name: facility.name || '',
      description: facility.description || '',
      type: facility.type || 'football',
      kind: facility.kind ? String(facility.kind) : '',
      price_per_hour: facility.price_per_hour ?? 0,
      latitude: facility.latitude ?? '',
      longitude: facility.longitude ?? '',
    });
  };

  const cancelFacilityEdit = () => {
    setEditingFacilityId(null);
    setFacilityForm(emptyFacilityForm);
    setFacilityImageFiles([]);
    setFacilityImageNotice('');
  };

  const deleteFacility = async (facility) => {
    if (!confirm(`Удалить объект "${facility.name}"?`)) return;

    await api.delete(`/facilities/${facility.id}/`);
    if (Number(editingFacilityId) === Number(facility.id)) {
      cancelFacilityEdit();
    }
    await fetchData();
  };

  const uploadFacilityImages = async () => {
    if (!editingFacilityId || facilityImageFiles.length === 0) return;

    setFacilityImageNotice('');
    try {
      for (const file of facilityImageFiles) {
        const formData = new FormData();
        formData.append('image', file);
        await api.post(`/facilities/${editingFacilityId}/upload_image/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      setFacilityImageFiles([]);
      setFacilityImageNotice('Фото добавлены.');
      await fetchData();
    } catch (error) {
      setFacilityImageNotice(error.response?.data?.detail || 'Не удалось загрузить фото.');
    }
  };

  const deleteFacilityImage = async (imageId) => {
    if (!editingFacilityId) return;

    try {
      await api.delete(`/facilities/${editingFacilityId}/images/${imageId}/`);
      setFacilityImageNotice('Фото удалено.');
      await fetchData();
    } catch (error) {
      setFacilityImageNotice(error.response?.data?.detail || 'Не удалось удалить фото.');
    }
  };

  const setMainFacilityImage = async (imageId) => {
    if (!editingFacilityId) return;

    try {
      await api.post(`/facilities/${editingFacilityId}/images/${imageId}/set_main/`);
      setFacilityImageNotice('Главное фото обновлено.');
      await fetchData();
    } catch (error) {
      setFacilityImageNotice(error.response?.data?.detail || 'Не удалось выбрать главное фото.');
    }
  };

  const saveSlot = async () => {
    setScheduleNotice('');
    if (!isSlotTimeRangeValid(slotForm)) {
      setScheduleNotice('Время окончания должно быть позже времени начала.');
      return;
    }

    try {
      if (editingSlotId) {
        await api.patch(`/timeslots/${editingSlotId}/`, formToSlotPayload(slotForm));
        setScheduleNotice('Слот обновлён.');
      } else {
        await api.post('/timeslots/', { ...formToSlotPayload(slotForm), is_booked: false });
        setScheduleNotice('Слот добавлен.');
      }

      setEditingSlotId(null);
      setScheduleFacility(String(slotForm.facility));
      setScheduleDate(slotForm.date);
      setSlotForm((prev) => getSlotFormDefaults(prev.facility, prev.date));
      await fetchData();
    } catch (error) {
      setScheduleNotice(error.response?.data?.detail || error.response?.data?.non_field_errors?.[0] || 'Не удалось сохранить слот.');
    }
  };

  const editSlot = (slot) => {
    setEditingSlotId(slot.id);
    setSlotForm(slotToForm(slot, getFacilityBasePrice(slot.facility)));
    setScheduleFacility(String(slot.facility));
    setScheduleDate(dayjs(slot.start_time).format('YYYY-MM-DD'));
    setScheduleNotice('');
  };

  const cancelSlotEdit = () => {
    setEditingSlotId(null);
    setSlotForm(getSlotFormDefaults());
    setScheduleNotice('');
  };

  const deleteSlot = async (slot) => {
    const message = slot.is_booked
      ? 'Удалить занятый слот? Активная бронь будет отменена.'
      : 'Удалить слот из расписания?';

    if (!confirm(message)) return;

    try {
      await api.delete(`/timeslots/${slot.id}/`);
      setScheduleNotice(slot.is_booked ? 'Слот удалён, бронь отменена.' : 'Слот удалён.');
      await fetchData();
    } catch (error) {
      setScheduleNotice(error.response?.data?.detail || 'Не удалось удалить слот.');
    }
  };

  const cancelBooking = async (bookingId) => {
    await api.post(`/bookings/${bookingId}/cancel/`);
    await fetchData();
  };

  const saveResponse = async (reviewId) => {
    const response = await api.post(`/reviews/${reviewId}/respond/`, {
      owner_response: responses[reviewId] || '',
    });
    setReviews((prev) => prev.map((review) => (review.id === reviewId ? response.data : review)));
  };

  const updateComplexField = (field) => (event) => {
    const { value } = event.currentTarget;
    setComplexForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateFacilityField = (field) => (event) => {
    const { value } = event.currentTarget;
    setFacilityForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateSlotField = (field) => (event) => {
    const { value } = event.currentTarget;
    setSlotForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateResponse = (reviewId) => (event) => {
    const { value } = event.currentTarget;
    setResponses((prev) => ({ ...prev, [reviewId]: value }));
  };

  if (loading) return <Center h="100vh"><Loader /></Center>;

  return (
    <div>
      <Header />
      <Container size="xl" py="xl">
        <Title order={2} mb="lg">Кабинет собственника</Title>

        <Tabs
          value={activeTab}
          onChange={(value) => setSearchParams(value === 'objects' ? {} : { tab: value })}
        >
          <Tabs.List mb="lg">
            <Tabs.Tab value="objects">Объекты</Tabs.Tab>
            <Tabs.Tab value="reviews">Отзывы</Tabs.Tab>
            <Tabs.Tab value="bookings">Бронирования</Tabs.Tab>
            <Tabs.Tab value="schedule">Расписание</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="objects">
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
              <Card withBorder radius="md" p="lg">
                <Title order={4} mb="md">{editingComplexId ? 'Редактировать спорткомплекс' : 'Новый спорткомплекс'}</Title>
                <Stack>
                  <TextInput label="Название" value={complexForm.name} onChange={updateComplexField('name')} />
                  <TextInput label="Адрес" value={complexForm.address} onChange={updateComplexField('address')} />
                  <Textarea label="Описание" value={complexForm.description} onChange={updateComplexField('description')} />
                  <Group>
                    <Button onClick={createComplex} disabled={!complexForm.name || !complexForm.address}>
                      {editingComplexId ? 'Сохранить спорткомплекс' : 'Добавить комплекс'}
                    </Button>
                    {editingComplexId && <Button variant="subtle" onClick={cancelComplexEdit}>Отмена</Button>}
                  </Group>
                  {complexNotice && (
                    <Text size="sm" c={complexNotice.includes('Не удалось') || complexNotice.includes('обязательное') || complexNotice.includes('required') ? 'red' : 'teal'}>
                      {complexNotice}
                    </Text>
                  )}
                </Stack>
              </Card>

              <Card withBorder radius="md" p="lg">
                <Title order={4} mb="md">{editingFacilityId ? 'Редактировать площадку' : 'Новая площадка'}</Title>
                <Stack>
                  <Select label="Комплекс" data={complexes.map((item) => ({ value: String(item.id), label: item.name }))} value={String(facilityForm.complex || '')} onChange={(value) => setFacilityForm((p) => ({ ...p, complex: value }))} />
                  <TextInput label="Название" value={facilityForm.name} onChange={updateFacilityField('name')} />
                  <Select label="Вид спорта" data={sportTypeOptions} value={facilityForm.type} onChange={(value) => setFacilityForm((p) => ({ ...p, type: value || '' }))} />
                  <Select
                    label="Вид площадки"
                    data={facilityKinds.map((item) => ({ value: String(item.id), label: item.name }))}
                    value={String(facilityForm.kind || '')}
                    onChange={(value) => setFacilityForm((p) => ({ ...p, kind: value || '' }))}
                    clearable
                  />
                  <Textarea label="Описание объекта" value={facilityForm.description} onChange={updateFacilityField('description')} minRows={3} />
                  <NumberInput label="Цена за час" min={0} value={facilityForm.price_per_hour} onChange={(value) => setFacilityForm((p) => ({ ...p, price_per_hour: value || 0 }))} />
                  <Group grow>
                    <NumberInput
                      label="Широта"
                      decimalScale={6}
                      min={-90}
                      max={90}
                      hideControls
                      value={facilityForm.latitude}
                      onChange={(value) => setFacilityForm((p) => ({ ...p, latitude: value ?? '' }))}
                    />
                    <NumberInput
                      label="Долгота"
                      decimalScale={6}
                      min={-180}
                      max={180}
                      hideControls
                      value={facilityForm.longitude}
                      onChange={(value) => setFacilityForm((p) => ({ ...p, longitude: value ?? '' }))}
                    />
                  </Group>
                  <Card withBorder radius="md" p="sm">
                      <Stack gap="sm">
                        <Text fw={700} size="sm">Фотографии объекта</Text>
                        {editingFacilityId && editingFacility?.images?.length > 0 ? (
                          <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="xs">
                            {editingFacility.images.map((image) => {
                              const isMainImage = image.is_main || editingFacility.images.length === 1;

                              return (
                                <Card key={image.id} withBorder p={4} radius="sm" pos="relative">
                                  <ActionIcon
                                    pos="absolute"
                                    top={8}
                                    right={8}
                                    size="sm"
                                    radius="xl"
                                    variant="filled"
                                    color={isMainImage ? 'yellow' : 'gray'}
                                    aria-label={isMainImage ? 'Главное фото' : 'Сделать главным'}
                                    onClick={() => !isMainImage && setMainFacilityImage(image.id)}
                                    style={{ zIndex: 2 }}
                                  >
                                    <IconStar size={15} fill={isMainImage ? 'currentColor' : 'none'} />
                                  </ActionIcon>
                                  <img
                                    src={getImageUrl(image.image)}
                                    alt={editingFacility.name}
                                    style={{ width: '100%', height: 84, objectFit: 'cover', borderRadius: 4, display: 'block' }}
                                  />
                                  <Group justify="space-between" mt={4} gap={4}>
                                    <Text size="xs" c={isMainImage ? 'blue' : 'dimmed'}>
                                      {isMainImage ? 'Главное' : 'Фото'}
                                    </Text>
                                    <Button size="compact-xs" color="red" variant="subtle" onClick={() => deleteFacilityImage(image.id)}>
                                      Удалить
                                    </Button>
                                  </Group>
                                </Card>
                              );
                            })}
                          </SimpleGrid>
                        ) : editingFacilityId ? (
                          <Text size="sm" c="dimmed">Фотографий пока нет.</Text>
                        ) : (
                          <Text size="sm" c="dimmed">Фото будут загружены сразу после создания объекта.</Text>
                        )}
                        <FileInput
                          label="Добавить фото"
                          placeholder="Выберите изображения"
                          accept="image/*"
                          multiple
                          value={facilityImageFiles}
                          onChange={setFacilityImageFiles}
                        />
                        <Group>
                          {editingFacilityId && (
                            <Button onClick={uploadFacilityImages} disabled={facilityImageFiles.length === 0}>
                              Загрузить фото
                            </Button>
                          )}
                          {facilityImageNotice && (
                            <Text size="sm" c={facilityImageNotice.includes('Не удалось') ? 'red' : 'teal'}>
                              {facilityImageNotice}
                            </Text>
                          )}
                        </Group>
                      </Stack>
                    </Card>
                  <Group>
                    <Button onClick={createFacility} disabled={!facilityForm.complex || !facilityForm.name}>
                      {editingFacilityId ? 'Сохранить площадку' : 'Добавить площадку'}
                    </Button>
                    {editingFacilityId && <Button variant="subtle" onClick={cancelFacilityEdit}>Отмена</Button>}
                  </Group>
                </Stack>
              </Card>
            </SimpleGrid>

            <Title order={4} mt="xl" mb="md">Мои спорткомплексы</Title>
            <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }}>
              {complexes.map((complex) => (
                <Card key={complex.id} withBorder radius="md">
                  <Group justify="space-between" align="flex-start">
                    <Stack gap={4}>
                      <Text fw={700}>{complex.name}</Text>
                      <Text size="sm" c="dimmed">{complex.address}</Text>
                      {complex.description && <Text size="sm" lineClamp={2}>{complex.description}</Text>}
                    </Stack>
                    <Group gap={2}>
                      <Tooltip label="Редактировать">
                        <ActionIcon variant="subtle" onClick={() => editComplex(complex)}>
                          <IconPencil size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Удалить">
                        <ActionIcon color="red" variant="subtle" onClick={() => deleteComplex(complex)}>
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Group>
                </Card>
              ))}
            </SimpleGrid>

            <Title order={4} mt="xl" mb="md">Мои площадки</Title>
            <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }}>
              {facilities.map((facility) => (
                <Card key={facility.id} withBorder radius="md">
                  <Group justify="space-between" align="flex-start">
                    <Stack gap={4}>
                      <Text fw={700}>{facility.name}</Text>
                      <Text size="sm" c="dimmed">{facility.complex_name}</Text>
                      {facility.kind_name && <Badge variant="light" color="blue" w="fit-content">{facility.kind_name}</Badge>}
                      {facility.description && <Text size="sm" lineClamp={2}>{facility.description}</Text>}
                      {facility.latitude && facility.longitude && (
                        <Text size="xs" c="dimmed">{facility.latitude}, {facility.longitude}</Text>
                      )}
                      <Text mt="xs">от {facility.min_price ?? facility.price_per_hour} ₽/час</Text>
                    </Stack>
                    <Group gap={2}>
                      <Tooltip label="Редактировать">
                        <ActionIcon variant="subtle" onClick={() => editFacility(facility)}>
                          <IconPencil size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Удалить">
                        <ActionIcon color="red" variant="subtle" onClick={() => deleteFacility(facility)}>
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Group>
                </Card>
              ))}
            </SimpleGrid>
          </Tabs.Panel>

          <Tabs.Panel value="reviews">
            <Stack>
              {reviews.length === 0 && <Text c="dimmed">К вашим объектам пока нет отзывов.</Text>}
              {reviews.map((review) => (
                <Card key={review.id} withBorder radius="md" p="md">
                  <Group justify="space-between">
                    <Stack gap={2}>
                      <Text fw={700}>{review.facility_name}</Text>
                      <Text size="sm" c="dimmed">{review.client_name} · оценка {review.rating}/5</Text>
                    </Stack>
                    <Badge>{dayjs(review.created_at).format('DD.MM.YYYY')}</Badge>
                  </Group>
                  <Text mt="sm">{review.comment || review.title || 'Без комментария'}</Text>
                  <Textarea
                    mt="md"
                    label="Ответ собственника"
                    minRows={3}
                    value={responses[review.id] || ''}
                    onChange={updateResponse(review.id)}
                  />
                  <Button mt="sm" onClick={() => saveResponse(review.id)}>Сохранить ответ</Button>
                </Card>
              ))}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="bookings">
            <Card withBorder radius="md" p="md" mb="md">
              <Group grow align="flex-end">
                <Select
                  label="Площадка"
                  data={[{ value: 'all', label: 'Все площадки' }, ...facilityOptions]}
                  value={bookingFacilityFilter}
                  onChange={(value) => setBookingFacilityFilter(value || 'all')}
                />
                <DateInput
                  label="Дата бронирования"
                  value={bookingDateFilter}
                  onChange={setBookingDateFilter}
                  clearable
                />
                <Select
                  label="Статус"
                  data={[
                    { value: 'all', label: 'Все статусы' },
                    { value: 'confirmed', label: 'Активные' },
                    { value: 'pending', label: 'Ожидают оплаты' },
                    { value: 'cancelled', label: 'Отмененные' },
                  ]}
                  value={bookingStatusFilter}
                  onChange={(value) => setBookingStatusFilter(value || 'all')}
                />
                <Button
                  variant="light"
                  color="gray"
                  onClick={() => {
                    setBookingFacilityFilter('all');
                    setBookingDateFilter(null);
                    setBookingStatusFilter('all');
                  }}
                >
                  Сбросить
                </Button>
              </Group>
              <Text size="sm" c="dimmed" mt="sm">
                Найдено бронирований: {visibleBookings.length}
              </Text>
            </Card>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Клиент</Table.Th>
                  <Table.Th>Контакты</Table.Th>
                  <Table.Th>Площадка</Table.Th>
                  <Table.Th>Время</Table.Th>
                  <Table.Th>Мест</Table.Th>
                  <Table.Th>Статус</Table.Th>
                  <Table.Th>Действия</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {visibleBookings.map((booking) => (
                  <Table.Tr key={booking.id}>
                    <Table.Td>
                      <Stack gap={2}>
                        <Text fw={600}>{booking.client_username || booking.client}</Text>
                        <Text size="xs" c="dimmed">ID: {booking.client_id}</Text>
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      <Stack gap={2}>
                        <Text size="sm">{booking.client_email || 'Email не указан'}</Text>
                        <Text size="sm" c="dimmed">{booking.client_phone || 'Телефон не указан'}</Text>
                      </Stack>
                    </Table.Td>
                    <Table.Td>{booking.slot_details?.facility_name}</Table.Td>
                    <Table.Td>{dayjs(booking.slot_details?.start_time).format('DD.MM.YYYY HH:mm')}</Table.Td>
                    <Table.Td>{booking.seats || 1}</Table.Td>
                    <Table.Td>
                      <Badge color={booking.status === 'cancelled' ? 'red' : 'green'}>
                        {booking.status === 'cancelled' ? 'Отменена' : 'Активна'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {booking.status !== 'cancelled' && (
                        <Button size="xs" color="red" variant="light" onClick={() => cancelBooking(booking.id)}>Отменить</Button>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Tabs.Panel>

          <Tabs.Panel value="schedule">
            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
              <Card withBorder radius="md" p="lg">
                <Title order={4} mb="md">{editingSlotId ? 'Редактировать слот' : 'Создать слот'}</Title>
                <Stack>
                  <Select
                    label="Площадка"
                    data={facilityOptions}
                    value={String(slotForm.facility || '')}
                    onChange={(value) => setSlotForm((prev) => ({
                      ...prev,
                      facility: value,
                      price: getFacilityBasePrice(value) ?? '',
                    }))}
                  />
                  <DateInput
                    label="Дата"
                    value={slotForm.date}
                    onChange={(value) => setSlotForm((prev) => ({ ...prev, date: value }))}
                  />
                  <Group grow>
                    <TimeInput label="Начало" value={slotForm.start} onChange={updateSlotField('start')} />
                    <TimeInput label="Конец" value={slotForm.end} onChange={updateSlotField('end')} />
                  </Group>
                  <TextInput
                    label="Название занятия"
                    placeholder="Например: Индивидуальная тренировка"
                    value={slotForm.title}
                    onChange={updateSlotField('title')}
                  />
                  <TextInput
                    label="Тренер"
                    placeholder="Например: Иван Петров"
                    value={slotForm.trainerName}
                    onChange={updateSlotField('trainerName')}
                  />
                  <NumberInput
                    label="Цена слота, ₽"
                    description="Оставьте пустым, чтобы использовать базовую цену объекта"
                    min={0}
                    hideControls
                    value={slotForm.price}
                    onChange={(value) => setSlotForm((prev) => ({ ...prev, price: value ?? '' }))}
                  />
                  <NumberInput
                    label="Количество мест"
                    min={1}
                    step={1}
                    value={slotForm.capacity}
                    onChange={(value) => setSlotForm((prev) => ({ ...prev, capacity: value || 1 }))}
                  />
                  {scheduleNotice && <Text size="sm" c={scheduleNotice.includes('Не удалось') || scheduleNotice.includes('Нельзя') ? 'red' : 'teal'}>{scheduleNotice}</Text>}
                  <Group>
                    <Button onClick={saveSlot} disabled={!slotForm.facility || !slotForm.date || !slotForm.start || !slotForm.end}>
                      {editingSlotId ? 'Сохранить слот' : 'Добавить слот'}
                    </Button>
                    {editingSlotId && <Button variant="subtle" onClick={cancelSlotEdit}>Отмена</Button>}
                  </Group>
                </Stack>
              </Card>

              <Card withBorder radius="md" p="lg">
                <Title order={4} mb="md">Просмотр расписания</Title>
                <Stack>
                  <Select
                    label="Площадка"
                    data={facilityOptions}
                    value={String(scheduleFacility || '')}
                    onChange={(value) => {
                      setScheduleFacility(value || '');
                      setSlotForm((prev) => ({
                        ...prev,
                        facility: value || '',
                        price: getFacilityBasePrice(value) ?? '',
                      }));
                    }}
                  />
                  <DateInput label="Дата" value={scheduleDate} onChange={(value) => {
                    setScheduleDate(value);
                    setSlotForm((prev) => ({ ...prev, date: value }));
                  }} />
                </Stack>
              </Card>
            </SimpleGrid>

            <Card withBorder radius="md" p="lg" mt="lg">
              <Group justify="space-between" mb="md">
                <Title order={4}>Слоты на {dayjs(scheduleDate).format('DD.MM.YYYY')}</Title>
                <Badge variant="light">{visibleSlots.length} слотов</Badge>
              </Group>

              {visibleSlots.length === 0 ? (
                <Text c="dimmed">На выбранную дату слотов пока нет.</Text>
              ) : (
                <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 6 }} spacing="sm">
                  {visibleSlots.map((slot) => (
                    <Card key={slot.id} withBorder radius="md" p="sm" style={{ backgroundColor: slot.is_booked ? '#f8f9fa' : '#ffffff' }}>
                      <Stack gap={6}>
                        <Button
                          fullWidth
                          variant={editingSlotId === slot.id ? 'filled' : 'outline'}
                          color={slot.is_booked ? 'gray' : editingSlotId === slot.id ? 'blue' : 'green'}
                          onClick={() => editSlot(slot)}
                        >
                          {dayjs(slot.start_time).format('HH:mm')} - {dayjs(slot.end_time).format('HH:mm')}
                        </Button>
                        {(slot.title || slot.trainer_name) && (
                          <Stack gap={0}>
                            {slot.title && <Text size="xs" fw={700} lineClamp={1}>{slot.title}</Text>}
                            {slot.trainer_name && <Text size="xs" c="dimmed" lineClamp={1}>{slot.trainer_name}</Text>}
                          </Stack>
                        )}
                        <Text size="xs" fw={700} c="blue">
                          {getSlotDisplayPrice(slot)} ₽
                        </Text>
                        <Text size="xs" c="dimmed">
                          Мест: {slot.booked_count || 0}/{slot.capacity || 1}
                        </Text>
                        <Group justify="space-between" gap={4}>
                          <Badge size="sm" color={slot.is_booked ? 'red' : 'green'}>
                            {slot.is_booked ? 'Мест нет' : `Свободно ${slot.available_spots ?? 1}`}
                          </Badge>
                          <Group gap={2}>
                            <Tooltip label={slot.is_booked ? 'Редактировать время брони' : 'Редактировать'}>
                              <ActionIcon variant="subtle" onClick={() => editSlot(slot)}>
                                <IconPencil size={16} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label={slot.is_booked ? 'Удалить слот и отменить бронь' : 'Удалить'}>
                              <ActionIcon color="red" variant="subtle" onClick={() => deleteSlot(slot)}>
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        </Group>
                      </Stack>
                    </Card>
                  ))}
                </SimpleGrid>
              )}
            </Card>
          </Tabs.Panel>
        </Tabs>
      </Container>
    </div>
  );
}
