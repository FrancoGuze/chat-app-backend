import "dotenv/config";
import { describe, it, expect, afterEach } from "vitest";
import { SupabaseContactService } from "../../src/services/spContactService.js";
import { SupabaseContactRepository } from "../../src/repository/spContactRepository.js";
import { SupabaseUserRepository } from "../../src/repository/spUserRepository.js";
import { supabase } from "../../src/supabase.js";

const createdUserIds: string[] = [];

const createUniqueName = () =>
  `test_user_${Date.now()}_${Math.random().toString(16).slice(2)}`;

describe("SupabaseContactService (integration)", () => {
  afterEach(async () => {
    if (!supabase || createdUserIds.length === 0) return;
    const ids = [...createdUserIds];
    createdUserIds.length = 0;
    await supabase.from("users_contacts").delete().in("user_id", ids);
    await supabase.from("users_contacts").delete().in("contact_id", ids);
    await supabase.from("users").delete().in("id", ids);
  });

  it("ensureContactPair creates mutual contact", async () => {
    const userRepo = new SupabaseUserRepository();
    const contactRepo = new SupabaseContactRepository();
    const service = new SupabaseContactService(contactRepo);

    const userA = await userRepo.create(createUniqueName());
    const userB = await userRepo.create(createUniqueName());

    expect(userA).not.toBeNull();
    expect(userB).not.toBeNull();
    if (!userA || !userB) return;

    createdUserIds.push(userA.id, userB.id);

    const result = await service.ensureContactPair(userA.id, userB.id);
    expect(result.created).toBe(true);

    const { data, error } = await supabase
      .from("users_contacts")
      .select("user_id,contact_id")
      .or(
        `and(user_id.eq.${userA.id},contact_id.eq.${userB.id}),and(user_id.eq.${userB.id},contact_id.eq.${userA.id})`
      );

    expect(error).toBeNull();
    expect(data?.length).toBe(2);
  });
  it("ensureContactPair returns created=false for invalid input", async () => {
    const contactRepo = new SupabaseContactRepository();
    const service = new SupabaseContactService(contactRepo);

    const result = await service.ensureContactPair("", "");
    expect(result.created).toBe(false);
  });
});
