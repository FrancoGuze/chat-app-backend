import type { MyWebSocket, MessageData } from "../../types.js";
import type { MessageService } from "../../services/servicesTypes.js";
import { ActiveConnectionsManager } from "../../realtime/activeConnectionsManager.js";

type MessageHandlerDeps = {
  ws: MyWebSocket;
  payload: MessageData;
  activeConnections: ActiveConnectionsManager;
  messageService: MessageService;
};

export const handleMessage = async ({
  ws,
  payload,
  activeConnections,
  messageService,
}: MessageHandlerDeps) => {
  if (!payload || payload.type !== "msg") {
    console.error("handleMessage received invalid payload");
    return;
  }

  const message = payload.message?.trim();

  if (!message) {
    console.error("handleMessage invalid message payload");
    return;
  }

  const { saved, broadcast, peers } = await messageService.sendMessage(payload);

  if (!saved || !broadcast || !peers) {
    return;
  }

  const receiverWs = activeConnections.get(broadcast.to);

  ws.send(
    JSON.stringify({
      type: "new-contact",
      payload: { id: peers.to.id, name: peers.to.name },
    })
  );
  receiverWs?.send(
    JSON.stringify({
      type: "new-contact",
      payload: { id: peers.from.id, name: peers.from.name },
    })
  );

  ws.send(
    JSON.stringify({
      type: "new-msg",
      payload: {
        message: broadcast,
      },
    })
  );
  receiverWs?.send(
    JSON.stringify({
      type: "new-msg",
      payload: {
        message: broadcast,
      },
    })
  );
};
