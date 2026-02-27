const https = require('https');
const http = require('http');

const FEEDS = {
  '/decisions': 'https://kokkola10.oncloudos.com/cgi/DREQUEST.PHP?page=rss/official_decisions&show=30',
  '/meetings':  'https://kokkola10.oncloudos.com/cgi/DREQUEST.PHP?page=rss/meetingitems&show=100',
  '/agendas':   'https://kokkola10.oncloudos.com/cgi/DREQUEST.PHP?page=rss/meetings&show=100'
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
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
    const get = tag => {
      const m = item.match(new RegExp('<' + tag + '[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/' + tag + '>|<' + tag + '[^>]*>([^<]*)<\\/' + tag + '>'));
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

function supabaseRequest(path, method, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const url = new URL(SUPABASE_URL + '/rest/v1/' + path);
    const options = {
      hostname: url.hostname,
      path:     url.pathname + url.search,
      method,
      headers: {
        'Content-Type':   'application/json',
        'apikey':         SUPABASE_SERVICE_KEY,
        'Authorization':  'Bearer ' + SUPABASE_SERVICE_KEY,
        'Prefer':         'resolution=merge-duplicates',
        'Content-Length': Buffer.byteLength(bodyStr)
      }
    };
    const req = https.request(options, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString()));
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

function supabaseGet(path) {
  return new Promise((resolve) => {
    const url = new URL(SUPABASE_URL + '/rest/v1/' + path);
    const options = {
      hostname: url.hostname,
      path:     url.pathname + url.search,
      method:   'GET',
      headers: {
        'apikey':        SUPABASE_SERVICE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY
      }
    };
    https.get(options, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch { resolve([]); }
      });
    }).on('error', () => resolve([]));
  });
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
    await supabaseRequest(
      'paatokset?on_conflict=ulkoinen_id',
      'POST',
      { ulkoinen_id: item.ulkoinen_id, otsikko, kuvaus: item.kuvaus, julkaisija, linkki: item.linkki, julkaistu, tyyppi }
    );
  }
}

function callClaude(messages, systemPrompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages
    });
    const options = {
      hostname: 'api.anthropic.com',
      path:     '/v1/messages',
      method:   'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length':    Buffer.byteLength(body)
      }
    };
    const req = https.request(options, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString());
          resolve(data.content?.[0]?.text || '');
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function parsePdfWithClaude(pdfUrl, kokousId, kokousPvm) {
  if (!ANTHROPIC_KEY) return;
  console.log('Parsing PDF:', pdfUrl);
  try {
    const pdfBuffer = await fetchBuffer(pdfUrl);
    if (pdfBuffer.length < 1000) {
      console.log('PDF too small, skipping:', kokousId);
      return;
    }
    const pdfBase64 = pdfBuffer.toString('base64');

    const result = await callClaude([
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 }
          },
          {
            type: 'text',
            text: 'Lue tämä Kokkolan kaupungin kokousasiakirja ja poimii kaikki taloudelliset ja henkilöstötiedot. Palauta VAIN JSON-objekti ilman mitään muuta tekstiä tai markdown-merkkejä. Talousraportille: {"tyyppi":"talous","vuosi":2026,"tulos_milj_eur":-5.2,"tulot_milj_eur":120.5,"menot_milj_eur":125.7,"investoinnit_milj_eur":15.0,"lisatiedot":"lyhyt yhteenveto"}. Henkilöstöraportille: {"tyyppi":"henkilosto","vuosi":2026,"kuukausi":1,"henkilovahvuus":2646,"vakinaiset":1807,"maaraikaiset":380,"sijaiset":277,"sairauspoissaolo_pct":7.1,"lisatiedot":"lyhyt yhteenveto"}. Jos dokumentti ei sisällä talous- tai henkilöstötietoja, palauta {"tyyppi":"ei_relevantti"}.'
          }
        ]
      }
    ], 'Olet Kokkolan kaupungin taloushallinnon asiantuntija. Poimit dataa dokumenteista tarkasti JSON-muodossa.');

    const clean = result.replace(/```json|```/g, '').trim();
    const data = JSON.parse(clean);

    if (data.tyyppi && data.tyyppi !== 'ei_relevantti') {
      await supabaseRequest(
        'talousdata?on_conflict=kokous_id',
        'POST',
        { kokous_id: kokousId, kokous_pvm: kokousPvm, raportti_tyyppi: data.tyyppi, data }
      );
      console.log('Saved talousdata:', kokousId, data.tyyppi);
    } else {
      console.log('Not relevant:', kokousId);
    }
  } catch(e) {
    console.error('PDF parse error:', kokousId, e.message);
  }
}

async function getMeetingItemIds(meetingId) {
  const url = 'https://kokkola10.oncloudos.com/cgi/DREQUEST.PHP?page=meeting&id=' + meetingId;
  const buffer = await fetchBuffer(url);
  const html = buffer.toString('latin1');
  const regex = /page=meetingitem&amp;id=(\d+-\d+)/g;
  const ids = new Set();
  let match;
  while ((match = regex.exec(html)) !== null) {
    ids.add(match[1]);
  }
  console.log('Found IDs in meeting', meetingId, ':', [...ids].slice(0, 3), '...');
  return [...ids];
}

async function checkKaupunginhallitusPdfs() {
  if (!ANTHROPIC_KEY) return;
  console.log('Checking kaupunginhallitus PDFs...');
  try {
    const buffer = await fetchBuffer(FEEDS['/agendas']);
    const items = parseRSS(buffer);

    const khMeetings = items.filter(item =>
      item.otsikko.toLowerCase().includes('kaupunginhallitus')
    );
    console.log('KH meetings found:', khMeetings.length);

    for (const meeting of khMeetings.slice(0, 2)) {
      const idMatch = meeting.linkki.match(/id=(\d+)/);
      if (!idMatch) continue;
      const meetingId = idMatch[1];

      const dateMatch = meeting.otsikko.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
      const kokousPvm = dateMatch
        ? dateMatch[3] + '-' + dateMatch[2].padStart(2,'0') + '-' + dateMatch[1].padStart(2,'0')
        : null;

      console.log('Processing meeting:', meetingId, kokousPvm);

      const itemIds = await getMeetingItemIds(meetingId);
      console.log('Total items:', itemIds.length);

      for (const itemId of itemIds) {
        const existing = await supabaseGet('talousdata?kokous_id=eq.' + itemId + '&select=id');
        if (existing.length > 0) {
          continue;
        }
        const pdfUrl = 'https://kokkola10.oncloudos.com/kokous/' + itemId + '.PDF';
        await parsePdfWithClaude(pdfUrl, itemId, kokousPvm);
        await new Promise(r => setTimeout(r, 1500));
      }
    }
  } catch(e) {
    console.error('checkKaupunginhallitusPdfs error:', e.message);
  }
}

async function syncFeeds() {
  console.log('Syncing feeds to Supabase...');
  for (const [path, url] of Object.entries(FEEDS)) {
    if (path === '/agendas') continue;
    const tyyppi = path === '/decisions' ? 'paatos' : 'kokous';
    const buffer = await fetchBuffer(url);
    const items = parseRSS(buffer);
    await saveToSupabase(items, tyyppi);
    console.log('Synced ' + items.length + ' items from ' + path);
  }
  await checkKaupunginhallitusPdfs();
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.url === '/sync') {
    syncFeeds().then(() => res.end('OK')).catch(e => res.end('Error: ' + e.message));
    return;
  }

  if (req.url === '/parse-pdfs') {
    checkKaupunginhallitusPdfs().then(() => res.end('OK')).catch(e => res.end('Error: ' + e.message));
    return;
  }

  const feedUrl = FEEDS[req.url] || FEEDS['/decisions'];
  https.get(feedUrl, rssRes => {
    res.setHeader('Content-Type', 'application/xml; charset=iso-8859-1');
    rssRes.pipe(res);
  }).on('error', e => {
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
