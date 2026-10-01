const express = require('express');
const pool = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Список помещений
router.get('/rooms', auth, async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM rooms ORDER BY name');
  res.json(rows);
});

// Создать заявку
router.post('/', auth, async (req, res) => {
  const { room_id, start_date, payment_method } = req.body;
  if (!room_id || !start_date || !payment_method)
    return res.status(400).json({ error: 'Заполните все поля' });
  if (!['очное', 'СБП'].includes(payment_method))
    return res.status(400).json({ error: 'Неверный способ оплаты' });

  try {
    const [r] = await pool.query(
      `INSERT INTO applications (user_id, room_id, start_date, payment_method)
       VALUES (?, ?, ?, ?)`,
      [req.user.id, room_id, start_date, payment_method]
    );
    res.json({ ok: true, id: r.insertId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Заявки текущего пользователя
router.get('/my', auth, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT a.id, r.name AS room_name, r.type AS room_type,
            a.start_date, a.payment_method, a.status, a.review, a.review_rating
     FROM applications a
     JOIN rooms r ON r.id = a.room_id
     WHERE a.user_id = ?
     ORDER BY a.created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
});

// Оставить отзыв
router.post('/:id/review', auth, async (req, res) => {
  const { review, rating } = req.body;
  if (!review || !rating)
    return res.status(400).json({ error: 'Заполните отзыв и оценку' });

  const [rows] = await pool.query(
    'SELECT * FROM applications WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Заявка не найдена' });
  if (rows[0].status !== 'Завершено')
    return res.status(400).json({ error: 'Отзыв только по завершённому мероприятию' });

  await pool.query(
    'UPDATE applications SET review = ?, review_rating = ? WHERE id = ?',
    [review, rating, req.params.id]
  );
  res.json({ ok: true });
});

module.exports = router;
