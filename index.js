const https = require('https');
const http = require('http');
const { URL } = require('url');

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

const CONFIG = {
  CLAUDE_MODEL: 'claude-haiku-4-5-20251001',
  CLAUDE_MAX_TOKENS: 2048,
  PDF_MIN_SIZE: 1000,
  PDF_REQUEST_DELAY_MS: 1500,
  NEWS_SYNC_INTERVAL_MS: 24 * 60 * 60 * 1000,
  FEED_SYNC_INTERVAL_MS: 60 * 60 * 1000,
  HTTP_TIMEOUT_MS: 30000,
  REQUEST_RETRY_ATTEMPTS: 3,
  REQUEST_RETRY_DELAY_MS: 1000,
  PARALLEL_REQUESTS: 5
};

const FEEDS = {
  '/decisions': 'https://kokkola10.oncloudos.com/cgi/DREQUEST.PHP?page=rss/official_decisions&show=30',
  '/meetings': 'https://kokkola10.oncloudos.com/cgi/DREQUEST.PHP?page=rss/meetingitems&show=100',
  '/agendas': 'https://kokkola10.oncloudos.com/cgi/DREQUEST.PHP?page=rss/meetings&show=100'
};

// ============================================================================
// ENVIRONMENT VALIDATION
// ============================================================================

function validateEnvironment() {
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'ANTHROPIC_API_KEY'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || ['*'];
const PORT = process.env.PORT || 10000;

// ============================================================================
// LOGGER
// ============================================================================

const Logger = {
  info:  (msg, data) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, data || ''),
  error: (msg, err)  => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, err?.message || err || ''),
  warn:  (msg, data) => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, data || ''),
  debug: (msg, data) => { if (process.env.DEBUG) console.log(`[DEBUG] ${new Date().toISOString()} - ${msg}`, data || ''); }
};

// ============================================================================
// HTTP UTILITIES
// ============================================================================

function collectResponse(res) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const timeout = setTimeout(() => reject(new Error('Response timeout')), CONFIG.HTTP_TIMEOUT_MS);
    res.on('data', c => chunks.push(c));
    res.on('end', () => { clearTimeout(timeout); resolve(Buffer.concat(chunks)); });
    res.on('error', err => { clearTimeout(timeout); reject(err); });
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function fetchBuffer(url, attempt = 1) {
  return new Promise((resolve, reject) => {
    try {
      const mod = url.startsWith('https') ? https : http;
      const req = mod.get(url, async (res) => {
        try {
          resolve(await collectResponse(res));
        } catch (err) { reject(err); }
      });
      req.setTimeout(CONFIG.HTTP_TIMEOUT_MS);
      req.on('error', async (err) => {
        if (attempt < CONFIG.REQUEST_RETRY_ATTEMPTS) {
          Logger.warn(`Retry attempt ${attempt} for ${url}`);
          await sleep(CONFIG.REQUEST_RETRY_DELAY_MS);
          resolve(fetchBuffer(url, attempt + 1));
        } else {
          reject(err);
        }
      });
    } catch (err) { reject(err); }
  });
}

// ============================================================================
// RSS PARSING
// ============================================================================

function parseRSS(buffer) {
  // Dynasty käyttää aina iso-8859-1 — kovakoodataan latin1
  const text = buffer.toString('latin1');
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(text)) !== null) {
    try {
      const item = match[1];
      const get = (tag) => {
        const regex = new RegExp(
          `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`,
          'i'
        );
        const m = item.match(regex);
        return m ? (m[1] || m[2] || '').trim() : '';
      };
      items.push({
        otsikko:     get('title'),
        kuvaus:      get('description'),
        linkki:      get('link'),
        julkaistu:   get('pubDate'),
        ulkoinen_id: get('guid') || get('link')
      });
    } catch (err) {
      Logger.warn('Error parsing RSS item', err);
    }
  }
  return items;
}

// ============================================================================
// SUPABASE API
// ============================================================================

function supabaseRequest(path, method = 'GET', body = null) {
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

function supabaseGet(path) {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await supabaseRequest(path, 'GET');
      try { resolve(JSON.parse(response)); }
      catch (err) { Logger.warn('Failed to parse Supabase response', err); resolve([]); }
    } catch (err) { Logger.error('supabaseGet error', err); reject(err); }
  });
}

async function supabaseBatchRequest(path, method, items) {
  const results = [];
  for (let i = 0; i < items.length; i += CONFIG.PARALLEL_REQUESTS) {
    const batch = items.slice(i, i + CONFIG.PARALLEL_REQUESTS);
    const promises = batch.map(item => supabaseRequest(path, method, item));
    try {
      const batchResults = await Promise.allSettled(promises);
      results.push(...batchResults);
    } catch (err) { Logger.error('Batch request error', err); }
    if (i + CONFIG.PARALLEL_REQUESTS < items.length) await sleep(100);
  }
  return results;
}

// ============================================================================
// SUPABASE SAVE OPERATIONS
// ============================================================================

async function saveToSupabase(items, tyyppi) {
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
    await supabaseBatchRequest('paatokset?on_conflict=ulkoinen_id', 'POST', processedItems);
    Logger.info(`Saved ${processedItems.length} items to Supabase`, { tyyppi });
  } catch (err) { Logger.error('Error saving to Supabase', err); }
}

// ============================================================================
// ANTHROPIC API (Claude)
// ============================================================================

function callClaude(messages, systemPrompt, tools = null) {
  return new Promise((resolve, reject) => {
    try {
      const payload = {
        model: CONFIG.CLAUDE_MODEL,
        max_tokens: CONFIG.CLAUDE_MAX_TOKENS,
        system: systemPrompt,
        messages
      };
      if (tools) payload.tools = tools;

      const body = JSON.stringify(payload);
      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'web-search-2025-03-05',
          'Content-Length': Buffer.byteLength(body)
        },
        timeout: CONFIG.HTTP_TIMEOUT_MS
      };

      const req = https.request(options, async (res) => {
        try {
          const buffer = await collectResponse(res);
          if (res.statusCode >= 400) throw new Error(`Claude API error ${res.statusCode}: ${buffer.toString()}`);
          try { resolve(JSON.parse(buffer.toString())); }
          catch (parseErr) { reject(new Error(`Failed to parse Claude response: ${parseErr.message}`)); }
        } catch (err) { reject(err); }
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Claude request timeout')); });
      req.write(body);
      req.end();
    } catch (err) { reject(err); }
  });
}

// ============================================================================
// NEWS FETCHING
// ============================================================================

async function fetchNews(aihe, query) {
  if (!ANTHROPIC_KEY) { Logger.warn('ANTHROPIC_KEY not set, skipping news fetch'); return; }
  Logger.info('Fetching news', { aihe, query });

  try {
    const tools = [{ type: 'web_search_20250305', name: 'web_search' }];

    const result = await callClaude(
      [{
        role: 'user',
        content: `Search for the latest news about: ${query}. Search multiple times to find news from different sources like news sites, press releases, LinkedIn, and official announcements. After using web_search tool (use it 2-3 times with different queries), you MUST respond with ONLY a raw JSON array with no markdown formatting and no other text. Each item must have: otsikko (string), url (string), kuvaus (string), julkaistu (date string YYYY-MM-DD or empty).`
      }],
      'You are a news search assistant. Search broadly for news from many different sources. After using web_search tool (use it 2-3 times with different queries), you MUST respond with ONLY a raw JSON array with no markdown, code blocks, or other text.',
      tools
    );

    const textBlocks = (result.content || []).filter(b => b.type === 'text');
    const text = textBlocks.map(b => b.text).join('');
    const clean = text.replace(/```json|```/g, '').trim();
    Logger.debug('Claude response', { aihe, preview: clean.slice(0, 300) });

    let news;
    try {
      news = JSON.parse(clean);
    } catch (err) {
      // Etsi ensimmäinen [ ja viimeinen ] ja yritä parsia niiden välinen teksti
      const start = clean.indexOf('[');
      const end   = clean.lastIndexOf(']');
      if (start !== -1 && end !== -1 && end > start) {
        try { news = JSON.parse(clean.slice(start, end + 1)); }
        catch (parseErr) { Logger.error('JSON parse error for news', { aihe, error: parseErr.message }); return; }
      } else {
        Logger.error('No JSON array found in response', { aihe, preview: clean.slice(0, 300) });
        return;
      }
    }

    if (!Array.isArray(news)) { Logger.error('Invalid news format - not an array', { aihe }); return; }

    const saveAihe = aihe === 'arctial2' ? 'arctial' : aihe;
    if (aihe !== 'arctial2') {
      try { await supabaseRequest(`uutiset?aihe=eq.${encodeURIComponent(saveAihe)}`, 'DELETE', {}); }
      catch (err) { Logger.warn('Failed to delete old news', { aihe, error: err.message }); }
    }

    const newsToSave = news
      .filter(item => item.otsikko && item.url)
      .map(item => ({ aihe: saveAihe, otsikko: item.otsikko, url: item.url, kuvaus: item.kuvaus || '', julkaistu: item.julkaistu || '' }));

    await supabaseBatchRequest('uutiset', 'POST', newsToSave);
    Logger.info('Saved news items', { aihe: saveAihe, count: newsToSave.length });
  } catch (err) { Logger.error('fetchNews error', err); }
}

// ============================================================================
// PDF PARSING
// ============================================================================

async function parsePdfWithClaude(pdfUrl, kokousId, kokousPvm) {
  if (!ANTHROPIC_KEY) { Logger.warn('ANTHROPIC_KEY not set, skipping PDF parse'); return; }
  Logger.info('Parsing PDF', { pdfUrl, kokousId });

  try {
    const pdfBuffer = await fetchBuffer(pdfUrl);
    if (pdfBuffer.length < CONFIG.PDF_MIN_SIZE) {
      Logger.warn('PDF too small', { kokousId, size: pdfBuffer.length });
      return;
    }

    const result = await callClaude(
      [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBuffer.toString('base64') } },
          { type: 'text', text: 'Lue tämä Kokkolan kaupungin kokousasiakirja ja poimii kaikki taloudelliset ja henkilöstötiedot. Palauta VAIN JSON-objekti ilman mitään muuta tekstiä tai markdownia. JSON:ssa: tyyppi (string: "budjetti", "palkka", "sopimus", "investointi", tai "ei_relevantti"), summat (array), osastot (array), henkilöt (array), yhteenveto (string).' }
        ]
      }],
      'Olet Kokkolan kaupungin taloushallinnon asiantuntija. Poimit dataa dokumenteista tarkasti JSON-muodossa.'
    );

    const text = (result.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const data = JSON.parse(clean);

    if (data.tyyppi && data.tyyppi !== 'ei_relevantti') {
      await supabaseRequest('talousdata?on_conflict=kokous_id', 'POST',
        { kokous_id: kokousId, kokous_pvm: kokousPvm, raportti_tyyppi: data.tyyppi, data: JSON.stringify(data) });
      Logger.info('Saved financial data', { kokousId, type: data.tyyppi });
    } else {
      Logger.info('PDF not relevant', { kokousId });
    }
  } catch (err) { Logger.error('PDF parse error', { kokousId, error: err.message }); }
}

// ============================================================================
// MEETING PARSING
// ============================================================================

async function getMeetingItemIds(meetingId) {
  try {
    const buffer = await fetchBuffer(`https://kokkola10.oncloudos.com/cgi/DREQUEST.PHP?page=meeting&id=${encodeURIComponent(meetingId)}`);
    const html = buffer.toString('latin1');
    const regex = /page=meetingitem&amp;id=(\d+-\d+)/g;
    const ids = new Set();
    let match;
    while ((match = regex.exec(html)) !== null) ids.add(match[1]);
    return Array.from(ids);
  } catch (err) {
    Logger.error('getMeetingItemIds error', { meetingId, error: err.message });
    return [];
  }
}

// ============================================================================
// KAUPUNGINHALLITUS PDF CHECKING
// ============================================================================

async function checkKaupunginhallitusPdfs() {
  if (!ANTHROPIC_KEY) { Logger.warn('ANTHROPIC_KEY not set, skipping PDF check'); return; }
  Logger.info('Checking kaupunginhallitus PDFs');

  try {
    const buffer = await fetchBuffer(FEEDS['/agendas']);
    const items = parseRSS(buffer);
    const khMeetings = items.filter(item => item.otsikko.toLowerCase().includes('kaupunginhallitus'));
    Logger.info('Found KH meetings', { count: khMeetings.length });

    for (const meeting of khMeetings.slice(0, 2)) {
      try {
        const idMatch = meeting.linkki.match(/id=(\d+)/);
        if (!idMatch) continue;
        const meetingId = idMatch[1];
        const dateMatch = meeting.otsikko.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
        const kokousPvm = dateMatch
          ? `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`
          : null;

        Logger.info('Processing meeting', { meetingId, kokousPvm });
        const itemIds = await getMeetingItemIds(meetingId);

        for (const itemId of itemIds) {
          try {
            const existing = await supabaseGet(`talousdata?kokous_id=eq.${encodeURIComponent(itemId)}&select=id`);
            if (existing.length > 0) { Logger.debug('Item already processed', { itemId }); continue; }
            await parsePdfWithClaude(`https://kokkola10.oncloudos.com/kokous/${encodeURIComponent(itemId)}.PDF`, itemId, kokousPvm);
            await sleep(CONFIG.PDF_REQUEST_DELAY_MS);
          } catch (err) { Logger.error('Error processing item', { itemId, error: err.message }); }
        }
      } catch (err) { Logger.error('Error processing meeting', { error: err.message }); }
    }
  } catch (err) { Logger.error('checkKaupunginhallitusPdfs error', err); }
}

// ============================================================================
// SYNC OPERATIONS
// ============================================================================

async function syncFeeds() {
  Logger.info('Starting feed sync');
  try {
    for (const [path, url] of Object.entries(FEEDS)) {
      if (path === '/agendas') continue;
      try {
        const tyyppi = path === '/decisions' ? 'paatos' : 'kokous';
        const buffer = await fetchBuffer(url);
        const items = parseRSS(buffer);
        await saveToSupabase(items, tyyppi);
        Logger.info('Synced feed', { path, count: items.length });
      } catch (err) { Logger.error('Error syncing feed', { path, error: err.message }); }
    }
    await checkKaupunginhallitusPdfs();
  } catch (err) { Logger.error('syncFeeds error', err); }
}

async function syncNews() {
  Logger.info('Starting news sync');
  try {
    await fetchNews('arctial', 'Arctial alumiinitehdas Kokkola 2026');
    await sleep(2000);
    await fetchNews('arctial2', 'Arctial Kokkola site:yle.fi OR site:keskipohjanmaa.fi OR site:kauppalehti.fi OR site:talouselama.fi');
    await sleep(3000);
    await fetchNews('kokkola', '"Kokkola" uutiset 2026 site:yle.fi OR site:keskipohjanmaa.fi OR site:kokkola.fi OR site:ampparit.com/kokkola');
    Logger.info('News sync completed');
  } catch (err) { Logger.error('syncNews error', err); }
}

// ============================================================================
// TILASTOKESKUS STATS (cached)
// ============================================================================

let statsCache = null;
let statsCacheTime = 0;
const STATS_CACHE_MS = 24 * 60 * 60 * 1000;

async function fetchPxStat(url, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const urlObj  = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Stat timeout')); });
    req.write(payload);
    req.end();
  });
}

async function getStats() {
  const now = Date.now();
  if (statsCache && (now - statsCacheTime) < STATS_CACHE_MS) return statsCache;

  const VAESTO_URL = 'https://pxdata.stat.fi/PxWeb/api/v1/fi/StatFin/vaerak/statfin_vaerak_pxt_11ra.px';
  const TYO_URL    = 'https://pxdata.stat.fi/PxWeb/api/v1/fi/StatFin/tyonv/statfin_tyonv_pxt_12tf.px';
  const makeBody   = (tiedot, vuosi) => ({
    query: [
      { code: 'Alue',   selection: { filter: 'item', values: ['KU272'] } },
      { code: 'Tiedot', selection: { filter: 'item', values: [tiedot]  } },
      { code: 'Vuosi',  selection: { filter: 'item', values: [vuosi]   } }
    ],
    response: { format: 'json' }
  });

  const result = {};

  try {
    const [v24, v23] = await Promise.all([
      fetchPxStat(VAESTO_URL, makeBody('vaesto', '2024')),
      fetchPxStat(VAESTO_URL, makeBody('vaesto', '2023'))
    ]);
    result.vaesto     = parseFloat(v24.data[0]?.values[0]);
    result.vaestoPrev = parseFloat(v23.data[0]?.values[0]);
  } catch (e) { Logger.error('Stats vaesto error', e); }

  try {
    const [n24, n23] = await Promise.all([
      fetchPxStat(VAESTO_URL, makeBody('vaesto_alle15_p', '2024')),
      fetchPxStat(VAESTO_URL, makeBody('vaesto_alle15_p', '2023'))
    ]);
    result.nuoret     = parseFloat(n24.data[0]?.values[0]);
    result.nuoretPrev = parseFloat(n23.data[0]?.values[0]);
  } catch (e) { Logger.error('Stats nuoret error', e); }

  try {
    const metaData = await new Promise((resolve, reject) => {
      https.get(TYO_URL, res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
      }).on('error', reject);
    });
    const kuukaudet   = metaData.variables.find(v => v.code === 'Kuukausi').values;
    const uusinKk     = kuukaudet[kuukaudet.length - 1];
    const edellinenKk = kuukaudet[kuukaudet.length - 13];
    const tyoData = await fetchPxStat(TYO_URL, {
      query: [
        { code: 'Alue',     selection: { filter: 'item', values: ['KU272'] } },
        { code: 'Kuukausi', selection: { filter: 'item', values: [uusinKk, edellinenKk] } },
        { code: 'Tiedot',   selection: { filter: 'item', values: ['TYOTOSUUS'] } }
      ],
      response: { format: 'json' }
    });
    result.tyottomyys     = parseFloat(tyoData.data[0]?.values[0]);
    result.tyottomyysPrev = parseFloat(tyoData.data[1]?.values[0]);
    result.tyottomyysKk   = uusinKk.replace('M', '/');
  } catch (e) { Logger.error('Stats tyottomyys error', e); }

  statsCache     = result;
  statsCacheTime = now;
  Logger.info('Stats cached', result);
  return result;
}

// ============================================================================
// HTTP SERVER
// ============================================================================

function checkCorsOrigin(req) {
  if (ALLOWED_ORIGINS.includes('*')) return true;
  return ALLOWED_ORIGINS.includes(req.headers.origin || '');
}

function sendError(res, statusCode, message) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: message }));
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (checkCorsOrigin(req)) res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.statusCode = 200; res.end(); return; }

  try {
    if (req.url === '/health') {
      res.statusCode = 200;
      res.end(JSON.stringify({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() }));
      return;
    }

    if (req.url === '/sync') {
      res.statusCode = 202;
      res.end(JSON.stringify({ message: 'Feed sync started' }));
      syncFeeds().catch(err => Logger.error('Async syncFeeds error', err));
      return;
    }

    if (req.url === '/parse-pdfs') {
      res.statusCode = 202;
      res.end(JSON.stringify({ message: 'PDF parsing started' }));
      checkKaupunginhallitusPdfs().catch(err => Logger.error('Async PDF parse error', err));
      return;
    }

    if (req.url === '/sync-news') {
      res.statusCode = 202;
      res.end(JSON.stringify({ message: 'News sync started' }));
      syncNews().catch(err => Logger.error('Async news sync error', err));
      return;
    }

    if (req.url === '/stats') {
      try {
        const data = await getStats();
        res.statusCode = 200;
        res.end(JSON.stringify(data));
      } catch (err) {
        Logger.error('Stats fetch error', err);
        sendError(res, 500, 'Failed to fetch stats');
      }
      return;
    }

    if (req.url.match(/^\/news\/(arctial|kokkola)(\?.*)?$/)) {
      const urlObj = new URL(req.url, 'http://localhost');
      const aihe   = urlObj.pathname.split('/')[2];
      const limit  = Math.min(parseInt(urlObj.searchParams.get('limit') || '10', 10) || 10, 100);
      try {
        const data = await supabaseGet(`uutiset?aihe=eq.${encodeURIComponent(aihe)}&order=id.desc&limit=${limit}`);
        res.statusCode = 200;
        res.end(JSON.stringify(data));
      } catch (err) {
        Logger.error('News fetch error', { aihe, error: err.message });
        sendError(res, 500, 'Failed to fetch news');
      }
      return;
    }

    // Feed proxy
    const feedUrl = FEEDS[req.url] || FEEDS['/decisions'];
    https.get(feedUrl, rssRes => {
      res.setHeader('Content-Type', 'application/xml; charset=iso-8859-1');
      rssRes.pipe(res);
    }).on('error', err => {
      Logger.error('Feed proxy error', { url: req.url, error: err.message });
      sendError(res, 500, 'Failed to fetch feed');
    });
  } catch (err) {
    Logger.error('Request handler error', err);
    sendError(res, 500, 'Internal server error');
  }
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function startServer() {
  try {
    validateEnvironment();
    Logger.info('Environment validation passed');

    server.listen(PORT, () => {
      Logger.info('Server started', { port: PORT });
      syncFeeds().catch(err => Logger.error('Initial syncFeeds error', err));
      syncNews().catch(err => Logger.error('Initial syncNews error', err));
      setInterval(syncFeeds, CONFIG.FEED_SYNC_INTERVAL_MS);
      setInterval(syncNews, CONFIG.NEWS_SYNC_INTERVAL_MS);
    });

    server.on('error', (err) => { Logger.error('Server error', err); process.exit(1); });
  } catch (err) { Logger.error('Failed to start server', err); process.exit(1); }
}

process.on('uncaughtException', (err) => { Logger.error('Uncaught exception', err); process.exit(1); });
process.on('unhandledRejection', (reason, promise) => { Logger.error('Unhandled rejection', { reason }); process.exit(1); });

startServer();

module.exports = { server, Logger };
