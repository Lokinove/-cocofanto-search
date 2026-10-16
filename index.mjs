import createBareServer from '@tomphttp/bare-server-node';
import express from 'express';
import http from 'http';

const port = Number(process.env.PORT) || 8080;
const bare = createBareServer('/bare/');
const app = express();
app.disable('x-powered-by');

// Serve the app itself directly at / so Cocofanto no longer sits inside an extra iframe.
app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile('main.html', { root: 'main' });
});

// Cache versioned/static UI assets, but always revalidate HTML and the service worker.
app.use((req, res, next) => {
  if (req.path === '/sw.js' || req.path.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-cache');
  } else if (req.path.startsWith('/uv/') || req.path.startsWith('/img/')) {
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }
  next();
});

app.use(express.static('main', {
  index: false,
  etag: true,
  lastModified: true
}));

app.use((req, res) => {
  if (!res.headersSent) res.status(404).send('Not found');
});

const server = http.createServer((req, res) => {
  if (bare.shouldRoute(req)) return bare.routeRequest(req, res);
  return app(req, res);
});

server.on('upgrade', (req, socket, head) => {
  if (bare.shouldRoute(req, socket, head)) return bare.routeUpgrade(req, socket, head);
  socket.end();
});

server.on('clientError', (err, socket) => {
  console.error('Client error:', err.message);
  if (!socket.destroyed) socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

// Keep connections warm between related browser requests.
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

server.listen(port, '0.0.0.0', () => {
  console.log(`Listening on port ${port}`);
});
