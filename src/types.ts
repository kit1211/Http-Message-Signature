// ── SQLite row types ───────────────────────────────────────────────────────────

export type Client  = { id: string; public_key: string };
export type Message = { id: number; client_id: string; payload: string; created_at: number };
export type Book    = { id: number; title: string; author: string; year: number | null; created_at: number };

// ── HTTP request body types ────────────────────────────────────────────────────

export interface RegisterBody { id: string; publicKey: string }
export interface BookCreate   { title: string; author: string; year?: number }
export interface BookUpdate   { title?: string; author?: string; year?: number }

// ── Server internal types ──────────────────────────────────────────────────────

export interface AuthContext { clientId: string; body: string }
export interface OkResult   { ok: true }
