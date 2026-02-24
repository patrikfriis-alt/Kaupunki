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
      const text = buffer.toString('latin1')
        .replace(/windows-1252|iso-8859-1|iso-8859-15/gi, 'utf-8');
      res.end(Buffer.from(text, 'latin1'));
    });
  }).on('error', (e) => {
    res.statusCode = 500;
    res.end('Error: ' + e.message);
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log('Proxy running on port ' + PORT));
