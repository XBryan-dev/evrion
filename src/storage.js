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

const COMMUNITY_MEDIA_BUCKET = "community-media";

/** Uploads an optional image attached to a public (not-logged-in) situation submission. */
export async function uploadCommunityMedia(file) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from(COMMUNITY_MEDIA_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(COMMUNITY_MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Submits a community situation. Always lands as "pending" — never auto-published. */
export async function submitSituation({ title, prompt, options, imageUrl }) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.from("community_submissions").insert({
    title,
    prompt,
    options,
    image_url: imageUrl || null,
    status: "pending",
  });
  if (error) throw error;
}

/** Admin-only: every submission, regardless of status. */
export async function fetchSubmissions() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("community_submissions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data;
}

/** Admin-only: updates exactly one submission (status, edited content, or both). */
export async function updateSubmission(id, patch) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase
    .from("community_submissions")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** Admin-only: deletes exactly one submission. */
export async function deleteSubmission(id) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.from("community_submissions").delete().eq("id", id);
  if (error) throw error;
}

/** Submits one feedback item. Always lands as "new" — independent from community submissions. */
export async function submitFeedback({ type, message, rating, pageContext, deviceInfo }) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.from("feedback_items").insert({
    type,
    message,
    rating: rating ?? null,
    page_context: pageContext || null,
    device_info: deviceInfo || null,
    status: "new",
  });
  if (error) throw error;
}

/** Admin-only: every feedback item, regardless of status. */
export async function fetchFeedback() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("feedback_items")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data;
}

/** Admin-only: updates exactly one feedback item (status change, typically). */
export async function updateFeedback(id, patch) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase
    .from("feedback_items")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** Admin-only: deletes exactly one feedback item. */
export async function deleteFeedback(id) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.from("feedback_items").delete().eq("id", id);
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/*  Analytics — a small, honest event-tracking foundation.              */
/*  Fire-and-forget: a tracking failure must never break the app, and   */
/*  it never blocks the UI waiting on a network round-trip.             */
/* ------------------------------------------------------------------ */

const VISITOR_ID_KEY = "evrion_visitor_id";
const SESSION_ID_KEY = "evrion_session_id";

/** A long-lived, anonymous, per-browser id. Returns whether it was just created (first-ever visit). */
export function getOrCreateVisitorId() {
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    let isNew = false;
    if (!id) {
      id = `vis_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(VISITOR_ID_KEY, id);
      isNew = true;
    }
    return { id, isNew };
  } catch (e) {
    return { id: `vis_${Date.now().toString(36)}`, isNew: true };
  }
}

/** A per-tab-session id — persists across reloads within the same tab, cleared when the tab closes. */
export function getOrCreateSessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_ID_KEY);
    if (!id) {
      id = `sess_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_ID_KEY, id);
    }
    return id;
  } catch (e) {
    return `sess_${Date.now().toString(36)}`;
  }
}

/** Records one analytics event. Never throws — a tracking hiccup should never break the app. */
export async function trackEvent(eventType, metadata = {}) {
  if (!supabase) return;
  try {
    const { id: visitorId } = getOrCreateVisitorId();
    const sessionId = getOrCreateSessionId();
    await supabase.from("analytics_events").insert({
      event_type: eventType,
      visitor_id: visitorId,
      session_id: sessionId,
      metadata,
    });
  } catch (e) {
    /* analytics is never allowed to break the app */
  }
}

/** Admin-only: raw events, optionally since a given ISO timestamp (omit for all-time). */
export async function fetchAnalyticsEvents(sinceIso) {
  if (!supabase) return [];
  let query = supabase.from("analytics_events").select("*").order("created_at", { ascending: false });
  if (sinceIso) query = query.gte("created_at", sinceIso);
  const { data, error } = await query;
  if (error || !data) return [];
  return data;
}
