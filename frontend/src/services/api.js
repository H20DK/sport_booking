import axios from 'axios';
import { clearStoredAuth, getAccessToken } from './authStorage';

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Интерцептор запроса: добавляем токен
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Интерцептор ответа: обрабатываем истечение токена (опционально для MVP)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.skipAuthRedirect) {
      // Токен протух или неверен
      clearStoredAuth();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
