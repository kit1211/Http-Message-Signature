import { createServer } from "./src/server";

const server = createServer();
console.log(`[server] listening on ${server.url}`);