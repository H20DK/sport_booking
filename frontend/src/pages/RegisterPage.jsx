import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Container, Paper, Title, TextInput, Button, Text, Select, Stack, Notification } from '@mantine/core';
import { IconUser, IconMail, IconLock } from '@tabler/icons-react';
import api from '../services/api';
import { Header } from '../components/Header';

export function RegisterPage() {
  const [formData, setFormData] = useState({ username: '', email: '', password: '', role: 'user' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/register/', formData);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch {
      setError('Ошибка регистрации. Проверьте данные.');
    }
  };

  return (
    <div>
      <Header />
      <Container size={420} my={40}>
        <Title ta="center" order={2}>Регистрация</Title>
        <Text c="dimmed" size="sm" ta="center" mt="xs">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </Text>

        <Paper withBorder shadow="md" p={30} mt="md" radius="md">
          {error && <Notification color="red" onClose={() => setError('')}>{error}</Notification>}
          {success && <Notification color="teal" onClose={() => setSuccess(false)}>Успешно! Переход ко входу...</Notification>}
          
          <form onSubmit={handleSubmit}>
            <Stack>
              <TextInput 
                label="Имя пользователя" 
                placeholder="ivan_sport" 
                leftSection={<IconUser size={16} />} 
                required 
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
              />
              <TextInput 
                label="Email" 
                type="email" 
                placeholder="ivan@example.com" 
                leftSection={<IconMail size={16} />} 
                required 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
              <Select
                label="Роль"
                data={[
                  { value: 'user', label: 'Пользователь' },
                  { value: 'renter', label: 'Собственник' },
                ]}
                value={formData.role}
                onChange={(val) => setFormData({...formData, role: val})}
              />
              <TextInput 
                label="Пароль" 
                type="password" 
                required 
                leftSection={<IconLock size={16} />} 
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
              <Button fullWidth type="submit">Создать аккаунт</Button>
            </Stack>
          </form>
        </Paper>
      </Container>
    </div>
  );
}
