import type { CalendarData } from '../types';

/** Verschlüsselte Datendatei (siehe scripts/encrypt-data.mjs). */
export const ENC_URL = `${import.meta.env.BASE_URL}data/calendar.enc`;

export interface EncFile {
  v: number;
  kdf: { name?: string; hash?: string; iterations: number; salt: string };
  cipher: { name?: string; iv: string };
  ct: string;
}

const encoder = new TextEncoder();

export function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function bytesToB64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export async function fetchEncFile(): Promise<EncFile> {
  const res = await fetch(ENC_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as EncFile;
}

/** PBKDF2-Schlüssel aus dem Passwort ableiten (extractable → für localStorage). */
export async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
}

export async function exportKeyB64(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key);
  return bytesToB64(new Uint8Array(raw));
}

export async function importStoredKey(b64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', b64ToBytes(b64), 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ]);
}

/** AES-256-GCM entschlüsseln; wirft bei falschem Passwort/Schlüssel (GCM-Tag). */
export async function decryptEnc(file: EncFile, key: CryptoKey): Promise<CalendarData> {
  const iv = b64ToBytes(file.cipher.iv);
  const ct = b64ToBytes(file.ct);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  const data: unknown = JSON.parse(new TextDecoder().decode(plain));
  if (
    !data ||
    typeof data !== 'object' ||
    !Array.isArray((data as CalendarData).types) ||
    !Array.isArray((data as CalendarData).entries)
  ) {
    throw new Error('Ungültige Datenstruktur');
  }
  return data as CalendarData;
}

/**
 * Verschlüsselt Daten für den Push – mit den **originalen** KDF-Parametern
 * und der Schema-Version der zuletzt geladenen Datei, damit andere Geräte
 * weiterhin mit dem Passwort entschlüsseln können.
 */
export async function encryptData(
  data: CalendarData,
  key: CryptoKey,
  meta: { kdf: EncFile['kdf']; v: number },
): Promise<EncFile> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(JSON.stringify(data)),
  );
  return {
    v: meta.v,
    kdf: meta.kdf,
    cipher: { name: 'AES-GCM', iv: bytesToB64(iv) },
    ct: bytesToB64(new Uint8Array(ct)),
  };
}
