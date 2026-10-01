const express = require('express');
const pool = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/applications', auth, adminOnly, async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT a.id, u.full_name, u.login, u.phone, u.email,
            r.name AS room_name, r.type AS room_type,
            a.start_date, a.payment_method, a.status, a.created_at
     FROM applications a
     JOIN users u ON u.id = a.user_id
     JOIN rooms r ON r.id = a.room_id
     ORDER BY a.created_at DESC`
  );
  res.json(rows);
});

router.put('/applications/:id/status', auth, adminOnly, async (req, res) => {
  const { status } = req.body;
  const allowed = ['Новая', 'Мероприятие назначено', 'Завершено'];
  if (!allowed.includes(status))
    return res.status(400).json({ error: 'Недопустимый статус' });

  await pool.query('UPDATE applications SET status = ? WHERE id = ?',
    [status, req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
