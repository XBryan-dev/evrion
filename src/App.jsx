import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Share2,
  RotateCcw,
  Layers,
  Lock,
  Plus,
  Trash2,
  Pencil,
  ChevronRight,
  ChevronLeft,
  X,
  Check,
  LogOut,
  CloudOff,
  UploadCloud,
} from "lucide-react";
import { supabase } from "./supabaseClient";
import { loadContent, saveContent, signIn, signOut, getSession, castVote, fetchVoteCounts } from "./storage";

/* ------------------------------------------------------------------ */
/*  EVRION — "What type of Cameroonian are you?"                      */
/*  Content lives in Supabase (public read, admin-only write) so the  */
/*  one owner's edits are what every visitor sees. Quiz results are   */
/*  shareable via a compact token in the URL.                         */
/* ------------------------------------------------------------------ */

const TRAITS = [
  { id: "directness", label: "Directness" },
  { id: "patience", label: "Patience" },
  { id: "chill", label: "Chill" },
  { id: "skepticism", label: "Skepticism" },
  { id: "diplomacy", label: "Diplomacy" },
  { id: "hustle", label: "Hustle" },
  { id: "loyalty", label: "Loyalty" },
  { id: "humor", label: "Humor" },
];

const uid = (p) => `${p}_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;

/* ------------------------------- Seed content ------------------------------- */

function buildSeedContent() {
  const categories = [
    {
      id: "cameroon-life",
      name: "Cameroon Life",
      description: "The everyday situations wey go expose your true colors.",
      order: 1,
      active: true,
    },
  ];

  const traits = TRAITS.map((t) => ({ id: t.id, name: t.label }));

  const personalities = [
    {
      id: "straight-shooter",
      name: "The Straight Shooter",
      emoji: "🎯",
      description:
        "You no get time for gragra. If e no correct, you go talk am for face — sweet or bitter. People fear you small but dem trust you pass anybody for the group chat.",
      order: 1,
      active: true,
      traitWeights: { directness: 3, skepticism: 1, hustle: 1, diplomacy: -1 },
    },
    {
      id: "veteran",
      name: "The Veteran",
      emoji: "🧘🏾",
      description:
        "Nothing shock you again. Man don enter your area for one hour and nobody dey, you don already see this film before. You dey manage Cameroon like say na PhD you get for am.",
      order: 2,
      active: true,
      traitWeights: { patience: 3, chill: 2, skepticism: 2 },
    },
    {
      id: "escape-artist",
      name: "The Escape Artist",
      emoji: "🌴",
      description:
        "When wahala show face, you don already dodge am since. You go laugh, you go vanish, you go make plan B before anybody sabi say plan A don fail.",
      order: 3,
      active: true,
      traitWeights: { chill: 3, humor: 2, skepticism: 1, directness: -1 },
    },
    {
      id: "peacemaker",
      name: "The Peacemaker",
      emoji: "🤝🏾",
      description:
        "Na you dey hold the group chat together. When bill go show face or beef wan start, you don already find middle ground before person even finish talk.",
      order: 4,
      active: true,
      traitWeights: { diplomacy: 3, loyalty: 2, patience: 1 },
    },
    {
      id: "hustler",
      name: "The Hustler",
      emoji: "⚡",
      description:
        "You no dey wait for luck, you dey create am. Whether na njangi, moto negotiation, or job wey never call — you dey always three steps ahead, already planning the next move.",
      order: 5,
      active: true,
      traitWeights: { hustle: 3, directness: 1, loyalty: 1 },
    },
  ];

  const questions = [
    {
      id: "q1",
      categoryId: "cameroon-life",
      title: "I Dey Come",
      order: 1,
      active: true,
      prompt: "How you go react?",
      chat: [
        { from: "you", text: "You reach?" },
        { from: "them", text: "I dey come" },
        { from: "you", text: "Bro??", meta: "45 minutes later" },
        { from: "them", text: "I dey road" },
        { from: "them", text: "I don enter your area.", meta: "1 hour later" },
        { from: "system", text: "You step outside. Nobody is there." },
      ],
    },
    {
      id: "q2",
      categoryId: "cameroon-life",
      title: "Weekend Plan",
      order: 2,
      active: true,
      prompt: "It's 6:30pm Saturday. Nobody has shown up. How you go react?",
      chat: [
        { from: "you", text: "Guys let's meet Saturday" },
        { from: "them", text: "I'm in", who: "Divine" },
        { from: "them", text: "Same", who: "Blessing" },
        { from: "them", text: "Depends on time", who: "Kum" },
        { from: "you", text: "Let's say 4pm" },
        { from: "them", text: "4 is tight, can we say 5", who: "Divine" },
        { from: "them", text: "5 works for me", who: "Blessing" },
        { from: "them", text: "Actually I might not make it again", who: "Kum" },
      ],
    },
    {
      id: "q3",
      categoryId: "cameroon-life",
      title: "Splitting The Bill",
      order: 3,
      active: true,
      prompt: "The bill lands on the table. How you go handle am?",
      chat: [
        { from: "them", text: "Guys make we split evenly na", who: "Nkeng" },
        { from: "them", text: "But I only chop salad and water o", who: "Achu" },
      ],
    },
    {
      id: "q4",
      categoryId: "cameroon-life",
      title: "Njangi Day",
      order: 4,
      active: true,
      prompt: "It's your turn to reply in the group. Wetin you go do?",
      chat: [
        { from: "them", text: "Contributions due today o, no excuse", who: "Treasurer" },
        { from: "them", text: "🎤 Voice note: \"Chai, money tight for me this month...\"", who: "Manyi" },
      ],
    },
    {
      id: "q5",
      categoryId: "cameroon-life",
      title: "The Moto Negotiation",
      order: 5,
      active: true,
      prompt: "How the negotiation go end for you?",
      chat: [
        { from: "you", text: "Bonamoussadi, how much?" },
        { from: "them", text: "500" },
        { from: "you", text: "Ah no, 300" },
        { from: "them", text: "Enter, 400 last last" },
      ],
    },
    {
      id: "q6",
      categoryId: "cameroon-life",
      title: "The Family Forward",
      order: 6,
      active: true,
      prompt: "Wetin you go do for the family WhatsApp group?",
      chat: [
        { from: "them", text: "URGENT!! Share before 12am or bad luck go follow you 🙏🏾", who: "Aunty" },
        { from: "system", text: "Forwarded 15 times" },
      ],
    },
    {
      id: "q7",
      categoryId: "cameroon-life",
      title: "We Will Call You",
      order: 7,
      active: true,
      prompt: "How you dey manage the wait?",
      chat: [
        { from: "them", text: "Thank you, we will call you soon.", who: "Interviewer" },
        { from: "system", text: "3 weeks pass. No call." },
      ],
    },
    {
      id: "q8",
      categoryId: "cameroon-life",
      title: "The Landlord Text",
      order: 8,
      active: true,
      prompt: "The message lands at 6am. How you reply?",
      chat: [{ from: "them", text: "Good morning. Rent be due since Monday 🙂", who: "Landlord" }],
    },
    {
      id: "q9",
      categoryId: "cameroon-life",
      title: "Cousin From Abroad",
      order: 9,
      active: true,
      prompt: "The airport run lands on you. Wetin you go do?",
      chat: [
        { from: "them", text: "I dey land Douala 6am, una go fit come pick me?", who: "Cousin" },
        { from: "system", text: "37 messages follow about who go carry which bag." },
      ],
    },
    {
      id: "q10",
      categoryId: "cameroon-life",
      title: "The Go-Slow",
      order: 10,
      active: true,
      format: "scene",
      prompt: "You're stuck in the taxi. How you manage the go-slow?",
      chat: [
        { from: "system", text: "Traffic hasn't moved in 40 minutes." },
        { from: "system", text: "Somebody dey horn like say na him go move the whole road." },
      ],
    },
    {
      id: "q11",
      categoryId: "cameroon-life",
      title: "The Group Photo",
      order: 11,
      active: true,
      format: "quick",
      prompt: "Everyone's posing for a photo before eating and the food is getting cold. How hungry-you go react?",
      chat: [],
    },
  ];

  const answersByQuestion = {
    q1: [
      ["Call am, vex small: 'Wusai you dey exactly?'", { directness: 2, patience: -1 }],
      ["Text 'ok no wahala 😊' — for mind you don already vex", { diplomacy: 2, humor: 1 }],
      ["Continue dey wait, you don already sabi this film", { patience: 2, chill: 1 }],
      ["Enter house back. No more explanation needed.", { skepticism: 2, chill: 1 }],
    ],
    q2: [
      ["Blow the group chat: 'Wusai everybody dey??'", { directness: 2 }],
      ["Order food, watch a film alone, no stress", { chill: 2, patience: 1 }],
      ["Quiet mental note: next time na you go dodge dem", { skepticism: 2 }],
      ["Laugh am off — 'na so Cameroon time dey be'", { humor: 2, chill: 1 }],
    ],
    q3: [
      ["Bring out your phone calculator, break the bill exact-exact", { directness: 2, hustle: 1 }],
      ["Pay the small extra, no wan make drama for public", { diplomacy: 2 }],
      ["Suggest the person who chopped small should pay small", { diplomacy: 1, directness: 1 }],
      ["Volunteer to organize everything, again — na you always be treasurer", { hustle: 2, loyalty: 1 }],
    ],
    q4: [
      ["Send your own contribution first, no comment for anybody", { loyalty: 2, hustle: 1 }],
      ["Reply publicly: 'We understand, but deadline na deadline'", { directness: 2 }],
      ["DM the person quietly so e no shame for group", { diplomacy: 2, loyalty: 1 }],
      ["Say nothing — you've seen this movie before", { patience: 2, skepticism: 1 }],
    ],
    q5: [
      ["Stand your ground, 300 or nothing", { directness: 2, skepticism: 1 }],
      ["Meet halfway quick quick, no time to waste", { diplomacy: 2, chill: 1 }],
      ["Pay the 400, small change no go kill you", { chill: 2, loyalty: 1 }],
      ["Walk off and find another moto at your price", { hustle: 2, skepticism: 1 }],
    ],
    q6: [
      ["Reply with a fact-check link, straight, no sugar", { directness: 2, skepticism: 2 }],
      ["React with 🙏🏾 and move on, no explanation", { diplomacy: 1, chill: 2 }],
      ["Mute the group small small, you don tire", { skepticism: 1, chill: 1 }],
      ["Forward am sef, joke joke, make the group laugh", { humor: 2 }],
    ],
    q7: [
      ["Follow up with a polite email every week, no shame", { hustle: 2, directness: 1 }],
      ["Move on, apply to ten more places the same day", { hustle: 2, chill: 1 }],
      ["Keep hoping, refresh your email every hour", { patience: 2 }],
      ["You already know 'we will call you' means no", { skepticism: 2, humor: 1 }],
    ],
    q8: [
      ["Reply immediately: 'Good morning sir, sending today'", { directness: 2, loyalty: 1 }],
      ["Read it, no reply — plan your response for later", { patience: 1, skepticism: 1 }],
      ["Call am direct, explain and negotiate small extension", { diplomacy: 2 }],
      ["Laugh at the smiley face — even landlord dey try soft you", { humor: 2, chill: 1 }],
    ],
    q9: [
      ["Volunteer straight, you've already planned the route", { loyalty: 2, hustle: 1 }],
      ["Wait for somebody else to offer first", { patience: 1, skepticism: 1 }],
      ["Organize the whole group — who dey pick, who dey cook", { hustle: 2, diplomacy: 1 }],
      ["Joke that you're only coming if there's a gift for you", { humor: 2 }],
    ],
    q10: [
      ["Wind down the glass, ask the person wetin dey happen", { directness: 1, humor: 1 }],
      ["Put in your earpiece, enter your own world completely", { chill: 2 }],
      ["Start counting the minutes — it's going in the group chat later", { skepticism: 1, directness: 1 }],
      ["Chat with the driver and find out what's really going on", { diplomacy: 1, patience: 2 }],
    ],
    q11: [
      ["Snap it quick quick so everybody fit chop", { hustle: 1, directness: 1 }],
      ["Complain small but still pose — e dey normal", { humor: 1, diplomacy: 1 }],
      ["You already chopped one piece before the photo. No apology.", { directness: 2, chill: 1 }],
      ["You're the one who suggested the photo — memories no dey wait", { loyalty: 1, humor: 1 }],
    ],
  };

  const answers = [];
  Object.entries(answersByQuestion).forEach(([qId, list]) => {
    list.forEach(([text, weights], i) => {
      answers.push({ id: uid("a"), questionId: qId, text, order: i + 1, weights });
    });
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayPages = [
    {
      id: uid("tp"),
      date: todayStr,
      status: "published",
      blocks: [
        {
          id: uid("blk"),
          type: "announcement",
          badge: "NEW",
          title: "Welcome to Today's Page",
          body: "This is EVRION's living front page — new stuff drops here, edited from Admin, no rebuild needed.",
          ctaLabel: "Take the vibe check",
          ctaUrl: "",
        },
        {
          id: uid("blk"),
          type: "situation",
          title: "The Data Bundle",
          format: "quick",
          prompt: "Your data finishes mid-video call. How you go react?",
          chat: [],
        },
        {
          id: uid("blk"),
          type: "poll",
          question: "Who's more likely to say 'I dey come' and disappear?",
          options: [
            { id: uid("opt"), text: "My guy" },
            { id: uid("opt"), text: "My cousin" },
            { id: uid("opt"), text: "Honestly, me" },
          ],
        },
      ],
    },
  ];

  return { categories, questions, answers, traits, personalities, todayPages };
}

/* ------------------------------- Share token ------------------------------- */

function encodeResult(personalityId, categoryId, pct) {
  const raw = JSON.stringify({ p: personalityId, c: categoryId, m: pct });
  try {
    return btoa(unescape(encodeURIComponent(raw)));
  } catch (e) {
    return "";
  }
}
function decodeResult(token) {
  try {
    const raw = decodeURIComponent(escape(atob(token)));
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

/* ------------------------------- Scoring ------------------------------- */

function scorePersonalities(traitScores, personalities) {
  const results = personalities
    .filter((p) => p.active !== false)
    .map((p) => {
      let score = 0;
      Object.entries(p.traitWeights || {}).forEach(([traitId, weight]) => {
        score += (traitScores[traitId] || 0) * weight;
      });
      return { personality: p, score };
    });
  results.sort((a, b) => b.score - a.score);
  const positiveTotal = results.reduce((s, r) => s + Math.max(0, r.score), 0);
  const top = results[0];
  let pct;
  if (!top || results.length === 0) pct = 0;
  else if (positiveTotal <= 0) pct = Math.round(100 / results.length);
  else pct = Math.max(34, Math.min(98, Math.round((Math.max(0, top.score) / positiveTotal) * 100)));
  return { ranked: results, top: top ? top.personality : null, pct };
}

/* ------------------------------------------------------------------ */
/*  Styling                                                            */
/* ------------------------------------------------------------------ */

const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Manrope:wght@400;500;600;700;800&display=swap');

    * { box-sizing: border-box; }
    html, body { overscroll-behavior-y: none; }
    .evrion-root {
      font-family: 'Manrope', system-ui, sans-serif;
      background: #12190F;
      min-height: 100vh;
      min-height: 100dvh;
      color: #F6EFDD;
      display: flex;
      justify-content: center;
      padding: 0;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      overscroll-behavior-y: contain;
    }
    .evrion-shell {
      width: 100%;
      max-width: 480px;
      min-height: 100vh;
      min-height: 100dvh;
      background: linear-gradient(180deg, #16210F 0%, #12190F 55%);
      position: relative;
      display: flex;
      flex-direction: column;
      box-shadow: 0 0 60px rgba(0,0,0,0.5);
    }
    .evrion-wordmark {
      font-family: 'Archivo Black', system-ui, sans-serif;
      letter-spacing: 0.02em;
    }
    .evrion-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 24px 20px 40px;
    }
    .evrion-btn {
      font-family: 'Manrope', sans-serif;
      font-weight: 700;
      border: none;
      border-radius: 14px;
      padding: 15px 20px;
      cursor: pointer;
      font-size: 15px;
      transition: transform 0.12s ease, filter 0.12s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      touch-action: manipulation;
      user-select: none;
      -webkit-user-select: none;
    }
    .evrion-btn:active { transform: scale(0.97); }
    .evrion-btn-primary { background: #E7B10A; color: #12190F; }
    .evrion-btn-primary:hover { filter: brightness(1.08); }
    .evrion-btn-secondary { background: transparent; color: #F6EFDD; border: 1.5px solid rgba(246,239,221,0.35); }
    .evrion-btn-secondary:hover { border-color: rgba(246,239,221,0.7); }
    .evrion-btn-danger { background: #C1442E; color: #FFF; }
    .evrion-btn-block { width: 100%; }
    .evrion-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .evrion-answer {
      width: 100%;
      text-align: left;
      background: #1D2A16;
      border: 1.5px solid rgba(246,239,221,0.12);
      color: #F6EFDD;
      border-radius: 14px;
      padding: 14px 16px;
      font-family: 'Manrope', sans-serif;
      font-size: 14.5px;
      font-weight: 600;
      line-height: 1.4;
      cursor: pointer;
      transition: border-color 0.15s ease, background 0.15s ease, transform 0.1s ease;
      touch-action: manipulation;
      user-select: none;
      -webkit-user-select: none;
    }
    .evrion-answer:hover { border-color: #E7B10A; background: #23301A; }
    .evrion-answer:active { transform: scale(0.98); }
    .evrion-answer.selected {
      border-color: #E7B10A;
      background: #E7B10A;
      color: #12190F;
    }
    .evrion-answer.dimmed { opacity: 0.35; }
    .evrion-answer:disabled { cursor: default; }

    .evrion-bubble-row { display: flex; margin-bottom: 8px; }
    .evrion-bubble-row.them { justify-content: flex-start; }
    .evrion-bubble-row.you { justify-content: flex-end; }
    .evrion-bubble-row.system { justify-content: center; }
    .evrion-bubble {
      max-width: 78%;
      padding: 10px 14px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.4;
      font-weight: 500;
      animation: evrion-pop 0.22s ease both;
    }
    .evrion-bubble.them { background: #F6EFDD; color: #12190F; border-bottom-left-radius: 4px; }
    .evrion-bubble.you { background: #E7B10A; color: #12190F; border-bottom-right-radius: 4px; }
    /* System/narrator lines: a real readable line, not fine print */
    .evrion-bubble.system {
      background: rgba(246,239,221,0.06);
      border: 1px solid rgba(246,239,221,0.12);
      color: #F6EFDD;
      font-size: 15px;
      font-weight: 600;
      font-style: normal;
      line-height: 1.45;
      text-align: center;
      max-width: 92%;
      border-radius: 14px;
    }
    .evrion-who {
      font-size: 10.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      opacity: 0.55;
      margin-bottom: 2px;
    }
    .evrion-meta {
      font-size: 12.5px;
      font-weight: 700;
      color: rgba(246,239,221,0.6);
      text-align: center;
      margin: 10px 0;
    }
    @keyframes evrion-pop {
      from { opacity: 0; transform: translateY(6px) scale(0.97); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* Scene format: a narrative read instead of chat bubbles */
    .evrion-scene-line {
      font-size: 16.5px;
      line-height: 1.6;
      font-weight: 500;
      color: #F6EFDD;
      margin-bottom: 12px;
      animation: evrion-pop 0.25s ease both;
    }
    .evrion-scene-line:last-child { margin-bottom: 0; }
    .evrion-scene-line.narrator {
      color: rgba(246,239,221,0.65);
      font-weight: 600;
      font-size: 14.5px;
    }

    .evrion-card {
      background: #1B2715;
      border: 1px solid rgba(246,239,221,0.1);
      border-radius: 18px;
      padding: 18px;
    }
    .evrion-progress-track {
      height: 5px;
      background: rgba(246,239,221,0.12);
      border-radius: 999px;
      overflow: hidden;
    }
    .evrion-progress-fill {
      height: 100%;
      background: #E7B10A;
      border-radius: 999px;
      transition: width 0.3s ease;
    }
    .evrion-input, .evrion-textarea, .evrion-select {
      width: 100%;
      background: #12190F;
      border: 1.5px solid rgba(246,239,221,0.18);
      color: #F6EFDD;
      border-radius: 10px;
      padding: 10px 12px;
      font-family: 'Manrope', sans-serif;
      font-size: 14px;
    }
    .evrion-textarea { resize: vertical; min-height: 60px; }
    .evrion-label {
      font-size: 11.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: rgba(246,239,221,0.55);
      margin-bottom: 5px;
      display: block;
    }
    .evrion-field { margin-bottom: 12px; }
    .evrion-tab {
      padding: 8px 13px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      border: 1.5px solid rgba(246,239,221,0.15);
      background: transparent;
      color: rgba(246,239,221,0.7);
    }
    .evrion-tab.active { background: #E7B10A; color: #12190F; border-color: #E7B10A; }
    .evrion-tabs { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; margin-bottom: 16px; }
    .evrion-tabs::-webkit-scrollbar { display: none; }

    .evrion-list-item {
      background: #1B2715;
      border: 1px solid rgba(246,239,221,0.1);
      border-radius: 12px;
      padding: 12px 14px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .evrion-icon-btn {
      background: rgba(246,239,221,0.08);
      border: none;
      color: #F6EFDD;
      border-radius: 8px;
      width: 30px;
      height: 30px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
    }
    .evrion-icon-btn:hover { background: rgba(246,239,221,0.18); }
    .evrion-icon-btn.danger:hover { background: #C1442E; }

    .evrion-modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.6);
      display: flex; align-items: flex-end; justify-content: center; z-index: 50;
    }
    .evrion-modal {
      width: 100%; max-width: 480px; max-height: 88vh; overflow-y: auto;
      background: #16210F; border-radius: 20px 20px 0 0;
      padding: 20px 20px 28px; border-top: 1px solid rgba(246,239,221,0.15);
    }
    .evrion-weight-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 7px 0; border-bottom: 1px solid rgba(246,239,221,0.06);
    }
    .evrion-weight-input {
      width: 60px; background: #12190F; border: 1.5px solid rgba(246,239,221,0.18);
      color: #F6EFDD; border-radius: 8px; padding: 5px 6px; text-align: center; font-size: 13px;
    }
    .evrion-chip {
      display: inline-flex; align-items: center; gap: 4px;
      background: rgba(231,177,10,0.15); color: #E7B10A;
      border-radius: 999px; padding: 3px 9px; font-size: 11.5px; font-weight: 700;
    }
    .evrion-banner {
      display: flex; align-items: center; gap: 10px;
      background: rgba(193,68,46,0.15); border: 1px solid rgba(193,68,46,0.4);
      color: #F3C8BC; border-radius: 12px; padding: 12px 14px; font-size: 12.5px;
      margin-bottom: 16px; line-height: 1.4;
    }
    .evrion-empty {
      text-align: center; padding: 40px 16px; color: rgba(246,239,221,0.5); font-size: 14px;
    }

    /* ---------------------------------------------------------------- */
    /*  Today's Page — EVRION's new visual direction: midnight + violet  */
    /*  + controlled warm orange. Scoped to .evtoday- so the rest of the */
    /*  app (quiz, admin) is untouched for now.                          */
    /* ---------------------------------------------------------------- */
    .evtoday-root {
      background: radial-gradient(120% 160% at 50% -10%, #201640 0%, #0B0A16 55%, #08070F 100%);
      min-height: 100%;
      color: #EDEBFA;
    }
    .evtoday-header {
      padding: 22px 20px 6px;
      text-align: center;
    }
    .evtoday-eyebrow {
      font-size: 11.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
      color: #B79CFF; opacity: 0.85; margin-bottom: 4px;
    }
    .evtoday-date {
      font-size: 13px; opacity: 0.5; margin-bottom: 2px;
    }
    .evtoday-block {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(183,156,255,0.16);
      border-radius: 20px;
      padding: 20px;
      margin: 0 20px 16px;
      backdrop-filter: blur(6px);
    }
    .evtoday-block-text .evtoday-heading {
      font-family: 'Archivo Black', sans-serif;
      font-size: 20px;
      margin-bottom: 8px;
      color: #F4F1FF;
    }
    .evtoday-block-text p { font-size: 15px; line-height: 1.65; opacity: 0.85; margin: 0; }

    .evtoday-image img, .evtoday-video video, .evtoday-video iframe {
      width: 100%; border-radius: 14px; display: block; background: #000;
    }
    .evtoday-caption { font-size: 12.5px; opacity: 0.55; margin-top: 8px; text-align: center; }

    .evtoday-badge {
      display: inline-flex; align-items: center; gap: 4px;
      background: linear-gradient(90deg, #FF7A45, #FF9E5E);
      color: #1A0F06; font-weight: 800; font-size: 10.5px; letter-spacing: 0.05em;
      text-transform: uppercase; padding: 4px 10px; border-radius: 999px; margin-bottom: 10px;
    }
    .evtoday-announce-title { font-family: 'Archivo Black', sans-serif; font-size: 19px; margin-bottom: 8px; color: #F4F1FF; }
    .evtoday-announce-body { font-size: 14.5px; line-height: 1.6; opacity: 0.85; margin-bottom: 14px; }

    .evtoday-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      width: 100%; padding: 14px 18px; border-radius: 14px; border: none;
      font-weight: 800; font-size: 14.5px; cursor: pointer; text-decoration: none;
      touch-action: manipulation;
    }
    .evtoday-btn-primary { background: linear-gradient(90deg, #8B5CF6, #6D28D9); color: #FFFFFF; }
    .evtoday-btn-secondary { background: transparent; border: 1.5px solid rgba(237,235,250,0.3); color: #EDEBFA; }
    .evtoday-btn-orange { background: linear-gradient(90deg, #FF7A45, #F5590E); color: #1A0F06; }

    .evtoday-poll-q { font-size: 15.5px; font-weight: 700; margin-bottom: 14px; color: #F4F1FF; }
    .evtoday-poll-option {
      position: relative;
      width: 100%; text-align: left; padding: 12px 14px; margin-bottom: 8px;
      border-radius: 12px; border: 1.5px solid rgba(183,156,255,0.25);
      background: rgba(139,92,246,0.08); color: #EDEBFA; font-weight: 600; font-size: 14px;
      cursor: pointer; overflow: hidden; touch-action: manipulation;
    }
    .evtoday-poll-fill {
      position: absolute; inset: 0; background: rgba(139,92,246,0.28);
      transition: width 0.5s ease; z-index: 0;
    }
    .evtoday-poll-option-inner { position: relative; z-index: 1; display: flex; justify-content: space-between; gap: 8px; }
    .evtoday-poll-note { font-size: 11.5px; opacity: 0.5; margin-top: 4px; }

    .evtoday-situation-title { font-family: 'Archivo Black', sans-serif; font-size: 18px; margin-bottom: 12px; color: #F4F1FF; }

    .evtoday-empty {
      text-align: center; padding: 60px 20px; opacity: 0.55; font-size: 14px;
    }
    .evtoday-fallback-note {
      text-align: center; font-size: 11.5px; opacity: 0.45; margin: 0 20px 12px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.04em;
    }

    /* Admin: Today's Page tab reuses the app's existing dark-green admin
       chrome, with violet accents only where it directly represents the
       new Today's Page content, so Admin still reads as one cohesive tool. */
    .evrion-today-admin-block {
      background: #1B2715;
      border: 1px solid rgba(183,156,255,0.25);
      border-radius: 14px;
      padding: 12px 14px;
      margin-bottom: 8px;
    }
    .evrion-today-type-tag {
      display: inline-flex; align-items: center; gap: 4px;
      background: rgba(183,156,255,0.15); color: #C4AEFF;
      border-radius: 999px; padding: 3px 9px; font-size: 11px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.03em;
    }
    .evrion-status-pill {
      display: inline-flex; align-items: center; gap: 4px;
      border-radius: 999px; padding: 3px 10px; font-size: 11px; font-weight: 800;
      text-transform: uppercase; letter-spacing: 0.03em;
    }
    .evrion-status-pill.published { background: rgba(46,111,78,0.35); color: #8FE0AF; }
    .evrion-status-pill.draft { background: rgba(246,239,221,0.1); color: rgba(246,239,221,0.6); }
  `}</style>
);

/* ------------------------------------------------------------------ */
/*  Small shared pieces                                                */
/* ------------------------------------------------------------------ */

function TopBar({ onBack, title, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 4px" }}>
      <div style={{ width: 32 }}>
        {onBack && (
          <button className="evrion-icon-btn" onClick={onBack} aria-label="Back">
            <ChevronLeft size={18} />
          </button>
        )}
      </div>
      <div style={{ fontWeight: 800, fontSize: 14, opacity: 0.8 }}>{title}</div>
      <div style={{ width: 32, display: "flex", justifyContent: "flex-end" }}>{right}</div>
    </div>
  );
}

function ChatScene({ question }) {
  const format = question.format || "chat"; // "chat" | "scene" | "quick"
  const [shown, setShown] = useState(0);
  const total = (question.chat || []).length;

  useEffect(() => {
    setShown(0);
    const lines = question.chat || [];
    if (lines.length === 0 || format === "quick") return;
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= lines.length) clearInterval(interval);
    }, format === "scene" ? 620 : 480);
    return () => clearInterval(interval);
  }, [question.id, format]);

  if (format === "quick" || total === 0) return null;

  const skip = () => shown < total && setShown(total);

  if (format === "scene") {
    return (
      <div className="evrion-card" style={{ marginBottom: 18, cursor: shown < total ? "pointer" : "default" }} onClick={skip}>
        {shown < total && (
          <div style={{ textAlign: "center", fontSize: 10.5, opacity: 0.35, marginBottom: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Tap to skip
          </div>
        )}
        {question.chat.slice(0, shown).map((line, idx) => (
          <div key={idx} className={`evrion-scene-line ${line.from === "system" ? "narrator" : ""}`}>
            {line.who ? `${line.who}: ` : ""}{line.text}
          </div>
        ))}
      </div>
    );
  }

  // "chat" format (default)
  return (
    <div
      className="evrion-card"
      style={{ marginBottom: 18, cursor: shown < total ? "pointer" : "default" }}
      onClick={skip}
    >
      {shown < total && (
        <div style={{ textAlign: "center", fontSize: 10.5, opacity: 0.35, marginBottom: 6, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Tap to skip
        </div>
      )}
      {question.chat.slice(0, shown).map((line, idx) => {
        if (line.from === "system") {
          return (
            <div key={idx} className="evrion-bubble-row system">
              <div className="evrion-bubble system">{line.text}</div>
            </div>
          );
        }
        return (
          <div key={idx}>
            {line.meta && <div className="evrion-meta">{line.meta}</div>}
            <div className={`evrion-bubble-row ${line.from}`}>
              <div className={`evrion-bubble ${line.from}`}>
                {line.who && <div className="evrion-who">{line.who}</div>}
                {line.text}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Public views                                                       */
/* ------------------------------------------------------------------ */

function HomeView({ onStart, onAdmin, onToday }) {
  return (
    <div className="evrion-scroll" style={{ display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "100%" }}>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div className="evrion-wordmark" style={{ fontSize: 34, color: "#E7B10A" }}>EVRION</div>
        <div style={{ fontSize: 13, letterSpacing: "0.04em", opacity: 0.6, marginTop: 2 }}>made for the vibes</div>
      </div>

      <div style={{ marginTop: 34, marginBottom: 18 }}>
        <div className="evrion-wordmark" style={{ fontSize: 28, lineHeight: 1.15, color: "#F6EFDD" }}>
          What type of Cameroonian are you?
        </div>
      </div>

      <p style={{ fontSize: 15, lineHeight: 1.6, opacity: 0.75, marginBottom: 30 }}>
        Not a test. Not general knowledge. Just those little situations that somehow expose you.
      </p>

      <button className="evrion-btn evrion-btn-primary evrion-btn-block" onClick={onStart}>
        Start the vibe check <ChevronRight size={17} />
      </button>

      <button
        className="evrion-btn evrion-btn-secondary evrion-btn-block"
        style={{ marginTop: 10 }}
        onClick={onToday}
      >
        🗓 Today's Page
      </button>

      <button
        onClick={onAdmin}
        style={{ background: "none", border: "none", color: "rgba(246,239,221,0.35)", fontSize: 12, marginTop: 22, cursor: "pointer" }}
      >
        Admin
      </button>
    </div>
  );
}

function CategoryView({ categories, onPick, onBack }) {
  const active = categories.filter((c) => c.active !== false).sort((a, b) => a.order - b.order);
  return (
    <div>
      <TopBar onBack={onBack} title="Choose a category" />
      <div className="evrion-scroll">
        {active.length === 0 && (
          <div className="evrion-empty">No categories yet. Check back soon — new EVRION quizzes dey come.</div>
        )}
        {active.map((c) => (
          <button
            key={c.id}
            className="evrion-card"
            style={{ width: "100%", textAlign: "left", marginBottom: 12, cursor: "pointer", border: "1.5px solid rgba(246,239,221,0.1)" }}
            onClick={() => onPick(c)}
          >
            <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 4, fontFamily: "'Archivo Black', sans-serif" }}>{c.name}</div>
            <div style={{ fontSize: 13.5, opacity: 0.65, lineHeight: 1.4 }}>{c.description}</div>
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, color: "#E7B10A", fontSize: 13, fontWeight: 700 }}>
              Play <ChevronRight size={15} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function QuizView({ category, questions, answersByQuestion, onFinish, onBack }) {
  const active = questions
    .filter((q) => q.categoryId === category.id && q.active !== false)
    .sort((a, b) => a.order - b.order);
  const [index, setIndex] = useState(0);
  const [traitScores, setTraitScores] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const question = active.length > 0 ? active[index] : null;

  useEffect(() => {
    setSelectedId(null);
  }, [question?.id]);

  if (active.length === 0) {
    return (
      <div>
        <TopBar onBack={onBack} title={category.name} />
        <div className="evrion-empty">No situations here yet. Try another category.</div>
      </div>
    );
  }

  const answers = (answersByQuestion[question.id] || []).slice().sort((a, b) => a.order - b.order);

  const pickAnswer = (answer) => {
    if (selectedId) return; // already advancing, ignore extra taps
    setSelectedId(answer.id);
    const next = { ...traitScores };
    Object.entries(answer.weights || {}).forEach(([traitId, w]) => {
      next[traitId] = (next[traitId] || 0) + w;
    });
    setTraitScores(next);
    setTimeout(() => {
      if (index + 1 < active.length) {
        setIndex(index + 1);
      } else {
        onFinish(next);
      }
    }, 320);
  };

  const pct = Math.round((index / active.length) * 100);
  const isQuick = question.format === "quick";

  return (
    <div>
      <TopBar onBack={index === 0 ? onBack : () => setIndex(index - 1)} title={`Question ${index + 1} of ${active.length}`} />
      <div style={{ padding: "0 20px" }}>
        <div className="evrion-progress-track">
          <div className="evrion-progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="evrion-scroll" style={{ paddingTop: 18 }}>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: isQuick ? 23 : 19, marginBottom: 14 }}>{question.title}</div>
        <ChatScene question={question} key={question.id} />
        <div style={{ fontSize: isQuick ? 17 : 14.5, fontWeight: 700, marginBottom: 12, opacity: 0.9 }}>{question.prompt}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {answers.map((a) => {
            const isSelected = selectedId === a.id;
            const isDimmed = selectedId && !isSelected;
            return (
              <button
                key={a.id}
                className={`evrion-answer ${isSelected ? "selected" : ""} ${isDimmed ? "dimmed" : ""}`}
                onClick={() => pickAnswer(a)}
                disabled={!!selectedId}
              >
                {a.text}
              </button>
            );
          })}
          {answers.length === 0 && <div className="evrion-empty">No answers set for this situation yet.</div>}
        </div>
      </div>
    </div>
  );
}

function ResultView({ personality, pct, onShare, onReplay, onCategories, shareStatus }) {
  return (
    <div>
      <TopBar title="Your result" />
      <div className="evrion-scroll" style={{ textAlign: "center" }}>
        <div style={{ fontSize: 12, letterSpacing: "0.05em", opacity: 0.55, marginBottom: 6, fontWeight: 700 }}>
          YOUR EVRION TYPE
        </div>
        <div style={{ fontSize: 52, marginBottom: 6 }}>{personality?.emoji}</div>
        <div className="evrion-wordmark" style={{ fontSize: 26, color: "#E7B10A", marginBottom: 14 }}>
          {personality?.name}
        </div>

        <div className="evrion-card" style={{ textAlign: "left", marginBottom: 16 }}>
          <p style={{ fontSize: 14.5, lineHeight: 1.6, opacity: 0.85, margin: 0 }}>{personality?.description}</p>
        </div>

        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 12.5, opacity: 0.55, marginBottom: 6 }}>Match strength</div>
          <div className="evrion-progress-track">
            <div className="evrion-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 6, color: "#E7B10A" }}>{pct}%</div>
        </div>

        <p style={{ fontSize: 11.5, opacity: 0.45, marginBottom: 26, lineHeight: 1.5 }}>
          This comes from your choices and the EVRION personality profile — there's no right or wrong answer here.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button className="evrion-btn evrion-btn-primary evrion-btn-block" onClick={onShare}>
            <Share2 size={16} /> {shareStatus || "Share result"}
          </button>
          <button className="evrion-btn evrion-btn-secondary evrion-btn-block" onClick={onReplay}>
            <RotateCcw size={16} /> Play again
          </button>
          <button className="evrion-btn evrion-btn-secondary evrion-btn-block" onClick={onCategories}>
            <Layers size={16} /> Try another category
          </button>
        </div>
      </div>
    </div>
  );
}

function SharedResultView({ personality, pct, onPlay }) {
  return (
    <div className="evrion-scroll" style={{ display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "100%", textAlign: "center" }}>
      <div className="evrion-wordmark" style={{ fontSize: 22, color: "#E7B10A", marginBottom: 18 }}>EVRION</div>
      <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 18 }}>A friend just found out:</div>
      <div style={{ fontSize: 52, marginBottom: 6 }}>{personality?.emoji || "🇨🇲"}</div>
      <div className="evrion-wordmark" style={{ fontSize: 24, marginBottom: 8 }}>{personality?.name || "Someone's EVRION type"}</div>
      <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 26 }}>{pct}% match</div>
      <button className="evrion-btn evrion-btn-primary evrion-btn-block" onClick={onPlay}>
        Find out your own type <ChevronRight size={17} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Today's Page — content-driven daily front page                     */
/*  Block types are defined once here; adding a new type later means   */
/*  adding one entry to TODAY_BLOCK_TYPES plus one render case below —  */
/*  nothing else about Today's Page needs to change.                   */
/* ------------------------------------------------------------------ */

const TODAY_BLOCK_TYPES = [
  { type: "text", label: "Text" },
  { type: "image", label: "Image" },
  { type: "video", label: "Video" },
  { type: "poll", label: "Poll" },
  { type: "situation", label: "Situation" },
  { type: "announcement", label: "Announcement / Feature" },
  { type: "button", label: "Button / Link" },
];

function defaultBlockData(type) {
  const base = { id: uid("blk"), type };
  switch (type) {
    case "text":
      return { ...base, heading: "", body: "" };
    case "image":
      return { ...base, url: "", caption: "", alt: "" };
    case "video":
      return { ...base, url: "", caption: "" };
    case "poll":
      return { ...base, question: "", options: [{ id: uid("opt"), text: "" }, { id: uid("opt"), text: "" }] };
    case "situation":
      return { ...base, title: "", format: "quick", prompt: "", chat: [] };
    case "announcement":
      return { ...base, badge: "", title: "", body: "", ctaLabel: "", ctaUrl: "" };
    case "button":
      return { ...base, label: "", url: "", style: "primary" };
    default:
      return base;
  }
}

function todaysDateString() {
  return new Date().toISOString().slice(0, 10);
}

function videoEmbedUrl(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

function PollBlockPublic({ block, pageDate }) {
  const [counts, setCounts] = useState(null);
  const [votedOption, setVotedOption] = useState(() => {
    try {
      return localStorage.getItem(`evrion_voted_${block.id}`) || null;
    } catch (e) {
      return null;
    }
  });
  const [busy, setBusy] = useState(false);

  const refreshCounts = useCallback(async () => {
    const c = await fetchVoteCounts(block.id);
    setCounts(c);
  }, [block.id]);

  useEffect(() => {
    if (votedOption) refreshCounts();
  }, [votedOption, refreshCounts]);

  const vote = async (optionId) => {
    if (votedOption || busy) return;
    setBusy(true);
    try {
      await castVote(pageDate, block.id, optionId);
      try {
        localStorage.setItem(`evrion_voted_${block.id}`, optionId);
      } catch (e) {
        /* ignore */
      }
      setVotedOption(optionId);
    } catch (e) {
      /* silently ignore — voting is a nice-to-have, not critical */
    } finally {
      setBusy(false);
    }
  };

  const total = counts ? Object.values(counts).reduce((s, n) => s + n, 0) : 0;

  return (
    <div className="evtoday-block">
      <div className="evtoday-poll-q">{block.question}</div>
      {(block.options || []).map((opt) => {
        const optCount = counts?.[opt.id] || 0;
        const pct = total > 0 ? Math.round((optCount / total) * 100) : 0;
        return (
          <button key={opt.id} className="evtoday-poll-option" onClick={() => vote(opt.id)} disabled={!!votedOption}>
            {votedOption && <div className="evtoday-poll-fill" style={{ width: `${pct}%` }} />}
            <div className="evtoday-poll-option-inner">
              <span>{opt.text}</span>
              {votedOption && <span>{pct}%</span>}
            </div>
          </button>
        );
      })}
      <div className="evtoday-poll-note">
        {votedOption ? `${total} vote${total !== 1 ? "s" : ""} so far` : "Tap to vote"}
      </div>
    </div>
  );
}

function TodayBlockPublic({ block, pageDate, onNavigate }) {
  switch (block.type) {
    case "text":
      return (
        <div className="evtoday-block evtoday-block-text">
          {block.heading && <div className="evtoday-heading">{block.heading}</div>}
          <p>{block.body}</p>
        </div>
      );
    case "image":
      return (
        <div className="evtoday-block evtoday-image">
          {block.url && <img src={block.url} alt={block.alt || ""} />}
          {block.caption && <div className="evtoday-caption">{block.caption}</div>}
        </div>
      );
    case "video": {
      const embed = videoEmbedUrl(block.url);
      return (
        <div className="evtoday-block evtoday-video">
          {embed ? (
            <iframe
              src={embed}
              title={block.caption || "video"}
              style={{ aspectRatio: "16/9" }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : block.url ? (
            <video src={block.url} controls style={{ aspectRatio: "16/9" }} />
          ) : null}
          {block.caption && <div className="evtoday-caption">{block.caption}</div>}
        </div>
      );
    }
    case "poll":
      return <PollBlockPublic block={block} pageDate={pageDate} />;
    case "situation":
      return (
        <div className="evtoday-block">
          {block.title && <div className="evtoday-situation-title">{block.title}</div>}
          <ChatScene question={{ id: block.id, format: block.format, chat: block.chat, prompt: "" }} />
          {block.prompt && <div style={{ fontSize: 14.5, fontWeight: 700, opacity: 0.9, color: "#F4F1FF" }}>{block.prompt}</div>}
        </div>
      );
    case "announcement":
      return (
        <div className="evtoday-block">
          {block.badge && <div className="evtoday-badge">{block.badge}</div>}
          {block.title && <div className="evtoday-announce-title">{block.title}</div>}
          {block.body && <div className="evtoday-announce-body">{block.body}</div>}
          {block.ctaLabel && (
            <button
              className="evtoday-btn evtoday-btn-orange"
              onClick={() => (block.ctaUrl ? window.open(block.ctaUrl, "_blank") : onNavigate?.())}
            >
              {block.ctaLabel} <ChevronRight size={16} />
            </button>
          )}
        </div>
      );
    case "button":
      return (
        <div style={{ margin: "0 20px 16px" }}>
          <a
            className={`evtoday-btn ${block.style === "secondary" ? "evtoday-btn-secondary" : "evtoday-btn-primary"}`}
            href={block.url || "#"}
            target={block.url?.startsWith("http") ? "_blank" : undefined}
            rel="noreferrer"
          >
            {block.label || "Tap here"}
          </a>
        </div>
      );
    default:
      return null;
  }
}

function TodayPageView({ content, onBack, onGoCategories }) {
  const pages = content.todayPages || [];
  const todayStr = todaysDateString();

  const exact = pages.find((p) => p.date === todayStr && p.status === "published");
  const fallback = !exact
    ? pages
        .filter((p) => p.status === "published" && p.date <= todayStr)
        .sort((a, b) => (a.date < b.date ? 1 : -1))[0]
    : null;
  const page = exact || fallback;

  return (
    <div className="evtoday-root" style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <TopBar onBack={onBack} title="" />
      <div className="evtoday-header">
        <div className="evtoday-eyebrow">Today's Page</div>
        <div className="evrion-wordmark" style={{ fontSize: 22, color: "#EDEBFA" }}>EVRION</div>
      </div>

      {!page && (
        <div className="evtoday-empty">Nothing here yet — check back soon.</div>
      )}

      {page && !exact && (
        <div className="evtoday-fallback-note">Showing {page.date}'s page</div>
      )}

      {page && (
        <div style={{ paddingTop: 8, paddingBottom: 24 }}>
          {(page.blocks || []).map((block) => (
            <TodayBlockPublic key={block.id} block={block} pageDate={page.date} onNavigate={onGoCategories} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Admin                                                               */
/* ------------------------------------------------------------------ */

function AdminLogin({ onBack, onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    if (!supabase) {
      setError("Supabase isn't configured yet — add your env vars first (see README.md).");
      return;
    }
    setBusy(true);
    try {
      await signIn(email, password);
      onSuccess();
    } catch (e) {
      setError(e.message || "Could not sign in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <TopBar onBack={onBack} title="Admin" />
      <div className="evrion-scroll">
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Lock size={26} style={{ marginBottom: 8, opacity: 0.7 }} />
          <div style={{ fontSize: 15, opacity: 0.7 }}>Owner access only</div>
        </div>
        {!supabase && (
          <div className="evrion-banner">
            <CloudOff size={16} /> Supabase isn't connected yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then create your admin user in Supabase's Authentication tab. See README.md.
          </div>
        )}
        <div className="evrion-field">
          <label className="evrion-label">Email</label>
          <input type="email" className="evrion-input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="evrion-field">
          <label className="evrion-label">Password</label>
          <input
            type="password"
            className="evrion-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>
        {error && <div style={{ color: "#E9967A", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button className="evrion-btn evrion-btn-primary evrion-btn-block" onClick={submit} disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </div>
    </div>
  );
}

const ADMIN_TABS = ["Today's Page", "Categories", "Questions", "Traits", "Personalities"];

function AdminDashboard({ content, setContent, connected, synced, onInitialize, onBack, onLogout }) {
  const [tab, setTab] = useState("Today's Page");
  const [modal, setModal] = useState(null);
  const [saveError, setSaveError] = useState("");

  const save = useCallback(
    async (next) => {
      setContent(next);
      if (connected) {
        try {
          await saveContent(next);
          setSaveError("");
        } catch (e) {
          setSaveError(e.message || "Could not save to Supabase.");
        }
      }
    },
    [setContent, connected]
  );

  const closeModal = () => setModal(null);

  return (
    <div>
      <TopBar
        onBack={onBack}
        title="EVRION Admin"
        right={
          <button className="evrion-icon-btn" onClick={onLogout} aria-label="Log out">
            <LogOut size={15} />
          </button>
        }
      />
      <div className="evrion-scroll">
        {!connected && (
          <div className="evrion-banner">
            <CloudOff size={16} /> Not connected to Supabase. Changes here will be lost on refresh — set up your env vars first.
          </div>
        )}
        {connected && !synced && (
          <div className="evrion-banner" style={{ background: "rgba(231,177,10,0.12)", borderColor: "rgba(231,177,10,0.4)", color: "#E7B10A" }}>
            <UploadCloud size={16} />
            <div style={{ flex: 1 }}>
              No content saved in Supabase yet. Push the starter quiz to your database to begin editing it.
              <button
                className="evrion-btn evrion-btn-primary"
                style={{ marginTop: 8, padding: "8px 12px", fontSize: 12.5 }}
                onClick={onInitialize}
              >
                Initialize content in Supabase
              </button>
            </div>
          </div>
        )}
        {saveError && <div className="evrion-banner">{saveError}</div>}

        <div className="evrion-tabs">
          {ADMIN_TABS.map((t) => (
            <button key={t} className={`evrion-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>

        {tab === "Today's Page" && <TodayPageTab content={content} save={save} />}
        {tab === "Categories" && <CategoriesTab content={content} save={save} setModal={setModal} />}
        {tab === "Questions" && <QuestionsTab content={content} save={save} setModal={setModal} />}
        {tab === "Traits" && <TraitsTab content={content} save={save} setModal={setModal} />}
        {tab === "Personalities" && <PersonalitiesTab content={content} save={save} setModal={setModal} />}
      </div>

      {modal && <Modal modal={modal} content={content} save={save} close={closeModal} />}
    </div>
  );
}

function SectionHeader({ label, onAdd }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 800, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.03em" }}>{label}</div>
      <button className="evrion-icon-btn" onClick={onAdd}><Plus size={16} /></button>
    </div>
  );
}

function TodayPageTab({ content, save }) {
  const pages = content.todayPages || [];
  const [date, setDate] = useState(todaysDateString());
  const existing = pages.find((p) => p.date === date);
  const [blocks, setBlocks] = useState(existing?.blocks || []);
  const [status, setStatus] = useState(existing?.status || "draft");
  const [blockModal, setBlockModal] = useState(null); // { block, isNew }
  const [showPreview, setShowPreview] = useState(false);
  const [addPicker, setAddPicker] = useState(false);
  const [savedFlash, setSavedFlash] = useState("");

  // When the selected date changes, load that date's existing page (or start blank).
  const switchDate = (newDate) => {
    setDate(newDate);
    const found = pages.find((p) => p.date === newDate);
    setBlocks(found?.blocks || []);
    setStatus(found?.status || "draft");
  };

  const persistPage = (nextBlocks, nextStatus) => {
    const pageId = existing?.id || uid("tp");
    const nextPage = { id: pageId, date, status: nextStatus, blocks: nextBlocks };
    const others = pages.filter((p) => p.date !== date);
    save({ ...content, todayPages: [...others, nextPage] });
  };

  const saveDraft = () => {
    persistPage(blocks, status === "published" ? "published" : "draft");
    setSavedFlash("Saved");
    setTimeout(() => setSavedFlash(""), 1800);
  };

  const publish = () => {
    setStatus("published");
    persistPage(blocks, "published");
    setSavedFlash("Published!");
    setTimeout(() => setSavedFlash(""), 1800);
  };

  const unpublish = () => {
    setStatus("draft");
    persistPage(blocks, "draft");
  };

  const addBlock = (type) => {
    setAddPicker(false);
    setBlockModal({ block: defaultBlockData(type), isNew: true });
  };

  const editBlock = (block) => setBlockModal({ block, isNew: false });

  const saveBlockFromModal = (updatedBlock) => {
    const exists = blocks.some((b) => b.id === updatedBlock.id);
    setBlocks(exists ? blocks.map((b) => (b.id === updatedBlock.id ? updatedBlock : b)) : [...blocks, updatedBlock]);
    setBlockModal(null);
  };

  const removeBlock = (id) => {
    if (!confirm("Remove this block from the page?")) return;
    setBlocks(blocks.filter((b) => b.id !== id));
  };

  const moveBlock = (idx, dir) => {
    const next = blocks.slice();
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setBlocks(next);
  };

  const otherDates = pages
    .map((p) => ({ date: p.date, status: p.status }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const previewPage = { date, status, blocks };

  return (
    <div>
      <div className="evrion-field">
        <label className="evrion-label">Editing page for</label>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="date" className="evrion-input" value={date} onChange={(e) => switchDate(e.target.value)} />
          <span className={`evrion-status-pill ${status === "published" ? "published" : "draft"}`}>
            {status === "published" ? "Live" : "Draft"}
          </span>
        </div>
        {otherDates.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
            {otherDates.map((p) => (
              <button
                key={p.date}
                className="evrion-tab"
                style={{ fontSize: 11.5, padding: "5px 10px" }}
                onClick={() => switchDate(p.date)}
              >
                {p.date} {p.status === "published" ? "🟢" : "⚪"}
              </button>
            ))}
          </div>
        )}
      </div>

      <SectionHeader label={`Blocks (${blocks.length})`} onAdd={() => setAddPicker(true)} />

      {blocks.length === 0 && <div className="evrion-empty">No blocks yet — tap + to add one.</div>}

      {blocks.map((b, idx) => {
        const meta = TODAY_BLOCK_TYPES.find((t) => t.type === b.type);
        const snippet = b.title || b.heading || b.question || b.body || b.label || b.caption || "(untitled)";
        return (
          <div className="evrion-today-admin-block" key={b.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <span className="evrion-today-type-tag">{meta?.label || b.type}</span>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {snippet}
                </div>
              </div>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button className="evrion-icon-btn" onClick={() => moveBlock(idx, -1)} disabled={idx === 0}><ChevronLeft size={13} style={{ transform: "rotate(90deg)" }} /></button>
                <button className="evrion-icon-btn" onClick={() => moveBlock(idx, 1)} disabled={idx === blocks.length - 1}><ChevronLeft size={13} style={{ transform: "rotate(-90deg)" }} /></button>
                <button className="evrion-icon-btn" onClick={() => editBlock(b)}><Pencil size={13} /></button>
                <button className="evrion-icon-btn danger" onClick={() => removeBlock(b.id)}><Trash2 size={13} /></button>
              </div>
            </div>
          </div>
        );
      })}

      <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
        <button className="evrion-btn evrion-btn-secondary" style={{ flex: 1 }} onClick={() => setShowPreview(true)}>Preview</button>
        <button className="evrion-btn evrion-btn-secondary" style={{ flex: 1 }} onClick={saveDraft}>Save draft</button>
        {status === "published" ? (
          <button className="evrion-btn evrion-btn-danger" style={{ flex: 1 }} onClick={unpublish}>Unpublish</button>
        ) : (
          <button className="evrion-btn evrion-btn-primary" style={{ flex: 1 }} onClick={publish}>Publish</button>
        )}
      </div>
      {savedFlash && <div style={{ textAlign: "center", fontSize: 12.5, color: "#E7B10A", marginTop: 8, fontWeight: 700 }}>{savedFlash}</div>}

      {addPicker && (
        <ModalShell title="Add a block" close={() => setAddPicker(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {TODAY_BLOCK_TYPES.map((t) => (
              <button key={t.type} className="evrion-answer" onClick={() => addBlock(t.type)}>
                {t.label}
              </button>
            ))}
          </div>
        </ModalShell>
      )}

      {blockModal && (
        <TodayBlockEditModal
          block={blockModal.block}
          close={() => setBlockModal(null)}
          onSave={saveBlockFromModal}
        />
      )}

      {showPreview && (
        <div className="evrion-modal-backdrop" onClick={() => setShowPreview(false)}>
          <div className="evrion-modal" style={{ padding: 0, background: "transparent" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "14px 14px 0" }}>
              <button className="evrion-icon-btn" onClick={() => setShowPreview(false)} style={{ background: "rgba(0,0,0,0.4)" }}>
                <X size={16} />
              </button>
            </div>
            <div className="evtoday-root" style={{ borderRadius: 20, overflow: "hidden", maxHeight: "75vh", overflowY: "auto" }}>
              <div className="evtoday-header">
                <div className="evtoday-eyebrow">Preview</div>
                <div className="evrion-wordmark" style={{ fontSize: 20, color: "#EDEBFA" }}>EVRION</div>
              </div>
              <div style={{ paddingTop: 8, paddingBottom: 24 }}>
                {previewPage.blocks.map((block) => (
                  <TodayBlockPublic key={block.id} block={block} pageDate={previewPage.date} onNavigate={() => {}} />
                ))}
                {previewPage.blocks.length === 0 && <div className="evtoday-empty">No blocks yet.</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TodayBlockEditModal({ block, close, onSave }) {
  const [draft, setDraft] = useState(block);
  const set = (patch) => setDraft({ ...draft, ...patch });

  const meta = TODAY_BLOCK_TYPES.find((t) => t.type === draft.type);

  const updateOption = (idx, text) =>
    set({ options: draft.options.map((o, i) => (i === idx ? { ...o, text } : o)) });
  const addOption = () => set({ options: [...draft.options, { id: uid("opt"), text: "" }] });
  const removeOption = (idx) => set({ options: draft.options.filter((_, i) => i !== idx) });

  const updateChatLine = (idx, patch) => set({ chat: draft.chat.map((l, i) => (i === idx ? { ...l, ...patch } : l)) });
  const addChatLine = () => set({ chat: [...(draft.chat || []), { from: "them", text: "" }] });
  const removeChatLine = (idx) => set({ chat: draft.chat.filter((_, i) => i !== idx) });

  const submit = () => onSave(draft);

  return (
    <ModalShell title={`${meta?.label || draft.type} block`} close={close}>
      {draft.type === "text" && (
        <>
          <div className="evrion-field">
            <label className="evrion-label">Heading (optional)</label>
            <input className="evrion-input" value={draft.heading} onChange={(e) => set({ heading: e.target.value })} />
          </div>
          <div className="evrion-field">
            <label className="evrion-label">Body</label>
            <textarea className="evrion-textarea" value={draft.body} onChange={(e) => set({ body: e.target.value })} />
          </div>
        </>
      )}

      {draft.type === "image" && (
        <>
          <div className="evrion-field">
            <label className="evrion-label">Image URL</label>
            <input className="evrion-input" value={draft.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://..." />
          </div>
          <div className="evrion-field">
            <label className="evrion-label">Caption (optional)</label>
            <input className="evrion-input" value={draft.caption} onChange={(e) => set({ caption: e.target.value })} />
          </div>
          <div className="evrion-field">
            <label className="evrion-label">Alt text (optional)</label>
            <input className="evrion-input" value={draft.alt} onChange={(e) => set({ alt: e.target.value })} />
          </div>
        </>
      )}

      {draft.type === "video" && (
        <>
          <div className="evrion-field">
            <label className="evrion-label">Video URL (YouTube, Vimeo, or direct .mp4 link)</label>
            <input className="evrion-input" value={draft.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
          </div>
          <div className="evrion-field">
            <label className="evrion-label">Caption (optional)</label>
            <input className="evrion-input" value={draft.caption} onChange={(e) => set({ caption: e.target.value })} />
          </div>
        </>
      )}

      {draft.type === "poll" && (
        <>
          <div className="evrion-field">
            <label className="evrion-label">Question</label>
            <input className="evrion-input" value={draft.question} onChange={(e) => set({ question: e.target.value })} />
          </div>
          <div className="evrion-field">
            <label className="evrion-label">Options</label>
            {draft.options.map((o, idx) => (
              <div key={o.id} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <input className="evrion-input" value={o.text} onChange={(e) => updateOption(idx, e.target.value)} placeholder={`Option ${idx + 1}`} />
                <button className="evrion-icon-btn danger" onClick={() => removeOption(idx)} disabled={draft.options.length <= 2}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <button className="evrion-btn evrion-btn-secondary" style={{ fontSize: 12.5, padding: "8px 12px" }} onClick={addOption}>
              <Plus size={13} /> Add option
            </button>
          </div>
        </>
      )}

      {draft.type === "situation" && (
        <>
          <div className="evrion-field">
            <label className="evrion-label">Title</label>
            <input className="evrion-input" value={draft.title} onChange={(e) => set({ title: e.target.value })} />
          </div>
          <div className="evrion-field">
            <label className="evrion-label">Format</label>
            <select className="evrion-select" value={draft.format} onChange={(e) => set({ format: e.target.value })}>
              <option value="chat">Chat — message bubbles</option>
              <option value="scene">Scene — narrated text</option>
              <option value="quick">Quick — no scene</option>
            </select>
          </div>
          {draft.format !== "quick" && (
            <div className="evrion-field">
              <label className="evrion-label">Scene lines</label>
              {(draft.chat || []).map((line, idx) => (
                <div key={idx} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                  <select className="evrion-select" style={{ width: 88, flexShrink: 0 }} value={line.from} onChange={(e) => updateChatLine(idx, { from: e.target.value })}>
                    <option value="them">Them</option>
                    <option value="you">You</option>
                    <option value="system">Note</option>
                  </select>
                  <input className="evrion-input" value={line.text} onChange={(e) => updateChatLine(idx, { text: e.target.value })} placeholder="Line text" />
                  <button className="evrion-icon-btn danger" onClick={() => removeChatLine(idx)}><Trash2 size={13} /></button>
                </div>
              ))}
              <button className="evrion-btn evrion-btn-secondary" style={{ fontSize: 12.5, padding: "8px 12px" }} onClick={addChatLine}>
                <Plus size={13} /> Add line
              </button>
            </div>
          )}
          <div className="evrion-field">
            <label className="evrion-label">Prompt / caption below the scene</label>
            <input className="evrion-input" value={draft.prompt} onChange={(e) => set({ prompt: e.target.value })} />
          </div>
        </>
      )}

      {draft.type === "announcement" && (
        <>
          <div className="evrion-field">
            <label className="evrion-label">Badge (optional, e.g. "NEW")</label>
            <input className="evrion-input" value={draft.badge} onChange={(e) => set({ badge: e.target.value })} />
          </div>
          <div className="evrion-field">
            <label className="evrion-label">Title</label>
            <input className="evrion-input" value={draft.title} onChange={(e) => set({ title: e.target.value })} />
          </div>
          <div className="evrion-field">
            <label className="evrion-label">Body</label>
            <textarea className="evrion-textarea" value={draft.body} onChange={(e) => set({ body: e.target.value })} />
          </div>
          <div className="evrion-field">
            <label className="evrion-label">Button label (optional)</label>
            <input className="evrion-input" value={draft.ctaLabel} onChange={(e) => set({ ctaLabel: e.target.value })} />
          </div>
          <div className="evrion-field">
            <label className="evrion-label">Button link (optional — leave blank to link to the quiz)</label>
            <input className="evrion-input" value={draft.ctaUrl} onChange={(e) => set({ ctaUrl: e.target.value })} placeholder="https://..." />
          </div>
        </>
      )}

      {draft.type === "button" && (
        <>
          <div className="evrion-field">
            <label className="evrion-label">Label</label>
            <input className="evrion-input" value={draft.label} onChange={(e) => set({ label: e.target.value })} />
          </div>
          <div className="evrion-field">
            <label className="evrion-label">Link URL</label>
            <input className="evrion-input" value={draft.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://..." />
          </div>
          <div className="evrion-field">
            <label className="evrion-label">Style</label>
            <select className="evrion-select" value={draft.style} onChange={(e) => set({ style: e.target.value })}>
              <option value="primary">Primary (violet)</option>
              <option value="secondary">Secondary (outline)</option>
            </select>
          </div>
        </>
      )}

      <button className="evrion-btn evrion-btn-primary evrion-btn-block" onClick={submit}>Save block</button>
    </ModalShell>
  );
}

function CategoriesTab({ content, save, setModal }) {
  const items = content.categories.slice().sort((a, b) => a.order - b.order);
  const remove = (id) => {
    if (!confirm("Delete this category? Its questions will remain but won't be reachable.")) return;
    save({ ...content, categories: content.categories.filter((c) => c.id !== id) });
  };
  const toggleActive = (c) => {
    save({ ...content, categories: content.categories.map((x) => (x.id === c.id ? { ...x, active: x.active === false } : x)) });
  };
  return (
    <div>
      <SectionHeader label="Categories" onAdd={() => setModal({ type: "category", item: null })} />
      {items.length === 0 && <div className="evrion-empty">No categories yet.</div>}
      {items.map((c) => (
        <div className="evrion-list-item" key={c.id}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name} {c.active === false && <span className="evrion-chip" style={{ marginLeft: 6 }}>hidden</span>}</div>
            <div style={{ fontSize: 12, opacity: 0.55, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.description}</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="evrion-icon-btn" onClick={() => toggleActive(c)}>{c.active === false ? <Check size={14} /> : <X size={14} />}</button>
            <button className="evrion-icon-btn" onClick={() => setModal({ type: "category", item: c })}><Pencil size={14} /></button>
            <button className="evrion-icon-btn danger" onClick={() => remove(c.id)}><Trash2 size={14} /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

function QuestionsTab({ content, save, setModal }) {
  const [catFilter, setCatFilter] = useState(content.categories[0]?.id || "");
  const items = content.questions
    .filter((q) => !catFilter || q.categoryId === catFilter)
    .slice()
    .sort((a, b) => a.order - b.order);

  const remove = (id) => {
    if (!confirm("Delete this question and its answers?")) return;
    save({
      ...content,
      questions: content.questions.filter((q) => q.id !== id),
      answers: content.answers.filter((a) => a.questionId !== id),
    });
  };
  const toggleActive = (q) => {
    save({ ...content, questions: content.questions.map((x) => (x.id === q.id ? { ...x, active: x.active === false } : x)) });
  };

  return (
    <div>
      <div className="evrion-field">
        <label className="evrion-label">Category</label>
        <select className="evrion-select" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
          {content.categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <SectionHeader label="Questions" onAdd={() => setModal({ type: "question", item: null, categoryId: catFilter })} />
      {items.length === 0 && <div className="evrion-empty">No questions in this category yet.</div>}
      {items.map((q) => {
        const answerCount = content.answers.filter((a) => a.questionId === q.id).length;
        return (
          <div className="evrion-list-item" key={q.id}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{q.title} {q.active === false && <span className="evrion-chip" style={{ marginLeft: 6 }}>hidden</span>}</div>
              <div style={{ fontSize: 12, opacity: 0.55 }}>{answerCount} answer{answerCount !== 1 ? "s" : ""} · order {q.order}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="evrion-icon-btn" onClick={() => toggleActive(q)}>{q.active === false ? <Check size={14} /> : <X size={14} />}</button>
              <button className="evrion-icon-btn" onClick={() => setModal({ type: "question", item: q })}><Pencil size={14} /></button>
              <button className="evrion-icon-btn danger" onClick={() => remove(q.id)}><Trash2 size={14} /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TraitsTab({ content, save, setModal }) {
  const remove = (id) => {
    if (!confirm("Delete this trait? It will be removed from any answers/personalities using it.")) return;
    const answers = content.answers.map((a) => {
      const w = { ...a.weights };
      delete w[id];
      return { ...a, weights: w };
    });
    const personalities = content.personalities.map((p) => {
      const w = { ...p.traitWeights };
      delete w[id];
      return { ...p, traitWeights: w };
    });
    save({ ...content, traits: content.traits.filter((t) => t.id !== id), answers, personalities });
  };
  return (
    <div>
      <SectionHeader label="Traits" onAdd={() => setModal({ type: "trait", item: null })} />
      {content.traits.map((t) => (
        <div className="evrion-list-item" key={t.id}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{t.name}</div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="evrion-icon-btn" onClick={() => setModal({ type: "trait", item: t })}><Pencil size={14} /></button>
            <button className="evrion-icon-btn danger" onClick={() => remove(t.id)}><Trash2 size={14} /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

function PersonalitiesTab({ content, save, setModal }) {
  const items = content.personalities.slice().sort((a, b) => a.order - b.order);
  const remove = (id) => {
    if (!confirm("Delete this personality?")) return;
    save({ ...content, personalities: content.personalities.filter((p) => p.id !== id) });
  };
  const toggleActive = (p) => {
    save({ ...content, personalities: content.personalities.map((x) => (x.id === p.id ? { ...x, active: x.active === false } : x)) });
  };
  return (
    <div>
      <SectionHeader label="Personalities" onAdd={() => setModal({ type: "personality", item: null })} />
      {items.map((p) => (
        <div className="evrion-list-item" key={p.id}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{p.emoji} {p.name} {p.active === false && <span className="evrion-chip" style={{ marginLeft: 6 }}>hidden</span>}</div>
            <div style={{ fontSize: 12, opacity: 0.55, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.description}</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="evrion-icon-btn" onClick={() => toggleActive(p)}>{p.active === false ? <Check size={14} /> : <X size={14} />}</button>
            <button className="evrion-icon-btn" onClick={() => setModal({ type: "personality", item: p })}><Pencil size={14} /></button>
            <button className="evrion-icon-btn danger" onClick={() => remove(p.id)}><Trash2 size={14} /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---- Modal: handles category / question(+answers) / trait / personality forms ---- */

function Modal({ modal, content, save, close }) {
  const { type, item } = modal;
  if (type === "category") return <CategoryModal item={item} content={content} save={save} close={close} />;
  if (type === "question") return <QuestionModal item={item} defaultCategoryId={modal.categoryId} content={content} save={save} close={close} />;
  if (type === "trait") return <TraitModal item={item} content={content} save={save} close={close} />;
  if (type === "personality") return <PersonalityModal item={item} content={content} save={save} close={close} />;
  return null;
}

function ModalShell({ title, close, children }) {
  return (
    <div className="evrion-modal-backdrop" onClick={close}>
      <div className="evrion-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>{title}</div>
          <button className="evrion-icon-btn" onClick={close}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CategoryModal({ item, content, save, close }) {
  const [name, setName] = useState(item?.name || "");
  const [description, setDescription] = useState(item?.description || "");
  const [order, setOrder] = useState(item?.order || content.categories.length + 1);

  const submit = () => {
    if (!name.trim()) return;
    if (item) {
      save({ ...content, categories: content.categories.map((c) => (c.id === item.id ? { ...c, name, description, order: Number(order) } : c)) });
    } else {
      save({ ...content, categories: [...content.categories, { id: uid("cat"), name, description, order: Number(order), active: true }] });
    }
    close();
  };

  return (
    <ModalShell title={item ? "Edit category" : "New category"} close={close}>
      <div className="evrion-field">
        <label className="evrion-label">Name</label>
        <input className="evrion-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Cameroon Life" />
      </div>
      <div className="evrion-field">
        <label className="evrion-label">Description</label>
        <textarea className="evrion-textarea" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="evrion-field">
        <label className="evrion-label">Order</label>
        <input type="number" className="evrion-input" value={order} onChange={(e) => setOrder(e.target.value)} />
      </div>
      <button className="evrion-btn evrion-btn-primary evrion-btn-block" onClick={submit}>Save</button>
    </ModalShell>
  );
}

function TraitModal({ item, content, save, close }) {
  const [name, setName] = useState(item?.name || "");
  const submit = () => {
    if (!name.trim()) return;
    if (item) {
      save({ ...content, traits: content.traits.map((t) => (t.id === item.id ? { ...t, name } : t)) });
    } else {
      save({ ...content, traits: [...content.traits, { id: uid("trait"), name }] });
    }
    close();
  };
  return (
    <ModalShell title={item ? "Edit trait" : "New trait"} close={close}>
      <div className="evrion-field">
        <label className="evrion-label">Name</label>
        <input className="evrion-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hustle" />
      </div>
      <button className="evrion-btn evrion-btn-primary evrion-btn-block" onClick={submit}>Save</button>
    </ModalShell>
  );
}

function PersonalityModal({ item, content, save, close }) {
  const [name, setName] = useState(item?.name || "");
  const [emoji, setEmoji] = useState(item?.emoji || "✨");
  const [description, setDescription] = useState(item?.description || "");
  const [order, setOrder] = useState(item?.order || content.personalities.length + 1);
  const [weights, setWeights] = useState(item?.traitWeights || {});

  const setWeight = (traitId, val) => setWeights({ ...weights, [traitId]: val === "" ? 0 : Number(val) });

  const submit = () => {
    if (!name.trim()) return;
    const payload = { name, emoji, description, order: Number(order), active: item?.active !== false, traitWeights: weights };
    if (item) {
      save({ ...content, personalities: content.personalities.map((p) => (p.id === item.id ? { ...p, ...payload } : p)) });
    } else {
      save({ ...content, personalities: [...content.personalities, { id: uid("pers"), ...payload }] });
    }
    close();
  };

  return (
    <ModalShell title={item ? "Edit personality" : "New personality"} close={close}>
      <div className="evrion-field" style={{ display: "flex", gap: 10 }}>
        <div style={{ width: 70 }}>
          <label className="evrion-label">Emoji</label>
          <input className="evrion-input" value={emoji} onChange={(e) => setEmoji(e.target.value)} style={{ textAlign: "center" }} />
        </div>
        <div style={{ flex: 1 }}>
          <label className="evrion-label">Name</label>
          <input className="evrion-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="The Straight Shooter" />
        </div>
      </div>
      <div className="evrion-field">
        <label className="evrion-label">Description</label>
        <textarea className="evrion-textarea" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="evrion-field">
        <label className="evrion-label">Order</label>
        <input type="number" className="evrion-input" value={order} onChange={(e) => setOrder(e.target.value)} />
      </div>
      <div className="evrion-field">
        <label className="evrion-label">Trait weights (how strongly each trait contributes)</label>
        {content.traits.map((t) => (
          <div className="evrion-weight-row" key={t.id}>
            <span style={{ fontSize: 13.5 }}>{t.name}</span>
            <input
              type="number"
              className="evrion-weight-input"
              value={weights[t.id] ?? 0}
              onChange={(e) => setWeight(t.id, e.target.value)}
            />
          </div>
        ))}
      </div>
      <button className="evrion-btn evrion-btn-primary evrion-btn-block" onClick={submit}>Save</button>
    </ModalShell>
  );
}

function QuestionModal({ item, defaultCategoryId, content, save, close }) {
  const [title, setTitle] = useState(item?.title || "");
  const [categoryId, setCategoryId] = useState(item?.categoryId || defaultCategoryId || content.categories[0]?.id || "");
  const [format, setFormat] = useState(item?.format || "chat");
  const [prompt, setPrompt] = useState(item?.prompt || "How you go react?");
  const [order, setOrder] = useState(item?.order || content.questions.length + 1);
  const [chat, setChat] = useState(item?.chat || [{ from: "them", text: "" }]);
  const [answers, setAnswers] = useState(
    item ? content.answers.filter((a) => a.questionId === item.id).sort((a, b) => a.order - b.order) : [{ id: uid("a"), text: "", order: 1, weights: {} }]
  );

  const updateChatLine = (idx, patch) => setChat(chat.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  const addChatLine = () => setChat([...chat, { from: "them", text: "" }]);
  const removeChatLine = (idx) => setChat(chat.filter((_, i) => i !== idx));

  const updateAnswer = (idx, patch) => setAnswers(answers.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  const updateAnswerWeight = (idx, traitId, val) =>
    setAnswers(
      answers.map((a, i) => (i === idx ? { ...a, weights: { ...a.weights, [traitId]: val === "" ? 0 : Number(val) } } : a))
    );
  const addAnswer = () => setAnswers([...answers, { id: uid("a"), text: "", order: answers.length + 1, weights: {} }]);
  const removeAnswer = (idx) => setAnswers(answers.filter((_, i) => i !== idx));

  const submit = () => {
    if (!title.trim() || !categoryId) return;
    const qId = item?.id || uid("q");
    const qPayload = { id: qId, categoryId, title, format, prompt, order: Number(order), active: item?.active !== false, chat: chat.filter((l) => l.text.trim()) };

    let nextQuestions;
    if (item) {
      nextQuestions = content.questions.map((q) => (q.id === item.id ? qPayload : q));
    } else {
      nextQuestions = [...content.questions, qPayload];
    }

    const otherAnswers = content.answers.filter((a) => a.questionId !== qId);
    const nextAnswers = [
      ...otherAnswers,
      ...answers.filter((a) => a.text.trim()).map((a, i) => ({ ...a, questionId: qId, order: i + 1 })),
    ];

    save({ ...content, questions: nextQuestions, answers: nextAnswers });
    close();
  };

  return (
    <ModalShell title={item ? "Edit question" : "New question"} close={close}>
      <div className="evrion-field">
        <label className="evrion-label">Category</label>
        <select className="evrion-select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          {content.categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className="evrion-field">
        <label className="evrion-label">Title</label>
        <input className="evrion-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="I Dey Come" />
      </div>
      <div className="evrion-field">
        <label className="evrion-label">Order</label>
        <input type="number" className="evrion-input" value={order} onChange={(e) => setOrder(e.target.value)} />
      </div>

      <div className="evrion-field">
        <label className="evrion-label">Format</label>
        <select className="evrion-select" value={format} onChange={(e) => setFormat(e.target.value)}>
          <option value="chat">Chat — message bubbles, back and forth</option>
          <option value="scene">Scene — narrated text, no bubbles</option>
          <option value="quick">Quick tap — straight to the question, no scene</option>
        </select>
        <div style={{ fontSize: 11.5, opacity: 0.5, marginTop: 5, lineHeight: 1.4 }}>
          {format === "chat" && "Good for back-and-forth exchanges like a WhatsApp thread."}
          {format === "scene" && "Good for setting a scene in a sentence or two, read like a story."}
          {format === "quick" && "No scene at all — just the prompt and answers. Best for fast, simple situations."}
        </div>
      </div>

      {format !== "quick" && (
      <div className="evrion-field">
        <label className="evrion-label">{format === "scene" ? "Scene lines" : "Chat / situation lines"}</label>
        {chat.map((line, idx) => (
          <div key={idx} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
            <select
              className="evrion-select"
              style={{ width: 88, flexShrink: 0 }}
              value={line.from}
              onChange={(e) => updateChatLine(idx, { from: e.target.value })}
            >
              <option value="them">Them</option>
              <option value="you">You</option>
              <option value="system">Note</option>
            </select>
            <input
              className="evrion-input"
              value={line.text}
              onChange={(e) => updateChatLine(idx, { text: e.target.value })}
              placeholder="Line text"
            />
            <button className="evrion-icon-btn danger" onClick={() => removeChatLine(idx)}><Trash2 size={13} /></button>
          </div>
        ))}
        <button className="evrion-btn evrion-btn-secondary" style={{ fontSize: 12.5, padding: "8px 12px" }} onClick={addChatLine}>
          <Plus size={13} /> Add line
        </button>
      </div>
      )}

      <div className="evrion-field">
        <label className="evrion-label">Prompt (question asked to the player)</label>
        <input className="evrion-input" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      </div>

      <div className="evrion-field">
        <label className="evrion-label">Answers &amp; trait weights</label>
        {answers.map((a, idx) => (
          <div key={a.id} className="evrion-card" style={{ marginBottom: 10, padding: 12 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <input
                className="evrion-input"
                value={a.text}
                onChange={(e) => updateAnswer(idx, { text: e.target.value })}
                placeholder="Answer text"
              />
              <button className="evrion-icon-btn danger" onClick={() => removeAnswer(idx)}><Trash2 size={13} /></button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {content.traits.map((t) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 11.5, opacity: 0.55 }}>{t.name}</span>
                  <input
                    type="number"
                    className="evrion-weight-input"
                    style={{ width: 44 }}
                    value={a.weights?.[t.id] ?? 0}
                    onChange={(e) => updateAnswerWeight(idx, t.id, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
        <button className="evrion-btn evrion-btn-secondary" style={{ fontSize: 12.5, padding: "8px 12px" }} onClick={addAnswer}>
          <Plus size={13} /> Add answer
        </button>
      </div>

      <button className="evrion-btn evrion-btn-primary evrion-btn-block" onClick={submit}>Save question</button>
    </ModalShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Root App                                                           */
/* ------------------------------------------------------------------ */

export default function App() {
  const [content, setContent] = useState(null);
  const [synced, setSynced] = useState(false); // true once we know Supabase has a saved row
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("home");
  const [category, setCategory] = useState(null);
  const [result, setResult] = useState(null);
  const [sharedResult, setSharedResult] = useState(null);
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [shareStatus, setShareStatus] = useState("");

  const connected = !!supabase;

  useEffect(() => {
    (async () => {
      const remote = await loadContent();
      if (remote) {
        setContent(remote);
        setSynced(true);
      } else {
        setContent(buildSeedContent());
        setSynced(false);
      }

      const params = new URLSearchParams(window.location.search);
      const token = params.get("r");
      if (token) {
        const decoded = decodeResult(token);
        if (decoded) {
          const source = remote || buildSeedContent();
          const personality = source.personalities.find((p) => p.id === decoded.p);
          if (personality) {
            setSharedResult({ personality, pct: decoded.m });
            setView("shared");
          }
        }
      }

      if (connected) {
        const session = await getSession();
        setAdminLoggedIn(!!session);
      }

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!connected) return undefined;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAdminLoggedIn(!!session);
    });
    return () => sub.subscription.unsubscribe();
  }, [connected]);

  const answersByQuestion = useMemo(() => {
    if (!content) return {};
    const map = {};
    content.answers.forEach((a) => {
      if (!map[a.questionId]) map[a.questionId] = [];
      map[a.questionId].push(a);
    });
    return map;
  }, [content]);

  const goHome = () => {
    setView("home");
    setResult(null);
    setShareStatus("");
    window.history.replaceState({}, "", window.location.pathname);
  };

  const finishQuiz = (traitScores) => {
    const { top, pct } = scorePersonalities(traitScores, content.personalities);
    setResult({ personality: top, pct, categoryId: category.id });
    setView("result");
  };

  const doShare = async () => {
    if (!result) return;
    const token = encodeResult(result.personality.id, result.categoryId, result.pct);
    const url = `${window.location.origin}${window.location.pathname}?r=${token}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "EVRION — What type of Cameroonian are you?", text: `I got "${result.personality.name}" on EVRION!`, url });
        setShareStatus("Shared!");
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setShareStatus("Link copied!");
      } else {
        setShareStatus(url);
      }
    } catch (e) {
      setShareStatus("Copy the link from your address bar");
    }
    setTimeout(() => setShareStatus(""), 2500);
  };

  const initializeContent = async () => {
    const seed = buildSeedContent();
    setContent(seed);
    try {
      await saveContent(seed);
      setSynced(true);
    } catch (e) {
      alert(`Could not save to Supabase: ${e.message}`);
    }
  };

  if (loading || !content) {
    return (
      <div className="evrion-root">
        <GlobalStyle />
        <div className="evrion-shell" style={{ alignItems: "center", justifyContent: "center", display: "flex" }}>
          <div className="evrion-wordmark" style={{ color: "#E7B10A", fontSize: 22 }}>EVRION</div>
        </div>
      </div>
    );
  }

  return (
    <div className="evrion-root">
      <GlobalStyle />
      <div className="evrion-shell">
        {view === "home" && (
          <HomeView
            onStart={() => setView("categories")}
            onAdmin={() => setView(adminLoggedIn ? "adminHome" : "adminLogin")}
            onToday={() => setView("today")}
          />
        )}

        {view === "today" && (
          <TodayPageView content={content} onBack={goHome} onGoCategories={() => setView("categories")} />
        )}

        {view === "shared" && sharedResult && (
          <SharedResultView personality={sharedResult.personality} pct={sharedResult.pct} onPlay={goHome} />
        )}

        {view === "categories" && (
          <CategoryView
            categories={content.categories}
            onPick={(c) => {
              setCategory(c);
              setView("quiz");
            }}
            onBack={goHome}
          />
        )}

        {view === "quiz" && category && (
          <QuizView
            category={category}
            questions={content.questions}
            answersByQuestion={answersByQuestion}
            onFinish={finishQuiz}
            onBack={() => setView("categories")}
          />
        )}

        {view === "result" && result && (
          <ResultView
            personality={result.personality}
            pct={result.pct}
            shareStatus={shareStatus}
            onShare={doShare}
            onReplay={() => setView("quiz")}
            onCategories={() => setView("categories")}
          />
        )}

        {view === "adminLogin" && (
          <AdminLogin
            onBack={goHome}
            onSuccess={() => {
              setAdminLoggedIn(true);
              setView("adminHome");
            }}
          />
        )}

        {view === "adminHome" && adminLoggedIn && (
          <AdminDashboard
            content={content}
            setContent={setContent}
            connected={connected}
            synced={synced}
            onInitialize={initializeContent}
            onBack={goHome}
            onLogout={async () => {
              await signOut();
              setAdminLoggedIn(false);
              goHome();
            }}
          />
        )}
      </div>
    </div>
  );
}
