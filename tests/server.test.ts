import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { randomBytes } from "node:crypto";
import { createServer } from "../src/server";
import { generateKeyPair, exportPublicKey, symKey } from "../src/crypto/keys";
import { signRequest } from "../src/crypto/signature";
import { cipher } from "../src/crypto/cipher";
import type { Book, BookCreate, BookUpdate, Message, OkResult } from "../src/types";

let server: ReturnType<typeof createServer>;
let baseUrl: string;

beforeAll(() => {
  server = createServer(0);
  baseUrl = `http://localhost:${server.port}`;
});

afterAll(() => {
  server.stop();
});

async function registerClient(): Promise<{
  clientId: string;
  privateKey: string;
  publicKeyB64: string;
}> {
  const { publicKey, privateKey } = generateKeyPair();
  const clientId = randomBytes(8).toString("hex");
  const publicKeyB64 = exportPublicKey(publicKey);
  const res = await server.fetch(new Request(`${baseUrl}/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: clientId, publicKey: publicKeyB64 }),
  }));
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
  return { clientId, privateKey, publicKeyB64 };
}

async function signedFetch(
  method: string,
  path: string,
  privateKey: string,
  clientId: string,
  body?: string | BookCreate | BookUpdate,
  nonce?: Buffer,
): Promise<Response> {
  let rawBody: string;
  const headers: Record<string, string> = { "x-client-id": clientId };
  if (body !== undefined && body !== "") {
    rawBody = typeof body === "string" ? body : JSON.stringify(body);
    if (typeof body === "object") headers["content-type"] = "application/json";
  } else {
    rawBody = "";
  }
  if (nonce) headers["x-nonce"] = nonce.toString("base64url");
  const url = `${baseUrl}${path}`;
  headers["x-signature"] = signRequest(method, url, rawBody, privateKey);
  return server.fetch(
    new Request(url, { method, headers, body: rawBody || undefined }),
  );
}

describe("server", () => {
  describe("POST /register", () => {
    test("accepts valid id and publicKey", async () => {
      const res = await server.fetch(
        new Request(`${baseUrl}/register`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            id: "test-client-1",
            publicKey: "dGVzdC1wdWJsaWMta2V5", // any base64url
          }),
        }),
      );
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
    });

    test("returns 400 when id missing", async () => {
      const res = await server.fetch(
        new Request(`${baseUrl}/register`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ publicKey: "YQ" }),
        }),
      );
      expect(res.status).toBe(400);
    });

    test("returns 400 when publicKey missing", async () => {
      const res = await server.fetch(
        new Request(`${baseUrl}/register`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: "x" }),
        }),
      );
      expect(res.status).toBe(400);
    });
  });

  describe("POST /message and GET /messages", () => {
    test("post encrypted message and list messages", async () => {
      const { clientId, privateKey, publicKeyB64 } = await registerClient();
      const key = symKey(publicKeyB64);
      const nonce = randomBytes(16);
      const plain = "Test message 123";
      const encrypted = cipher(
        new TextEncoder().encode(plain),
        key,
        nonce,
      );
      const bodyB64 = Buffer.from(encrypted).toString("base64url");
      const res = await signedFetch(
        "POST",
        "/message",
        privateKey,
        clientId,
        bodyB64,
        nonce,
      );
      expect(res.status).toBe(200);

      const listRes = await signedFetch(
        "GET",
        `/messages?clientId=${clientId}`,
        privateKey,
        clientId,
      );
      expect(listRes.status).toBe(200);
      const list = (await listRes.json()) as Message[];
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThanOrEqual(1);
      expect(list.some((m) => m.payload === plain)).toBe(true);
    });

    test("returns 400 when x-nonce missing for POST /message", async () => {
      const { clientId, privateKey } = await registerClient();
      const res = await signedFetch("POST", "/message", privateKey, clientId, "YQ");
      expect(res.status).toBe(400);
    });

    test("returns 401 when signature invalid", async () => {
      const { clientId } = await registerClient();
      const res = await server.fetch(
        new Request(`${baseUrl}/messages?clientId=${clientId}`, {
          method: "GET",
          headers: {
            "x-client-id": clientId,
            "x-signature": "invalid-sig",
          },
        }),
      );
      expect(res.status).toBe(401);
    });
  });

  describe("books CRUD", () => {
    test("create, list, get, update, delete book", async () => {
      const { clientId, privateKey } = await registerClient();
      const createBody: BookCreate = {
        title: "Test Book",
        author: "Test Author",
        year: 2024,
      };
      const createRes = await signedFetch("POST", "/books", privateKey, clientId, createBody);
      expect(createRes.status).toBe(200);
      const created = (await createRes.json()) as Book;
      expect(created.title).toBe(createBody.title);
      expect(created.author).toBe(createBody.author);
      expect(created.year).toBe(createBody.year ?? null);
      expect(created.id).toBeDefined();

      const listRes = await signedFetch("GET", "/books", privateKey, clientId);
      expect(listRes.status).toBe(200);
      const list = (await listRes.json()) as Book[];
      expect(list.some((b) => b.id === created.id)).toBe(true);

      const getRes = await signedFetch(
        "GET",
        `/books/${created.id}`,
        privateKey,
        clientId,
      );
      expect(getRes.status).toBe(200);
      const got = (await getRes.json()) as Book;
      expect(got.id).toBe(created.id);
      expect(got.title).toBe(created.title);

      const updateBody: BookUpdate = { title: "Updated Title" };
      const updateRes = await signedFetch(
        "PATCH",
        `/books/${created.id}`,
        privateKey,
        clientId,
        updateBody,
      );
      expect(updateRes.status).toBe(200);
      const updated = (await updateRes.json()) as Book;
      expect(updated.title).toBe("Updated Title");
      expect(updated.author).toBe(created.author);

      const deleteRes = await signedFetch(
        "DELETE",
        `/books/${created.id}`,
        privateKey,
        clientId,
      );
      expect(deleteRes.status).toBe(200);
      expect((await deleteRes.json()) as OkResult).toEqual({ ok: true });

      const getAfterRes = await signedFetch(
        "GET",
        `/books/${created.id}`,
        privateKey,
        clientId,
      );
      expect(getAfterRes.status).toBe(404);
    });

    test("POST /books returns 400 when title or author missing", async () => {
      const { clientId, privateKey } = await registerClient();
      const res = await signedFetch("POST", "/books", privateKey, clientId, {
        title: "No Author",
      } as BookCreate);
      expect(res.status).toBe(400);
    });

    test("GET /books/:id returns 404 for non-existent id", async () => {
      const { clientId, privateKey } = await registerClient();
      const res = await signedFetch("GET", "/books/999999", privateKey, clientId);
      expect(res.status).toBe(404);
    });
  });

  describe("routing", () => {
    test("returns 404 for unknown path", async () => {
      const res = await server.fetch(new Request(`${baseUrl}/unknown`));
      expect(res.status).toBe(404);
    });
  });
});
