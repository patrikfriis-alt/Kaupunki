const https = require('https');
const http = require('http');

const RSS_URL = 'https://kokkola10.oncloudos.com/cgi/DREQUEST.PHP?page=rss/official_decisions&show=30';

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');

  https.get(RSS_URL, (rssRes) => {
    const chunks = [];
    rssRes.on('data', chunk => chunks.push(chunk));
    rssRes.on('end', () => {
      const buffer = Buffer.concat(chunks);

      // Detect encoding from XML declaration
      const sniff = buffer.slice(0, 200).toString('ascii');
      const match = sniff.match(/encoding=["']([^"']+)["']/i);
      const encoding = (match ? match[1] : 'utf-8').toLowerCase();

      let text;
      if (encoding === 'windows-1252' || encoding === 'iso-8859-1' || encoding === 'iso-8859-15') {
        // Decode as latin1 (Node's name for windows-1252 subset)
        text = buffer.toString('binary');
        // Fix scandinavian chars manually
        const map = {
          '\xe4': 'ä', '\xc4': 'Ä',
          '\xf6': 'ö', '\xd6': 'Ö',
          '\xe5': 'å', '\xc5': 'Å'
        };
        text = text.replace(/[\xe4\xc4\xf6\xd6\xe5\xc5]/g, c => map[c] || c);
        text = text.replace(/encoding="[^"]+"/i, 'encoding="utf-8"');
        res.end(Buffer.from(text, 'utf-8'));
      } else {
        text = buffer.toString('utf-8');
        res.end(text);
