import "dotenv/config";
import { describe, it, expect, afterEach } from "vitest";
import { SupabaseUserService } from "../../src/services/spUserService.js";
import { SupabaseUserRepository } from "../../src/repository/spUserRepository.js";
import { SupabaseContactRepository } from "../../src/repository/spContactRepository.js";
import { supabase } from "../../src/supabase.js";

const createdUserIds: string[] = [];

const createUniqueName = () =>
  `test_user_${Date.now()}_${Math.random().toString(16).slice(2)}`;

describe("SupabaseUserService (integration)", () => {
  afterEach(async () => {
    if (!supabase || createdUserIds.length === 0) return;
    const ids = [...createdUserIds];
    createdUserIds.length = 0;
    await supabase.from("users_contacts").delete().in("user_id", ids);
    await supabase.from("users_contacts").delete().in("contact_id", ids);
    await supabase.from("users").delete().in("id", ids);
  });

  it("authenticateUser creates user when not found and returns empty contacts", async () => {
    const userRepo = new SupabaseUserRepository();
    const contactRepo = new SupabaseContactRepository();
    const service = new SupabaseUserService(userRepo, contactRepo);

    const name = createUniqueName();
    const result = await service.authenticateUser(name);

    expect(result.user).not.toBeNull();
    expect(result.user?.name).toBe(name);
    expect(result.contacts).toEqual([]);

    if (result.user?.id) {
      createdUserIds.push(result.user.id);
    }
  });
  it("authenticateUser returns existing user and their contacts", async () => {
    const userRepo = new SupabaseUserRepository();
    const contactRepo = new SupabaseContactRepository();
    const service = new SupabaseUserService(userRepo, contactRepo);

    const userA = await userRepo.create(createUniqueName());
    const userB = await userRepo.create(createUniqueName());

    expect(userA).not.toBeNull();
    expect(userB).not.toBeNull();
    if (!userA || !userB) return;

    createdUserIds.push(userA.id, userB.id);

    await contactRepo.ensureContact(userA.id, userB.id);

    const result = await service.authenticateUser(userA.name);

    expect(result.user).not.toBeNull();
    expect(result.user?.name).toBe(userA.name);
    const contactNames = result.contacts.map((c) => c.name);
    expect(contactNames).toContain(userB.name);
  });
});
