import { ec } from 'elliptic'
import { encrypt as _encrypt, decrypt as _decrypt } from '@futuretense/secret-box'

const secp256k1 = new ec('secp256k1');

const normaliseHex = (hex: string): string => {
    if (hex.startsWith('0x')) {
        return hex.slice(2)
    } 
    return hex
}

const deriveKey = (privateKey: string, publicKey: string): Buffer => {
    privateKey = normaliseHex(privateKey)
    publicKey = normaliseHex(publicKey)

    if(Buffer.from(privateKey, 'hex').length !== 20) {
        console.error('Invalid private key, it should be 20 bytes long', Buffer.from(privateKey, 'hex').length)
    }
    if(Buffer.from(publicKey, 'hex').length !== 33) {
        console.error('Invalid public key, it should be 33 bytes long', Buffer.from(publicKey, 'hex').length)
    }

    const receiver = secp256k1.keyFromPublic(publicKey, 'hex')
    const derived = secp256k1.keyFromPrivate(privateKey).derive(receiver.getPublic())
    return Buffer.from(derived.toString('hex'), 'hex')
}

export const encrypt = async (msg: Uint8Array, privateKey: string, publicKey: string): Promise<Uint8Array> => {
    const key = deriveKey(privateKey, publicKey)
    return _encrypt(msg, key, null)
}

export const decrypt = async (msg: Uint8Array, privateKey: string, publicKey: string): Promise<Uint8Array> => {
    const key = deriveKey(privateKey, publicKey)
    return _decrypt(msg, key, null)
}