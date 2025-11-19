import supabase from './supabase.js';

export function generateUUID() {
  return crypto.randomUUID();
}

export async function cleanExpiredCache() {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('diagnosis_cache')
      .delete()
      .lt('expires_at', now);

    if (error) throw error;
    console.log(`Cleaned expired cache entries`);
    return true;
  } catch (error) {
    console.error('Error cleaning expired cache:', error);
    return false;
  }
}

export async function getCacheStats() {
  try {
    const now = new Date().toISOString();

    const { data: allCache, error } = await supabase
      .from('diagnosis_cache')
      .select('expires_at, hit_count');

    if (error) throw error;

    const totalEntries = allCache?.length || 0;
    const validEntries = allCache?.filter(c => c.expires_at > now).length || 0;
    const expiredEntries = totalEntries - validEntries;
    const totalHits = allCache?.reduce((sum, c) => sum + (c.hit_count || 0), 0) || 0;
    const avgHitCount = totalEntries > 0 ? totalHits / totalEntries : 0;

    return {
      total_entries: totalEntries,
      valid_entries: validEntries,
      expired_entries: expiredEntries,
      total_hits: totalHits,
      avg_hit_count: avgHitCount
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return null;
  }
}

export async function getSessionSummary(daysBack = 7) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    const cutoff = cutoffDate.toISOString();

    const { data: sessions, error: sessionsError } = await supabase
      .from('user_sessions')
      .select('session_id')
      .gte('first_visit_at', cutoff);

    if (sessionsError) throw sessionsError;

    const { data: events, error: eventsError } = await supabase
      .from('user_events')
      .select('event_type, session_id')
      .gte('created_at', cutoff);

    if (eventsError) throw eventsError;

    const totalSessions = new Set(sessions?.map(s => s.session_id) || []).size;
    const totalEvents = events?.length || 0;
    const pageLoads = events?.filter(e => e.event_type === 'page_load').length || 0;
    const diagnoses = events?.filter(e => e.event_type === 'diagnosis_click').length || 0;
    const reportDownloads = events?.filter(e => e.event_type === 'report_download').length || 0;
    const conversions = events?.filter(e => e.event_type === 'conversion').length || 0;
    const conversionRate = totalSessions > 0 ? (conversions / totalSessions) * 100 : 0;

    return {
      total_sessions: totalSessions,
      total_events: totalEvents,
      page_loads: pageLoads,
      diagnoses: diagnoses,
      report_downloads: reportDownloads,
      conversions: conversions,
      conversion_rate: conversionRate.toFixed(2)
    };
  } catch (error) {
    console.error('Error getting session summary:', error);
    return null;
  }
}

export async function getPopularStocks(daysBack = 7, limitCount = 10) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    const cutoff = cutoffDate.toISOString();

    const { data: sessions, error: sessionsError } = await supabase
      .from('user_sessions')
      .select('stock_code, stock_name, session_id')
      .gte('first_visit_at', cutoff)
      .not('stock_code', 'is', null);

    if (sessionsError) throw sessionsError;

    const { data: events, error: eventsError } = await supabase
      .from('user_events')
      .select('event_type, session_id')
      .gte('created_at', cutoff);

    if (eventsError) throw eventsError;

    const stockStats = {};
    sessions?.forEach(session => {
      if (!stockStats[session.stock_code]) {
        stockStats[session.stock_code] = {
          stock_code: session.stock_code,
          stock_name: session.stock_name,
          visit_count: 0,
          diagnosis_count: 0,
          conversion_count: 0,
          session_ids: new Set()
        };
      }
      stockStats[session.stock_code].session_ids.add(session.session_id);
    });

    Object.keys(stockStats).forEach(code => {
      stockStats[code].visit_count = stockStats[code].session_ids.size;
      delete stockStats[code].session_ids;
    });

    events?.forEach(event => {
      const session = sessions?.find(s => s.session_id === event.session_id);
      if (session && stockStats[session.stock_code]) {
        if (event.event_type === 'diagnosis_click') {
          stockStats[session.stock_code].diagnosis_count++;
        } else if (event.event_type === 'conversion') {
          stockStats[session.stock_code].conversion_count++;
        }
      }
    });

    return Object.values(stockStats)
      .sort((a, b) => b.visit_count - a.visit_count)
      .slice(0, limitCount);
  } catch (error) {
    console.error('Error getting popular stocks:', error);
    return [];
  }
}
