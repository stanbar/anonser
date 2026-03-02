import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  LocalPayloadStore,
  hashData,
  generateKeyPair,
  deriveSharedSecret,
  encrypt,
  decrypt,
} from "../lib/payload-store";

describe("PayloadStore", function () {
  let store: LocalPayloadStore;
  let tmpDir: string;

  beforeEach(function () {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "anonser-test-"));
    store = new LocalPayloadStore(tmpDir);
  });

  afterEach(function () {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("stores and retrieves data by content hash", async function () {
    const data = Buffer.from("hello, anonser!");
    const cid = await store.put(data);

    expect(cid).to.equal(hashData(data));
    expect(await store.has(cid)).to.be.true;

    const retrieved = await store.get(cid);
    expect(retrieved).to.not.be.null;
    expect(retrieved!.toString()).to.equal("hello, anonser!");
  });

  it("returns null for unknown CID", async function () {
    expect(await store.get("0000000000000000000000000000000000000000000000000000000000000000")).to.be.null;
  });
});

describe("E2E Encryption (ECDH + AES-256-CTR)", function () {
  it("client encrypts payload, provider decrypts it", function () {
    const client = generateKeyPair();
    const provider = generateKeyPair();

    // Client encrypts for provider
    const sharedClient = deriveSharedSecret(client.privateKey, provider.publicKey);
    const plaintext = Buffer.from("This is my DNA sample metadata.");
    const ciphertext = encrypt(plaintext, sharedClient);

    // Provider decrypts
    const sharedProvider = deriveSharedSecret(provider.privateKey, client.publicKey);
    const decrypted = decrypt(ciphertext, sharedProvider);

    expect(decrypted.toString()).to.equal(plaintext.toString());
  });

  it("provider encrypts result, client decrypts it", function () {
    const client = generateKeyPair();
    const provider = generateKeyPair();

    // Provider encrypts result
    const sharedProvider = deriveSharedSecret(provider.privateKey, client.publicKey);
    const result = Buffer.from("Paternity test result: 99.99% match");
    const ciphertext = encrypt(result, sharedProvider);

    // Client decrypts
    const sharedClient = deriveSharedSecret(client.privateKey, provider.publicKey);
    const decrypted = decrypt(ciphertext, sharedClient);

    expect(decrypted.toString()).to.equal(result.toString());
  });

  it("wrong key cannot decrypt", function () {
    const client = generateKeyPair();
    const provider = generateKeyPair();
    const attacker = generateKeyPair();

    const shared = deriveSharedSecret(client.privateKey, provider.publicKey);
    const ciphertext = encrypt(Buffer.from("secret data"), shared);

    // Attacker tries with wrong shared secret
    const wrongShared = deriveSharedSecret(attacker.privateKey, provider.publicKey);
    const decrypted = decrypt(ciphertext, wrongShared);

    expect(decrypted.toString()).to.not.equal("secret data");
  });

  it("full round-trip with payload store", async function () {
    const tmpDir = fs.mkdtempSync(path.join(require("os").tmpdir(), "anonser-e2e-"));
    const store = new LocalPayloadStore(tmpDir);

    const client = generateKeyPair();
    const provider = generateKeyPair();

    // 1. Client encrypts payload and stores it
    const payload = Buffer.from("encrypted service request data");
    const sharedClient = deriveSharedSecret(client.privateKey, provider.publicKey);
    const encPayload = encrypt(payload, sharedClient);
    const payloadCid = await store.put(encPayload);

    // 2. Provider retrieves and decrypts payload
    const retrieved = await store.get(payloadCid);
    const sharedProvider = deriveSharedSecret(provider.privateKey, client.publicKey);
    const decPayload = decrypt(retrieved!, sharedProvider);
    expect(decPayload.toString()).to.equal(payload.toString());

    // 3. Provider encrypts result and stores it
    const result = Buffer.from("service result: all clear");
    const encResult = encrypt(result, sharedProvider);
    const resultCid = await store.put(encResult);

    // 4. Client retrieves and decrypts result
    const retrievedResult = await store.get(resultCid);
    const decResult = decrypt(retrievedResult!, sharedClient);
    expect(decResult.toString()).to.equal(result.toString());

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
