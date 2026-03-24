import "dotenv/config";
import { describe, it, expect, afterEach } from "vitest";
import { SupabaseContactRepository } from "../../src/repository/spContactRepository.js";
import { SupabaseUserRepository } from "../../src/repository/spUserRepository.js";
import { supabase } from "../../src/supabase.js";

const createdUserIds: string[] = [];

const createUniqueName = () =>
  `test_user_${Date.now()}_${Math.random().toString(16).slice(2)}`;

describe("SupabaseContactRepository (integration)", () => {
  afterEach(async () => {
    if (!supabase || createdUserIds.length === 0) return;
    const ids = [...createdUserIds];
    createdUserIds.length = 0;
    await supabase.from("users_contacts").delete().in("user_id", ids);
    await supabase.from("users_contacts").delete().in("contact_id", ids);
    await supabase.from("users").delete().in("id", ids);
  });

  it("ensureContact creates a single contact relation", async () => {
    const userRepo = new SupabaseUserRepository();
    const contactRepo = new SupabaseContactRepository();

    const userA = await userRepo.create(createUniqueName());
    const userB = await userRepo.create(createUniqueName());

    expect(userA).not.toBeNull();
    expect(userB).not.toBeNull();
    if (!userA || !userB) return;

    createdUserIds.push(userA.id, userB.id);

    const result = await contactRepo.ensureContact(userA.id, userB.id);
    expect(result.created).toBe(true);

    const { data, error } = await supabase
      .from("users_contacts")
      .select("user_id,contact_id")
      .eq("user_id", userA.id)
      .eq("contact_id", userB.id);

    expect(error).toBeNull();
    expect(data?.length).toBe(1);
  });
  it("ensureContact returns created=false when relation already exists", async () => {
    const userRepo = new SupabaseUserRepository();
    const contactRepo = new SupabaseContactRepository();

    const userA = await userRepo.create(createUniqueName());
    const userB = await userRepo.create(createUniqueName());

    expect(userA).not.toBeNull();
    expect(userB).not.toBeNull();
    if (!userA || !userB) return;

    createdUserIds.push(userA.id, userB.id);

    const first = await contactRepo.ensureContact(userA.id, userB.id);
    expect(first.created).toBe(true);

    const second = await contactRepo.ensureContact(userA.id, userB.id);
    expect(second.created).toBe(false);
  });
  it("ensureMutualContact creates both directions", async () => {
    const userRepo = new SupabaseUserRepository();
    const contactRepo = new SupabaseContactRepository();

    const userA = await userRepo.create(createUniqueName());
    const userB = await userRepo.create(createUniqueName());

    expect(userA).not.toBeNull();
    expect(userB).not.toBeNull();
    if (!userA || !userB) return;

    createdUserIds.push(userA.id, userB.id);

    const result = await contactRepo.ensureMutualContact(userA.id, userB.id);
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

  it(
    "ensureMutualContact returns created=false when both relations already exist",
    async () => {
      const userRepo = new SupabaseUserRepository();
      const contactRepo = new SupabaseContactRepository();

      const userA = await userRepo.create(createUniqueName());
      const userB = await userRepo.create(createUniqueName());

      expect(userA).not.toBeNull();
      expect(userB).not.toBeNull();
      if (!userA || !userB) return;

      createdUserIds.push(userA.id, userB.id);

      const first = await contactRepo.ensureMutualContact(userA.id, userB.id);
      expect(first.created).toBe(true);

      const second = await contactRepo.ensureMutualContact(userA.id, userB.id);
      expect(second.created).toBe(false);
    }
  );
  it("listContacts returns empty array when user has no contacts", async () => {
    const userRepo = new SupabaseUserRepository();
    const contactRepo = new SupabaseContactRepository();

    const user = await userRepo.create(createUniqueName());
    expect(user).not.toBeNull();
    if (!user) return;

    createdUserIds.push(user.id);

    const contacts = await contactRepo.listContacts(user.id);
    expect(contacts).toEqual([]);
  });
  it("listContacts returns contact users for given user", async () => {
    const userRepo = new SupabaseUserRepository();
    const contactRepo = new SupabaseContactRepository();

    const userA = await userRepo.create(createUniqueName());
    const userB = await userRepo.create(createUniqueName());

    expect(userA).not.toBeNull();
    expect(userB).not.toBeNull();
    if (!userA || !userB) return;

    createdUserIds.push(userA.id, userB.id);

    await contactRepo.ensureContact(userA.id, userB.id);

    const contacts = await contactRepo.listContacts(userA.id);

    const contactNames = contacts.map((c) => c.name);
    expect(contactNames).toContain(userB.name);
  });
});
