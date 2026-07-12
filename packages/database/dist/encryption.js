import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
export function createAesGcmFieldEncryptor(key, keyVersion) {
    if (key.byteLength !== 32)
        throw new Error("Field encryption key must contain exactly 32 bytes");
    if (!keyVersion)
        throw new Error("Field encryption key version is required");
    return {
        encrypt(plaintext) {
            const nonce = randomBytes(12);
            const cipher = createCipheriv("aes-256-gcm", key, nonce);
            const body = Buffer.concat([
                cipher.update(plaintext, "utf8"),
                cipher.final(),
            ]);
            return {
                ciphertext: `${nonce.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${body.toString("base64url")}`,
                keyVersion,
            };
        },
        decrypt(value) {
            if (value.keyVersion !== keyVersion)
                throw new Error("Unsupported field encryption key version");
            const parts = value.ciphertext.split(".");
            if (parts.length !== 3)
                throw new Error("Malformed encrypted field");
            const [noncePart, tagPart, bodyPart] = parts;
            if (!noncePart || !tagPart || !bodyPart)
                throw new Error("Malformed encrypted field");
            const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(noncePart, "base64url"));
            decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
            return Buffer.concat([
                decipher.update(Buffer.from(bodyPart, "base64url")),
                decipher.final(),
            ]).toString("utf8");
        },
    };
}
