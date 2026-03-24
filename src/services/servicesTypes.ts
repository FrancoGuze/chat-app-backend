import type { MessageData } from "../types.js";

type User = {
  id: string;
  name: string;
  created_at: Date;
};

export type AuthResult = {
  user: User | null;
  contacts: User[];
};

export interface UserService {
  authenticateUser: (name: string) => Promise<AuthResult>;
}

export interface ContactService {
  ensureContactPair: (
    userId: string,
    contactId: string
  ) => Promise<{ created: boolean }>;
}

export type MessageSendPeers = {
  from: { id: string; name: string };
  to: { id: string; name: string };
};

export interface MessageService {
  sendMessage: (
    payload: MessageData
  ) => Promise<{
    saved: boolean;
    createdContact: boolean;
    broadcast?: MessageData;
    peers?: MessageSendPeers;
  }>;
  restoreMessages: (userId: string) => Promise<MessageData[]>;
  updateMessageStatus: (
    ids: string[],
    status: MessageData["status"]
  ) => Promise<{ updated: boolean; amount?: number }>;
}
