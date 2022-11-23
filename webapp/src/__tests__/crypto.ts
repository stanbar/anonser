import { ec } from 'elliptic'
import rand from 'randombytes'
import { encrypt, decrypt } from '../crypto/encrypt'

const secp256k1 = new ec('secp256k1');

it("ECDH works for secp256k1", () => {
    const alice = secp256k1.keyFromPrivate(rand(32))
    const bob = secp256k1.keyFromPrivate(rand(32))

    expect(alice.derive(bob.getPublic()).toString(16))
        .toEqual(bob.derive(alice.getPublic()).toString(16))
})


it("Encryption works for key derived from ECDH", async () => {
    const alice = secp256k1.keyFromPrivate(rand(32))
    const bob = secp256k1.keyFromPrivate(rand(32))
    const msg = new Uint8Array([1, 2, 3])
    const encrypted = await encrypt(msg, alice.getPrivate('hex'), bob.getPublic().encode('hex', false))
    const decrypted = await decrypt(encrypted, alice.getPrivate('hex'), bob.getPublic().encode('hex', false))
    expect(decrypted).toEqual(msg)
})