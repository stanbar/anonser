/**
 * Content-addressed encrypted payload store.
 *
 * Minimal local implementation compatible with IPFS CID semantics:
 * - Store blobs by their SHA-256 hash (hex-encoded, treated as CID).
 * - Retrieve blobs by CID.
 *
 * In production, swap this adapter for an IPFS/Filecoin client.
 * The interface is intentionally simple to allow drop-in replacement.
 */

import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

export interface PayloadStore {
  /** Store a blob and return its content-addressed identifier (hex SHA-256). */
  put(data: Buffer): Promise<string>;
  /** Retrieve a blob by its CID. Returns null if not found. */
  get(cid: string): Promise<Buffer | null>;
  /** Check whether a CID exists in the store. */
  has(cid: string): Promise<boolean>;
}

/**
 * File-system-backed content-addressed store.
 * Stores blobs in `<baseDir>/<sha256hex>`.
 */
export class LocalPayloadStore implements PayloadStore {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
    fs.mkdirSync(baseDir, { recursive: true });
  }

  async put(data: Buffer): Promise<string> {
    const cid = hashData(data);
    const filePath = path.join(this.baseDir, cid);
    fs.writeFileSync(filePath, data);
    return cid;
  }

  async get(cid: string): Promise<Buffer | null> {
    const filePath = path.join(this.baseDir, cid);
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath);
  }

  async has(cid: string): Promise<boolean> {
    return fs.existsSync(path.join(this.baseDir, cid));
  }
}

/** Compute SHA-256 hex digest of data. */
export function hashData(data: Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

// ─── E2E encryption helpers (ECDH + AES-256-CTR) ───────────────────

/**
 * Generate an ephemeral ECDH key pair (secp256k1-compatible via P-256 for
 * Node.js built-in crypto; in production use secp256k1).
 *
 * NOTE: This PoC uses ECDH with the 'prime256v1' curve (P-256) available in
 * Node's built-in crypto. For real anonymity alignment with Ethereum keys,
 * use secp256k1 via the `elliptic` or `@noble/secp256k1` library.
 */
export function generateKeyPair(): { privateKey: Buffer; publicKey: Buffer } {
  const ecdh = crypto.createECDH("secp256k1");
  ecdh.generateKeys();
  return {
    privateKey: ecdh.getPrivateKey(),
    publicKey: ecdh.getPublicKey(null, "compressed"),
  };
}

/** Derive a shared secret from our private key and the peer's public key. */
export function deriveSharedSecret(privateKey: Buffer, peerPublicKey: Buffer): Buffer {
  const ecdh = crypto.createECDH("secp256k1");
  ecdh.setPrivateKey(privateKey);
  const shared = ecdh.computeSecret(peerPublicKey);
  // Use SHA-256 of the raw shared point as the symmetric key
  return crypto.createHash("sha256").update(shared).digest();
}

/** Encrypt a buffer using AES-256-CTR with a derived shared key. */
export function encrypt(plaintext: Buffer, sharedKey: Buffer): Buffer {
  // IV = first 16 bytes of SHA-256(sharedKey) — deterministic for this PoC.
  // In production, use a random IV and prepend it to ciphertext.
  const iv = crypto.createHash("sha256").update(sharedKey).digest().subarray(0, 16);
  const cipher = crypto.createCipheriv("aes-256-ctr", sharedKey, iv);
  return Buffer.concat([cipher.update(plaintext), cipher.final()]);
}

/** Decrypt a buffer using AES-256-CTR with a derived shared key. */
export function decrypt(ciphertext: Buffer, sharedKey: Buffer): Buffer {
  const iv = crypto.createHash("sha256").update(sharedKey).digest().subarray(0, 16);
  const decipher = crypto.createDecipheriv("aes-256-ctr", sharedKey, iv);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
