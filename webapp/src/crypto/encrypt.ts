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

export const encrypt = (msg: Uint8Array| string, privateKey: string, publicKey: string): string => {
    const key = deriveKey(privateKey, publicKey)

    if (msg instanceof Uint8Array) {
        msg = Buffer.from(msg).toString('hex')
    }

    return CryptoJS.AES.encrypt(msg, key.toString("utf-8")).toString()
}

export const encryptU8intArray = (msg: Uint8Array | string, privateKey: string, publicKey: string): Uint8Array => {
    const key = deriveKey(privateKey, publicKey)

    if (msg instanceof Uint8Array) {
        msg = Buffer.from(msg).toString('hex')
    }

    const ciphertext64 = CryptoJS.AES.encrypt(msg, key.toString("utf-8")).toString()
    console.log({ciphertext64})
    const ciphertextWordArray = CryptoJS.enc.Base64.parse(ciphertext64)
    console.log({ ciphertextWordArray })
    return convertWordArrayToUint8Array(ciphertextWordArray)
}

export const decrypt = (msg: Uint8Array | string, privateKey: string, publicKey: string): string => {
    const key = deriveKey(privateKey, publicKey)

    if (msg instanceof Uint8Array) {
        msg = Buffer.from(msg).toString('hex')
    }

    const decrypted = CryptoJS.AES.decrypt(msg, key.toString("utf8"))
    return decrypted.toString(CryptoJS.enc.Utf8)
}


export const decryptU8intArray = (msg: Uint8Array | string, privateKey: string, publicKey: string): Uint8Array => {
    const key = deriveKey(privateKey, publicKey)

    if (msg instanceof Uint8Array) {
        msg = Buffer.from(msg).toString('hex')
    }

    return convertWordArrayToUint8Array(CryptoJS.AES.decrypt(msg, key.toString("utf8")))
}


    export function convertWordArrayToUint8Array(wordArray: CryptoJS.lib.WordArray): Uint8Array {
        var arrayOfWords = wordArray.hasOwnProperty("words") ? wordArray.words : [];
        var length = wordArray.hasOwnProperty("sigBytes") ? wordArray.sigBytes : arrayOfWords.length * 4;
        var uInt8Array = new Uint8Array(length), index = 0, word, i;
        for (i = 0; i < length; i++) {
            word = arrayOfWords[i];
            uInt8Array[index++] = word >> 24;
            uInt8Array[index++] = (word >> 16) & 0xff;
            uInt8Array[index++] = (word >> 8) & 0xff;
            uInt8Array[index++] = word & 0xff;
        }
        return uInt8Array;
    }
