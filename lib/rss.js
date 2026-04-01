const https = require('https');
const http = require('http');

// RSS PARSING
// ============================================================================

function parseRSS(buffer) {
  let text = buffer.toString('utf8');
  if (!text.startsWith('<?xml')) {
    text = '<?xml version="1.0" encoding="UTF-8"?>' + text;
  }
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
      console.warn('[WARN] Error parsing RSS item', err);
    }
  }
  return items;
}

async function fetchRSSNews(url, label, fetchBuffer, PORT) {
  const proxyUrl = `http://localhost:${PORT}/rss?url=${encodeURIComponent(url)}`;
  try {
    const buffer = await fetchBuffer(proxyUrl);
    const items = parseRSS(buffer);
    return items.map(item => ({ ...item, url: item.linkki, source: label }));
  } catch (err) {
    console.warn(`[WARN] Failed to fetch RSS from ${label}`, err);
    return [];
  }
}

module.exports = { parseRSS, fetchRSSNews };