import { supabase } from "../supabase.js";
import type { UserRepository } from "./repositoriesTypes.js";

type User = {
  id: string;
  name: string;
  created_at: Date;
};

export class SupabaseUserRepository implements UserRepository {
  constructor() {}

  async create(name: string): Promise<User | null> {
    if (!supabase) return null;
    const trimmed = name.trim();
    if (!trimmed) return null;

    const { data, error } = await supabase
      .from("users")
      .insert({ name: trimmed })
      .select("id,name,created_at")
      .single();

    if (error) {
      console.error("create user error:", error);
      return null;
    }

    return data as User;
  }

  async findByName(name: string): Promise<User | null> {
    if (!supabase) return null;
    const trimmed = name.trim();
    if (!trimmed) return null;

    const { data, error } = await supabase
      .from("users")
      .select("id,name,created_at")
      .eq("name", trimmed)
      .maybeSingle();

    if (error) {
      console.error("findByName error:", error);
      return null;
    }

    return (data as User) || null;
  }

  async findById(id: string): Promise<User | null> {
    if (!supabase) return null;
    const trimmed = id.trim();
    if (!trimmed) return null;

    const { data, error } = await supabase
      .from("users")
      .select("id,name,created_at")
      .eq("id", trimmed)
      .maybeSingle();

    if (error) {
      console.error("findById error:", error);
      return null;
    }

    return (data as User) || null;
  }

  async findOrCreateByName(name: string): Promise<User | null> {
    if (!supabase) return null;
    const trimmed = name.trim();
    if (!trimmed) return null;

    const { data, error } = await supabase
      .from("users")
      .upsert({ name: trimmed }, { onConflict: "name" })
      .select("id,name,created_at")
      .single();

    if (error) {
      console.error("findOrCreateByName error:", error);
      return null;
    }

    return data as User;
  }
}
