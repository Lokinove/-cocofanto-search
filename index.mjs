import createBareServer from '@tomphttp/bare-server-node';
import express from 'express';
import http from 'http';

const port = Number(process.env.PORT) || 8080;

const bare = createBareServer('/bare/');
const app = express();

// Serve the existing frontend from /main.
app.use(express.static('main'));

// Keep a simple fallback for unknown non-Bare routes.
app.use((req, res) => {
  if (!res.headersSent) {
    res.status(404).send('Not found');
  }
});

const server = http.createServer((req, res) => {
  // Exactly one handler owns each HTTP request.
  if (bare.shouldRoute(req)) {
    return bare.routeRequest(req, res);
  }

  return app(req, res);
});

server.on('upgrade', (req, socket, head) => {
  if (bare.shouldRoute(req, socket, head)) {
    return bare.routeUpgrade(req, socket, head);
  }

  socket.end();
});

server.on('clientError', (err, socket) => {
  console.error('Client error:', err.message);
  if (!socket.destroyed) socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Listening on port ${port}`);
});
