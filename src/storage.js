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

const VOTER_ID_KEY = "evrion_voter_id";

/** A random, anonymous, per-browser id — not an account, just lets a vote be found again to change/remove. */
export function getVoterId() {
  try {
    let id = localStorage.getItem(VOTER_ID_KEY);
    if (!id) {
      id = `v_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(VOTER_ID_KEY, id);
    }
    return id;
  } catch (e) {
    return `v_${Date.now().toString(36)}`;
  }
}

/** Casts a first vote or changes an existing one — never stacks multiple votes from the same browser. */
export async function castOrChangeVote(pageDate, blockId, optionId) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const voterId = getVoterId();
  const { error } = await supabase
    .from("today_page_votes")
    .upsert(
      { page_date: pageDate, block_id: blockId, option_id: optionId, voter_id: voterId, created_at: new Date().toISOString() },
      { onConflict: "block_id,voter_id" }
    );
  if (error) throw error;
}

/** Removes this browser's vote from a poll entirely. */
export async function removeVote(blockId) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const voterId = getVoterId();
  const { error } = await supabase
    .from("today_page_votes")
    .delete()
    .eq("block_id", blockId)
    .eq("voter_id", voterId);
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

const MEDIA_BUCKET = "today-media";

/** Uploads an image/video file from the admin's device to Supabase Storage and returns its public URL. */
export async function uploadMedia(file) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
