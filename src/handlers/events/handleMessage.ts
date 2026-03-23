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

  const sender = payload.from?.trim();
  const receiver = payload.to?.trim();
  const message = payload.message?.trim();

  if (!sender || !receiver || !message) {
    console.error("handleMessage invalid message payload");
    return;
  }

  const receiverWs = activeConnections.get(receiver);

  const { saved } = await messageService.sendMessage(payload);

  if (saved) {
    ws.send(JSON.stringify({ type: "new-contact", contact: receiver }));
    receiverWs?.send(
      JSON.stringify({ type: "new-contact", contact: sender })
    );

    ws.send(JSON.stringify({ type: "new-msg", message: payload }));
    receiverWs?.send(JSON.stringify({ type: "new-msg", message: payload }));
  }
};
