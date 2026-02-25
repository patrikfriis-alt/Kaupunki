const https = require('https');
const http = require('http');

const FEEDS = {
  '/decisions': 'https://kokkola10.oncloudos.com/cgi/DREQUEST.PHP?page=rss/official_decisions&show=30',
  '/meetings':  'https://kokkola10.oncloudos.com/cgi/DREQUEST.PHP?page=rss/meetingitems&show=30',
  '/agendas':   'https://kokkola10.oncloudos.com/cgi/DREQUEST.PHP?page=rss/meetings&show=10'
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || SUPABASE_KEY;

function fetchRSS(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

function parseRSS(buffer) {
  const text = buffer.toString('latin1');
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(text)) !== null) {
    const item = match[1];
    const get = (tag) => {
      const m = item.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`));
      return m ? (m[1] || m[2] || '').trim() : '';
    };
    items.push({
      otsikko:     get('title'),
      kuvaus:      get('description'),
      linkki:      get('link'),
      julkaistu:   get('pubDate'),
      ulkoinen_id: get('guid') || get('link')
    });
  }
  return items;
}

async function saveToSupabase(items, tyyppi) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;

  for (const item of items) {
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
      if (!isNaN(d)) julkaistu = d.toISOString().split('T')[0];
    }

    const body = JSON.stringify({
      ulkoinen_id: item.ulkoinen_id,
      otsikko,
      kuvaus:    item.kuvaus,
      julkaisija,
      linkki:    item.linkki,
      julkaistu,
      tyyppi
    });

    await new Promise((resolve) => {
      const url = new URL(`${SUPABASE_URL}/rest/v1/paatokset`);
      const options = {
        hostname: url.hostname,
        path:     url.pathname + '?on_conflict=ulkoinen_id',
        method:   'POST',
        headers: {
          'Content-Type':   'application/json',
          'apikey':         SUPABASE_SERVICE_KEY,
          'Authorization':  `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Prefer':         'resolution=merge-duplicates',
          'Content-Length': Buffer.byteLength(body)
        }
      };
      const req = https.request(options, (res) => {
        res.on('data', () => {});
        res.on('end', resolve);
      });
      req.on('error', resolve);
      req.write(body);
      req.end();
    });
  }
}

async function syncFeeds() {
  console.log('Syncing feeds to Supabase...');
  for (const [path, url] of Object.entries(FEEDS)) {
    if (path === '/agendas') continue;
    const tyyppi = path === '/decisions' ? 'paatos' : 'kokous';
    const buffer = await fetchRSS(url);
    const items = parseRSS(buffer);
    await saveToSupabase(items, tyyppi);
    console.log(`Synced ${items.length} items from ${path}`);
  }
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.url === '/sync') {
    syncFeeds().then(() => res.end('OK')).catch(e => res.end('Error: ' + e.message));
    return;
  }

  const feedUrl = FEEDS[req.url] || FEEDS['/decisions'];
  https.get(feedUrl, (rssRes) => {
    const contentType = rssRes.headers['content-type'] || 'application/xml';
    res.setHeader('Content-Type', contentType);
    rssRes.pipe(res);
  }).on('error', (e) => {
    res.statusCode = 500;
    res.end('Error: ' + e.message);
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log('Proxy running on port ' + PORT);
  syncFeeds();
  setInterval(syncFeeds, 60 * 60 * 1000);
});
