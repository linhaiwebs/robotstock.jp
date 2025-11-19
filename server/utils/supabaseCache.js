import supabase from '../database/supabase.js';

const CACHE_DURATION_HOURS = 4;

export async function getCachedDiagnosis(stockCode) {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('diagnosis_cache')
      .select('*')
      .eq('stock_code', stockCode)
      .gt('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      await supabase
        .from('diagnosis_cache')
        .update({
          hit_count: data.hit_count + 1,
          last_hit_at: new Date().toISOString()
        })
        .eq('id', data.id);

      console.log(`Cache hit for stock ${stockCode}, hit_count: ${data.hit_count + 1}`);

      return data;
    }

    console.log(`Cache miss for stock ${stockCode}`);
    return null;
  } catch (error) {
    console.error('Error in getCachedDiagnosis:', error);
    return null;
  }
}

export async function saveDiagnosisToCache(stockCode, stockData, diagnosisResult, modelUsed = 'qwen2.5-7b-instruct') {
  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + CACHE_DURATION_HOURS);

    const { data, error } = await supabase
      .from('diagnosis_cache')
      .insert({
        stock_code: stockCode,
        stock_data: stockData,
        diagnosis_result: diagnosisResult,
        model_used: modelUsed,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`Saved diagnosis to cache for stock ${stockCode}, expires at ${expiresAt.toISOString()}`);
    return data;
  } catch (error) {
    console.error('Error in saveDiagnosisToCache:', error);
    return null;
  }
}

export async function cleanExpiredCache() {
  try {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('diagnosis_cache')
      .delete()
      .lt('expires_at', now);

    if (error) throw error;

    console.log(`Cleaned expired cache entries`);
    return true;
  } catch (error) {
    console.error('Error in cleanExpiredCache:', error);
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
    console.error('Error in getCacheStats:', error);
    return null;
  }
}
