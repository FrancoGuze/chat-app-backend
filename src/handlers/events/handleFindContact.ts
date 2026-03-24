import type { MyWebSocket } from "../../types.js";
import { supabase } from "../../supabase.js";

type FindContactPayload = {
  type: "find-contact";
  username: string;
};

export const handleFindContact = async (
  ws: MyWebSocket,
  payload: FindContactPayload
) => {
  const username = payload.username?.trim() ?? "";

  if (!username) {
    ws.send(
      JSON.stringify({
        type: "contact-not-found",
        payload: { username: "" },
      })
    );
    return;
  }

  const { data, error } = await supabase
    .from("users")
    .select("id, name")
    .eq("name", username)
    .single();

  if (error || !data) {
    ws.send(
      JSON.stringify({
        type: "contact-not-found",
        payload: { username },
      })
    );
    return;
  }

  ws.send(
    JSON.stringify({
      type: "contact-found",
      payload: {
        id: data.id as string,
        username: data.name as string,
      },
    })
  );
};
