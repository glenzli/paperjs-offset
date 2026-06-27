const fs = require('fs');
const http = require('http');
const path = require('path');

const root = __dirname;
const hostname = '127.0.0.1';
const displayHostname = 'localhost';
const port = 4173;
const paperBundlePath = path.join(root, '..', 'node_modules', 'paper', 'dist', 'paper-full.min.js');
const paperBundleUrl = '/vendor/paper-full.min.js';

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
};

function resolveRequestPath(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split('?')[0]);
  const relativePath = cleanPath === '/' ? '/index.html' : cleanPath;

  if (relativePath === paperBundleUrl) {
    return paperBundlePath;
  }

  const filePath = path.normalize(path.join(root, relativePath));

  if (!filePath.startsWith(root + path.sep)) {
    return null;
  }

  return filePath;
}

const server = http.createServer((request, response) => {
  const filePath = resolveRequestPath(request.url || '/');

  if (!filePath) {
    response.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500, {
        'content-type': 'text/plain; charset=utf-8',
      });
      response.end(error.code === 'ENOENT' ? 'Not found' : 'Server error');
      return;
    }

    response.writeHead(200, {
      'content-type': mimeTypes[path.extname(filePath)] || 'application/octet-stream',
    });
    response.end(content);
  });
});

server.listen(port, hostname, () => {
  console.log(`Serving demo at http://${displayHostname}:${port}/`);
});
