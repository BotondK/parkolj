// Web Push küldés külső csomag nélkül, csak WebCrypto-val (Deno / Supabase Edge Function és Node is futtatja).
// Titkosítás: RFC 8291 (aes128gcm, RFC 8188), aláírás: VAPID (RFC 8292, ES256 JWT).
// Teszt: tests/webpush.test.ts (az RFC 8291 példájával).

const enc = new TextEncoder();

export function b64u(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function unb64u(s: string): Uint8Array {
  const t = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(t + '='.repeat((4 - (t.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};

async function hmac(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', key as BufferSource, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data as BufferSource));
}

/** P-256 kulcs JWK-ként a nyers (65 bájtos) nyilvános és a 32 bájtos titkos részből */
function jwk(pub: Uint8Array, priv?: Uint8Array): JsonWebKey {
  return { kty: 'EC', crv: 'P-256', x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)), ...(priv ? { d: b64u(priv) } : {}), ext: true };
}

export type KeyPair = { publicKey: string; privateKey: string };

/** Új P-256 kulcspár (VAPID vagy teszt), b64url nyers formában */
export async function generateKeys(): Promise<KeyPair> {
  const kp = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair;
  const pub = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
  const j = await crypto.subtle.exportKey('jwk', kp.privateKey);
  return { publicKey: b64u(pub), privateKey: j.d! };
}

/**
 * A push tartalmának titkosítása a feliratkozás kulcsaival (p256dh, auth).
 * A `salt` és a küldő kulcspár csak a teszthez adható meg; élesben mindig véletlen.
 */
export async function encryptPayload(payload: string, p256dh: string, auth: string, fixed?: { salt: string; keys: KeyPair }): Promise<Uint8Array> {
  const uaPub = unb64u(p256dh);
  const authSecret = unb64u(auth);
  const salt = fixed ? unb64u(fixed.salt) : crypto.getRandomValues(new Uint8Array(16));
  const keys = fixed?.keys ?? (await generateKeys());
  const asPub = unb64u(keys.publicKey);
  const asPriv = await crypto.subtle.importKey('jwk', jwk(asPub, unb64u(keys.privateKey)), { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  const uaKey = await crypto.subtle.importKey('raw', uaPub as BufferSource, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, asPriv, 256));

  const prkKey = await hmac(authSecret, ecdh);
  const ikm = await hmac(prkKey, concat(enc.encode('WebPush: info\0'), uaPub, asPub, new Uint8Array([1])));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, enc.encode('Content-Encoding: aes128gcm\0\x01'))).slice(0, 16);
  const nonce = (await hmac(prk, enc.encode('Content-Encoding: nonce\0\x01'))).slice(0, 12);

  const key = await crypto.subtle.importKey('raw', cek as BufferSource, 'AES-GCM', false, ['encrypt']);
  const plain = concat(enc.encode(payload), new Uint8Array([2]));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce as BufferSource }, key, plain as BufferSource));
  const rs = 4096;
  const header = concat(salt, new Uint8Array([(rs >>> 24) & 255, (rs >>> 16) & 255, (rs >>> 8) & 255, rs & 255, asPub.length]), asPub);
  return concat(header, cipher);
}

/** VAPID fejléc: ES256-tal aláírt JWT a push szolgáltatás címére (12 óráig érvényes) */
export async function vapidAuth(endpoint: string, subject: string, vapid: KeyPair, now = Date.now()): Promise<string> {
  const aud = new URL(endpoint).origin;
  const head = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = b64u(enc.encode(JSON.stringify({ aud, exp: Math.floor(now / 1000) + 12 * 3600, sub: subject })));
  const pub = unb64u(vapid.publicKey);
  const key = await crypto.subtle.importKey('jwk', jwk(pub, unb64u(vapid.privateKey)), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(`${head}.${body}`)));
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${vapid.publicKey}`;
}

export type PushSub = { endpoint: string; p256dh: string; auth: string };

/** Egy értesítés elküldése. Visszaadja a push szolgáltatás válaszkódját (201 = elment, 404/410 = a feliratkozás megszűnt). */
export async function sendPush(sub: PushSub, payload: string, vapid: KeyPair, subject: string, ttlSec = 600): Promise<number> {
  const body = await encryptPayload(payload, sub.p256dh, sub.auth);
  const r = await fetch(sub.endpoint, {
    method: 'POST',
    headers: { Authorization: await vapidAuth(sub.endpoint, subject, vapid), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: String(ttlSec), Urgency: 'high' },
    body: body as BodyInit,
  });
  return r.status;
}
