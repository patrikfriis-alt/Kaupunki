const https = require('https');
const http = require('http');

const FEEDS = {
  '/decisions': 'https://kokkola10.oncloudos.com/cgi/DREQUEST.PHP?page=rss/official_decisions&show=30',
  '/meetings':  'https://kokkola10.oncloudos.com/cgi/DREQUEST.PHP?page=rss/meetingitems&show=30'
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const url = FEEDS[req.url] || FEEDS['/decisions'];

  https.get(url, (rssRes) => {
    const contentType = rssRes.headers['content-type'] || 'application/xml';
    res.setHeader('Content-Type', contentType);
    rssRes.pipe(res);
  }).on('error', (e) => {
    res.statusCode = 500;
    res.end('Error: ' + e.message);
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log('Proxy running on port ' + PORT));
```

