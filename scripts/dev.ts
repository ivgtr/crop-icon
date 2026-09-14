import type { AddressInfo } from 'node:net';
import { createServer } from 'node:http';
import handler from '../api/index.js';

// The same handler serves HTML and SVG locally and on Vercel. No asset/file server.
const server = createServer(async (request, response) => {
  try { await handler(request, response); }
  catch (error) {
    console.error(error);
    if (!response.headersSent) response.writeHead(500);
    response.end();
  }
});
server.listen(Number(process.env.PORT || 3000), '127.0.0.1', () => {
  console.log(`crop-icon: http://localhost:${(server.address() as AddressInfo).port}`);
});
