import type { MyWebSocket, MessageData } from "../../types.js";
import type { UserService, MessageService } from "../../services/servicesTypes.js";
import { ActiveConnectionsManager } from "../../realtime/activeConnectionsManager.js";

type AuthHandlerDeps = {
  ws: MyWebSocket;
  activeConnections: ActiveConnectionsManager;
  payload: MessageData;
  userService: UserService;
  messageService: MessageService;
};

export const handleAuth = async ({
  ws,
  activeConnections,
  payload,
  userService,
  messageService,
}: AuthHandlerDeps) => {
  if (!payload || payload.type !== "auth") {
    console.error("handleAuth received invalid payload");
    return;
  }

  const userName = payload.from?.trim();
  if (!userName) {
    console.error("handleAuth invalid user name");
    return;
  }

  ws.user = userName;
  activeConnections.add(userName, ws);

  const { user, contacts } = await userService.authenticateUser(userName);
  const contactsWire = contacts.map((c) => ({ id: c.id, name: c.name }));

  ws.send(
    JSON.stringify({
      type: "auth",
      payload: {
        message: "Autenticacion recibida",
        contacts: contactsWire,
        userId: user?.id,
      },
    })
  );

  if (!user?.id) return;

  const messages = await messageService.restoreMessages(user.id);
  console.log(
    "[handleAuth] restore for",
    userName,
    "user.id",
    user.id,
    "messages",
    messages.length
  );
  if (!messages.length) return;

  const idToName = new Map<string, string>();
  idToName.set(user.id, user.name);
  contacts.forEach((c) => idToName.set(c.id, c.name));

  const toWire = (msg: MessageData) => ({
    ...msg,
    type: "msg" as const,
    from: idToName.get(msg.from) ?? msg.from,
    to: idToName.get(msg.to) ?? msg.to,
  });

  const sortedByDate = [...messages].sort((msgA, msgB) => {
    const a = new Date(msgA.date);
    const b = new Date(msgB.date);
    return a.getTime() - b.getTime();
  });

  ws.send(
    JSON.stringify({
      type: "message-history",
      payload: {
        messages: sortedByDate.map(toWire),
      },
    })
  );
};
