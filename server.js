const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const server = http.createServer((req, res) => {
  // Normalize URL for Turkish characters first
  let normalizedUrl = req.url;
  if (req.url.includes('%C3%B6') || req.url.includes('%C3%BC')) {
    normalizedUrl = req.url.replace(/%C3%B6/g, 'ö').replace(/%C3%BC/g, 'ü').replace(/%C4%9F/g, 'ğ').replace(/%C4%B1/g, 'ı').replace(/%C5%9F/g, 'ş').replace(/%C3%A7/g, 'ç');
  }
  
  let filePath = path.join(__dirname, normalizedUrl);
  
  // Security: Prevent path traversal attacks
  const realPath = path.resolve(filePath);
  const basePath = path.resolve(__dirname);
  if (!realPath.startsWith(basePath)) {
    res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>403 - Erişim Yasak</h1>', 'utf-8');
    return;
  }
  
  if (req.url === '/' || req.url === '') {
    filePath = path.join(__dirname, 'index.html');
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
  };

  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if(error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>404 - Dosya Bulunamadı</h1><p>Aranan dosya: ' + decodeURIComponent(req.url) + '</p>', 'utf-8');
      }
      else {
        res.writeHead(500);
        res.end('Sunucu Hatası: '+error.code+' ..\n');
      }
    }
    else {
      res.writeHead(200, { 'Content-Type': contentType + '; charset=utf-8' });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n✅ Sunucu http://localhost:${PORT} adresinde çalışıyor\n`);
  console.log(`📱 Tarayıcıda açmak için: http://localhost:${PORT}`);
  console.log(`\n💡 Sunucuyu durdurmak için: Ctrl + C\n`);
});
