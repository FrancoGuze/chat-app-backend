import "dotenv/config";
import { describe, it, expect, afterEach } from "vitest";
import { SupabaseMessageService } from "../../src/services/spMessageService.js";
import { SupabaseUserRepository } from "../../src/repository/spUserRepository.js";
import { SupabaseContactRepository } from "../../src/repository/spContactRepository.js";
import { SupabaseMessageRepository } from "../../src/repository/spMessageRepository.js";
import { supabase } from "../../src/supabase.js";

const createdUserIds: string[] = [];
const createdMessageIds: string[] = [];

const createUniqueName = () =>
  `test_user_${Date.now()}_${Math.random().toString(16).slice(2)}`;
const createUniqueId = () =>
  `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`;

describe("SupabaseMessageService (integration)", () => {
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
      await supabase.from("users_contacts").delete().in("user_id", ids);
      await supabase.from("users_contacts").delete().in("contact_id", ids);
      await supabase.from("users").delete().in("id", ids);
    }
  });

  it("sendMessage validates and persists message", async () => {
    const userRepo = new SupabaseUserRepository();
    const contactRepo = new SupabaseContactRepository();
    const messageRepo = new SupabaseMessageRepository();
    const service = new SupabaseMessageService(
      userRepo,
      contactRepo,
      messageRepo
    );

    const userA = await userRepo.create(createUniqueName());
    const userB = await userRepo.create(createUniqueName());

    expect(userA).not.toBeNull();
    expect(userB).not.toBeNull();
    if (!userA || !userB) return;

    createdUserIds.push(userA.id, userB.id);

    const payload = {
      type: "msg" as const,
      id: createUniqueId(),
      from: userA.name,
      to: userB.name,
      message: "service message",
      date: new Date(),
      status: "sent" as const,
    };

    const result = await service.sendMessage(payload);
    expect(result.saved).toBe(true);
    createdMessageIds.push(payload.id);

    const { data, error } = await supabase
      .from("messages")
      .select("id,from,to,message,status")
      .eq("id", payload.id)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.id).toBe(payload.id);
    expect(data?.from).toBe(userA.id);
    expect(data?.to).toBe(userB.id);
    expect(data?.message).toBe("service message");
    expect(data?.status).toBe("sent");
  });
  it("sendMessage returns saved=false for invalid payload", async () => {
    const userRepo = new SupabaseUserRepository();
    const contactRepo = new SupabaseContactRepository();
    const messageRepo = new SupabaseMessageRepository();
    const service = new SupabaseMessageService(
      userRepo,
      contactRepo,
      messageRepo
    );

    const invalidPayload = {
      type: "auth" as const,
      from: "invalid",
      message: "nope",
      date: new Date(),
      id: undefined as never,
      ids: undefined as never,
      to: undefined as never,
      status: undefined as never,
    };

    const result = await service.sendMessage(invalidPayload as any);
    expect(result.saved).toBe(false);
  });

  it("restoreMessages returns messages for user", async () => {
    const userRepo = new SupabaseUserRepository();
    const contactRepo = new SupabaseContactRepository();
    const messageRepo = new SupabaseMessageRepository();
    const service = new SupabaseMessageService(
      userRepo,
      contactRepo,
      messageRepo
    );

    const userA = await userRepo.create(createUniqueName());
    const userB = await userRepo.create(createUniqueName());

    expect(userA).not.toBeNull();
    expect(userB).not.toBeNull();
    if (!userA || !userB) return;

    createdUserIds.push(userA.id, userB.id);

    const payload = {
      type: "msg" as const,
      id: createUniqueId(),
      from: userA.name,
      to: userB.name,
      message: "restore message",
      date: new Date(),
      status: "sent" as const,
    };

    createdMessageIds.push(payload.id);

    const payloadDb = {
      type: "msg" as const,
      id: payload.id,
      from: userA.id,
      to: userB.id,
      message: "restore message",
      date: payload.date,
      status: "sent" as const,
    };

    const savedDb = await messageRepo.saveMessage(payloadDb);
    expect(savedDb.saved).toBe(true);

    const messages = await service.restoreMessages(userA.id);
    const ids = messages.map((msg) => msg.id);
    expect(ids).toContain(payloadDb.id);
  });

  it("updateMessageStatus updates status for ids", async () => {
    const userRepo = new SupabaseUserRepository();
    const contactRepo = new SupabaseContactRepository();
    const messageRepo = new SupabaseMessageRepository();
    const service = new SupabaseMessageService(
      userRepo,
      contactRepo,
      messageRepo
    );

    const userA = await userRepo.create(createUniqueName());
    const userB = await userRepo.create(createUniqueName());

    expect(userA).not.toBeNull();
    expect(userB).not.toBeNull();
    if (!userA || !userB) return;

    createdUserIds.push(userA.id, userB.id);

    const payload = {
      type: "msg" as const,
      id: createUniqueId(),
      from: userA.id,
      to: userB.id,
      message: "status service",
      date: new Date(),
      status: "sent" as const,
    };

    const saved = await messageRepo.saveMessage(payload);
    expect(saved.saved).toBe(true);
    createdMessageIds.push(payload.id);

    const update = await service.updateMessageStatus([payload.id], "seen");
    expect(update.updated).toBe(true);

    const { data, error } = await supabase
      .from("messages")
      .select("status")
      .eq("id", payload.id)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.status).toBe("seen");
  });
});
