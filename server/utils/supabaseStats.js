import supabase from '../database/supabase.js';

export async function recordUsageStats({ cacheHit, apiCall, error, responseTime, queueLength = 0 }) {
  try {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const hour = now.getHours();

    const { data: existing, error: selectError } = await supabase
      .from('api_usage_stats')
      .select('*')
      .eq('date', date)
      .eq('hour', hour)
      .maybeSingle();

    if (selectError) throw selectError;

    if (existing) {
      const newRequestsTotal = existing.requests_total + 1;
      const { error: updateError } = await supabase
        .from('api_usage_stats')
        .update({
          requests_total: newRequestsTotal,
          cache_hits: existing.cache_hits + (cacheHit ? 1 : 0),
          api_calls: existing.api_calls + (apiCall ? 1 : 0),
          errors_count: existing.errors_count + (error ? 1 : 0),
          queue_length_avg: Math.round((existing.queue_length_avg + queueLength) / 2),
          response_time_avg: Math.round((existing.response_time_avg * existing.requests_total + responseTime) / newRequestsTotal),
          updated_at: now.toISOString()
        })
        .eq('id', existing.id);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('api_usage_stats')
        .insert({
          date,
          hour,
          requests_total: 1,
          cache_hits: cacheHit ? 1 : 0,
          api_calls: apiCall ? 1 : 0,
          errors_count: error ? 1 : 0,
          queue_length_avg: queueLength,
          response_time_avg: responseTime
        });

      if (insertError) throw insertError;
    }
  } catch (error) {
    console.error('Error in recordUsageStats:', error);
  }
}

export async function getTodayStats() {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('api_usage_stats')
      .select('*')
      .eq('date', today)
      .order('hour', { ascending: true });

    if (error) throw error;

    const totals = (data || []).reduce(
      (acc, row) => ({
        requests_total: acc.requests_total + row.requests_total,
        cache_hits: acc.cache_hits + row.cache_hits,
        api_calls: acc.api_calls + row.api_calls,
        errors_count: acc.errors_count + row.errors_count,
      }),
      { requests_total: 0, cache_hits: 0, api_calls: 0, errors_count: 0 }
    );

    return {
      hourly: data || [],
      totals,
      cacheHitRate: totals.requests_total > 0
        ? ((totals.cache_hits / totals.requests_total) * 100).toFixed(2)
        : 0,
    };
  } catch (error) {
    console.error('Error in getTodayStats:', error);
    return null;
  }
}
