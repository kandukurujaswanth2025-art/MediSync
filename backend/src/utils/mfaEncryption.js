
const crypto = require("crypto");

function getEncryptionKey() {
    const encodedKey = process.env.MFA_ENCRYPTION_KEY;

    if (!encodedKey) {
        throw new Error("MFA_ENCRYPTION_KEY is not configured");
    }

    const key = Buffer.from(encodedKey, "base64");

    if (key.length !== 32) {
        throw new Error(
            "MFA_ENCRYPTION_KEY must decode to exactly 32 bytes"
        );
    }

    return key;
}

function encryptSecret(secret) {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv(
        "aes-256-gcm",
        key,
        iv
    );

    const encrypted = Buffer.concat([
        cipher.update(secret, "utf8"),
        cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    return [
        iv.toString("base64"),
        authTag.toString("base64"),
        encrypted.toString("base64")
    ].join(":");
}

function decryptSecret(encryptedSecret) {
    const key = getEncryptionKey();
    const parts = encryptedSecret.split(":");

    if (parts.length !== 3) {
        throw new Error("Invalid encrypted MFA secret format");
    }

    const [ivBase64, authTagBase64, encryptedBase64] = parts;

    const iv = Buffer.from(ivBase64, "base64");
    const authTag = Buffer.from(authTagBase64, "base64");
    const encrypted = Buffer.from(encryptedBase64, "base64");

    if (iv.length !== 12 || authTag.length !== 16) {
        throw new Error("Invalid encrypted MFA secret data");
    }

    const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        key,
        iv
    );

    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
    ]);

    return decrypted.toString("utf8");
}

module.exports = {
    encryptSecret,
    decryptSecret
};
