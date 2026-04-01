const https = require('https');

// SUPABASE API
// ============================================================================

function supabaseRequest(path, method = 'GET', body = null, SUPABASE_URL, SUPABASE_SERVICE_KEY, CONFIG, collectResponse, Logger) {
  return new Promise((resolve, reject) => {
    try {
      const bodyStr = body ? JSON.stringify(body) : '';
      const url = new URL(SUPABASE_URL + '/rest/v1/' + path);
      const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Prefer': 'resolution=merge-duplicates'
        },
        timeout: CONFIG.HTTP_TIMEOUT_MS
      };
      if (bodyStr) options.headers['Content-Length'] = Buffer.byteLength(bodyStr);

      const req = https.request(options, async (res) => {
        try {
          const buffer = await collectResponse(res);
          const text = buffer.toString();
          if (res.statusCode >= 400) throw new Error(`Supabase error ${res.statusCode}: ${text}`);
          resolve(text);
        } catch (err) { reject(err); }
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Supabase request timeout')); });
      if (bodyStr) req.write(bodyStr);
      req.end();
    } catch (err) { reject(err); }
  });
}

function supabaseGet(path, SUPABASE_URL, SUPABASE_SERVICE_KEY, CONFIG, collectResponse, Logger) {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await supabaseRequest(path, 'GET', null, SUPABASE_URL, SUPABASE_SERVICE_KEY, CONFIG, collectResponse, Logger);
      try { resolve(JSON.parse(response)); }
      catch (err) { Logger.warn('Failed to parse Supabase response', err); resolve([]); }
    } catch (err) { Logger.error('supabaseGet error', err); reject(err); }
  });
}

async function supabaseBatchRequest(path, method, items, SUPABASE_URL, SUPABASE_SERVICE_KEY, CONFIG, collectResponse, Logger, sleep) {
  const results = [];
  for (let i = 0; i < items.length; i += CONFIG.PARALLEL_REQUESTS) {
    const batch = items.slice(i, i + CONFIG.PARALLEL_REQUESTS);
    const promises = batch.map(item => supabaseRequest(path, method, item, SUPABASE_URL, SUPABASE_SERVICE_KEY, CONFIG, collectResponse, Logger));
    try {
      const batchResults = await Promise.allSettled(promises);
      results.push(...batchResults);
    } catch (err) { Logger.error('Batch request error', err); }
    if (i + CONFIG.PARALLEL_REQUESTS < items.length) await sleep(100);
  }
  return results;
}

async function saveToSupabase(items, tyyppi, SUPABASE_URL, SUPABASE_SERVICE_KEY, CONFIG, collectResponse, Logger, sleep) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    Logger.warn('Supabase not configured, skipping save');
    return;
  }

  const processedItems = items.map(item => {
    let julkaisija = 'Kokkola';
    let otsikko = item.otsikko;
    if (otsikko.includes(' / ')) {
      const parts = otsikko.split(' / ');
      julkaisija = parts[0].trim();
      otsikko = parts.slice(1).join(' / ').trim();
    }
    let julkaistu = null;
    if (item.julkaistu) {
      const d = new Date(item.julkaistu);
      if (!isNaN(d.getTime())) julkaistu = d.toISOString().split('T')[0];
    }
    return { ulkoinen_id: item.ulkoinen_id, otsikko, kuvaus: item.kuvaus, julkaisija, linkki: item.linkki, julkaistu, tyyppi };
  });

  try {
    await supabaseBatchRequest('paatokset?on_conflict=ulkoinen_id', 'POST', processedItems, SUPABASE_URL, SUPABASE_SERVICE_KEY, CONFIG, collectResponse, Logger, sleep);
    Logger.info(`Saved ${processedItems.length} items to Supabase`, { tyyppi });
  } catch (err) { Logger.error('Error saving to Supabase', err); }
}

module.exports = { supabaseRequest, supabaseGet, supabaseBatchRequest, saveToSupabase };