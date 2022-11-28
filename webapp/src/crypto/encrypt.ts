import { ec } from 'elliptic'
import { encrypt as _encrypt, decrypt as _decrypt } from '@futuretense/secret-box'
import CryptoJS from 'crypto-js';

const secp256k1 = new ec('secp256k1');

const normaliseHex = (hex: string): string => {
    if (hex.startsWith('0x')) {
        return hex.slice(2)
    } 
    return hex
}

export const deriveKey = (privateKey: string, publicKey: string): Buffer => {
    privateKey = normaliseHex(privateKey)
    publicKey = normaliseHex(publicKey)

    if(Buffer.from(privateKey, 'hex').length !== 32) {
        const message = `Invalid private key, it should be 32 bytes long, but found ${Buffer.from(privateKey, 'hex').length} ${privateKey}`
        console.error(message)
        throw new Error(message)
    }
    if(Buffer.from(publicKey, 'hex').length !== 33) {
        const message = `Invalid public key, it should be 33 bytes long, but found ${Buffer.from(publicKey, 'hex').length} ${publicKey}`
        console.error(message)
        throw new Error(message)
    }

    const receiver = secp256k1.keyFromPublic(publicKey, 'hex')
    const derived = secp256k1.keyFromPrivate(privateKey).derive(receiver.getPublic())
    const key = Buffer.from(derived.toString('hex', 32), 'hex')
    if(key.length !== 32){
        throw new Error("Derived key is not 32 bytes long")
    }
    return key
}

export const encrypt = async (msg: Uint8Array| string, iv: Uint8Array, privateKey: string, publicKey: string): Promise<string> => {
    const key = deriveKey(privateKey, publicKey)

    if (msg instanceof Uint8Array) {
        msg = Buffer.from(msg.slice(0,16)).toString('hex')
    }

    return CryptoJS.AES.encrypt(msg, key.toString("utf-8")).toString()
}

export const decrypt = async (msg: Uint8Array | string, iv: Uint8Array, privateKey: string, publicKey: string): Promise<string> => {
    const key = deriveKey(privateKey, publicKey)

    if (msg instanceof Uint8Array) {
        msg = Buffer.from(msg.slice(0,16)).toString('hex')
    }

    const decrypted = CryptoJS.AES.decrypt(msg, key.toString("utf8"))
    return decrypted.toString(CryptoJS.enc.Utf8)
}