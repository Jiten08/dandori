# Dandori

Plan before your AI agent builds. yourtool is an MCP server that runs inside your coding agent (Antigravity, Claude Code, Copilot and others). It interviews you with multiple-choice questions, writes the plan to a `.plan/` folder in your project, checks the plan for problems, and teaches you the concepts as you build.

## Run it from source

```bash
npm install
npm run build
node dist/cli.js mcp     # start the MCP server (your agent does this for you)
node dist/cli.js check   # check the .plan/ folder in the current directory
```

## Connect it to Antigravity

Add this to `.agents/mcp_config.json` in your project, with your own absolute paths:

```json
{
  "mcpServers": {
    "yourtool": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/yourtool/dist/cli.js", "mcp"],
      "cwd": "/ABSOLUTE/PATH/your-project",
      "env": { "PLAN_ROOT": "/ABSOLUTE/PATH/your-project" }
    }
  }
}
```

## Licence

MIT
