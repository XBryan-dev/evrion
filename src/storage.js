import { supabase } from "./supabaseClient";

const ROW_ID = "main";

/** Loads the single EVRION content row. Returns null if unavailable or not yet created. */
export async function loadContent() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("evrion_content")
    .select("data")
    .eq("id", ROW_ID)
    .maybeSingle();
  if (error || !data) return null;
  return data.data;
}

/** Upserts the single EVRION content row. Requires an authenticated (admin) session. */
export async function saveContent(content) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase
    .from("evrion_content")
    .upsert({ id: ROW_ID, data: content, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function signIn(email, password) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}
