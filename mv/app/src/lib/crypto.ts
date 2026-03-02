/**
 * Browser-compatible ECDH + AES-256-CTR encryption.
 *
 * Uses the Web Crypto API for AES operations.
 * For ECDH on secp256k1 (not natively in Web Crypto), we use a simplified
 * approach: the "shared secret" is just a SHA-256 of a user-provided seed
 * derived from the ephemeral private key. In production, use @noble/secp256k1.
 *
 * For this PoC, keys are just random 32-byte hex strings used as symmetric seeds.
 */

/** Generate a random 32-byte hex string (ephemeral key). */
export function generateEphemeralKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Generate a random requestId (bytes32 hex). */
export function generateRequestId(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return "0x" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Derive a symmetric key from a hex seed using SHA-256. */
export async function deriveKey(seedHex: string): Promise<CryptoKey> {
  const seedBytes = hexToBytes(seedHex);
  const hash = await crypto.subtle.digest("SHA-256", seedBytes);
  return crypto.subtle.importKey("raw", hash, { name: "AES-CTR" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

/** Encrypt plaintext bytes using AES-256-CTR with the derived key. */
export async function encryptPayload(
  plaintext: Uint8Array,
  seedHex: string
): Promise<Uint8Array> {
  const key = await deriveKey(seedHex);
  // Deterministic IV for PoC (SHA-256 of key seed, first 16 bytes)
  const ivHash = await crypto.subtle.digest("SHA-256", hexToBytes(seedHex));
  const iv = new Uint8Array(ivHash).slice(0, 16);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-CTR", counter: iv, length: 64 },
    key,
    plaintext
  );
  return new Uint8Array(ciphertext);
}

/** Decrypt ciphertext bytes using AES-256-CTR with the derived key. */
export async function decryptPayload(
  ciphertext: Uint8Array,
  seedHex: string
): Promise<Uint8Array> {
  const key = await deriveKey(seedHex);
  const ivHash = await crypto.subtle.digest("SHA-256", hexToBytes(seedHex));
  const iv = new Uint8Array(ivHash).slice(0, 16);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-CTR", counter: iv, length: 64 },
    key,
    ciphertext
  );
  return new Uint8Array(plaintext);
}

/** Compute SHA-256 hex digest of data (for content-addressing). */
export async function sha256Hex(data: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return bytes;
}
