import "dotenv/config";
import { describe, it, expect, afterEach, beforeAll, afterAll } from "vitest";
import http from "http";
import type { AddressInfo } from "net";
import WebSocket, { WebSocketServer } from "ws";
import { ActiveConnectionsManager } from "../../src/realtime/activeConnectionsManager.js";
import { SupabaseUserRepository } from "../../src/repository/spUserRepository.js";
import { SupabaseContactRepository } from "../../src/repository/spContactRepository.js";
import { SupabaseMessageRepository } from "../../src/repository/spMessageRepository.js";
import { SupabaseMessageService } from "../../src/services/spMessageService.js";
import { supabase } from "../../src/supabase.js";
import { createWsHandlers, handleWsClose, handleWsMessage } from "../../src/handlers/wsHandler.js";

const createdUserIds: string[] = [];
const createdMessageIds: string[] = [];
const createdUserNames: string[] = [];

const createUniqueName = () =>
  `test_user_${Date.now()}_${Math.random().toString(16).slice(2)}`;
const createUniqueId = () =>
  `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`;

let server: http.Server;
let wss: WebSocketServer;
let baseUrl = "";

const waitForOpen = (ws: WebSocket) =>
  new Promise<void>((resolve) => ws.on("open", () => resolve()));

const waitForMessageType = (
  ws: WebSocket,
  type: string,
  timeoutMs = 5000
) =>
  new Promise<any>((resolve, reject) => {
    const onMessage = (data: WebSocket.RawData) => {
      const parsed = JSON.parse(data.toString());
      if (parsed.type === type) {
        cleanup();
        resolve(parsed);
      }
    };
    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout waiting for message type: ${type}`));
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timer);
      ws.off("message", onMessage);
      ws.off("error", onError);
    };

    ws.on("message", onMessage);
    ws.on("error", onError);
  });

describe("handleStatusUpdate (integration)", () => {
  beforeAll(async () => {
    const userRepo = new SupabaseUserRepository();
    const contactRepo = new SupabaseContactRepository();
    const messageRepo = new SupabaseMessageRepository();
    const messageService = new SupabaseMessageService(
      userRepo,
      contactRepo,
      messageRepo
    );
    const activeConnections = new ActiveConnectionsManager();
    const handlers = createWsHandlers({
      activeConnections,
      userService: new (class {
        async authenticateUser() {
          return { user: null, contacts: [] };
        }
      })(),
      messageService,
    });

    server = http.createServer();
    wss = new WebSocketServer({ server });
    wss.on("connection", (ws) => {
      ws.on("message", async (data) => {
        try {
          const payload = JSON.parse(data.toString());
          await handleWsMessage(ws as any, payload, handlers);
        } catch {
          // ignore
        }
      });
      ws.on("close", () => handleWsClose(ws as any, activeConnections));
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as AddressInfo).port;
    baseUrl = `ws://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => wss.close(() => resolve()));
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  afterEach(async () => {
    if (!supabase) return;
    if (createdMessageIds.length) {
      const ids = [...createdMessageIds];
      createdMessageIds.length = 0;
      await supabase.from("messages").delete().in("id", ids);
    }
    if (createdUserIds.length) {
      const ids = [...createdUserIds];
      createdUserIds.length = 0;
      const names = [...createdUserNames];
      createdUserNames.length = 0;
      await supabase.from("users_contacts").delete().in("user_id", names);
      await supabase.from("users_contacts").delete().in("contact_id", names);
      await supabase.from("users_contacts").delete().in("user_id", ids);
      await supabase.from("users_contacts").delete().in("contact_id", ids);
      await supabase.from("users").delete().in("id", ids);
    }
  });

  it("updates status and notifies sender", async () => {
    const userRepo = new SupabaseUserRepository();
    const messageRepo = new SupabaseMessageRepository();

    const sender = await userRepo.create(createUniqueName());
    const receiver = await userRepo.create(createUniqueName());
    expect(sender).not.toBeNull();
    expect(receiver).not.toBeNull();
    if (!sender || !receiver) return;

    createdUserIds.push(sender.id, receiver.id);
    createdUserNames.push(sender.name, receiver.name);

    const message = {
      type: "msg" as const,
      id: createUniqueId(),
      from: sender.name,
      to: receiver.name,
      message: "status update",
      date: new Date(),
      status: "sent" as const,
    };

    const saved = await messageRepo.saveMessage(message);
    expect(saved.saved).toBe(true);
    createdMessageIds.push(message.id);

    const senderWs = new WebSocket(baseUrl);
    const receiverWs = new WebSocket(baseUrl);
    await Promise.all([waitForOpen(senderWs), waitForOpen(receiverWs)]);

    senderWs.send(
      JSON.stringify({
        type: "auth",
        from: sender.name,
        message: "auth",
        date: new Date(),
        id: undefined,
        ids: undefined,
        to: undefined,
        status: undefined,
      })
    );
    await waitForMessageType(senderWs, "auth");

    receiverWs.send(
      JSON.stringify({
        type: "status-update",
        ids: [message.id],
        status: "seen",
        sender: sender.name,
      })
    );

    const statusMsg = await waitForMessageType(senderWs, "status-update");
    expect(statusMsg.ids).toContain(message.id);
    expect(statusMsg.status).toBe("seen");

    senderWs.close();
    receiverWs.close();
  });
});
