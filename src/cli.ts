#!/usr/bin/env node
const command = process.argv[2];

if (command === "mcp") {
  const { startServer } = await import("./server.js");
  await startServer();
} else if (command === "check") {
  const { checkPlan, formatFindings } = await import("./check.js");
  const found = await checkPlan();
  console.log(formatFindings(found));

  process.exit(found.some((f) => f.severity === "critical") ? 1 : 0);
} else {
  console.log("Usage: dandori mcp | dandori check");
  process.exit(1);
}
