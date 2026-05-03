import { Button, Container, Group, Menu, Text, UnstyledButton } from '@mantine/core';
import {
  IconCalendarCheck,
  IconChevronDown,
  IconLogin,
  IconLogout,
  IconMapPin,
  IconMessageStar,
  IconUser,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';

export function Header() {
  const isLoggedIn = !!localStorage.getItem('access_token');

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('username');
    window.location.href = '/';
  };

  return (
    <header style={{ borderBottom: '1px solid #e9ecef', padding: '1rem 0', background: '#fff' }}>
      <Container size="xl">
        <Group justify="space-between">
          <Link to="/" style={{ textDecoration: 'none' }}>
            <Group gap="xs">
              <IconMapPin size={32} color="#339af0" />
              <Text size="xl" fw={700} c="#339af0">SportBooking</Text>
            </Group>
          </Link>

          <Group gap="md">
            {isLoggedIn ? (
              <Menu trigger="hover" openDelay={120} closeDelay={180} position="bottom-end" shadow="md" width={220}>
                <Menu.Target>
                  <UnstyledButton>
                    <Group gap={6}>
                      <IconUser size={18} />
                      <Text fw={600}>Профиль</Text>
                      <IconChevronDown size={16} />
                    </Group>
                  </UnstyledButton>
                </Menu.Target>

                <Menu.Dropdown>
                  <Menu.Item component={Link} to="/profile" leftSection={<IconUser size={16} />}>
                    Профиль
                  </Menu.Item>
                  <Menu.Item component={Link} to="/profile/bookings" leftSection={<IconCalendarCheck size={16} />}>
                    Бронирования
                  </Menu.Item>
                  <Menu.Item component={Link} to="/profile/reviews" leftSection={<IconMessageStar size={16} />}>
                    Отзывы
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item color="red" leftSection={<IconLogout size={16} />} onClick={handleLogout}>
                    Выйти
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            ) : (
              <>
                <Button variant="outline" leftSection={<IconUser size={16} />} component={Link} to="/login">
                  Войти
                </Button>
                <Button color="blue" leftSection={<IconLogin size={16} />} component={Link} to="/register">
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
