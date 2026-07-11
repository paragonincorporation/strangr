export interface EncryptedValue {
    ciphertext: string;
    keyVersion: string;
}
export interface FieldEncryptor {
    encrypt(plaintext: string): EncryptedValue;
    decrypt(value: EncryptedValue): string;
}
export declare function createAesGcmFieldEncryptor(key: Uint8Array, keyVersion: string): FieldEncryptor;
