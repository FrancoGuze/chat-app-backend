import express, { Request, Response } from "express";
import "dotenv/config";
import http, { IncomingMessage } from "http";
import { WebSocketServer } from "ws";

import type { MessageData, MyWebSocket } from "./types.js";
import { ActiveConnectionsManager } from "./realtime/activeConnectionsManager.js";
import { SupabaseUserRepository } from "./repository/spUserRepository.js";
import { SupabaseContactRepository } from "./repository/spContactRepository.js";
import { SupabaseMessageRepository } from "./repository/spMessageRepository.js";
import { SupabaseUserService } from "./services/spUserService.js";
import { SupabaseMessageService } from "./services/spMessageService.js";
import {
  createWsHandlers,
  handleWsClose,
  handleWsMessage,
} from "./handlers/wsHandler.js";

const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const activeConnections = new ActiveConnectionsManager();

const userRepo = new SupabaseUserRepository();
const contactRepo = new SupabaseContactRepository();
const messageRepo = new SupabaseMessageRepository();

const userService = new SupabaseUserService(userRepo, contactRepo);
const messageService = new SupabaseMessageService(
  userRepo,
  contactRepo,
  messageRepo
);
const wsHandlers = createWsHandlers({
  activeConnections,
  userService,
  messageService,
});

wss.on("connection", (ws: MyWebSocket, _req: IncomingMessage) => {
  console.log("Usuario nuevo conectado")
  ws.on("message", async (data: any) => {
    let payload: MessageData | null = null;
    try {
      const raw = typeof data === "string" ? data : data?.toString?.() ?? "";
      payload = JSON.parse(raw);
    } catch (error) {
      console.error("Invalid WS message payload", error);
      return;
    }

    if (!payload) return;
    console.log("Tipo recibido: ",payload.type,wsHandlers[payload.type])
    await handleWsMessage(ws, payload, wsHandlers);
  });

  ws.on("close", () => {
    console.log("Usuario desconectado")
    handleWsClose(ws, activeConnections)});
});

app.get("/", (_req: Request, res: Response) => {
  res.send({ ok: true });
});

server.listen(process.env.PORT, () => {
  console.log(`La app esta corriendo en el puerto ${process.env.PORT}`);
});
