import { describe, expect, test } from "bun:test";
import { cipher } from "../../src/crypto/cipher";

describe("cipher", () => {
  test("encrypt and decrypt round-trip", () => {
    const key = new Uint8Array(32).fill(1);
    const nonce = new Uint8Array(16).fill(2);
    const plain = new TextEncoder().encode("Hello, world!");
    const encrypted = cipher(plain, key, nonce);
    const decrypted = cipher(encrypted, key, nonce);
    expect(new TextDecoder().decode(decrypted)).toBe("Hello, world!");
  });

  test("cipher is symmetric (XOR)", () => {
    const key = new Uint8Array(32);
    const nonce = new Uint8Array(16);
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const once = cipher(data, key, nonce);
    const twice = cipher(once, key, nonce);
    expect(twice).toEqual(data);
  });

  test("different nonce produces different ciphertext", () => {
    const key = new Uint8Array(32).fill(7);
    const nonce1 = new Uint8Array(16).fill(1);
    const nonce2 = new Uint8Array(16).fill(2);
    const plain = new Uint8Array([10, 20, 30]);
    expect(cipher(plain, key, nonce1)).not.toEqual(cipher(plain, key, nonce2));
  });

  test("different key produces different ciphertext", () => {
    const key1 = new Uint8Array(32).fill(1);
    const key2 = new Uint8Array(32).fill(2);
    const nonce = new Uint8Array(16);
    const plain = new Uint8Array([1, 2, 3]);
    expect(cipher(plain, key1, nonce)).not.toEqual(cipher(plain, key2, nonce));
  });

  test("empty input returns empty output", () => {
    const key = new Uint8Array(32);
    const nonce = new Uint8Array(16);
    expect(cipher(new Uint8Array(0), key, nonce)).toEqual(new Uint8Array(0));
  });
});
