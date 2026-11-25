#!/usr/bin/env node
/**
 * Verschlüsselt public/data/calendar.json → public/data/calendar.enc
 *
 * Aufruf:  DATA_PASSWORD=geheim npm run data:encrypt
 *
 * Format (kompatibel zu WebCrypto im Browser):
 *   PBKDF2 (SHA-256, iterationen aus Datei) → AES-256-GCM
 *   { v, kdf:{iterations, salt(b64)}, cipher:{iv(b64)}, ct(b64) }
 *   ct enthält den GCM-AuthTag am Ende (16 Bytes).
 *
 * Das Passwort wird NIE in eine Datei geschrieben.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createCipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';

const password = process.env.DATA_PASSWORD;
if (!password) {
  console.error('Fehler: DATA_PASSWORD gesetzt nicht (z. B. DATA_PASSWORD=… npm run data:encrypt)');
  process.exit(1);
}

const ITERATIONS = 300_000;
const src = new URL('../public/data/calendar.json', import.meta.url);
const dst = new URL('../public/data/calendar.enc', import.meta.url);

// Klartext lesen und auf die aktuelle Schema-Version migrieren
// (frisches JSON gilt als v1-Basis, danach laufen alle Migrationen)
let data = JSON.parse(readFileSync(src, 'utf8'));
let version = 1;
const migDir = new URL('./migrations/', import.meta.url);
for (const f of readdirSync(migDir).filter((n) => n.endsWith('.mjs')).sort()) {
  const m = await import(new URL(f, migDir));
  if (m.from === version) {
    data = m.migrate(data);
    version = m.to;
    console.log(`Migration ${f}: v${m.from} → v${m.to}`);
  }
}
const plain = Buffer.from(JSON.stringify(data), 'utf8');
const salt = randomBytes(16);
const iv = randomBytes(12);
const key = pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');
const cipher = createCipheriv('aes-256-gcm', key, iv);
const ct = Buffer.concat([cipher.update(plain), cipher.final(), cipher.getAuthTag()]);

const out = {
  v: version,
  kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: ITERATIONS, salt: salt.toString('base64') },
  cipher: { name: 'AES-GCM', iv: iv.toString('base64') },
  ct: ct.toString('base64'),
};

writeFileSync(dst, JSON.stringify(out, null, 2) + '\n');
console.log(
  `geschrieben: ${dst.pathname} (v${version}, ${plain.length} Bytes Klartext → ${ct.length} Bytes Chiffretext)`,
);
