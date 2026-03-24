import "dotenv/config";
import { describe, it, expect, afterEach } from "vitest";
import { SupabaseUserRepository } from "../../src/repository/spUserRepository.js";
import { supabase } from "../../src/supabase.js";

const createdUsers: string[] = [];

const createUniqueName = () =>
  `test_user_${Date.now()}_${Math.random().toString(16).slice(2)}`;

describe("SupabaseUserRepository (integration)", () => {
  afterEach(async () => {
    if (!supabase || createdUsers.length === 0) return;
    const names = [...createdUsers];
    createdUsers.length = 0;
    await supabase.from("users").delete().in("name", names);
  });

  it("findByName returns user when exists", async () => {
    const repo = new SupabaseUserRepository();
    const name = createUniqueName();

    const created = await repo.create(name);
    expect(created).not.toBeNull();
    createdUsers.push(name);

    const found = await repo.findByName(name);

    expect(found).not.toBeNull();
    expect(found?.name).toBe(name);
    expect(found?.id).toBeTruthy();
    expect(found?.created_at).toBeTruthy();
  });

  it("findByName returns null when not found", async () => {
    const repo = new SupabaseUserRepository();
    const name = createUniqueName();

    const found = await repo.findByName(name);

    expect(found).toBeNull();
  });
  it("create returns created user with id/name/created_at", async () => {
    const repo = new SupabaseUserRepository();
    const name = createUniqueName();

    const created = await repo.create(name);
    expect(created).not.toBeNull();
    createdUsers.push(name);

    expect(created?.name).toBe(name);
    expect(created?.id).toBeTruthy();
    expect(created?.created_at).toBeTruthy();
  });
  it("findOrCreateByName returns existing user when found", async () => {
    const repo = new SupabaseUserRepository();
    const name = createUniqueName();

    const created = await repo.create(name);
    expect(created).not.toBeNull();
    createdUsers.push(name);

    const found = await repo.findOrCreateByName(name);

    expect(found).not.toBeNull();
    expect(found?.name).toBe(name);
    expect(found?.id).toBeTruthy();
    expect(found?.created_at).toBeTruthy();
  });
  it("findOrCreateByName creates and returns user when not found", async () => {
    const repo = new SupabaseUserRepository();
    const name = createUniqueName();

    const created = await repo.findOrCreateByName(name);
    expect(created).not.toBeNull();
    createdUsers.push(name);

    expect(created?.name).toBe(name);
    expect(created?.id).toBeTruthy();
    expect(created?.created_at).toBeTruthy();
  });
});
