import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';

const built = process.argv.includes('--dist');
const portIndex = process.argv.indexOf('--port');
const port = portIndex < 0 ? (built ? 4173 : 5173) : Number(process.argv[portIndex+1]);
const root = resolve(built ? 'dist' : '.');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
  '.svg':'image/svg+xml','.png':'image/png','.mp4':'video/mp4','.webmanifest':'application/manifest+json','.json':'application/json'};

const server = createServer(async (request,response) => {
  try {
    const requested = decodeURIComponent(new URL(request.url,'http://localhost').pathname);
    const relative = requested === '/' ? 'index.html' : requested.slice(1);
    if (!built && relative === 'sw.js') {response.writeHead(204); response.end(); return;}
    if (!/^(index\.html|sw\.js|manifest\.webmanifest|(?:src|icons)\/[\w./-]+|demo\/[\w-]+\.mp4|crease-field\.svg)$/.test(relative) ||
        relative.split('/').some(part => part === '..' || part.startsWith('.'))) throw new Error('Not found');
    const file = resolve(root,relative);
    if (!file.startsWith(`${root}${sep}`)) throw new Error('Not found');
    let data;
    try { data = await readFile(file); }
    catch (error) {
      if (built || error.code !== 'ENOENT') throw error;
      data = await readFile(resolve(root,'public',relative));
    }
    response.writeHead(200,{'Content-Type':types[extname(file)] || 'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch {
    response.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});
    response.end('Not found');
  }
});
server.listen(port,'127.0.0.1',() => console.log(`CreaseCoach ${built ? 'production preview' : 'development'} at http://localhost:${server.address().port}`));
