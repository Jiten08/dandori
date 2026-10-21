import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { readBrief, writeBrief } from "./store.js";
import {
  DECIDE,
  EXPLAIN,
  explain,
  present,
  type Answers,
  type Question,
} from "./questions.js";

const DEMO = "A hackathon or demo";
const LEARN = "Learning, or a college assignment";
const REAL = "A real app for people I know";
const PUBLIC = "A product for the public";

const CONFIRM = "Looks right, plan it";
const CHANGE = "I want to change an answer";

export const SLOTS: Question[] = [
  {
    id: "purpose",
    intro: () =>
      "Hey! Before we design anything, tell me what this is for. It decides how much we build and what we can safely skip.",
    text: "What's this project for?",
    options: [
      {
        label: DEMO,
        consequence:
          "we aim for a working demo by the deadline and skip what judges never see",
      },
      {
        label: LEARN,
        consequence: "we keep it small, and I explain each part as we build it",
      },
      {
        label: REAL,
        consequence: "real sign-in and real data protection from day one",
      },
      {
        label: PUBLIC,
        consequence: "full security, abuse protection and room to grow",
      },
    ],
    recommended: () => 1,
  },
  {
    id: "users",
    intro: (a) =>
      a.purpose === DEMO
        ? "A demo, nice. Quick check so we don't build a sign-in page nobody uses:"
        : "Got it. Now, who's actually going to use it?",
    text: "Who will use this app?",
    options: [
      {
        label: "Just me",
        consequence:
          "no sign-in at first; also right for a demo you show to judges",
      },
      {
        label: "A small group I know",
        consequence: "simple sign-in and a few roles",
      },
      {
        label: "The public",
        consequence: "sign-up, abuse protection and stricter security",
      },
    ],
    recommended: (a) => (a.purpose === PUBLIC ? 2 : a.purpose === DEMO ? 0 : 1),
  },
  {
    id: "access",
    intro: (a) =>
      a.users === "The public"
        ? "Strangers will sign up, so privacy really matters here:"
        : "Since other people will sign in, one quick privacy question:",
    text: "Who can see a user's data?",
    options: [
      {
        label: "Only that user",
        consequence: "safest: every query checks who owns the record",
      },
      {
        label: "That user and admins",
        consequence: "adds an admin role that must be checked too",
      },
      {
        label: "Everyone who is signed in",
        consequence: "fine for shared boards, wrong for private data",
      },
    ],
    recommended: () => 0,
    assume: (a) => (a.users === "Just me" ? "Only that user" : undefined), // nobody else to hide data from
  },
  // add six more
];

const reply = (text: string) => ({
  content: [{ type: "text" as const, text }],
});

// The questions still to ask, given the answers so far
function stillToAsk(answers: Answers) {
  return SLOTS.filter((s) => !(s.id in answers) && !s.assume?.(answers));
}

function summarise(answers: Answers) {
  const lines = SLOTS.filter((s) => s.id in answers).map(
    (s) => `- **${s.text}** ${answers[s.id]}`,
  );
  return ["# Project brief", "", ...lines, ""].join("\n");
}

function recap(answers: Answers) {
  return [
    "Every question is answered. Show the user a short, friendly recap, one line per answer:",
    ...SLOTS.map(
      (s) =>
        `- ${s.text} ${answers[s.id]}${s.assume?.(answers) === answers[s.id] ? " (assumed, not asked)" : ""}`,
    ),
    "",
    `Then ask with your multiple-choice question tool: "${CONFIRM}" (recommended) or "${CHANGE}".`,
    "Call interview_answer with question id confirm and their choice.",
  ].join("\n");
}

export function registerInterviewTools(server: McpServer) {
  server.registerTool(
    "interview_next",
    {
      description:
        "Get the next interview question. Show it with your multiple-choice question tool, then call interview_answer. Repeat until the interview is complete. Never write interview questions yourself.",
      inputSchema: z.object({}),
    },
    async ({ id, choice }) => {
      const brief = await readBrief();
      const picked = (choice ?? "")
        .replace(/\s*\(recommended\)\s*$/, "")
        .trim();

      if (id === "confirm") {
        if (picked !== CHANGE && !/change/i.test(picked)) {
          await writeBrief(
            { ...brief, complete: true },
            summarise(brief.answers),
          );
          return reply(
            "Interview complete. Thank the user in one short line, summarise the brief in five bullets, then suggest /plan.",
          );
        }
        return reply(
          [
            "Ask which answer they want to change, with your multiple-choice question tool, using these options: ",
            ...SLOTS.map(
              (s) =>
                `- ${s.text} (now: ${brief.answers[s.id] ?? "not answered"})`,
            ),
            "Then call interview_answer with question id change and the id of the question they picked.",
          ].join("\n"),
        );
      }

      if (id === "change") {
        const index = SLOTS.findIndex(
          (s) =>
            picked === s.id ||
            picked.startsWith(`${s.id}:`) ||
            picked.includes(s.text),
        );
        const slot = SLOTS[index];
        if (!slot)
          return reply(
            `No question matches "${choice}". Call interview_answer with question id confirm and "${CHANGE}" to see the list again`,
          );
        delete brief.answers[slot.id];

        for (const later of SLOTS.slice(index + 1))
          if (later.assume) delete brief.answers[later.id];
        await writeBrief({ ...brief, complete: false });
        return reply(
          `Cleared ${slot.id}. Call interview_next to ask it again.`,
        );
      }

      const slot = SLOTS.find((s) => s.id === id);
      if (!slot)
        return reply(
          `Unknown question id "${id}". Call interview_next to get the current question.`,
        );
      if (picked === EXPLAIN) return reply(explain(slot, brief.answers)); // nothing saved: teach, then ask again
      const decided = picked === DECIDE;
      const answer = decided
        ? (slot.options[slot.recommended(brief.answers)]?.label ?? picked)
        : picked;
      brief.answers[id!] = answer;
      await writeBrief(brief);
      return reply(
        `Saved ${id}: ${answer}${decided ? " (the recommended option)" : ""}. React in a few friendly words (under 10), then call interview_next.`,
      );
    },
  );
}
