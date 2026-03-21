import { supabase } from "../supabase.js";
import type { ContactRepository } from "./repositoriesTypes.js";

type User = {
  id: string;
  name: string;
  created_at: Date;
};

export class SupabaseContactRepository implements ContactRepository {
  constructor() {}

  async ensureContact(userA: string, userB: string): Promise<{ created: boolean }> {
    if (!supabase) return { created: false };
    if (!userA || !userB) return { created: false };

    const { error, status } = await supabase
      .from("users_contacts")
      .upsert({ user_id: userA, contact_id: userB }, { onConflict: "user_id,contact_id" });

    if (error) {
      console.error("ensureContact error:", error);
      return { created: false };
    }

    return { created: status === 201 };
  }

  async ensureMutualContact(userA: string, userB: string): Promise<{ created: boolean }> {
    if (!supabase) return { created: false };
    if (!userA || !userB) return { created: false };

    const { error, status } = await supabase
      .from("users_contacts")
      .upsert(
        [
          { user_id: userA, contact_id: userB },
          { user_id: userB, contact_id: userA },
        ],
        { onConflict: "user_id,contact_id" }
      );

    if (error) {
      console.error("ensureMutualContact error:", error);
      return { created: false };
    }

    return { created: status === 201 };
  }

  async listContacts(id: string): Promise<User[]> {
    if (!supabase) return [];
    if (!id) return [];

    const { data: contactRows, error: contactsError } = await supabase
      .from("users_contacts")
      .select("contact_id")
      .eq("user_id", id);

    if (contactsError) {
      console.error("listContacts error:", contactsError);
      return [];
    }

    const contactIds = (contactRows || []).map((row) => row.contact_id);
    if (contactIds.length === 0) return [];

    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id,name,created_at")
      .in("id", contactIds);

    if (usersError) {
      console.error("listContacts users error:", usersError);
      return [];
    }

    return (users as User[]) || [];
  }
}
