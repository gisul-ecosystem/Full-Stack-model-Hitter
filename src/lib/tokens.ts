import { randomInt } from "crypto";

/** Unambiguous chars (no 0/O, 1/I/l) — easier to type from a short URL. */
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function createSubmitToken(length = 6) {
  let token = "";
  for (let i = 0; i < length; i += 1) {
    token += ALPHABET[randomInt(ALPHABET.length)];
  }
  return token;
}

/** Normalize user-typed tokens (case / spaces). */
export function normalizeSubmitToken(token: string) {
  return String(token || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}
