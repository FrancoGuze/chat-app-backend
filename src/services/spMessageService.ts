import { ContactRepository, MessageRepository, UserRepository } from "../repository/repositoriesTypes.js";
import { MessageData } from "../types.js";
import { MessageService, MessageSendPeers } from "./servicesTypes.js";

function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());
}

export class SupabaseMessageService implements MessageService {
  constructor(
    private userRepo: UserRepository,
    private contactRepo: ContactRepository,
    private messageRepo: MessageRepository
  ) {}

  private async resolveUserRef(ref: string) {
    const t = ref.trim();
    if (!t) return null;
    if (looksLikeUuid(t)) {
      return await this.userRepo.findById(t);
    }
    return await this.userRepo.findByName(t);
  }

  /**
   * Validates the message payload, ensures contacts, and persists the message.
   * Persists `from` / `to` as user ids; `broadcast` + `peers` use display names for the wire.
   */
  async sendMessage(payload: MessageData) {
    if (payload.type !== "msg") {
      console.error("Payload type is not 'msg'");
      return { saved: false, createdContact: false };
    }

    const fromRef = payload.from.trim();
    const toRef = payload.to.trim();
    const message = payload.message;

    if (!fromRef || !toRef || !message || message.trim() === "") {
      console.error("Invalid message payload");
      return { saved: false, createdContact: false };
    }

    const fromUser = await this.resolveUserRef(fromRef);
    const toUser = await this.resolveUserRef(toRef);
    if (!fromUser || !toUser) {
      console.error("Could not resolve message endpoints");
      return { saved: false, createdContact: false };
    }

    const { created } = await this.contactRepo.ensureMutualContact(fromUser.id, toUser.id);

    const persistPayload: MessageData = {
      ...payload,
      from: fromUser.id,
      to: toUser.id,
    };
    const { saved } = await this.messageRepo.saveMessage(persistPayload);

    const broadcast: MessageData = {
      ...payload,
      from: fromUser.name,
      to: toUser.name,
    };

    const peers: MessageSendPeers = {
      from: { id: fromUser.id, name: fromUser.name },
      to: { id: toUser.id, name: toUser.name },
    };

    return { saved, createdContact: created, broadcast, peers };
  }

  /**
   * Restores all messages for a given user (by Supabase user id).
   */
  async restoreMessages(userId: string) {
    if (!userId || userId.trim() === "") return [];
    const messages = await this.messageRepo.listMessagesForUser(userId);
    return messages;
  }

  async updateMessageStatus(ids: string[], status: MessageData["status"]) {
    if (!ids || ids.length === 0) {
      return { updated: false, amount: 0 };
    }
    if (!status) {
      return { updated: false, amount: 0 };
    }
    return this.messageRepo.updateStatus(ids, status);
  }
}
