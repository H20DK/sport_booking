import { useEffect, useState } from 'react';
import { Button, Container, Group, Menu, Text, UnstyledButton } from '@mantine/core';
import {
  IconBuildingStore,
  IconCalendarCheck,
  IconChevronDown,
  IconLogin,
  IconLogout,
  IconMapPin,
  IconMessageStar,
  IconShield,
  IconUser,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { clearStoredAuth, getAccessToken } from '../services/authStorage';

export function Header() {
  const isLoggedIn = !!getAccessToken();
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!isLoggedIn) return;
    api.get('/me/', { skipAuthRedirect: true })
      .then((response) => setUser(response.data))
      .catch(() => setUser(null));
  }, [isLoggedIn]);

  const canOpenRenterCabinet = user && (['renter', 'administration', 'system_admin'].includes(user.role) || user.is_staff || user.is_superuser);
  const canOpenAdminCabinet = user && (user.role === 'administration' || user.is_staff || user.is_superuser);

  const handleLogout = () => {
    clearStoredAuth();
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
              <Menu trigger="hover" openDelay={120} closeDelay={180} position="bottom-end" shadow="md" width={240}>
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
                  {canOpenRenterCabinet ? (
                    <>
                      {canOpenAdminCabinet && (
                        <Menu.Item component={Link} to="/admin-dashboard" leftSection={<IconShield size={16} />}>
                          Администрирование
                        </Menu.Item>
                      )}
                      <Menu.Item component={Link} to="/renter?tab=objects" leftSection={<IconBuildingStore size={16} />}>
                        Объекты
                      </Menu.Item>
                      <Menu.Item component={Link} to="/renter?tab=reviews" leftSection={<IconMessageStar size={16} />}>
                        Отзывы
                      </Menu.Item>
                      <Menu.Item component={Link} to="/renter?tab=bookings" leftSection={<IconCalendarCheck size={16} />}>
                        Бронирования
                      </Menu.Item>
                      <Menu.Item component={Link} to="/renter?tab=schedule" leftSection={<IconCalendarCheck size={16} />}>
                        Расписание
                      </Menu.Item>
                    </>
                  ) : (
                    <>
                      <Menu.Item component={Link} to="/profile?tab=bookings" leftSection={<IconCalendarCheck size={16} />}>
                        Бронирования
                      </Menu.Item>
                      <Menu.Item component={Link} to="/profile?tab=reviews" leftSection={<IconMessageStar size={16} />}>
                        Отзывы
                      </Menu.Item>
                    </>
                  )}
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
