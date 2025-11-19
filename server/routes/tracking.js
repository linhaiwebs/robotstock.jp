import express from 'express';
import supabase from '../database/supabase.js';

const router = express.Router();

router.post('/session', async (req, res) => {
  try {
    const { sessionId, stockCode, stockName, urlParams, userAgent } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const { data: existing, error: selectError } = await supabase
      .from('user_sessions')
      .select('id')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (selectError) throw selectError;

    if (existing) {
      const { error: updateError } = await supabase
        .from('user_sessions')
        .update({
          stock_code: stockCode || null,
          stock_name: stockName || null,
          url_params: urlParams || {},
          last_activity_at: new Date().toISOString()
        })
        .eq('session_id', sessionId);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('user_sessions')
        .insert({
          session_id: sessionId,
          stock_code: stockCode || null,
          stock_name: stockName || null,
          url_params: urlParams || {},
          user_agent: userAgent || null
        });

      if (insertError) throw insertError;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking session:', error);
    res.status(500).json({ error: 'Failed to track session' });
  }
});

router.post('/event', async (req, res) => {
  try {
    const { sessionId, eventType, eventData, stockCode, stockName, durationMs, gclid } = req.body;

    if (!sessionId || !eventType) {
      return res.status(400).json({ error: 'Session ID and event type are required' });
    }

    const { error: updateActivityError } = await supabase
      .from('user_sessions')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('session_id', sessionId);

    if (updateActivityError) throw updateActivityError;

    if (eventType === 'conversion') {
      const { error: convertError } = await supabase
        .from('user_sessions')
        .update({
          converted: true,
          converted_at: new Date().toISOString()
        })
        .eq('session_id', sessionId);

      if (convertError) throw convertError;
    }

    const { error: insertError } = await supabase
      .from('user_events')
      .insert({
        session_id: sessionId,
        event_type: eventType,
        event_data: eventData || {},
        stock_code: stockCode || null,
        stock_name: stockName || null,
        duration_ms: durationMs || null,
        gclid: gclid || null
      });

    if (insertError) throw insertError;

    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

export default router;
