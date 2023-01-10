import { ec } from 'elliptic'
import rand from 'randombytes'
import { encrypt, decrypt } from '../crypto/encrypt'
import { readFileSync } from 'fs'
import { encrypt as _encrypt, decrypt as _decrypt } from '@futuretense/secret-box'

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
    const msg = new Uint8Array(Array.from({ length: 1000 }, (v, i) => i % 255))

    const alicePrivate = alice.getPrivate('hex')
    const alicePublic = alice.getPublic().encode('hex', true)

    const bobPrivate = bob.getPrivate('hex')
    const bobPublic = bob.getPublic().encode('hex', true)

    const encrypted = encrypt(msg, alicePrivate, bobPublic)
    const decrypted = decrypt(encrypted, bobPrivate, alicePublic)

    expect(decrypted).toEqual(msg)
})

it("Encryption works for a README.md file with internal encryption", async () => {
    const alice = secp256k1.keyFromPrivate(rand(32))
    const bob = secp256k1.keyFromPrivate(rand(32))

    const file = readFileSync('README.md', null)

    const alicePrivate = alice.getPrivate('hex')
    const alicePublic = alice.getPublic().encode('hex', true)

    const bobPrivate = bob.getPrivate('hex')
    const bobPublic = bob.getPublic().encode('hex', true)

    const encrypted = encrypt(file, alicePrivate, bobPublic)
    const decrypted = decrypt(encrypted, bobPrivate, alicePublic)

    expect(Buffer.from(decrypted)).toEqual(file)
})