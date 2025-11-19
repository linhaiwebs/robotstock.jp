import express from 'express';
import supabase from '../database/supabase.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/', async (req, res) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  });

  try {
    const { data: config, error } = await supabase
      .from('google_tracking_config')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!config) {
      return res.json({
        success: true,
        config: {
          google_ads_conversion_id: '',
          ga4_measurement_id: '',
          conversion_action_id: '',
          is_enabled: false
        }
      });
    }

    res.json({
      success: true,
      config: {
        google_ads_conversion_id: config.google_ads_conversion_id || '',
        ga4_measurement_id: config.ga4_measurement_id || '',
        conversion_action_id: config.conversion_action_id || '',
        is_enabled: config.is_enabled || false
      }
    });
  } catch (error) {
    console.error('Error fetching Google tracking config:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch configuration' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  try {
    const { google_ads_conversion_id, ga4_measurement_id, conversion_action_id, is_enabled } = req.body;

    const { data: existing, error: selectError } = await supabase
      .from('google_tracking_config')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (selectError) throw selectError;

    if (existing) {
      const { data: config, error: updateError } = await supabase
        .from('google_tracking_config')
        .update({
          google_ads_conversion_id: google_ads_conversion_id || null,
          ga4_measurement_id: ga4_measurement_id || null,
          conversion_action_id: conversion_action_id || null,
          is_enabled: is_enabled || false,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) throw updateError;

      return res.json({ success: true, config });
    }

    const { data: config, error: insertError } = await supabase
      .from('google_tracking_config')
      .insert({
        google_ads_conversion_id: google_ads_conversion_id || null,
        ga4_measurement_id: ga4_measurement_id || null,
        conversion_action_id: conversion_action_id || null,
        is_enabled: is_enabled || false
      })
      .select()
      .single();

    if (insertError) throw insertError;

    res.json({ success: true, config });
  } catch (error) {
    console.error('Error saving Google tracking config:', error);
    res.status(500).json({ success: false, error: 'Failed to save configuration' });
  }
});

export default router;
