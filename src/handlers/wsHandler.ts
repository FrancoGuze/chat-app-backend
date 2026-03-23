import type { MyWebSocket, MessageData } from "../types.js";
import type { UserService, MessageService } from "../services/servicesTypes.js";
import { ActiveConnectionsManager } from "../realtime/activeConnectionsManager.js";

import { handleAuth } from "./events/handleAuth.js";
import { handleMessage } from "./events/handleMessage.js";
import { handleStatusUpdate } from "./events/handleStatusUpdate.js";

export type WsHandlerDeps = {
  activeConnections: ActiveConnectionsManager;
  userService: UserService;
  messageService: MessageService;
};

export type WsHandlerFn = (
  ws: MyWebSocket,
  payload: MessageData
) => Promise<void>;

export type WsHandlers = {
  auth: WsHandlerFn;
  msg: WsHandlerFn;
  "status-update": WsHandlerFn;
};

export const createWsHandlers = (deps: WsHandlerDeps): WsHandlers => {
  return {
    auth: async (ws, payload) => {
      await handleAuth({
        ws,
        activeConnections: deps.activeConnections,
        payload,
        userService: deps.userService,
        messageService: deps.messageService,
      });
    },
    msg: async (ws, payload) => {
      await handleMessage({
        ws,
        payload,
        activeConnections: deps.activeConnections,
        messageService: deps.messageService,
      });
    },
    "status-update": async (ws, payload) => {
      await handleStatusUpdate({
        ws,
        payload,
        activeConnections: deps.activeConnections,
        messageService: deps.messageService,
      });
    },
  };
};

export const handleWsMessage = async (
  ws: MyWebSocket,
  payload: MessageData,
  handlers: WsHandlers
) => {
  if (!payload || !("type" in payload)) {
    console.error("WS message missing type");
    return;
  }

  const handler = handlers[payload.type];
  if (!handler) {
    console.warn("Unknown WS message type:", (payload as any).type);
    return;
  }

  await handler(ws, payload);
};

export const handleWsClose = (
  ws: MyWebSocket,
  activeConnections: ActiveConnectionsManager
) => {
  const userId = ws.user;
  if (!userId) return;
  const removed = activeConnections.remove(userId);
  if (!removed) {
    console.log("Failed to remove connection for:", userId);
  }
};
