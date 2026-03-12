import { describe, expect, test } from "bun:test";
import { signRequest, verifyRequest } from "../../src/crypto/signature";
import { generateKeyPair, exportPublicKey } from "../../src/crypto/keys";

describe("signature", () => {
  test("verifyRequest accepts valid signature from signRequest", () => {
    const { publicKey, privateKey } = generateKeyPair();
    const pubB64 = exportPublicKey(publicKey);
    const method = "POST";
    const url = "http://localhost:3001/books";
    const body = '{"title":"x","author":"y"}';
    const sig = signRequest(method, url, body, privateKey);
    expect(verifyRequest(method, url, body, sig, pubB64)).toBe(true);
  });

  test("verifyRequest rejects wrong method", () => {
    const { publicKey, privateKey } = generateKeyPair();
    const pubB64 = exportPublicKey(publicKey);
    const url = "http://localhost:3001/books";
    const body = "{}";
    const sig = signRequest("POST", url, body, privateKey);
    expect(verifyRequest("GET", url, body, sig, pubB64)).toBe(false);
  });

  test("verifyRequest rejects wrong body", () => {
    const { publicKey, privateKey } = generateKeyPair();
    const pubB64 = exportPublicKey(publicKey);
    const url = "http://localhost:3001/books";
    const sig = signRequest("POST", url, '{"a":1}', privateKey);
    expect(verifyRequest("POST", url, '{"a":2}', sig, pubB64)).toBe(false);
  });

  test("verifyRequest rejects wrong URL path", () => {
    const { publicKey, privateKey } = generateKeyPair();
    const pubB64 = exportPublicKey(publicKey);
    const body = "{}";
    const sig = signRequest("GET", "http://localhost:3001/books", body, privateKey);
    expect(verifyRequest("GET", "http://localhost:3001/books/1", body, sig, pubB64)).toBe(false);
  });

  test("verifyRequest rejects invalid base64 signature", () => {
    const { publicKey } = generateKeyPair();
    const pubB64 = exportPublicKey(publicKey);
    expect(
      verifyRequest("GET", "http://localhost:3001/books", "", "not-valid-base64!!!", pubB64),
    ).toBe(false);
  });

  test("empty body is signed and verified", () => {
    const { publicKey, privateKey } = generateKeyPair();
    const pubB64 = exportPublicKey(publicKey);
    const url = "http://localhost:3001/messages?clientId=abc";
    const sig = signRequest("GET", url, "", privateKey);
    expect(verifyRequest("GET", url, "", sig, pubB64)).toBe(true);
  });
});
