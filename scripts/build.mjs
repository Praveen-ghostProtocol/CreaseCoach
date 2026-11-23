import { copyFile, cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { bundledDemoClips, demoClipPath } from '../src/demo-clips.js';

const source = await readdir('src',{withFileTypes:true});
await mkdir('dist',{recursive:true});
await copyFile('index.html','dist/index.html');
await cp('public','dist',{recursive:true});
await mkdir('dist/src',{recursive:true});
const assets = ['./','./index.html','./manifest.webmanifest','./crease-field.svg','./icons/mark.svg','./icons/icon-192.png','./icons/icon-512.png','./icons/maskable-512.png'];
assets.push(...bundledDemoClips.map(demoClipPath));
for (const file of source.filter(file => file.isFile() && /\.(js|css)$/.test(file.name))) {
  const path = join('src',file.name);
  await copyFile(path,join('dist',path));
  assets.push(`./src/${file.name}`);
}
const hash = createHash('sha256');
for (const asset of assets.slice(1)) hash.update(await readFile(join('dist',asset)));
const worker = await readFile('scripts/sw-template.js','utf8');
const version = hash.update(worker).digest('hex').slice(0,12);
await writeFile('dist/sw.js',worker.replace('__VERSION__',version).replace('"__ASSETS__"',JSON.stringify(assets)));
console.log(`Built dist/ with ${assets.length} precached URLs (${version}).`);
