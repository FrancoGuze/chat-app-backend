import "dotenv/config";
import { describe, it, expect, afterEach } from "vitest";
import { SupabaseMessageRepository } from "../../src/repository/spMessageRepository.js";
import { SupabaseUserRepository } from "../../src/repository/spUserRepository.js";
import { supabase } from "../../src/supabase.js";

const createdUserIds: string[] = [];
const createdMessageIds: string[] = [];

const createUniqueName = () =>
  `test_user_${Date.now()}_${Math.random().toString(16).slice(2)}`;
const createUniqueId = () =>
  `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`;

describe("SupabaseMessageRepository (integration)", () => {
  afterEach(async () => {
    if (!supabase) return;
    if (createdMessageIds.length) {
      const ids = [...createdMessageIds];
      createdMessageIds.length = 0;
      await supabase.from("messages").delete().in("id", ids);
    }
    if (createdUserIds.length) {
      const ids = [...createdUserIds];
      createdUserIds.length = 0;
      await supabase.from("users").delete().in("id", ids);
    }
  });

  it("saveMessage persists a message", async () => {
    const userRepo = new SupabaseUserRepository();
    const messageRepo = new SupabaseMessageRepository();

    const userA = await userRepo.create(createUniqueName());
    const userB = await userRepo.create(createUniqueName());

    expect(userA).not.toBeNull();
    expect(userB).not.toBeNull();
    if (!userA || !userB) return;

    createdUserIds.push(userA.id, userB.id);

    const message = {
      type: "msg" as const,
      id: createUniqueId(),
      from: userA.id,
      to: userB.id,
      message: "hello",
      date: new Date(),
      status: "sent" as const,
    };

    const result = await messageRepo.saveMessage(message);
    expect(result.saved).toBe(true);
    createdMessageIds.push(message.id);

    const { data, error } = await supabase
      .from("messages")
      .select("id,from,to,message,status")
      .eq("id", message.id)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.id).toBe(message.id);
    expect(data?.from).toBe(userA.id);
    expect(data?.to).toBe(userB.id);
    expect(data?.message).toBe("hello");
    expect(data?.status).toBe("sent");
  });
  it("saveMessage returns saved=false on invalid payload", async () => {
    const messageRepo = new SupabaseMessageRepository();

    const invalidMessage = {
      type: "auth" as const,
      from: "invalid",
      message: "nope",
      date: new Date(),
      id: undefined as never,
      ids: undefined as never,
      to: undefined as never,
      status: undefined as never,
    };

    const result = await messageRepo.saveMessage(invalidMessage as any);
    expect(result.saved).toBe(false);
  });
  it("listMessagesForUser returns empty array when no messages", async () => {
    const userRepo = new SupabaseUserRepository();
    const messageRepo = new SupabaseMessageRepository();

    const user = await userRepo.create(createUniqueName());
    expect(user).not.toBeNull();
    if (!user) return;

    createdUserIds.push(user.id);

    const result = await messageRepo.listMessagesForUser(user.id);
    expect(result).toEqual([]);
  });
  it("listMessagesForUser returns messages for user", async () => {
    const userRepo = new SupabaseUserRepository();
    const messageRepo = new SupabaseMessageRepository();

    const userA = await userRepo.create(createUniqueName());
    const userB = await userRepo.create(createUniqueName());

    expect(userA).not.toBeNull();
    expect(userB).not.toBeNull();
    if (!userA || !userB) return;

    createdUserIds.push(userA.id, userB.id);

    const message = {
      type: "msg" as const,
      id: createUniqueId(),
      from: userA.id,
      to: userB.id,
      message: "hello again",
      date: new Date(),
      status: "sent" as const,
    };

    const saved = await messageRepo.saveMessage(message);
    expect(saved.saved).toBe(true);
    createdMessageIds.push(message.id);

    const result = await messageRepo.listMessagesForUser(userA.id);
    const ids = result.map((msg) => msg.id);

    expect(ids).toContain(message.id);
  });
  it("updateStatus updates status for ids", async () => {
    const userRepo = new SupabaseUserRepository();
    const messageRepo = new SupabaseMessageRepository();

    const userA = await userRepo.create(createUniqueName());
    const userB = await userRepo.create(createUniqueName());

    expect(userA).not.toBeNull();
    expect(userB).not.toBeNull();
    if (!userA || !userB) return;

    createdUserIds.push(userA.id, userB.id);

    const message = {
      type: "msg" as const,
      id: createUniqueId(),
      from: userA.id,
      to: userB.id,
      message: "status update",
      date: new Date(),
      status: "sent" as const,
    };

    const saved = await messageRepo.saveMessage(message);
    expect(saved.saved).toBe(true);
    createdMessageIds.push(message.id);

    const update = await messageRepo.updateStatus([message.id], "seen");
    expect(update.updated).toBe(true);

    const { data, error } = await supabase
      .from("messages")
      .select("status")
      .eq("id", message.id)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.status).toBe("seen");
  });
});
