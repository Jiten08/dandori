import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import YAML from "yaml";
import {
  Brief,
  Config,
  DecisionMeta,
  TaskMeta,
  type TaskStatus,
} from "./schema.js";

export const ROOT = process.env.PLAN_ROOT ?? process.cwd();
export const PLAN = path.join(ROOT, ".plan");
const at = (...parts: string[]) => path.join(PLAN, ...parts);

export async function ensurePlan() {
  for (const dir of ["decisions", "tasks", "lessons"]) {
    await fs.mkdir(at(dir), { recursive: true });
  }
  try {
    await fs.access(at("config.yaml"));
  } catch {
    await fs.writeFile(at("config.yaml"), YAML.stringify(Config.parse({})));
  }
}

export async function reafBrief(): Promise<Brief> {
  try {
    return Brief.parse(matter(await fs.readFile(at("brief.md"), "utf-8")).data);
  } catch {
    return Brief.parse({});
  }
}

export async function writeBrief(brief: Brief, summary = "# Project brief\n") {
  await fs.writeFile(at("brief.md"), matter.stringify(summary, brief));
}

export async function nextId(dir: "tasks" | "decisions", prefix: "T" | "D") {
  const count = (await fs.readdir(at(dir))).filter((f) =>
    f.endsWith(".md"),
  ).length;
  return `${prefix}-${String(count + 1).padStart(3, "0")}`; // For sort to work in listTasks
}

export async function saveTask(meta: TaskMeta, body: string) {
  const file = at("tasks", `${meta.id}.md`);
  await fs.writeFile(file, matter.stringify(body, TaskMeta.parse(meta)));
  return file;
}

export async function listTasks() {
  const files = (await fs.readdir(at("tasks")))
    .filter((f) => f.endsWith(".md"))
    .sort();
  return Promise.all(
    files.map(async (f) => {
      const { data, content } = matter(
        await fs.readFile(at("tasks", f), "utf-8"),
      );
      return { meta: TaskMeta.parse(data), body: content.trim() };
    }),
  );
}

export async function updateTaskStatus(id: string, status: TaskStatus) {
  const task = (await listTasks()).find((t) => t.meta.id === id);
  if (!task) return `No task with id ${id}`;
  await saveTask({ ...task.meta, status }, task.body);
  return `${id} is now ${status}`;
}

export async function saveDecision(meta: DecisionMeta, body: string) {
  const file = at("decisions", `${meta.id}.md`);
  await fs.writeFile(file, matter.stringify(body, DecisionMeta.parse(meta)));
  return file;
}
