export const DEVELOPER_USERNAME = "bunheng";
export const DEVELOPER_ID = "developer:bunheng";
export const DEVELOPER_EMAIL = "developer@mcb.internal";
export const DEVELOPER_NAME = "Bunheng";

const PBKDF2_ITERATIONS = 100_000;
const PASSWORD_SALT_B64URL = "WA8CwbNri1knwupeX0pgxg";
const PASSWORD_HASH_B64URL = "8XgbXqTAoWYbT8R6YMdP_Yfeudt8ymfqcnyED4dnM64";

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

export async function verifyDeveloperPassword(password: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derived = new Uint8Array(await crypto.subtle.deriveBits({
    name: "PBKDF2",
    hash: "SHA-256",
    salt: fromBase64Url(PASSWORD_SALT_B64URL),
    iterations: PBKDF2_ITERATIONS,
  }, key, 256));
  return constantTimeEqual(derived, fromBase64Url(PASSWORD_HASH_B64URL));
}

export async function hashSessionToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
