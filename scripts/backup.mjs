// Nightly backup on the server (cron, see README "Backups"), run inside the container:
//
//   docker compose exec -T app node scripts/backup.mjs
//
// storage/backups/YYYY-MM-DD/: app.db (a consistent copy made with VACUUM INTO while the site runs) and uploads/
// (hard links to the photos: no extra space, and a deleted or overwritten photo stays in the backup).
// Keeps the last KEEP days. Copy storage/backups somewhere else as well — this protects against mistakes, not a lost disk.
import fs from 'node:fs';
import path from 'node:path';
import { openDb, ROOT } from './lib.mjs';

const KEEP = Number(process.env.BACKUP_KEEP || 14);
const { url, db } = openDb();
if (!url.startsWith('file:')) throw new Error('backup: only for a local database file');
const data = path.dirname(url.slice('file:'.length));
const root = path.join(data, 'backups');
const dir = path.join(root, new Date().toISOString().slice(0, 10));

fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(path.join(dir, 'uploads'), { recursive: true });
await db.execute({ sql: 'VACUUM INTO ?', args: [path.join(dir, 'app.db')] });

const uploads = fs.realpathSync(path.join(ROOT, 'uploads'));
let photos = 0;
for (const name of fs.readdirSync(uploads)) {
  const from = path.join(uploads, name);
  if (!fs.statSync(from).isFile()) continue;
  try { fs.linkSync(from, path.join(dir, 'uploads', name)) } catch { fs.copyFileSync(from, path.join(dir, 'uploads', name)) }
  photos++;
}

const old = fs.readdirSync(root).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().slice(0, -KEEP);
for (const d of old) fs.rmSync(path.join(root, d), { recursive: true, force: true });
const sites = (await db.execute('SELECT COUNT(*) AS n FROM sites')).rows[0].n;
console.log(`${new Date().toISOString()} backup: ${dir} (${sites} churches, ${photos} photo files)${old.length ? `, removed ${old.join(', ')}` : ''}`);
