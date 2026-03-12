import { generateKeyPairSync, createPublicKey, type KeyObject } from "node:crypto";

export function generateKeyPair() {
  return generateKeyPairSync("ed25519", {
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
}

/** Encode public key as base64url DER — no newlines, HTTP-safe */
export function exportPublicKey(pemPublicKey: string): string {
  const der = createPublicKey(pemPublicKey).export({ type: "spki", format: "der" }) as Buffer;
  return der.toString("base64url");
}

/** Load public KeyObject from base64url DER */
export function loadPublicKey(b64Key: string): KeyObject {
  return createPublicKey({ key: Buffer.from(b64Key, "base64url"), format: "der", type: "spki" });
}

/** Derive 32-byte symmetric key from base64url DER public key */
export function symKey(b64PublicKey: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64PublicKey, "base64url")).slice(-32);
}
