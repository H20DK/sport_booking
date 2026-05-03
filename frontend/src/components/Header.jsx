import { Group, Button, Container, ActionIcon, Text } from '@mantine/core';
import { IconMapPin, IconUser, IconLogin, IconLogout } from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router-dom';

export function Header() {
  const _navigate = useNavigate();

  // Проверяем токен напрямую при каждом рендере.
  // Это быстро и гарантирует, что UI всегда соответствует реальному состоянию localStorage.
  const isLoggedIn = !!localStorage.getItem('access_token');

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_role');
    // Принудительно обновляем страницу или переходим на главную, чтобы сбросить все состояния
    window.location.href = '/'; 
  };

  return (
    <header style={{ borderBottom: '1px solid #e9ecef', padding: '1rem 0' }}>
      <Container size="xl">
        <Group justify="space-between">
          {/* Логотип */}
          <Link to="/" style={{ textDecoration: 'none' }}>
            <Group gap="xs">
              <IconMapPin size={32} color="#339af0" />
              <Text size="xl" fw={700} c="#339af0">SportBooking</Text>
            </Group>
          </Link>

          {/* Кнопки справа */}
          <Group gap="md">
            {isLoggedIn ? (
              <>
                <Button 
                  variant="filled" 
                  color="blue" 
                  leftSection={<IconUser size={16} />} 
                  component={Link} 
                  to="/profile"
                >
                  Кабинет
                </Button>
                <Button 
                  variant="outline" 
                  color="red" 
                  leftSection={<IconLogout size={16} />} 
                  onClick={handleLogout}
                >
                  Выйти
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  leftSection={<IconUser size={16} />} 
                  component={Link} 
                  to="/login"
                >
                  Войти
                </Button>
                <Button 
                  color="blue" 
                  leftSection={<IconLogin size={16} />} 
                  component={Link} 
                  to="/register"
                >
                  Регистрация
                </Button>
              </>
            )}
          </Group>
        </Group>
      </Container>
    </header>
  );
}