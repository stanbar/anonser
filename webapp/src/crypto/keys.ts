import { ec } from 'elliptic'
import { encrypt as _encrypt, decrypt as _decrypt } from '@futuretense/secret-box'
import rand from 'randombytes'

const secp256k1 = new ec('secp256k1');

export const genKeypair = (): ec.KeyPair => {
    return secp256k1.keyFromPrivate(rand(32))
}