// Új VAPID kulcspár a Web Push küldőhöz (P-256). Kimenet: két sor, „PUBLIC=…” és „PRIVATE=…” (b64url).
// A telepítő munkafolyamat (supabase-telepites.yml) használja, csak ha még nincs kulcs; a titkos rész csak a Supabase titkai közé kerül.
const kp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
const b64u = (b) => Buffer.from(b).toString('base64url');
const pub = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
console.log(`PUBLIC=${b64u(pub)}`);
console.log(`PRIVATE=${jwk.d}`);
