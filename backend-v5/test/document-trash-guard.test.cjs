// Cestino lotto 1: a trashed document must be invisible to every read. Static guard, no DB.
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const src = path.join(__dirname, '..', 'src');
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith('.ts') ? [path.join(dir, e.name)] : []);
const files = walk(src).map(file => ({ name: path.relative(src, file).split(path.sep).join('/'), lines: fs.readFileSync(file, 'utf8').split(/\r?\n/) }));
// The trash module itself reads trashed rows on purpose.
const TRASH = new Set(['documents/trash.ts', 'documents/trash.service.ts']);

test('Every visibility check on a document also excludes the trash', () => {
  const missing = [];
  for (const { name, lines } of files) lines.forEach((line, i) => {
    if (name === 'documents/access.ts' || TRASH.has(name)) return;
    if (/visibility(::text)?\s*(===?|=|<>)\s*'home'|visibility\s*:\s*'home'/.test(line) && !/trashedAt|activeDocument/.test(line)) missing.push(name + ':' + (i + 1));
  });
  assert.deepEqual(missing, []);
});

test('Every Prisma document read is trash-aware within six lines', () => {
  const missing = [];
  for (const { name, lines } of files) lines.forEach((line, i) => {
    if (TRASH.has(name) || !/\.document\.(findMany|findFirst|findUnique|count|findFirstOrThrow|findUniqueOrThrow)\(/.test(line)) return;
    if (!/trashedAt|canReadDocument|readableWhere|activeDocument|trash-checked/.test(lines.slice(i, i + 6).join('\n'))) missing.push(name + ':' + (i + 1));
  });
  assert.deepEqual(missing, []);
});

test('canReadDocument rejects trashed documents for uploader and members', () => {
  const access = fs.readFileSync(path.join(src, 'documents', 'access.ts'), 'utf8');
  assert.match(access, /canReadDocument\(doc: Pick<Document, 'uploaderId' \| 'visibility' \| 'trashedAt'>, accountId: string\) \{ return !doc\.trashedAt && /);
});
