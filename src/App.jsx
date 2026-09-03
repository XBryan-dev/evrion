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
import { loadContent, saveContent, signIn, signOut, getSession } from "./storage";

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
      prompt: "How hungry-you go react?",
      chat: [
        { from: "them", text: "Wait wait, make we snap the food first before we chop!", who: "Achu" },
        { from: "system", text: "The food is getting cold. Everyone is posing." },
      ],
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

  return { categories, questions, answers, traits, personalities };
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
    .evrion-root {
      font-family: 'Manrope', system-ui, sans-serif;
      background: #12190F;
      min-height: 100vh;
      color: #F6EFDD;
      display: flex;
      justify-content: center;
      padding: 0;
    }
    .evrion-shell {
      width: 100%;
      max-width: 480px;
      min-height: 100vh;
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
    }
    .evrion-answer:hover { border-color: #E7B10A; background: #23301A; }
    .evrion-answer:active { transform: scale(0.98); }

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
    .evrion-bubble.system {
      background: transparent;
      color: rgba(246,239,221,0.55);
      font-size: 12px;
      font-style: italic;
      text-align: center;
      max-width: 90%;
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
      font-size: 11px;
      color: rgba(246,239,221,0.45);
      text-align: center;
      margin: 6px 0;
    }
    @keyframes evrion-pop {
      from { opacity: 0; transform: translateY(6px) scale(0.97); }
      to { opacity: 1; transform: translateY(0) scale(1); }
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
      
