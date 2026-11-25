import { DATA_BRANCH, DATA_PATH, GITHUB_REPO, SITE_SUFFIX } from '../utils/site';
import type { EncFile } from './crypto';

const TOKEN_KEY = 'pyc-gh-token' + SITE_SUFFIX;
const API = `https://api.github.com/repos/${GITHUB_REPO}/contents/${DATA_PATH}`;

/** Fehler mit HTTP-Status (z. B. 409/422 = sha-Konflikt). */
export class SyncError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'SyncError';
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignorieren */
  }
}

async function ghFetch(url: string, init?: RequestInit): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    throw new SyncError(res.status, `GitHub API: HTTP ${res.status}`);
  }
  return res;
}

export interface RemoteEnc {
  file: EncFile;
  /** Blob-SHA – Vorbedingung für Push (Optimistic Concurrency). */
  sha: string;
}

interface ContentsResponse {
  content: string;
  sha: string;
}

/** Liest die verschlüsselte Datei vom Daten-Branch (mit Token, falls vorhanden). */
export async function pullEnc(): Promise<RemoteEnc> {
  const res = await ghFetch(`${API}?ref=${DATA_BRANCH}`);
  const data = (await res.json()) as ContentsResponse;
  const b64 = data.content.replace(/\n/g, '');
  const file = JSON.parse(atob(b64)) as EncFile;
  return { file, sha: data.sha };
}

/**
 * Schreibt die verschlüsselte Datei zurück (optimistisch via sha).
 * Bei sha-Konflikt wirft SyncError mit Status 409/422.
 */
export async function pushEnc(file: EncFile, sha: string, message: string): Promise<string> {
  const content = btoa(JSON.stringify(file, null, 2) + '\n');
  const res = await ghFetch(API, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, content, sha, branch: DATA_BRANCH }),
  });
  const data = (await res.json()) as { content: { sha: string } };
  return data.content.sha;
}
