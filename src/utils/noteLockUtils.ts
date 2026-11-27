import { NoteLock } from '../types/todo';

const PBKDF2_ITERATIONS = 100000;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.length % 2 === 0 ? hex : `0${hex}`;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Derive a salted PBKDF2-SHA256 hash using Web Crypto (never stores plaintext passwords) */
export async function derivePasswordHash(
  password: string,
  existingSaltHex?: string
): Promise<{ salt: string; passwordHash: string }> {
  const saltBytes = existingSaltHex
    ? hexToBytes(existingSaltHex)
    : crypto.getRandomValues(new Uint8Array(16));

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  return {
    salt: bytesToHex(saltBytes),
    passwordHash: bytesToHex(new Uint8Array(derivedBits)),
  };
}

export async function verifyNotePassword(password: string, lock: NoteLock): Promise<boolean> {
  if (!password || !lock.salt || !lock.passwordHash) return false;
  try {
    const { passwordHash } = await derivePasswordHash(password, lock.salt);
    return constantTimeEqual(passwordHash, lock.passwordHash);
  } catch {
    return false;
  }
}

export interface BiometricSupportInfo {
  available: boolean;
  mode: 'electron-touchid' | 'webauthn' | 'none';
}

export async function detectTouchIdSupport(): Promise<BiometricSupportInfo> {
  if (typeof window === 'undefined') {
    return { available: false, mode: 'none' };
  }

  // Native macOS Touch ID inside Electron desktop app
  if (window.yulistDesktop?.isElectron && window.yulistDesktop.canUseTouchId) {
    try {
      const supported = await window.yulistDesktop.canUseTouchId();
      if (supported) {
        return { available: true, mode: 'electron-touchid' };
      }
    } catch {
      // Fall through to WebAuthn check
    }
  }

  // Browser WebAuthn platform authenticator (Touch ID on macOS Safari / Chrome)
  if (
    window.isSecureContext &&
    typeof window.PublicKeyCredential !== 'undefined' &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
  ) {
    try {
      const supported =
        await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (supported) {
        return { available: true, mode: 'webauthn' };
      }
    } catch {
      return { available: false, mode: 'none' };
    }
  }

  return { available: false, mode: 'none' };
}

/** Register a local MacBook Touch ID WebAuthn credential when running in browser mode */
export async function registerWebAuthnTouchId(noteId: string, noteTitle: string): Promise<string | null> {
  if (!window.isSecureContext || !navigator.credentials?.create) {
    return null;
  }

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = new TextEncoder().encode(`yulist-${noteId}`).slice(0, 64);

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'yulist',
          id: window.location.hostname || 'localhost',
        },
        user: {
          id: userId,
          name: noteTitle.trim() || 'Заметка yulist',
          displayName: noteTitle.trim() || 'Заметка yulist',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    if (!credential) return null;
    return bytesToBase64Url(new Uint8Array(credential.rawId));
  } catch {
    return null;
  }
}

/** Prompt Touch ID via Electron native macOS API or WebAuthn platform authenticator */
export async function authenticateWithTouchId(
  reason: string,
  webAuthnCredentialId?: string | null
): Promise<{ ok: boolean; error?: string }> {
  // 1. Native macOS Touch ID in Electron desktop app
  if (window.yulistDesktop?.isElectron && window.yulistDesktop.promptTouchId) {
    try {
      const res = await window.yulistDesktop.promptTouchId(reason);
      if (res.ok) return { ok: true };
      return { ok: false, error: res.error || 'Отпечаток не подтверждён' };
    } catch {
      return { ok: false, error: 'Не удалось вызвать Touch ID' };
    }
  }

  // 2. Browser WebAuthn Touch ID on MacBook
  if (!window.isSecureContext || !navigator.credentials?.get) {
    return {
      ok: false,
      error: 'Touch ID доступен в приложении yulist для macOS или в поддерживаемом браузере по HTTPS.',
    };
  }

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const publicKey: PublicKeyCredentialRequestOptions = {
      challenge,
      rpId: window.location.hostname || 'localhost',
      userVerification: 'required',
      timeout: 60000,
    };

    if (webAuthnCredentialId) {
      publicKey.allowCredentials = [
        {
          id: base64UrlToBytes(webAuthnCredentialId).buffer as ArrayBuffer,
          type: 'public-key',
          transports: ['internal'],
        },
      ];
    }

    const assertion = await navigator.credentials.get({ publicKey });
    if (assertion) {
      return { ok: true };
    }
    return { ok: false, error: 'Проверка Touch ID отменена' };
  } catch {
    return { ok: false, error: 'Проверка Touch ID не пройдена или отменена' };
  }
}
