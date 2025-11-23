const crypto = require("crypto");

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

if (!process.env.CRYPTO_SECRET_KEY) {
  throw new Error(
    "CRYPTO_SECRET_KEY is missing. Generate one with: openssl rand -hex 32"
  );
}

if (process.env.CRYPTO_SECRET_KEY.length !== 64) {
  throw new Error(
    "CRYPTO_SECRET_KEY must be 32 bytes (64 hex chars). Example: openssl rand -hex 32"
  );
}

const KEY = Buffer.from(process.env.CRYPTO_SECRET_KEY, "hex");

/**
 * Encrypt a UTF-8 string using AES-256-GCM.
 * Output format: "v1:<base64(iv + authTag + ciphertext)>".
 *
 * @param {string} plaintext
 * @returns {string} cipher text bundle
 */
function encrypt(plaintext) {
  if (typeof plaintext !== "string" || plaintext.length === 0) {
    throw new Error("encrypt() expects a non-empty string.");
  }

  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGO, KEY, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    
    const bundle = Buffer.concat([iv, authTag, encrypted]).toString("base64");
    return `v1:${bundle}`;
  } catch (err) {
    console.error("crypto.encrypt.error:", err.message);
    throw new Error("Encryption failed.");
  }
}

/**
 * Decrypt a cipher bundle produced by encrypt().
 * Accepts: "v1:<base64(iv + authTag + ciphertext)>".
 *
 * @param {string} cipherBundle
 * @returns {string} decrypted plaintext (UTF-8)
 */
function decrypt(cipherBundle) {
  if (typeof cipherBundle !== "string" || cipherBundle.length === 0) {
    throw new Error("decrypt() expects a non-empty string.");
  }

  try {
    
    if (!cipherBundle.startsWith("v1:")) {
      throw new Error("Unsupported cipher format/version.");
    }

    const encoded = cipherBundle.slice(3);
    const data = Buffer.from(encoded, "base64");

    if (data.length <= IV_LENGTH + TAG_LENGTH) {
      throw new Error("Cipher bundle is too short or malformed.");
    }

    const iv = data.subarray(0, IV_LENGTH);
    const authTag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = data.subarray(IV_LENGTH + TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch (err) {
    console.error("crypto.decrypt.error:", err.message);
    throw new Error("Decryption failed. Cipher may be corrupted or key is invalid.");
  }
}

module.exports = {
  encrypt,
  decrypt,
};