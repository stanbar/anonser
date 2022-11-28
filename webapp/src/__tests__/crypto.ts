import { ec } from 'elliptic'
import rand from 'randombytes'
import { encrypt, decrypt, deriveKey } from '../crypto/encrypt'
import { readFileSync } from 'fs'
import { encrypt as _encrypt, decrypt as _decrypt } from '@futuretense/secret-box'
import BN from 'bn.js'
import crypto from 'crypto'
import CryptoJS, { AES, SHA256, lib, enc } from 'crypto-js';

const secp256k1 = new ec('secp256k1');

it("ECDH works for secp256k1", () => {
    const alice = secp256k1.keyFromPrivate(rand(32))
    const bob = secp256k1.keyFromPrivate(rand(32))

    expect(alice.derive(bob.getPublic()).toString(16))
        .toEqual(bob.derive(alice.getPublic()).toString(16))
})

it("ECDH works for secp256k1 compressed", () => {
    const alice = secp256k1.keyFromPrivate(rand(32))
    const bob = secp256k1.keyFromPrivate(rand(32))

    const alicePub = alice.getPublic(true, 'hex')
    const bobPub = bob.getPublic(true, 'hex')

    expect(alice.derive(secp256k1.keyFromPublic(bobPub, 'hex').getPublic()).toString(16))
        .toEqual(bob.derive(secp256k1.keyFromPublic(alicePub, 'hex').getPublic()).toString(16))
})


it("Encryption works for key derived from ECDH", async () => {
    const alice = secp256k1.keyFromPrivate(rand(32))
    const bob = secp256k1.keyFromPrivate(rand(32))
    const msg = new Uint8Array(Array.from({ length: 100000 }, (v, i) => i % 255))
    const encrypted = await encrypt(msg, alice.getPrivate('hex'), bob.getPublic().encode('hex', true))
    const decrypted = await decrypt(encrypted, alice.getPrivate('hex'), bob.getPublic().encode('hex', true))
    expect(decrypted).toEqual(msg)
})


it("Encryption works for a large payload with internal encryption", async () => {
    const alice = secp256k1.keyFromPrivate(rand(32))
    const bob = secp256k1.keyFromPrivate(rand(32))

    const file = readFileSync('README.md', null)
    
    const msg = file.toString('hex')

    const alicePrivate = alice.getPrivate('hex')
    const alicePublic = alice.getPublic().encode('hex', true)


    const bobPrivate = bob.getPrivate('hex')
    const bobPublic = bob.getPublic().encode('hex', true)

    const sharedKey1 = deriveKey(alicePrivate, bobPublic);
    const sharedKey2 = deriveKey(bobPrivate, alicePublic);

    const message = enc.Hex.parse(msg)
    const options = { iv: enc.Hex.parse("123123"), mode: CryptoJS.mode.CTR, padding: CryptoJS.pad.NoPadding }
    const encrypted = AES.encrypt(message, enc.Hex.parse(sharedKey1.toString('hex')), options);
    const decrypted = AES.decrypt(encrypted, enc.Hex.parse(sharedKey2.toString('hex')), options);


    expect(enc.Hex.stringify(decrypted)).toEqual(msg)
})