import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";
import * as store from "./store.js";
import { DecisionMeta, TaskMeta, TaskStatus } from "./schema.js";
import { registerInterviewTools } from "./interview.js";

export const text = (value: unknown) => ({
  content: [
    {
      type: "text" as const,
      text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
    },
  ],
});

export async function startServer() {
  await store.ensurePlan();
  const server = new McpServer({ name: "dandori", version: "0.1.0" });

  server.registerTool(
    "brief_get",
    {
      description:
        "Read the project brief: the interview answers so far and whether the interview is complete. Call this before planning or coding.",
      inputSchema: z.object({}),
    },
    async () => text(await store.readBrief()),
  );

  (server.registerTool(
    "task_create",
    {
      description:
        "Create one task with acceptance criteria and the files it may touch. The body explains the goals in plain words.",
      inputSchema: TaskMeta.omit({ id: true, status: true }).extend({
        body: z.string(),
      }),
    },
    async ({ body, ...meta }) => {
      const id = await store.nextId("tasks", "T");
      return text(
        `Created ${id} at ${await store.saveTask({ ...meta, id, status: "todo" }, body)}`,
      );
    },
  ),
    server.registerTool(
      "tasks_next",
      {
        description:
          "Get the next task that is ready to start: status todo, with every dependency done.",
        inputSchema: z.object({}),
      },
      async () => {
        const tasks = await store.listTasks();
        const done = new Set(
          tasks.filter((t) => t.meta.status === "done").map((t) => t.meta.id),
        );
        const next = tasks.find(
          (t) =>
            t.meta.status === "todo" &&
            t.meta.dependsOn.every((d) => done.has(d)),
        );

        return text(
          next ??
            "No task is ready: either every task is done or the rest are blocked",
        );
      },
    ));

  server.registerTool(
    "task_update",
    {
      description:
        "Change a task status: in_progress when starting, in_review when code is ready, done with every check passes.",
      inputSchema: z.object({ id: z.string(), status: TaskStatus }),
    },
    async ({ id, status }) => text(await store.updateTaskStatus(id, status)),
  );

  server.registerTool(
    "decisions_record",
    {
      description:
        "Record an architecture decision: the question, the options, the choice and the reason.",
      inputSchema: DecisionMeta.omit({ id: true }).extend({
        body: z.string().default(""),
      }),
    },
    async ({ body, ...meta }) => {
      const id = await store.nextId("decisions", "D");
      return text(
        `Recorded ${id} at ${await store.saveDecision({ ...meta, id }, body)}`,
      );
    },
  );

  registerInterviewTools(server);

  await server.connect(new StdioServerTransport());
  console.error("dandori MCP sever running on stdio");
}
