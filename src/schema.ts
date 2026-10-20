import test from "node:test";
import { z } from "zod";

export const TaskStatus = z.enum([
  "todo",
  "in_progress",
  "in_review",
  "done",
  "blocked",
]);
export type TaskStatus = z.infer<typeof TaskStatus>;

export const TaskMeta = z.object({
  id: z.string().regex(/^T-\d{3}$/),
  title: z.string().min(3),
  status: TaskStatus.default("todo"),
  dependsOn: z.array(z.string()).default([]),
  allowedFiles: z.array(z.string()).default([]),
  acceptance: z.array(z.string()).min(1),
});
export type TaskMeta = z.infer<typeof TaskMeta>;

export const DecisionMeta = z.object({
  id: z.string().regex(/^D-\d{3}$/),
  question: z.string(),
  options: z.array(z.string()).min(2),
  choice: z.string(),
  reason: z.string(),
  ruleId: z.string().optional(),
});
export type DecisionMeta = z.infer<typeof DecisionMeta>;

export const Brief = z.object({
  complete: z.boolean().default(false),
  answers: z.record(z.string(), z.string()).default({}),
});
export type Brief = z.infer<typeof Brief>;

export const Config = z.object({
  mode: z.enum(["learn", "build"]).default("learn"),
  stage: z.enum(["interview", "plan", "build"]).default("interview"),
  testCommand: z.string().default(""),
});
