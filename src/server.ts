import { clients, messages, books } from "./db";
import { verifyRequest } from "./crypto/signature";
import { symKey } from "./crypto/keys";
import { cipher } from "./crypto/cipher";
import type { AuthContext, RegisterBody, BookCreate, BookUpdate, OkResult } from "./types";

// ── Auth middleware ────────────────────────────────────────────────────────────

async function authenticate(req: Request): Promise<AuthContext | Response> {
  const clientId = req.headers.get("x-client-id");
  const sig      = req.headers.get("x-signature");
  if (!clientId || !sig) return new Response("Missing auth headers", { status: 401 });

  const client = clients.find.get(clientId);
  if (!client) return new Response("Unknown client", { status: 401 });

  const body = await req.text();
  if (!verifyRequest(req.method, req.url, body, sig, client.public_key))
    return new Response("Invalid signature", { status: 401 });

  return { clientId, body };
}

// ── Route handlers ─────────────────────────────────────────────────────────────

async function handleRegister(req: Request): Promise<Response> {
  const { id, publicKey } = await req.json() as RegisterBody;
  if (!id || !publicKey) return new Response("Bad request", { status: 400 });
  clients.upsert.run(id, publicKey);
  return Response.json({ ok: true } satisfies OkResult);
}

async function handleMessagePost(req: Request): Promise<Response> {
  const auth = await authenticate(req);
  if (auth instanceof Response) return auth;

  const nonce = req.headers.get("x-nonce");
  if (!nonce) return new Response("Missing nonce", { status: 400 });

  const client    = clients.find.get(auth.clientId)!;
  const decrypted = cipher(
    Buffer.from(auth.body, "base64url"),
    symKey(client.public_key),
    Buffer.from(nonce, "base64url"),
  );
  messages.save.run(auth.clientId, new TextDecoder().decode(decrypted));
  return Response.json({ ok: true } satisfies OkResult);
}

async function handleMessageList(req: Request, url: URL): Promise<Response> {
  const auth = await authenticate(req);
  if (auth instanceof Response) return auth;

  const clientId = url.searchParams.get("clientId") ?? "";
  return Response.json(messages.list.all(clientId));
}

// ── Book handlers ──────────────────────────────────────────────────────────────

async function handleBookList(req: Request): Promise<Response> {
  const auth = await authenticate(req);
  if (auth instanceof Response) return auth;
  return Response.json(books.list.all());
}

async function handleBookGet(req: Request, id: number): Promise<Response> {
  const auth = await authenticate(req);
  if (auth instanceof Response) return auth;

  const book = books.find.get(id);
  return book ? Response.json(book) : new Response("Not found", { status: 404 });
}

async function handleBookCreate(req: Request): Promise<Response> {
  const auth = await authenticate(req);
  if (auth instanceof Response) return auth;

  const { title, author, year }: BookCreate = JSON.parse(auth.body);
  if (!title || !author) return new Response("Bad request", { status: 400 });
  const result = books.create.run(title, author, year ?? null);
  return Response.json(books.find.get(Number(result.lastInsertRowid)));
}

async function handleBookUpdate(req: Request, id: number): Promise<Response> {
  const auth = await authenticate(req);
  if (auth instanceof Response) return auth;

  const { title, author, year }: BookUpdate = JSON.parse(auth.body);
  books.update.run(title ?? null, author ?? null, year ?? null, id);
  const book = books.find.get(id);
  return book ? Response.json(book) : new Response("Not found", { status: 404 });
}

async function handleBookDelete(req: Request, id: number): Promise<Response> {
  const auth = await authenticate(req);
  if (auth instanceof Response) return auth;

  books.delete.run(id);
  return Response.json({ ok: true } satisfies OkResult);
}

// ── Router & logger ────────────────────────────────────────────────────────────

function logRequest(method: string, path: string, status: number, ms: number): void {
  console.log(`[server] ${method} ${path} ${status} ${ms}ms`);
}

export function createServer(port = 3001) {
  return Bun.serve({
    port,
    async fetch(req) {
      const start = performance.now();
      const url   = new URL(req.url);
      const path  = url.pathname;
      const m     = req.method;

      let res: Response;
      if (m === "POST" && path === "/register") res = await handleRegister(req);
      else if (m === "POST" && path === "/message") res = await handleMessagePost(req);
      else if (m === "GET" && path === "/messages") res = await handleMessageList(req, url);
      else if (m === "GET" && path === "/books") res = await handleBookList(req);
      else if (m === "POST" && path === "/books") res = await handleBookCreate(req);
      else {
        const bookMatch = path.match(/^\/books\/(\d+)$/);
        if (bookMatch) {
          const id = Number(bookMatch[1]);
          if (m === "GET") res = await handleBookGet(req, id);
          else if (m === "PATCH") res = await handleBookUpdate(req, id);
          else if (m === "DELETE") res = await handleBookDelete(req, id);
          else res = new Response("Not found", { status: 404 });
        } else {
          res = new Response("Not found", { status: 404 });
        }
      }

      logRequest(m, path, res.status, Math.round(performance.now() - start));
      return res;
    },
  });
}
