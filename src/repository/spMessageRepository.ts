import { supabase } from "../supabase.js";
import type { MessageRepository } from "./repositoriesTypes.js";
import type { MessageData } from "../types.js";

export class SupabaseMessageRepository implements MessageRepository {
  constructor() {}

  async saveMessage(message: MessageData): Promise<{ saved: boolean }> {
    if (!supabase) return { saved: false };
    if (!message || message.type !== "msg") return { saved: false };

    const { error } = await supabase.from("messages").insert({
      id: message.id,
      date: message.date,
      from: message.from,
      to: message.to,
      message: message.message,
      status: message.status,
    });

    if (error) {
      console.error("saveMessage error:", error);
      return { saved: false };
    }

    return { saved: true };
  }

  async updateStatus(
    ids: string[],
    status: MessageData["status"]
  ): Promise<{ updated: boolean; amount?: number }> {
    if (!supabase) return { updated: false };
    if (!ids?.length) return { updated: false };

    const { data, error } = await supabase
      .from("messages")
      .update({ status })
      .in("id", ids)
      .select("id");

    if (error) {
      console.error("updateStatus error:", error);
      return { updated: false };
    }

    return { updated: true, amount: data?.length };
  }

  async listMessagesForUser(userId: string): Promise<MessageData[]> {
    if (!supabase) return [];
    if (!userId) return [];

    const { data, error } = await supabase
      .from("messages")
      .select()
      .or(`from.eq.${userId},to.eq.${userId}`);

    if (error) {
      console.error("listMessagesForUser error:", error);
      return [];
    }

    return (data as MessageData[]) || [];
  }
}
