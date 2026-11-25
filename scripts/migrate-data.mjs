#!/usr/bin/env node
/**
 * Wendet Schema-Migrationen auf eine verschlüsselte calendar.enc an.
 *
 * Aufruf:
 *   DATA_PASSWORD=… npm run data:migrate
 *   DATA_PASSWORD=… node scripts/migrate-data.mjs --file <pfad/zu/calendar.enc> [--out <ziel>]
 *
 * Ablauf:
 *   1. Datei entschlüsseln (PBKDF2/AES-256-GCM, Passwort aus Env)
 *   2. Migrationen aus scripts/migrations/ der Reihe nach anwenden,
 *      solange deren `from` der aktuellen Version entspricht
 *   3. Neu verschlüsseln mit erhöhtem `v`
 *
 * Nach dem Lauf: DATA_CHANGELOG.md aktualisieren (Datenwächter-Pflicht!),
 * siehe MIGRATION.md.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';

const password = process.env.DATA_PASSWORD;
if (!password) {
  console.error('Fehler: DATA_PASSWORD gesetzt nicht.');
  process.exit(1);
}

// Argumente
const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : undefined;
};
const srcPath = getArg('--file') || new URL('../public/data/calendar.enc', import.meta.url).pathname;
const outPath = getArg('--out') || srcPath;

// 1. Lesen + entschlüsseln
const file = JSON.parse(readFileSync(srcPath, 'utf8'));
const salt = Buffer.from(file.kdf.salt, 'base64');
const iv = Buffer.from(file.cipher.iv, 'base64');
const raw = Buffer.from(file.ct, 'base64');
const key = pbkdf2Sync(password, salt, file.kdf.iterations, 32, 'sha256');
const dec = createDecipheriv('aes-256-gcm', key, iv);
dec.setAuthTag(raw.subarray(-16));
let data;
try {
  const plain = Buffer.concat([dec.update(raw.subarray(0, -16)), dec.final()]);
  data = JSON.parse(plain.toString('utf8'));
} catch {
  console.error('FEHLER: Entschlüsselung fehlgeschlagen – Passwort falsch oder Datei beschädigt.');
  process.exit(1);
}
let version = file.v;
console.log(`Gelesen: ${srcPath} (v${version})`);

// 2. Migrationen anwenden
const migDir = new URL('./migrations/', import.meta.url);
const files = readdirSync(migDir).filter((f) => f.endsWith('.mjs')).sort();
let applied = 0;
for (const f of files) {
  const m = await import(new URL(f, migDir));
  if (m.from === version) {
    data = m.migrate(data);
    console.log(`  Migration ${f}: v${m.from} → v${m.to}`);
    version = m.to;
    applied++;
  }
}

if (applied === 0) {
  console.log(`Keine Migration nötig – Daten sind bereits auf v${version}.`);
  process.exit(0);
}

// 3. Neu verschlüsseln
const newSalt = randomBytes(16);
const newIv = randomBytes(12);
const newKey = pbkdf2Sync(password, newSalt, 300_000, 32, 'sha256');
const cipher = createCipheriv('aes-256-gcm', newKey, newIv);
const ct = Buffer.concat([
  cipher.update(JSON.stringify(data)),
  cipher.final(),
  cipher.getAuthTag(),
]);
const out = {
  v: version,
  kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: 300_000, salt: newSalt.toString('base64') },
  cipher: { name: 'AES-GCM', iv: newIv.toString('base64') },
  ct: ct.toString('base64'),
};
writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
console.log(`Geschrieben: ${outPath} (v${version})`);
console.log('');
console.log('Nächste Schritte (siehe MIGRATION.md):');
console.log('  1. DATA_CHANGELOG.md aktualisieren (Pflicht – Datenwächter!)');
console.log('  2. Commit + Push auf den Daten-Branch (data bzw. data-test)');
