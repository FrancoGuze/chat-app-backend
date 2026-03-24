import WebSocket from "ws";
export type wsReqData = {};
export type MessageData =
  | {
      type: "msg"; // Mensaje normal
      from: string;
      id: string;
      to: string; // <— requerido
      message: string;
      date: Date;
      status: "sent" | "delivered" | "seen";
      ids?: never;

    }
  | {
      type: "auth"; // Mensaje de autenticación
      from: string;
      message: string;
      date: Date;
      id: never;
      ids: never;
      to: never; // <— explícitamente prohibido
      status: never;
    }
  | {
      type: "status-update";
      from: never;
      to: never;
      ids: string[];
      id:never
      message: never;
      date: never;
      status: "sent" | "delivered" | "seen";
      sender?: string;
      receiver?: string;
    }
  | {
      type: "find-contact";
      username: string;
      from: never;
      to: never;
      id: never;
      message: never;
      date: never;
      ids: never;
      status: never;
    };
export type msgUpdate = { type: "status-update"; id: string };

export type ServerWSEvent =
  | {
      type: "auth";
      payload: { message: string; contacts: { id: string; name: string }[]; userId?: string };
    }
  | { type: "message-history"; payload: { messages: MessageData[] } }
  | { type: "new-contact"; payload: { id: string; name: string } }
  | { type: "new-msg"; payload: { message: MessageData } }
  | { type: "status-update"; payload: { ids: string[]; status: "sent" | "delivered" | "seen" } }
  | { type: "contact-found"; payload: { id: string; username: string } }
  | { type: "contact-not-found"; payload: { username: string } };
export interface MyWebSocket extends WebSocket {
  user?: string;
}

export type User = {
  contacts: string[];
};
export type Users = {
  [username: string]: User;
};
