import { describe, expect, test } from "bun:test";
import {
  generateKeyPair,
  exportPublicKey,
  loadPublicKey,
  symKey,
} from "../../src/crypto/keys";

describe("keys", () => {
  test("generateKeyPair returns publicKey and privateKey PEM strings", () => {
    const { publicKey, privateKey } = generateKeyPair();
    expect(publicKey).toBeString();
    expect(privateKey).toBeString();
    expect(publicKey).toContain("-----BEGIN PUBLIC KEY-----");
    expect(privateKey).toContain("-----BEGIN PRIVATE KEY-----");
  });

  test("exportPublicKey converts PEM to base64url DER", () => {
    const { publicKey } = generateKeyPair();
    const b64 = exportPublicKey(publicKey);
    expect(b64).toBeString();
    expect(b64).not.toContain("\n");
    expect(/^[A-Za-z0-9_-]+$/.test(b64)).toBe(true);
  });

  test("loadPublicKey accepts base64url from exportPublicKey", () => {
    const { publicKey } = generateKeyPair();
    const b64 = exportPublicKey(publicKey);
    const keyObj = loadPublicKey(b64);
    expect(keyObj).toBeDefined();
    expect(keyObj.type).toBe("public");
  });

  test("symKey returns 32 bytes from public key DER", () => {
    const { publicKey } = generateKeyPair();
    const b64 = exportPublicKey(publicKey);
    const key = symKey(b64);
    expect(key).toBeInstanceOf(Uint8Array);
    expect(key.length).toBe(32);
  });

  test("symKey is deterministic for same public key", () => {
    const { publicKey } = generateKeyPair();
    const b64 = exportPublicKey(publicKey);
    expect(symKey(b64)).toEqual(symKey(b64));
  });
});
