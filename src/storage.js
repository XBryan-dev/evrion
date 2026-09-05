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

/** Casts one anonymous vote on a Today's Page poll block. No login required. */
export async function castVote(pageDate, blockId, optionId) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase
    .from("today_page_votes")
    .insert({ page_date: pageDate, block_id: blockId, option_id: optionId });
  if (error) throw error;
}

/** Returns { [optionId]: count } for a given poll block. */
export async function fetchVoteCounts(blockId) {
  if (!supabase) return {};
  const { data, error } = await supabase
    .from("today_page_votes")
    .select("option_id")
    .eq("block_id", blockId);
  if (error || !data) return {};
  const counts = {};
  data.forEach((row) => {
    counts[row.option_id] = (counts[row.option_id] || 0) + 1;
  });
  return counts;
}
