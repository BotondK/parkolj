// A webes build (dist/) után legenerálja a dist/sw.js-t: a verzió a fájlok tartalmából, a lista a dist fájljaiból.
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const SKIP = new Set(['sw.js', '404.html', 'metadata.json']);
const walk = async (d) => (await Promise.all((await readdir(d, { withFileTypes: true })).map((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)])))).flat();

const files = (await walk(DIST)).filter((f) => !SKIP.has(relative(DIST, f))).sort();
const hash = createHash('sha256');
for (const f of files) hash.update(relative(DIST, f)).update(await readFile(f));
const version = hash.digest('hex').slice(0, 12);
// Útvonalak a sw.js helyéhez képest (scope: /parkolj/); az index.html az első (offline tartalék)
const list = ['./', ...files.map((f) => `./${relative(DIST, f).split('\\').join('/')}`).filter((p) => p !== './index.html')];
const tpl = await readFile(new URL('./sw.template.js', import.meta.url), 'utf8');
await writeFile(join(DIST, 'sw.js'), tpl.replace("'__VERSION__'", `'${version}'`).replace('= __PRECACHE__', `= ${JSON.stringify(list)}`));
console.log(`sw.js: ${list.length} fájl, verzió ${version}`);
