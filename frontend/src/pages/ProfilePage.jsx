import { useEffect, useState } from 'react';
import { Badge, Button, Center, Container, Group, Loader, Notification, Paper, Stack, Text, TextInput, Title } from '@mantine/core';
import { Header } from '../components/Header';
import api from '../services/api';

export function ProfilePage() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    api.get('/me/')
      .then((response) => {
        setUser(response.data);
        setForm({
          first_name: response.data.first_name || '',
          last_name: response.data.last_name || '',
          email: response.data.email || '',
          phone: response.data.phone || '',
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await api.patch('/me/', form);
      setUser(response.data);
      setNotice({ color: 'teal', text: 'Профиль обновлён.' });
    } catch {
      setNotice({ color: 'red', text: 'Не удалось сохранить профиль.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Center h="100vh"><Loader /></Center>;

  return (
    <div>
      <Header />
      <Container size={720} py="xl">
        <Group justify="space-between" mb="lg">
          <Title order={2}>Профиль</Title>
          <Badge size="lg" variant="light">{user?.role}</Badge>
        </Group>

        {notice && (
          <Notification color={notice.color} mb="md" onClose={() => setNotice(null)}>
            {notice.text}
          </Notification>
        )}

        <Paper withBorder shadow="sm" radius="md" p="lg">
          <Stack>
            <Text c="dimmed">Логин: {user?.username}</Text>
            <TextInput
              label="Имя"
              value={form.first_name}
              onChange={(event) => setForm((prev) => ({ ...prev, first_name: event.currentTarget.value }))}
            />
            <TextInput
              label="Фамилия"
              value={form.last_name}
              onChange={(event) => setForm((prev) => ({ ...prev, last_name: event.currentTarget.value }))}
            />
            <TextInput
              label="Email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.currentTarget.value }))}
            />
            <TextInput
              label="Телефон"
              value={form.phone}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.currentTarget.value }))}
            />
            <Button loading={saving} onClick={handleSave}>Сохранить</Button>
          </Stack>
        </Paper>
      </Container>
    </div>
  );
}
