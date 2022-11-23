import { ec } from 'elliptic'
import { encrypt as _encrypt, decrypt as _decrypt } from '@futuretense/secret-box'

const secp256k1 = new ec('secp256k1');

type Hex = string

export const deriveKey = (privateKey: string, publicKey: string): Buffer => {
    const receiver = secp256k1.keyFromPublic(publicKey, 'hex')
    return secp256k1.keyFromPrivate(privateKey).derive(receiver.getPublic()).toBuffer()
}

export const encrypt = async (msg: Uint8Array, privateKey: string, publicKey: string): Promise<Uint8Array> => {
    const key = deriveKey(privateKey, publicKey)
    return _encrypt(msg, key, null)
}

export const decrypt = async (msg: Uint8Array, privateKey: string, publicKey: string): Promise<Uint8Array> => {
    const key = deriveKey(privateKey, publicKey)
    return _decrypt(msg, key, null)
}