import express from 'express';
import supabase from '../database/supabase.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

function isValidUrl(urlString) {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

router.get('/', authMiddleware, async (req, res) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  });

  try {
    const { data: links, error } = await supabase
      .from('redirect_links')
      .select('*')
      .order('is_active', { ascending: false })
      .order('weight', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, links: links || [] });
  } catch (error) {
    console.error('Error fetching redirect links:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch links' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  try {
    const { redirect_url, weight, label, url_type } = req.body;

    if (!redirect_url || !isValidUrl(redirect_url)) {
      return res.status(400).json({ success: false, error: 'Invalid URL format. Please provide a valid http or https URL.' });
    }

    if (weight < 1 || weight > 100) {
      return res.status(400).json({ success: false, error: 'Weight must be between 1 and 100' });
    }

    const { data: existingLink, error: checkError } = await supabase
      .from('redirect_links')
      .select('id')
      .eq('redirect_url', redirect_url)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existingLink) {
      return res.status(400).json({ success: false, error: 'This URL already exists' });
    }

    const { data: newLink, error: insertError } = await supabase
      .from('redirect_links')
      .insert({
        redirect_url,
        weight,
        label: label || '',
        url_type: url_type || 'general'
      })
      .select()
      .single();

    if (insertError) throw insertError;

    res.json({ success: true, link: newLink });
  } catch (error) {
    console.error('Error creating redirect link:', error);
    res.status(500).json({ success: false, error: 'Failed to create link' });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  try {
    const { id } = req.params;
    const { redirect_url, weight, is_active, label, url_type } = req.body;

    if (redirect_url && !isValidUrl(redirect_url)) {
      return res.status(400).json({ success: false, error: 'Invalid URL format. Please provide a valid http or https URL.' });
    }

    if (weight !== undefined && (weight < 1 || weight > 100)) {
      return res.status(400).json({ success: false, error: 'Weight must be between 1 and 100' });
    }

    const updates = { updated_at: new Date().toISOString() };

    if (redirect_url !== undefined) {
      const { data: existingLink, error: checkError } = await supabase
        .from('redirect_links')
        .select('id')
        .eq('redirect_url', redirect_url)
        .neq('id', id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingLink) {
        return res.status(400).json({ success: false, error: 'This URL already exists' });
      }

      updates.redirect_url = redirect_url;
    }
    if (weight !== undefined) updates.weight = weight;
    if (is_active !== undefined) updates.is_active = is_active;
    if (label !== undefined) updates.label = label;
    if (url_type !== undefined) updates.url_type = url_type;

    if (Object.keys(updates).length === 1) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    const { data: updatedLink, error: updateError } = await supabase
      .from('redirect_links')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({ success: true, link: updatedLink });
  } catch (error) {
    console.error('Error updating redirect link:', error);
    res.status(500).json({ success: false, error: 'Failed to update link' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('redirect_links')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting redirect link:', error);
    res.status(500).json({ success: false, error: 'Failed to delete link' });
  }
});

router.get('/select', async (req, res) => {
  try {
    const { data: activeLinks, error } = await supabase
      .from('redirect_links')
      .select('*')
      .eq('is_active', true)
      .order('weight', { ascending: false });

    if (error) throw error;

    if (!activeLinks || activeLinks.length === 0) {
      return res.status(404).json({ success: false, error: 'No active links available' });
    }

    const totalWeight = activeLinks.reduce((sum, link) => sum + link.weight, 0);
    let random = Math.random() * totalWeight;
    let selectedLink = activeLinks[0];

    for (const link of activeLinks) {
      random -= link.weight;
      if (random <= 0) {
        selectedLink = link;
        break;
      }
    }

    const { error: updateError } = await supabase
      .from('redirect_links')
      .update({ hit_count: selectedLink.hit_count + 1 })
      .eq('id', selectedLink.id);

    if (updateError) throw updateError;

    res.json({ success: true, link: selectedLink });
  } catch (error) {
    console.error('Error selecting redirect link:', error);
    res.status(500).json({ success: false, error: 'Failed to select link' });
  }
});

export default router;
