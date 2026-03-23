import type { MyWebSocket, MessageData } from "../../types.js";
import type { MessageService } from "../../services/servicesTypes.js";
import { ActiveConnectionsManager } from "../../realtime/activeConnectionsManager.js";

type StatusUpdateHandlerDeps = {
  ws: MyWebSocket;
  payload: MessageData;
  activeConnections: ActiveConnectionsManager;
  messageService: MessageService;
};

export const handleStatusUpdate = async ({
  ws,
  payload,
  activeConnections,
  messageService,
}: StatusUpdateHandlerDeps) => {
  if (!payload || payload.type !== "status-update") {
    console.error("handleStatusUpdate received invalid payload");
    return;
  }

  const ids = payload.ids || [];
  const status = payload.status || "seen";
  const sender = payload.sender?.trim();

  if (!ids.length || !status) {
    console.error("handleStatusUpdate invalid ids or status");
    return;
  }

  await messageService.updateMessageStatus(ids, status);

  if (!sender) return;

  const senderWs = activeConnections.get(sender);
  senderWs?.send(
    JSON.stringify({
      type: "status-update",
      ids,
      status,
    })
  );
};
