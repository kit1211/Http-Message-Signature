import { createHash, createPrivateKey, sign, verify } from "node:crypto";
import { loadPublicKey } from "./keys";

// Simplified HTTP Message Signature — inspired by RFC 9421

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function signingInput(method: string, path: string, host: string, bodyHash: string): string {
  return `(request-target): ${method.toLowerCase()} ${path}\nhost: ${host}\nbody-hash: ${bodyHash}`;
}

export function signRequest(method: string, url: string, body: string, privateKeyPem: string): string {
  const u = new URL(url);
  const input = signingInput(method, u.pathname, u.host, sha256(body));
  return sign(null, Buffer.from(input), createPrivateKey(privateKeyPem)).toString("base64url");
}

export function verifyRequest(
  method: string,
  url: string,
  body: string,
  sig: string,
  publicKeyB64: string, // base64url-encoded DER
): boolean {
  try {
    const u = new URL(url);
    const input = signingInput(method, u.pathname, u.host, sha256(body));
    return verify(null, Buffer.from(input), loadPublicKey(publicKeyB64), Buffer.from(sig, "base64url"));
  } catch {
    return false;
  }
}
