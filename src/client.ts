import { randomBytes } from "node:crypto";
import { generateKeyPair, symKey, exportPublicKey } from "./crypto/keys";
import { signRequest } from "./crypto/signature";
import { cipher } from "./crypto/cipher";
import type { Book, BookCreate, BookUpdate, Message, OkResult, RegisterBody } from "./types";

const BASE = "http://localhost:3001";

// Signed fetch helper
async function sfetch(
  method: string,
  path: string,
  privateKeyPem: string,
  clientId: string,
  body?: BookCreate | BookUpdate | Uint8Array,
  nonce?: Buffer,
): Promise<Response> {
  let rawBody = "";
  const headers: Record<string, string> = { "x-client-id": clientId };

  if (body instanceof Uint8Array) {
    rawBody = Buffer.from(body).toString("base64url");
    headers["x-nonce"] = nonce!.toString("base64url");
  } else if (body) {
    rawBody = JSON.stringify(body);
    headers["content-type"] = "application/json";
  }

  headers["x-signature"] = signRequest(method, `${BASE}${path}`, rawBody, privateKeyPem);
  return fetch(`${BASE}${path}`, { method, headers, body: rawBody || undefined });
}

export async function demo() {
  const { publicKey, privateKey } = generateKeyPair();
  const clientId  = randomBytes(8).toString("hex");
  const pubKeyB64 = exportPublicKey(publicKey);
  const key       = symKey(pubKeyB64);

  // Register
  const regBody: RegisterBody = { id: clientId, publicKey: pubKeyB64 };
  await fetch(`${BASE}/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(regBody),
  });
  console.log(`[client] registered: ${clientId}`);

  // Encrypted message
  const nonce     = randomBytes(16);
  const encrypted = cipher(new TextEncoder().encode("Hello, secure world!"), key, nonce);
  await sfetch("POST", "/message", privateKey, clientId, encrypted, nonce);
  const msgs    = await (await sfetch("GET", `/messages?clientId=${clientId}`, privateKey, clientId)).json() as Message[];
  console.log("[messages]", msgs);

  // Book CRUD
  const newBook: BookCreate = { title: "Clean Code", author: "Robert Martin", year: 2008 };
  const created = await (await sfetch("POST", "/books", privateKey, clientId, newBook)).json() as Book;
  console.log("[books] created:", created);

  const list    = await (await sfetch("GET", "/books", privateKey, clientId)).json() as Book[];
  console.log("[books] list:", list);

  const patch: BookUpdate = { title: "Clean Code (Updated)" };
  const updated = await (await sfetch("PATCH", `/books/${created.id}`, privateKey, clientId, patch)).json() as Book;
  console.log("[books] updated:", updated);

  const detail  = await (await sfetch("GET", `/books/${created.id}`, privateKey, clientId)).json() as Book;
  console.log("[books] detail:", detail);

  const deleted = await (await sfetch("DELETE", `/books/${created.id}`, privateKey, clientId)).json() as OkResult;
  console.log("[books] deleted:", deleted);
}

demo();