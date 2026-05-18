import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Center,
  Checkbox,
  Container,
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
import { DateInput } from '@mantine/dates';
import { IconPencil, IconTrash } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { Header } from '../components/Header';
import api from '../services/api';

const ROLE_OPTIONS = [
  { value: 'user', label: 'Пользователь' },
  { value: 'renter', label: 'Собственник' },
  { value: 'administration', label: 'Администрация' },
  { value: 'system_admin', label: 'Системный администратор' },
];

const emptyUser = {
  username: '',
  email: '',
  password: '',
  role: 'user',
  phone: '',
  first_name: '',
  last_name: '',
  is_active: true,
  is_staff: false,
  is_superuser: false,
};

const emptyComplex = { owner: '', name: '', address: '', description: '' };
const emptySportType = { name: '', slug: '' };
const emptyFacilityKind = { name: '', slug: '' };
const emptyFacility = {
  complex: '',
  name: '',
  description: '',
  type: 'football',
  kind: '',
  price_per_hour: 1000,
  latitude: '',
  longitude: '',
};
const emptyReview = {
  facility: '',
  client: '',
  rating: 5,
  title: '',
  comment: '',
  visit_date: null,
  would_recommend: true,
};
const emptyBooking = { slot_id: '', client_id: '', seats: 1, status: 'confirmed' };

function optionList(items, labelField = 'name') {
  return items.map((item) => ({ value: String(item.id), label: `${item[labelField] || item.username} #${item.id}` }));
}

function cleanPayload(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== '' && value !== null && value !== undefined)
  );
}

function formatApiError(data) {
  if (!data) return '';
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;

  return Object.entries(data)
    .map(([field, messages]) => {
      const text = Array.isArray(messages) ? messages.join(' ') : String(messages);
      return `${field}: ${text}`;
    })
    .join(' ');
}

function toCsvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map(toCsvCell).join(',')).join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [complexes, setComplexes] = useState([]);
  const [sportTypes, setSportTypes] = useState([]);
  const [facilityKinds, setFacilityKinds] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [slots, setSlots] = useState([]);
  const [actionLogs, setActionLogs] = useState([]);
  const [userForm, setUserForm] = useState(emptyUser);
  const [complexForm, setComplexForm] = useState(emptyComplex);
  const [sportTypeForm, setSportTypeForm] = useState(emptySportType);
  const [facilityKindForm, setFacilityKindForm] = useState(emptyFacilityKind);
  const [facilityForm, setFacilityForm] = useState(emptyFacility);
  const [reviewForm, setReviewForm] = useState(emptyReview);
  const [bookingForm, setBookingForm] = useState(emptyBooking);
  const [editing, setEditing] = useState({});
  const [importData, setImportData] = useState('');
  const [userNotice, setUserNotice] = useState('');
  const [notice, setNotice] = useState('');

  const fetchData = useCallback(async () => {
    const [usersRes, complexesRes, sportTypesRes, facilityKindsRes, facilitiesRes, reviewsRes, bookingsRes, slotsRes, logsRes] = await Promise.all([
      api.get('/users/'),
      api.get('/complexes/'),
      api.get('/sport-types/'),
      api.get('/facility-kinds/'),
      api.get('/facilities/'),
      api.get('/reviews/'),
      api.get('/bookings/'),
      api.get('/timeslots/'),
      api.get('/action-logs/'),
    ]);

    setUsers(usersRes.data);
    setComplexes(complexesRes.data);
    setSportTypes(sportTypesRes.data);
    setFacilityKinds(facilityKindsRes.data);
    setFacilities(facilitiesRes.data);
    setReviews(reviewsRes.data);
    setBookings(bookingsRes.data);
    setSlots(slotsRes.data);
    setActionLogs(logsRes.data);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchData().finally(() => setLoading(false));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchData]);

  const userOptions = useMemo(() => optionList(users, 'username'), [users]);
  const complexOptions = useMemo(() => optionList(complexes), [complexes]);
  const sportTypeOptions = useMemo(() => sportTypes.map((item) => ({ value: item.slug, label: item.name })), [sportTypes]);
  const facilityKindOptions = useMemo(() => optionList(facilityKinds), [facilityKinds]);
  const facilityOptions = useMemo(() => optionList(facilities), [facilities]);
  const slotOptions = useMemo(() => slots.map((slot) => ({
    value: String(slot.id),
    label: `${slot.facility_name} ${dayjs(slot.start_time).format('DD.MM HH:mm')}`,
  })), [slots]);

  const saveUser = async () => {
    setUserNotice('');
    try {
      const payload = cleanPayload(userForm);
      if (editing.user) {
        if (!payload.password) delete payload.password;
        await api.patch(`/users/${editing.user}/`, payload);
      } else {
        await api.post('/users/', payload);
      }
      setUserForm(emptyUser);
      setEditing((prev) => ({ ...prev, user: null }));
      setUserNotice(editing.user ? 'Пользователь обновлен.' : 'Пользователь создан.');
      await fetchData();
    } catch (error) {
      setUserNotice(formatApiError(error.response?.data) || 'Не удалось сохранить пользователя.');
    }
  };

  const saveComplex = async () => {
    const payload = cleanPayload(complexForm);
    if (editing.complex) await api.patch(`/complexes/${editing.complex}/`, payload);
    else await api.post('/complexes/', payload);
    setComplexForm(emptyComplex);
    setEditing((prev) => ({ ...prev, complex: null }));
    await fetchData();
  };

  const saveSportType = async () => {
    const payload = cleanPayload(sportTypeForm);
    if (editing.sportType) await api.patch(`/sport-types/${editing.sportType}/`, payload);
    else await api.post('/sport-types/', payload);
    setSportTypeForm(emptySportType);
    setEditing((prev) => ({ ...prev, sportType: null }));
    await fetchData();
  };

  const saveFacilityKind = async () => {
    const payload = cleanPayload(facilityKindForm);
    if (editing.facilityKind) await api.patch(`/facility-kinds/${editing.facilityKind}/`, payload);
    else await api.post('/facility-kinds/', payload);
    setFacilityKindForm(emptyFacilityKind);
    setEditing((prev) => ({ ...prev, facilityKind: null }));
    await fetchData();
  };

  const saveFacility = async () => {
    const payload = cleanPayload({
      ...facilityForm,
      latitude: facilityForm.latitude === '' ? null : facilityForm.latitude,
      longitude: facilityForm.longitude === '' ? null : facilityForm.longitude,
    });
    if (editing.facility) await api.patch(`/facilities/${editing.facility}/`, payload);
    else await api.post('/facilities/', payload);
    setFacilityForm(emptyFacility);
    setEditing((prev) => ({ ...prev, facility: null }));
    await fetchData();
  };

  const saveReview = async () => {
    const payload = cleanPayload(reviewForm);
    if (editing.review) await api.patch(`/reviews/${editing.review}/`, payload);
    else await api.post('/reviews/', payload);
    setReviewForm(emptyReview);
    setEditing((prev) => ({ ...prev, review: null }));
    await fetchData();
  };

  const saveBooking = async () => {
    if (editing.booking) await api.patch(`/bookings/${editing.booking}/`, { status: bookingForm.status });
    else await api.post('/bookings/', cleanPayload(bookingForm));
    setBookingForm(emptyBooking);
    setEditing((prev) => ({ ...prev, booking: null }));
    await fetchData();
  };

  const remove = async (url, message) => {
    if (!confirm(message)) return;
    await api.delete(url);
    await fetchData();
  };

  const exportData = async () => {
    const response = await api.get('/admin-data/', { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sport_booking_export.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async () => {
    setNotice('');
    try {
      const response = await api.post('/admin-data/', { data: importData });
      setNotice(`Импортировано записей: ${response.data.imported}`);
      setImportData('');
      await fetchData();
    } catch (error) {
      setNotice(error.response?.data?.detail || 'Не удалось импортировать данные.');
    }
  };

  const exportLogsCsv = () => {
    const rows = [
      ['Когда', 'Кто', 'Действие', 'Тип объекта', 'ID объекта', 'Площадка', 'Описание'],
      ...actionLogs.map((log) => [
        dayjs(log.created_at).format('DD.MM.YYYY HH:mm:ss'),
        log.actor_name || 'Гость',
        log.action,
        log.entity_type || '',
        log.entity_id ?? '',
        log.facility_name || '',
        log.description || '',
      ]),
    ];

    downloadCsv(`action_logs_${dayjs().format('YYYY-MM-DD')}.csv`, rows);
  };

  const updateUserField = (field) => (event) => {
    const { value } = event.currentTarget;
    setUserForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateUserCheckbox = (field) => (event) => {
    const { checked } = event.currentTarget;
    setUserForm((prev) => ({ ...prev, [field]: checked }));
  };

  const updateComplexField = (field) => (event) => {
    const { value } = event.currentTarget;
    setComplexForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateSportTypeField = (field) => (event) => {
    const { value } = event.currentTarget;
    setSportTypeForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateFacilityKindField = (field) => (event) => {
    const { value } = event.currentTarget;
    setFacilityKindForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateFacilityField = (field) => (event) => {
    const { value } = event.currentTarget;
    setFacilityForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateReviewField = (field) => (event) => {
    const { value } = event.currentTarget;
    setReviewForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateReviewCheckbox = (event) => {
    const { checked } = event.currentTarget;
    setReviewForm((prev) => ({ ...prev, would_recommend: checked }));
  };

  const canSaveUser = Boolean(userForm.username) && (Boolean(editing.user) || Boolean(userForm.password));

  if (loading) return <Center h="100vh"><Loader /></Center>;

  return (
    <div>
      <Header />
      <Container size="xl" py="xl">
        <Group justify="space-between" mb="lg">
          <Title order={2}>Администрирование</Title>
          <Badge size="lg" color="blue">Полный доступ</Badge>
        </Group>

        <Tabs defaultValue="users">
          <Tabs.List mb="lg">
            <Tabs.Tab value="users">Пользователи</Tabs.Tab>
            <Tabs.Tab value="complexes">Комплексы</Tabs.Tab>
            <Tabs.Tab value="sportTypes">Виды спорта</Tabs.Tab>
            <Tabs.Tab value="facilityKinds">Виды площадок</Tabs.Tab>
            <Tabs.Tab value="facilities">Объекты</Tabs.Tab>
            <Tabs.Tab value="reviews">Отзывы</Tabs.Tab>
            <Tabs.Tab value="bookings">Бронирования</Tabs.Tab>
            <Tabs.Tab value="logs">Логи</Tabs.Tab>
            <Tabs.Tab value="data">Импорт/экспорт</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="users">
            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
              <Card withBorder>
                <Title order={4} mb="md">{editing.user ? 'Редактировать пользователя' : 'Создать пользователя'}</Title>
                <Stack>
                  <Group grow>
                    <TextInput label="Логин" value={userForm.username} onChange={updateUserField('username')} />
                    <TextInput label="Email" value={userForm.email} onChange={updateUserField('email')} />
                  </Group>
                  <TextInput label="Пароль" type="password" value={userForm.password} onChange={updateUserField('password')} />
                  <Select label="Роль" data={ROLE_OPTIONS} value={userForm.role} onChange={(value) => setUserForm((p) => ({ ...p, role: value }))} />
                  <Group grow>
                    <TextInput label="Имя" value={userForm.first_name} onChange={updateUserField('first_name')} />
                    <TextInput label="Фамилия" value={userForm.last_name} onChange={updateUserField('last_name')} />
                  </Group>
                  <TextInput label="Телефон" value={userForm.phone} onChange={updateUserField('phone')} />
                  <Group>
                    <Checkbox label="Активен" checked={userForm.is_active} onChange={updateUserCheckbox('is_active')} />
                    <Checkbox label="Staff" checked={userForm.is_staff} onChange={updateUserCheckbox('is_staff')} />
                    <Checkbox label="Superuser" checked={userForm.is_superuser} onChange={updateUserCheckbox('is_superuser')} />
                  </Group>
                  <Group>
                    <Button onClick={saveUser} disabled={!canSaveUser}>{editing.user ? 'Сохранить' : 'Создать'}</Button>
                    {editing.user && <Button variant="subtle" onClick={() => { setEditing((p) => ({ ...p, user: null })); setUserForm(emptyUser); setUserNotice(''); }}>Отмена</Button>}
                  </Group>
                  {userNotice && (
                    <Text size="sm" c={userNotice.includes('Не удалось') || userNotice.includes('Укажите') || userNotice.includes('already') ? 'red' : 'teal'}>
                      {userNotice}
                    </Text>
                  )}
                </Stack>
              </Card>
              <Card withBorder>
                <Table striped highlightOnHover>
                  <Table.Thead><Table.Tr><Table.Th>Пользователь</Table.Th><Table.Th>Роль</Table.Th><Table.Th /></Table.Tr></Table.Thead>
                  <Table.Tbody>
                    {users.map((user) => (
                      <Table.Tr key={user.id}>
                        <Table.Td>{user.username}<Text size="xs" c="dimmed">{user.email}</Text></Table.Td>
                        <Table.Td>{ROLE_OPTIONS.find((role) => role.value === user.role)?.label || user.role}</Table.Td>
                        <Table.Td>
                          <Group gap={2} justify="flex-end">
                            <Tooltip label="Редактировать"><ActionIcon variant="subtle" onClick={() => { setEditing((p) => ({ ...p, user: user.id })); setUserForm({ ...emptyUser, ...user, password: '' }); }}><IconPencil size={16} /></ActionIcon></Tooltip>
                            <Tooltip label="Удалить"><ActionIcon color="red" variant="subtle" onClick={() => remove(`/users/${user.id}/`, `Удалить пользователя ${user.username}?`)}><IconTrash size={16} /></ActionIcon></Tooltip>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Card>
            </SimpleGrid>
          </Tabs.Panel>

          <Tabs.Panel value="complexes">
            <Card withBorder mb="lg">
              <SimpleGrid cols={{ base: 1, md: 2 }}>
                <Select label="Собственник" data={userOptions} value={String(complexForm.owner || '')} onChange={(value) => setComplexForm((p) => ({ ...p, owner: value }))} />
                <TextInput label="Название" value={complexForm.name} onChange={updateComplexField('name')} />
                <TextInput label="Адрес" value={complexForm.address} onChange={updateComplexField('address')} />
                <Textarea label="Описание" value={complexForm.description} onChange={updateComplexField('description')} />
              </SimpleGrid>
              <Button mt="md" onClick={saveComplex} disabled={!complexForm.owner || !complexForm.name}>{editing.complex ? 'Сохранить комплекс' : 'Создать комплекс'}</Button>
            </Card>
            <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }}>
              {complexes.map((item) => (
                <Card key={item.id} withBorder>
                  <Group justify="space-between" align="flex-start">
                    <Stack gap={4}><Text fw={700}>{item.name}</Text><Text size="sm" c="dimmed">{item.owner_name}</Text><Text size="sm">{item.address}</Text></Stack>
                    <Group gap={2}><ActionIcon variant="subtle" onClick={() => { setEditing((p) => ({ ...p, complex: item.id })); setComplexForm({ owner: String(item.owner), name: item.name, address: item.address, description: item.description || '' }); }}><IconPencil size={16} /></ActionIcon><ActionIcon color="red" variant="subtle" onClick={() => remove(`/complexes/${item.id}/`, `Удалить комплекс ${item.name}?`)}><IconTrash size={16} /></ActionIcon></Group>
                  </Group>
                </Card>
              ))}
            </SimpleGrid>
          </Tabs.Panel>

          <Tabs.Panel value="sportTypes">
            <Card withBorder mb="lg">
              <SimpleGrid cols={{ base: 1, md: 2 }}>
                <TextInput label="Название" value={sportTypeForm.name} onChange={updateSportTypeField('name')} />
                <TextInput label="Код" value={sportTypeForm.slug} onChange={updateSportTypeField('slug')} placeholder="football" />
              </SimpleGrid>
              <Group mt="md">
                <Button onClick={saveSportType} disabled={!sportTypeForm.name || !sportTypeForm.slug}>
                  {editing.sportType ? 'Сохранить вид спорта' : 'Создать вид спорта'}
                </Button>
                {editing.sportType && (
                  <Button variant="subtle" onClick={() => { setEditing((p) => ({ ...p, sportType: null })); setSportTypeForm(emptySportType); }}>
                    Отмена
                  </Button>
                )}
              </Group>
            </Card>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead><Table.Tr><Table.Th>Название</Table.Th><Table.Th>Код</Table.Th><Table.Th /></Table.Tr></Table.Thead>
              <Table.Tbody>
                {sportTypes.map((item) => (
                  <Table.Tr key={item.id}>
                    <Table.Td>{item.name}</Table.Td>
                    <Table.Td>{item.slug}</Table.Td>
                    <Table.Td>
                      <Group gap={2} justify="flex-end">
                        <ActionIcon variant="subtle" onClick={() => { setEditing((p) => ({ ...p, sportType: item.id })); setSportTypeForm({ name: item.name, slug: item.slug }); }}><IconPencil size={16} /></ActionIcon>
                        <ActionIcon color="red" variant="subtle" onClick={() => remove(`/sport-types/${item.id}/`, `Удалить вид спорта ${item.name}?`)}><IconTrash size={16} /></ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Tabs.Panel>

          <Tabs.Panel value="facilityKinds">
            <Card withBorder mb="lg">
              <SimpleGrid cols={{ base: 1, md: 2 }}>
                <TextInput label="Название" value={facilityKindForm.name} onChange={updateFacilityKindField('name')} />
                <TextInput label="Код" value={facilityKindForm.slug} onChange={updateFacilityKindField('slug')} placeholder="pool" />
              </SimpleGrid>
              <Group mt="md">
                <Button onClick={saveFacilityKind} disabled={!facilityKindForm.name || !facilityKindForm.slug}>
                  {editing.facilityKind ? 'Сохранить вид площадки' : 'Создать вид площадки'}
                </Button>
                {editing.facilityKind && (
                  <Button variant="subtle" onClick={() => { setEditing((p) => ({ ...p, facilityKind: null })); setFacilityKindForm(emptyFacilityKind); }}>
                    Отмена
                  </Button>
                )}
              </Group>
            </Card>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead><Table.Tr><Table.Th>Название</Table.Th><Table.Th>Код</Table.Th><Table.Th /></Table.Tr></Table.Thead>
              <Table.Tbody>
                {facilityKinds.map((item) => (
                  <Table.Tr key={item.id}>
                    <Table.Td>{item.name}</Table.Td>
                    <Table.Td>{item.slug}</Table.Td>
                    <Table.Td>
                      <Group gap={2} justify="flex-end">
                        <ActionIcon variant="subtle" onClick={() => { setEditing((p) => ({ ...p, facilityKind: item.id })); setFacilityKindForm({ name: item.name, slug: item.slug }); }}><IconPencil size={16} /></ActionIcon>
                        <ActionIcon color="red" variant="subtle" onClick={() => remove(`/facility-kinds/${item.id}/`, `Удалить вид площадки ${item.name}?`)}><IconTrash size={16} /></ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Tabs.Panel>

          <Tabs.Panel value="facilities">
            <Card withBorder mb="lg">
              <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }}>
                <Select label="Комплекс" data={complexOptions} value={String(facilityForm.complex || '')} onChange={(value) => setFacilityForm((p) => ({ ...p, complex: value }))} />
                <TextInput label="Название" value={facilityForm.name} onChange={updateFacilityField('name')} />
                <Select label="Вид спорта" data={sportTypeOptions} value={facilityForm.type} onChange={(value) => setFacilityForm((p) => ({ ...p, type: value || '' }))} />
                <Select label="Вид площадки" data={facilityKindOptions} value={String(facilityForm.kind || '')} onChange={(value) => setFacilityForm((p) => ({ ...p, kind: value || '' }))} clearable />
                <NumberInput label="Цена" min={0} value={facilityForm.price_per_hour} onChange={(value) => setFacilityForm((p) => ({ ...p, price_per_hour: value || 0 }))} />
                <NumberInput label="Широта" value={facilityForm.latitude} onChange={(value) => setFacilityForm((p) => ({ ...p, latitude: value ?? '' }))} />
                <NumberInput label="Долгота" value={facilityForm.longitude} onChange={(value) => setFacilityForm((p) => ({ ...p, longitude: value ?? '' }))} />
              </SimpleGrid>
              <Textarea mt="md" label="Описание" value={facilityForm.description} onChange={updateFacilityField('description')} />
              <Button mt="md" onClick={saveFacility} disabled={!facilityForm.complex || !facilityForm.name}>{editing.facility ? 'Сохранить объект' : 'Создать объект'}</Button>
            </Card>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead><Table.Tr><Table.Th>Объект</Table.Th><Table.Th>Комплекс</Table.Th><Table.Th>Цена</Table.Th><Table.Th /></Table.Tr></Table.Thead>
              <Table.Tbody>
                {facilities.map((item) => (
                  <Table.Tr key={item.id}>
                    <Table.Td>{item.name}</Table.Td><Table.Td>{item.complex_name}</Table.Td><Table.Td>{item.price_per_hour} ₽</Table.Td>
                    <Table.Td><Group gap={2} justify="flex-end"><ActionIcon variant="subtle" onClick={() => { setEditing((p) => ({ ...p, facility: item.id })); setFacilityForm({ complex: String(item.complex), name: item.name, description: item.description || '', type: item.type, kind: item.kind ? String(item.kind) : '', price_per_hour: item.price_per_hour, latitude: item.latitude ?? '', longitude: item.longitude ?? '' }); }}><IconPencil size={16} /></ActionIcon><ActionIcon color="red" variant="subtle" onClick={() => remove(`/facilities/${item.id}/`, `Удалить объект ${item.name}?`)}><IconTrash size={16} /></ActionIcon></Group></Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Tabs.Panel>

          <Tabs.Panel value="reviews">
            <Card withBorder mb="lg">
              <SimpleGrid cols={{ base: 1, md: 2, lg: 4 }}>
                <Select label="Объект" data={facilityOptions} value={String(reviewForm.facility || '')} onChange={(value) => setReviewForm((p) => ({ ...p, facility: value }))} />
                <Select label="Автор" data={userOptions} value={String(reviewForm.client || '')} onChange={(value) => setReviewForm((p) => ({ ...p, client: value }))} />
                <NumberInput label="Оценка" min={1} max={5} value={reviewForm.rating} onChange={(value) => setReviewForm((p) => ({ ...p, rating: value || 5 }))} />
                <DateInput label="Дата посещения" value={reviewForm.visit_date} onChange={(value) => setReviewForm((p) => ({ ...p, visit_date: value }))} clearable />
              </SimpleGrid>
              <TextInput mt="md" label="Заголовок" value={reviewForm.title} onChange={updateReviewField('title')} />
              <Textarea mt="md" label="Комментарий" value={reviewForm.comment} onChange={updateReviewField('comment')} />
              <Checkbox mt="md" label="Рекомендует" checked={reviewForm.would_recommend} onChange={updateReviewCheckbox} />
              <Button mt="md" onClick={saveReview} disabled={!reviewForm.facility || !reviewForm.client}>{editing.review ? 'Сохранить отзыв' : 'Создать отзыв'}</Button>
            </Card>
            <Stack>
              {reviews.map((item) => (
                <Card key={item.id} withBorder>
                  <Group justify="space-between"><Text fw={700}>{item.facility_name}: {item.rating}/5</Text><Group gap={2}><ActionIcon variant="subtle" onClick={() => { setEditing((p) => ({ ...p, review: item.id })); setReviewForm({ facility: String(item.facility), client: String(item.client_id), rating: item.rating, title: item.title || '', comment: item.comment || '', visit_date: item.visit_date || null, would_recommend: item.would_recommend }); }}><IconPencil size={16} /></ActionIcon><ActionIcon color="red" variant="subtle" onClick={() => remove(`/reviews/${item.id}/`, 'Удалить отзыв?')}><IconTrash size={16} /></ActionIcon></Group></Group>
                  <Text size="sm" c="dimmed">{item.client_name}</Text>
                  <Text mt="xs">{item.comment || item.title || 'Без комментария'}</Text>
                </Card>
              ))}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="bookings">
            <Card withBorder mb="lg">
              <SimpleGrid cols={{ base: 1, md: 3 }}>
                <Select label="Слот" data={slotOptions} value={String(bookingForm.slot_id || '')} onChange={(value) => setBookingForm((p) => ({ ...p, slot_id: value }))} disabled={Boolean(editing.booking)} />
                <Select label="Клиент" data={userOptions} value={String(bookingForm.client_id || '')} onChange={(value) => setBookingForm((p) => ({ ...p, client_id: value }))} disabled={Boolean(editing.booking)} />
                <NumberInput label="Мест" min={1} value={bookingForm.seats} onChange={(value) => setBookingForm((p) => ({ ...p, seats: value || 1 }))} disabled={Boolean(editing.booking)} />
                <Select label="Статус" data={[{ value: 'pending', label: 'Ожидает оплаты' }, { value: 'confirmed', label: 'Подтверждено' }, { value: 'cancelled', label: 'Отменено' }]} value={bookingForm.status} onChange={(value) => setBookingForm((p) => ({ ...p, status: value }))} />
              </SimpleGrid>
              <Button mt="md" onClick={saveBooking} disabled={!editing.booking && (!bookingForm.slot_id || !bookingForm.client_id)}>{editing.booking ? 'Сохранить бронь' : 'Создать бронь'}</Button>
            </Card>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead><Table.Tr><Table.Th>Клиент</Table.Th><Table.Th>Объект</Table.Th><Table.Th>Время</Table.Th><Table.Th>Мест</Table.Th><Table.Th>Статус</Table.Th><Table.Th /></Table.Tr></Table.Thead>
              <Table.Tbody>
                {bookings.map((item) => (
                  <Table.Tr key={item.id}>
                    <Table.Td>{item.client_username}</Table.Td><Table.Td>{item.slot_details?.facility_name}</Table.Td><Table.Td>{dayjs(item.slot_details?.start_time).format('DD.MM.YYYY HH:mm')}</Table.Td><Table.Td>{item.seats}</Table.Td><Table.Td>{item.status}</Table.Td>
                    <Table.Td><Group gap={2} justify="flex-end"><ActionIcon variant="subtle" onClick={() => { setEditing((p) => ({ ...p, booking: item.id })); setBookingForm({ slot_id: String(item.slot), client_id: String(item.client_id), seats: item.seats || 1, status: item.status }); }}><IconPencil size={16} /></ActionIcon><ActionIcon color="red" variant="subtle" onClick={() => remove(`/bookings/${item.id}/`, 'Удалить бронирование?')}><IconTrash size={16} /></ActionIcon></Group></Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Tabs.Panel>

          <Tabs.Panel value="data">
            <Card withBorder>
              <Stack>
                <Group><Button onClick={exportData}>Экспортировать данные</Button><Button color="blue" variant="light" onClick={importJson} disabled={!importData.trim()}>Импортировать JSON</Button></Group>
                <Textarea minRows={12} label="JSON для импорта" value={importData} onChange={(e) => setImportData(e.currentTarget.value)} />
                {notice && <Text c={notice.includes('Не удалось') ? 'red' : 'teal'}>{notice}</Text>}
              </Stack>
            </Card>
          </Tabs.Panel>

          <Tabs.Panel value="logs">
            <Group justify="space-between" mb="md">
              <Title order={4}>Логи действий</Title>
              <Button variant="light" onClick={exportLogsCsv} disabled={actionLogs.length === 0}>
                Экспорт CSV
              </Button>
            </Group>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Когда</Table.Th>
                  <Table.Th>Кто</Table.Th>
                  <Table.Th>Действие</Table.Th>
                  <Table.Th>Объект</Table.Th>
                  <Table.Th>Площадка</Table.Th>
                  <Table.Th>Описание</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {actionLogs.map((log) => (
                  <Table.Tr key={log.id}>
                    <Table.Td>{dayjs(log.created_at).format('DD.MM.YYYY HH:mm')}</Table.Td>
                    <Table.Td>{log.actor_name || 'Гость'}</Table.Td>
                    <Table.Td>{log.action}</Table.Td>
                    <Table.Td>{log.entity_type} #{log.entity_id}</Table.Td>
                    <Table.Td>{log.facility_name || '-'}</Table.Td>
                    <Table.Td>{log.description || '-'}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Tabs.Panel>
        </Tabs>
      </Container>
    </div>
  );
}
