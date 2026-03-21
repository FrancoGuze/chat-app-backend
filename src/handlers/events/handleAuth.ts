import type { MyWebSocket, MessageData } from "../../types.js";
import type { UserService, MessageService } from "../../services/servicesTypes.js";

type AuthHandlerDeps = {
  ws: MyWebSocket;
  activeClients: Map<string, MyWebSocket>;
  payload: MessageData;
  userService: UserService;
  messageService: MessageService;
};

export const handleAuth = async ({
  ws,
  activeClients,
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
  activeClients.set(userName, ws);

  const { user, contacts } = await userService.authenticateUser(userName);
  const contactNames = contacts.map((contact) => contact.name);

  ws.send(
    JSON.stringify({
      type: "auth",
      message: "Autenticacion recibida",
      contacts: contactNames,
      userId: user?.id,
    })
  );

  const messages = await messageService.restoreMessages(userName);
  if (!messages.length) return;

  const sortedByDate = [...messages].sort((msgA, msgB) => {
    const a = new Date(msgA.date);
    const b = new Date(msgB.date);
    return a.getTime() - b.getTime();
  });

  ws.send(
    JSON.stringify({
      type: "message-history",
      messages: sortedByDate,
    })
  );
};
