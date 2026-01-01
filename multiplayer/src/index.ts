import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { createServer } from "http";
import { GameRoom } from "./rooms/GameRoom.js";
import "dotenv/config";

const port = Number(process.env.COLYSEUS_PORT) || 2567;

// Create HTTP server
const server = createServer();

// Create Colyseus server
const gameServer = new Server({
  transport: new WebSocketTransport({
    server,
    pingInterval: 5000,
    pingMaxRetries: 3,
  }),
});

// Register game rooms
// Each Phaser map room will join the same "game" room type with a roomSlug option
gameServer.define("game", GameRoom);

// Start listening
server.listen(port, () => {
  console.log(`[Colyseus] Multiplayer server listening on ws://localhost:${port}`);
  console.log(`[Colyseus] Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("[Colyseus] SIGTERM received, shutting down...");
  gameServer.gracefullyShutdown();
});

process.on("SIGINT", () => {
  console.log("[Colyseus] SIGINT received, shutting down...");
  gameServer.gracefullyShutdown();
});
