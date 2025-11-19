import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../database/sqlite.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';
import { getSessionSummary, getPopularStocks, getAllSessions, getEventsBySessionId } from '../database/sqliteHelpers.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = db.prepare(`
      SELECT * FROM admin_users WHERE username = ?
    `).get(username);

    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    db.prepare(`
      UPDATE admin_users
      SET last_login_at = ?
      WHERE id = ?
    `).run(new Date().toISOString(), user.id);

    const token = generateToken(user.id, user.username);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: '登录失败,请重试' });
  }
});

router.post('/logout', authMiddleware, (req, res) => {
  res.json({ success: true });
});

router.get('/verify', authMiddleware, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

router.get('/sessions', authMiddleware, async (req, res) => {
  try {
    const { days = 7, limit = 50, offset = 0 } = req.query;
    const daysBack = parseInt(days);
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);

    const { sessions, count } = getAllSessions(limitNum, offsetNum, daysBack);

    const sessionsWithEvents = sessions.map(session => ({
      ...session,
      events: getEventsBySessionId(session.session_id)
    }));

    res.json({
      sessions: sessionsWithEvents,
      total: count,
      limit: limitNum,
      offset: offsetNum
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const daysBack = parseInt(days);

    const summary = getSessionSummary(daysBack);
    const popularStocks = getPopularStocks(daysBack, 10);

    res.json({
      summary,
      popularStocks
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;
