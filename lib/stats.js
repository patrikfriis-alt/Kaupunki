const https = require('https');

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

async function getStats(Logger) {
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

module.exports = { getStats };