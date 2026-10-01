// public/api.js
const Auth = (() => {
  let accessToken = null;
  let currentUser = null;

  function setToken(t) { accessToken = t; }
  function getToken() { return accessToken; }
  function setUser(u) { currentUser = u; }
  function getUser() { return currentUser; }

  async function request(url, options = {}) {
    options.headers = {
      ...(options.headers || {}),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
    };
    options.credentials = 'same-origin'; // чтобы refresh-cookie уходила

    let res = await fetch(url, options);

    // Если access-токен истёк — пробуем refresh
    if (res.status === 401) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        options.headers.Authorization = `Bearer ${accessToken}`;
        res = await fetch(url, options);
      } else {
        location.href = 'index.html';
        return res;
      }
    }
    return res;
  }

  async function tryRefresh() {
    try {
      const r = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'same-origin'
      });
      if (!r.ok) return false;
      const d = await r.json();
      accessToken = d.accessToken;
      return true;
    } catch { return false; }
  }

  async function login(login, password) {
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ login, password })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    accessToken = data.accessToken;
    currentUser = data.user;
    return data.user;
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    accessToken = null;
    currentUser = null;
    location.href = 'index.html';
  }

  // При загрузке страницы — попробовать восстановить сессию по refresh-cookie
  async function bootstrap() {
    if (await tryRefresh()) {
      const r = await request('/api/auth/me');
      if (r.ok) currentUser = await r.json();
      return currentUser;
    }
    return null;
  }

  return {
    request, login, logout, bootstrap,
    setToken, getToken, setUser, getUser
  };
})();
