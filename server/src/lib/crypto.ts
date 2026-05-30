import crypto from "crypto";

const KEY = process.env.ENCRYPTION_KEY!;

if (!KEY || KEY.length < 32) {
  throw new Error("ENCRYPTION_KEY must be at least 32 characters");
}

// AES-256-GCM authenticated encryption.
// Output format: hex(iv):hex(authTag):hex(ciphertext)
export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    Buffer.from(KEY.slice(0, 32)),
    iv
  );
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(hash: string): string {
  const parts = hash.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted token format");
  const [ivHex, tagHex, encHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(encHex, "hex");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    Buffer.from(KEY.slice(0, 32)),
    iv
  );
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
