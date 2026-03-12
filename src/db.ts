import { Database } from "bun:sqlite";
import type { Client, Message, Book } from "./types";

const db = new Database(process.env.TEST ? ":memory:" : "data.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id         TEXT    PRIMARY KEY,
    public_key TEXT    NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id  TEXT    NOT NULL,
    payload    TEXT    NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS books (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT    NOT NULL,
    author     TEXT    NOT NULL,
    year       INTEGER,
    created_at INTEGER DEFAULT (unixepoch())
  );
`);

export const clients = {
  upsert: db.prepare("INSERT OR REPLACE INTO clients (id, public_key) VALUES (?, ?)"),
  find:   db.prepare<Client,   [string]>("SELECT id, public_key FROM clients WHERE id = ?"),
};

export const messages = {
  save: db.prepare("INSERT INTO messages (client_id, payload) VALUES (?, ?)"),
  list: db.prepare<Message, [string]>("SELECT * FROM messages WHERE client_id = ? ORDER BY created_at DESC"),
};

export const books = {
  list:   db.prepare<Book,   []>("SELECT * FROM books ORDER BY id"),
  find:   db.prepare<Book,   [number]>("SELECT * FROM books WHERE id = ?"),
  create: db.prepare("INSERT INTO books (title, author, year) VALUES (?, ?, ?)"),
  update: db.prepare("UPDATE books SET title = COALESCE(?, title), author = COALESCE(?, author), year = COALESCE(?, year) WHERE id = ?"),
  delete: db.prepare("DELETE FROM books WHERE id = ?"),
};
