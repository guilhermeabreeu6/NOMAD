// @ts-check
// Empacota dist-static/ em release/nomad-site-static-<versao>.zip (sem dependencias externas).
// O conteudo fica na RAIZ do zip (inclusive .htaccess), pronto para extrair em public_html/.
//   node scripts/package-static.mjs [--dir=dist-static]
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateRawSync } from 'node:zlib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dirArg = process.argv.find((a) => a.startsWith('--dir='))?.slice(6) ?? 'dist-static';
const srcDir = path.resolve(root, dirArg);
if (!existsSync(path.join(srcDir, 'index.html'))) {
  throw new Error(`${dirArg}/index.html nao existe. Rode "npm run build:static" primeiro.`);
}
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));

/** @param {string} dir @returns {Promise<string[]>} */
async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

/** @param {Date} d */
function dos(d) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((Math.max(d.getFullYear(), 1980) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

const files = (await walk(srcDir)).sort();
/** @type {Buffer[]} */ const parts = [];
/** @type {Buffer[]} */ const central = [];
let offset = 0;
for (const file of files) {
  const name = Buffer.from(path.relative(srcDir, file).split(path.sep).join('/'));
  const data = await readFile(file);
  const comp = deflateRawSync(data, { level: 9 });
  const { time, date } = dos((await stat(file)).mtime);
  const crc = crc32(data);
  const h = Buffer.alloc(30);
  h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(8, 8);
  h.writeUInt16LE(time, 10); h.writeUInt16LE(date, 12); h.writeUInt32LE(crc, 14);
  h.writeUInt32LE(comp.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(name.length, 26);
  parts.push(h, name, comp);
  const c = Buffer.alloc(46);
  c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8);
  c.writeUInt16LE(8, 10); c.writeUInt16LE(time, 12); c.writeUInt16LE(date, 14); c.writeUInt32LE(crc, 16);
  c.writeUInt32LE(comp.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(name.length, 28);
  c.writeUInt32LE(offset, 42);
  central.push(c, name);
  offset += 30 + name.length + comp.length;
}
const cd = Buffer.concat(central);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);

const outDir = path.join(root, 'release');
await mkdir(outDir, { recursive: true });
const outFile = path.join(outDir, `nomad-site-static-${pkg.version}.zip`);
await writeFile(outFile, Buffer.concat([...parts, cd, end]));
console.log(`[package] ${path.relative(root, outFile)} (${files.length} arquivos)`);
