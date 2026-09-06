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
/*                                                                      */
/*  Four distinct concepts, deliberately never conflated:               */
/*   - VISITOR: one persistent anonymous id per browser, forever.       */
/*   - SESSION: a period of continuous activity, ends after 30 minutes  */
/*     of inactivity — not tied to navigation, and not tied to closing  */
/*     the tab (closing and reopening within the timeout is still the   */
/*     same session; leaving one tab idle past the timeout starts a     */
/*     new one even without closing anything).                         */
/*   - PAGE VIEW: fired only on real top-level screen navigation (see   */
/*     the single call site in App's view-change effect) — never on     */
/*     re-renders, answer taps, or question changes within a quiz.      */
/*   - EVENT: a specific product interaction (quiz_started, etc.) that   */
/*     can happen many times in one session without implying a new      */
/*     visitor or session.                                             */
/* ------------------------------------------------------------------ */

const VISITOR_ID_KEY = "evrion_visitor_id";
const SESSION_ID_KEY = "evrion_session_id";
const SESSION_LAST_ACTIVE_KEY = "evrion_session_last_active";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes, per spec

/** A long-lived, anonymous, per-browser id — the ONE thing that defines "a visitor". Never regenerated once set. */
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
    // Storage unavailable (e.g. some private-browsing modes) — fall back to a
    // one-off id rather than crashing. This visitor won't persist, which is
    // an honest reflection of the environment, not a fabricated number.
    return { id: `vis_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`, isNew: true };
  }
}

/**
 * The current session id, using a real inactivity timeout — not tab
 * lifetime. Every call both resolves the id AND refreshes "last active",
 * so continued use naturally extends the same session. Only starts a new
 * session if more than SESSION_TIMEOUT_MS has passed since the last call.
 */
export function getOrCreateSessionId() {
  try {
    const now = Date.now();
    const lastActive = Number(localStorage.getItem(SESSION_LAST_ACTIVE_KEY) || 0);
    let id = localStorage.getItem(SESSION_ID_KEY);
    let isNewSession = false;
    if (!id || now - lastActive > SESSION_TIMEOUT_MS) {
      id = `sess_${now.toString(36)}${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(SESSION_ID_KEY, id);
      isNewSession = true;
    }
    localStorage.setItem(SESSION_LAST_ACTIVE_KEY, String(now));
    return { id, isNewSession };
  } catch (e) {
    return { id: `sess_${Date.now().toString(36)}`, isNewSession: true };
  }
}

/** A tiny, non-cryptographic hash — just enough to tell "same text" from "different text" for dedup purposes. */
function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return h.toString(36);
}

/**
 * Builds a deterministic dedup key for one event. Two calls with the SAME
 * key within the same short time bucket collapse into one database row —
 * that's what catches an accidental double-fire (a re-render quirk, a
 * double-tap, a retried network call). Two calls for a genuinely different
 * occurrence (a different question, a different day, different content, or
 * just later in time) get different keys and are correctly counted as
 * separate events.
 *
 * The bucket is deliberately short (2 seconds) — long enough to absorb a
 * real accidental duplicate, far shorter than the realistic pace of actual
 * distinct user actions, so legitimate repeats are never merged.
 */
function buildDedupKey(eventType, sessionId, metadata) {
  const bucket = Math.floor(Date.now() / 2000);
  let discriminator = "";
  if (eventType === "page_view") discriminator = metadata.page || "";
  else if (eventType === "quiz_started" || eventType === "quiz_completed") discriminator = metadata.categoryId || "";
  else if (eventType === "situation_played") discriminator = metadata.questionId || "";
  else if (eventType === "today_page_viewed") discriminator = metadata.date || "";
  else if (eventType === "community_submission") discriminator = metadata.title ? simpleHash(metadata.title) : "";
  else if (eventType === "feedback_submitted") discriminator = metadata.message ? simpleHash(metadata.message) : metadata.type || "";
  return `${sessionId}_${eventType}_${discriminator}_${bucket}`;
}

/**
 * Records one analytics event. Never throws — a tracking hiccup must never
 * break the app.
 *
 * Session detection lives HERE, not scattered across call sites: every
 * single tracked action (whatever it is) checks whether a new session has
 * started and, if so, writes exactly one session_started row first. This
 * means session_started can never be "forgotten" on some code path — it's
 * a property of the tracking function itself, not something each caller
 * has to remember to check.
 *
 * Deduplication: every row gets a deterministic client_event_id (see
 * buildDedupKey above), enforced unique at the database level (see
 * supabase-analytics-v2.sql). Using upsert with ignoreDuplicates means an
 * accidental double-call that produces the same key can never create a
 * second row — the database itself refuses it, which is a stronger
 * guarantee than any client-side-only heuristic.
 */
export async function trackEvent(eventType, metadata = {}) {
  if (!supabase) return;
  try {
    const { id: visitorId, isNew: isNewVisitor } = getOrCreateVisitorId();
    const { id: sessionId, isNewSession } = getOrCreateSessionId();

    if (isNewSession) {
      await supabase.from("analytics_events").upsert(
        {
          event_type: "session_started",
          visitor_id: visitorId,
          session_id: sessionId,
          metadata: { isNewVisitor },
          client_event_id: `${sessionId}_session_started`,
        },
        { onConflict: "client_event_id", ignoreDuplicates: true }
      );
    }

    if (eventType === "session_started") return; // already handled above, never fired twice

    const clientEventId = buildDedupKey(eventType, sessionId, metadata);
    await supabase.from("analytics_events").upsert(
      {
        event_type: eventType,
        visitor_id: visitorId,
        session_id: sessionId,
        metadata,
        client_event_id: clientEventId,
      },
      { onConflict: "client_event_id", ignoreDuplicates: true }
    );
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
