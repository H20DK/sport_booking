import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Container, Paper, Title, TextInput, Button, Text, Notification, Stack } from '@mantine/core';
import { IconLock, IconMail } from '@tabler/icons-react';
import api from '../services/api';
import { Header } from '../components/Header';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      // Запрос токена
      const response = await api.post('/token/', { username: email, password }); // DRF SimpleJWT ждет username (или email если кастомизировано)
      
      // В нашей модели User используется email как username? 
      // Если нет, нужно отправлять username. Для простоты предположим, что пользователь вводит email, 
      // но в БД username может отличаться. 
      // ВАЖНО: В SimpleJWT по умолчанию поле 'username'. 
      // Если вы регистрировались через админку, там username и email разные.
      // Давайте исправим запрос, чтобы отправлять именно то, что ввели в поле username (если это email, то нужно изменить бэкенд или ввод).
      // Для курса проще: считаем, что пользователь вводит 'username' (логин).
      
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
      
      navigate('/profile'); // Переход в личный кабинет
    } catch {
      setError('Неверный логин или пароль');
    }
  };

  return (
    <div>
      <Header />
      <Container size={420} my={40}>
        <Title ta="center" order={2}>Вход в систему</Title>
        <Text c="dimmed" size="sm" ta="center" mt="xs">
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </Text>

        <Paper withBorder shadow="md" p={30} mt="md" radius="md">
          {error && <Notification color="red" onClose={() => setError('')}>{error}</Notification>}
          
          <form onSubmit={handleLogin}>
            <Stack>
              <TextInput 
                label="Логин (Username)" 
                placeholder="admin" 
                leftSection={<IconMail size={16} />} 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <TextInput 
                label="Пароль" 
                type="password" 
                placeholder="Ваш пароль" 
                leftSection={<IconLock size={16} />} 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button fullWidth type="submit">Войти</Button>
            </Stack>
          </form>
        </Paper>
      </Container>
    </div>
  );
}