import createBareServer from '@tomphttp/bare-server-node';
import express from 'express';
import http from 'http';
import dns from 'dns';
import fs from 'fs';
import path from 'path';

// Prefer IPv4 first on hosts where an unusable IPv6 route can add connection delay.
dns.setDefaultResultOrder('ipv4first');

const port = Number(process.env.PORT) || 8080;
const bare = createBareServer('/bare/');
const app = express();
const mainRoot = path.resolve('main');
app.disable('x-powered-by');

const compressedTypes = new Map([
  ['/main.html', 'text/html; charset=utf-8'],
  ['/uv/uv.bundle.js', 'application/javascript; charset=utf-8'],
  ['/uv/uv.config.js', 'application/javascript; charset=utf-8'],
  ['/uv/uv.sw.js', 'application/javascript; charset=utf-8'],
  ['/uv/uv.handler.js', 'application/javascript; charset=utf-8'],
  ['/uv/uv.index.js', 'application/javascript; charset=utf-8']
]);

function sendPrecompressed(req, res, relativePath, contentType, cacheControl) {
  const accept = String(req.headers['accept-encoding'] || '');
  const source = path.join(mainRoot, relativePath);
  let file = source;
  let encoding = '';

  if (/\bbr\b/.test(accept) && fs.existsSync(source + '.br')) {
    file = source + '.br';
    encoding = 'br';
  } else if (/\bgzip\b/.test(accept) && fs.existsSync(source + '.gz')) {
    file = source + '.gz';
    encoding = 'gzip';
  }

  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', cacheControl);
  res.setHeader('Vary', 'Accept-Encoding');
  if (encoding) res.setHeader('Content-Encoding', encoding);
  return res.sendFile(file);
}

// Serve the app itself directly at / so Cocofanto does not sit inside an extra iframe.
app.get('/', (req, res) => sendPrecompressed(req, res, 'main.html', 'text/html; charset=utf-8', 'no-cache'));
app.get('/main.html', (req, res) => sendPrecompressed(req, res, 'main.html', 'text/html; charset=utf-8', 'no-cache'));

// The UV runtime is the largest part of the first-load payload. Serve precompressed copies when the browser supports them.
for (const [urlPath, type] of compressedTypes) {
  if (urlPath === '/main.html') continue;
  app.get(urlPath, (req, res) => sendPrecompressed(req, res, urlPath.slice(1), type, 'public, max-age=604800, immutable'));
}

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

app.use(express.static('main', {index:false,etag:true,lastModified:true}));
app.use((req,res)=>{if(!res.headersSent)res.status(404).send('Not found')});

const server=http.createServer((req,res)=>{
  if(bare.shouldRoute(req))return bare.routeRequest(req,res);
  return app(req,res);
});

server.on('upgrade',(req,socket,head)=>{
  if(bare.shouldRoute(req,socket,head))return bare.routeUpgrade(req,socket,head);
  socket.end();
});
server.on('clientError',(err,socket)=>{
  console.error('Client error:',err.message);
  if(!socket.destroyed)socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

// Keep browser-to-app connections reusable during resource-heavy page loads.
server.keepAliveTimeout=75000;
server.headersTimeout=80000;
server.requestTimeout=0;
server.maxRequestsPerSocket=0;
if('keepAliveTimeoutBuffer' in server)server.keepAliveTimeoutBuffer=5000;

server.listen(port,'0.0.0.0',()=>console.log(`Listening on port ${port}`));
