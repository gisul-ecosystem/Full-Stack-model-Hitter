export const AUTH_EMAIL = process.env.AUTH_EMAIL || "info@aaptor.com";
export const AUTH_PASSWORD = process.env.AUTH_PASSWORD || "Aaptor@123";
export const AUTH_COOKIE = "aaptor_ops_session";

const AUTH_SECRET =
  process.env.AUTH_SECRET || "aaptor-vm-to-model-ops-session-v1";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function toBase64Url(bytes: ArrayBuffer | Uint8Array) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < arr.length; i += 1) binary += String.fromCharCode(arr[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sign(payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(AUTH_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );
  return toBase64Url(sig);
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export async function createSessionValue(email: string, now = Date.now()) {
  const exp = String(now + SESSION_TTL_MS);
  const body = `${email}|${exp}`;
  const signature = await sign(body);
  return `${body}|${signature}`;
}

export async function verifySessionValue(value: string | undefined | null) {
  if (!value) return false;
  const parts = value.split("|");
  if (parts.length !== 3) return false;
  const [email, exp, signature] = parts;
  if (!email || !exp || !signature) return false;
  if (email !== AUTH_EMAIL.toLowerCase()) return false;
  const expMs = Number(exp);
  if (!Number.isFinite(expMs) || Date.now() > expMs) return false;

  const expected = await sign(`${email}|${exp}`);
  return safeEqual(signature, expected);
}

export function credentialsMatch(email: string, password: string) {
  return (
    email.trim().toLowerCase() === AUTH_EMAIL.toLowerCase() &&
    password === AUTH_PASSWORD
  );
}
