import express from 'express';
import bcrypt from 'bcryptjs';
import supabase from '../database/supabase.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';
import { getSessionSummary, getPopularStocks } from '../database/supabaseHelpers.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const { data: user, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (error) throw error;

    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    await supabase
      .from('admin_users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

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

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    const cutoff = cutoffDate.toISOString();

    const { data: sessions, error: sessionsError } = await supabase
      .from('user_sessions')
      .select('*')
      .gte('first_visit_at', cutoff)
      .order('first_visit_at', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1);

    if (sessionsError) throw sessionsError;

    const { count, error: countError } = await supabase
      .from('user_sessions')
      .select('*', { count: 'exact', head: true })
      .gte('first_visit_at', cutoff);

    if (countError) throw countError;

    const sessionsWithEvents = await Promise.all(
      (sessions || []).map(async (session) => {
        const { data: events, error: eventsError } = await supabase
          .from('user_events')
          .select('*')
          .eq('session_id', session.session_id)
          .order('created_at', { ascending: true });

        if (eventsError) throw eventsError;

        return {
          ...session,
          events: events || []
        };
      })
    );

    res.json({
      sessions: sessionsWithEvents,
      total: count || 0,
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

    const summary = await getSessionSummary(daysBack);
    const popularStocks = await getPopularStocks(daysBack, 10);

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
