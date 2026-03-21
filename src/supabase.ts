import { createClient } from "@supabase/supabase-js";
const SPurl = process.env.DB_URL;
const SPkey = process.env.DB_KEY;
if (!SPkey || !SPurl) throw new Error("Supabase Key or URL is missing")
export const supabase = createClient(SPurl, SPkey);
