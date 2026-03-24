import { supabase } from "../supabase.js";
import type { MessageRepository } from "./repositoriesTypes.js";
import type { MessageData } from "../types.js";

export class SupabaseMessageRepository implements MessageRepository {
  constructor() {}

  async saveMessage(message: MessageData): Promise<{ saved: boolean }> {
    if (!supabase) return { saved: false };
    if (!message || message.type !== "msg") return { saved: false };

    const row = {
      id: message.id,
      date: message.date,
      from: message.from,
      to: message.to,
      message: message.message,
      status: message.status,
    };

    console.log("[messages.saveMessage] insert", {
      id: row.id,
      from: row.from,
      to: row.to,
      status: row.status,
      messageLen: row.message?.length ?? 0,
    });

    const { error } = await supabase.from("messages").insert(row);

    if (error) {
      console.error("[messages.saveMessage] error:", error);
      return { saved: false };
    }

    console.log("[messages.saveMessage] ok", row.id);
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

  /**
   * Loads all messages where the user id appears in `from` or `to`.
   * Uses two `.eq()` queries so column names `from` / `to` are not embedded in a raw `.or()` string
   * (PostgREST can mis-parse unquoted `from` / `to` as reserved tokens).
   */
  async listMessagesForUser(userId: string): Promise<MessageData[]> {
    if (!supabase) return [];
    if (!userId) return [];

    console.log("[messages.listMessagesForUser] userId", userId);

    const [fromRes, toRes] = await Promise.all([
      supabase.from("messages").select().eq("from", userId),
      supabase.from("messages").select().eq("to", userId),
    ]);

    if (fromRes.error) {
      console.error("[messages.listMessagesForUser] from query error:", fromRes.error);
    }
    if (toRes.error) {
      console.error("[messages.listMessagesForUser] to query error:", toRes.error);
    }

    const byId = new Map<string, MessageData>();
    for (const row of [...(fromRes.data ?? []), ...(toRes.data ?? [])]) {
      const m = row as MessageData;
      byId.set(m.id, m);
    }

    const merged = Array.from(byId.values());
    console.log("[messages.listMessagesForUser] count", merged.length);

    return merged;
  }
}
