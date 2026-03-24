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

const waitForMessages = (ws: WebSocket, count: number, timeoutMs = 5000) =>
  new Promise<any[]>((resolve, reject) => {
    const messages: any[] = [];
    const onMessage = (data: WebSocket.RawData) => {
      messages.push(JSON.parse(data.toString()));
      if (messages.length >= count) {
        cleanup();
        resolve(messages);
      }
    };
    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Timeout waiting for messages"));
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timer);
      ws.off("message", onMessage);
      ws.off("error", onError);
    };

    ws.on("message", onMessage);
    ws.on("error", onError);
  });

describe("handleMessage (integration)", () => {
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

  it("sends new-contact and new-msg to sender and receiver when saved", async () => {
    const userRepo = new SupabaseUserRepository();
    const contactRepo = new SupabaseContactRepository();
    const messageRepo = new SupabaseMessageRepository();
    const userA = await userRepo.create(createUniqueName());
    const userB = await userRepo.create(createUniqueName());

    expect(userA).not.toBeNull();
    expect(userB).not.toBeNull();
    if (!userA || !userB) return;

    createdUserIds.push(userA.id, userB.id);
    createdUserNames.push(userA.name, userB.name);

    const payload = {
      type: "msg" as const,
      id: createUniqueId(),
      from: userA.name,
      to: userB.name,
      message: "hello handler",
      date: new Date(),
      status: "sent" as const,
    };

    const senderWs = new WebSocket(baseUrl);
    const receiverWs = new WebSocket(baseUrl);
    await Promise.all([waitForOpen(senderWs), waitForOpen(receiverWs)]);

    senderWs.send(
      JSON.stringify({
        type: "auth",
        from: userA.name,
        message: "auth",
        date: new Date(),
        id: undefined,
        ids: undefined,
        to: undefined,
        status: undefined,
      })
    );
    receiverWs.send(
      JSON.stringify({
        type: "auth",
        from: userB.name,
        message: "auth",
        date: new Date(),
        id: undefined,
        ids: undefined,
        to: undefined,
        status: undefined,
      })
    );

    await waitForMessages(senderWs, 1);
    await waitForMessages(receiverWs, 1);

    senderWs.send(JSON.stringify(payload));

    createdMessageIds.push(payload.id);

    const senderMsgs = await waitForMessages(senderWs, 2);
    const receiverMsgs = await waitForMessages(receiverWs, 2);

    const senderTypes = senderMsgs.map((m) => m.type);
    const receiverTypes = receiverMsgs.map((m) => m.type);

    expect(senderTypes).toContain("new-contact");
    expect(senderTypes).toContain("new-msg");
    expect(receiverTypes).toContain("new-contact");
    expect(receiverTypes).toContain("new-msg");

    const { data, error } = await supabase
      .from("messages")
      .select("id")
      .eq("id", payload.id)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.id).toBe(payload.id);

    senderWs.close();
    receiverWs.close();
  });
});
