const AUTH_KEYS = ['access_token', 'refresh_token', 'user_role', 'username'];

export function getAccessToken() {
  return sessionStorage.getItem('access_token');
}

export function setAuthTokens({ access, refresh }) {
  clearStoredAuth();

  if (access) {
    sessionStorage.setItem('access_token', access);
  }

  if (refresh) {
    sessionStorage.setItem('refresh_token', refresh);
  }
}

export function clearStoredAuth() {
  AUTH_KEYS.forEach((key) => {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  });
}
