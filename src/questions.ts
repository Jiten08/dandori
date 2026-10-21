export const DECIDE = "Not sure, decide for me";
export const EXPLAIN = "Explain these options first";

export type Answers = Record<string, string>;
export type Option = { label: string; consequence: string };

export type Question = {
  id: string;
  intro: (a: Answers) => string;
  //answers
  text: string;
  options: Option[];
  recommended: (a: Answers) => number;
  assume?: (a: Answers) => string | undefined;
};

// provdies one line summary per option and a recommended option
function optionLines(q: Question, a: Answers) {
  const best = q.recommended(a);
  return q.options.map(
    (o, i) =>
      `- ${o.label}${i === best ? " (recommended)" : ""}: ${o.consequence}`,
  );
}

export function present(q: Question, a: Answers, progress: string) {
  return [
    "Ask the user this with your built-in multiple-choice question tool (ask_question in Antigravity).",
    "Sound like a friendly senior engineer pairing with them: warm, casual and brief. Never lecture.",
    `Open with this lead-in (reword it if that reads more naturally): "${q.intro(a)}"`,
    `Then ask: "${q.text}" ${progress}`,
    `Use these options as written, each with its note, add the options "${DECIDE}" and "${EXPLAIN}", and allow a write-in answer.`,
    "",
    `Question id: ${q.id}`,
    ...optionLines(q, a),
    "",
    "Then call interview_answer with this question id and the label the user chose, or their own words.",
  ].join("\n");
}

export function explain(q: Question, a: Answers) {
  return [
    `The user wants to understand the options for "${q.text}" before choosing. Nothing is saved yet.`,
    "In under 120 friendly words, explain each option in plain words: what it means, when people pick it, and its trade-off:",
    ...optionLines(q, a),
    "",
    "Answer any follow-up questions. Then ask the same question again with your multiple-choice question tool,",
    `with the same options plus "${DECIDE}", and call interview_answer with question id ${q.id}.`,
  ].join("\n");
}
