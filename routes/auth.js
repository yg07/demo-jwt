const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// ---- Валидаторы ----
const loginRe = /^[A-Za-z0-9]{6,}$/;
const fioRe   = /^[А-Яа-яЁё\s]+$/;
const phoneRe = /^8\(\d{3}\)\d{3}-\d{2}-\d{2}$/;
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---- Хелперы ----
function issueTokens(user) {
  const accessToken = jwt.sign(
    { id: user.id, login: user.login, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_TTL || '15m' }
  );
  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_TTL || '7d' }
  );
  return { accessToken, refreshToken };
}

function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

// ---- Регистрация ----
router.post('/register', async (req, res) => {
  const { login, password, full_name, phone, email } = req.body;
  if (!login || !password || !full_name || !phone || !email)
    return res.status(400).json({ error: 'Все поля обязательны' });
  if (!loginRe.test(login))
    return res.status(400).json({ error: 'Логин: латиница и цифры, ≥6 символов' });
  if (password.length < 8)
    return res.status(400).json({ error: 'Пароль: минимум 8 символов' });
  if (!fioRe.test(full_name))
    return res.status(400).json({ error: 'ФИО: только кириллица и пробелы' });
  if (!phoneRe.test(phone))
    return res.status(400).json({ error: 'Телефон: формат 8(XXX)XXX-XX-XX' });
  if (!emailRe.test(email))
    return res.status(400).json({ error: 'Некорректный email' });

  try {
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO users (login, password_hash, full_name, phone, email)
       VALUES (?, ?, ?, ?, ?)`,
      [login, hash, full_name, phone, email]
    );
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY')
      return res.status(400).json({ error: 'Логин уже занят' });
    console.error(e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ---- Логин ----
router.post('/login', async (req, res) => {
  const { login, password } = req.body;
  if (!login || !password)
    return res.status(400).json({ error: 'Введите логин и пароль' });

  const [rows] = await pool.query('SELECT * FROM users WHERE login = ?', [login]);
  if (!rows.length)
    return res.status(400).json({ error: 'Пользователь не найден' });

  const user = rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(400).json({ error: 'Неверный пароль' });

  const { accessToken, refreshToken } = issueTokens(user);
  setRefreshCookie(res, refreshToken);
  res.json({
    ok: true,
    accessToken,
    user: { id: user.id, login: user.login, full_name: user.full_name, role: user.role }
  });
});

// ---- Обновление access-токена по refresh из cookie ----
router.post('/refresh', async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ error: 'Нет refresh-токена' });

  try {
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const [rows] = await pool.query(
      'SELECT id, login, role FROM users WHERE id = ?', [payload.id]
    );
    if (!rows.length) return res.status(401).json({ error: 'Пользователь не найден' });

    const user = rows[0];
    const accessToken = jwt.sign(
      { id: user.id, login: user.login, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_ACCESS_TTL || '15m' }
    );
    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: 'Refresh-токен недействителен' });
  }
});

// ---- Текущий пользователь (по access-токену) ----
router.get('/me', auth, async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, login, full_name, email, phone, role FROM users WHERE id = ?',
    [req.user.id]
  );
  if (!rows.length) return res.status(401).json({ error: 'Пользователь не найден' });
  res.json(rows[0]);
});

// ---- Выход: чистим refresh-cookie ----
router.post('/logout', (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ ok: true });
});

module.exports = router;
