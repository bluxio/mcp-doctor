# MCP Doctor

**Ship MCP servers that actually work in Claude, Cursor, VS Code, and ChatGPT.**

CLI + live web audit + GitHub Action. Same engine everywhere.

```bash
pnpm install
pnpm --filter @mcp-doctor/core build
pnpm --filter mcp-doctor doctor:fixture
pnpm --filter @mcp-doctor/web dev
# open http://localhost:3456
```

## What this is

MCP servers give AI apps tools. Many of them break in real hosts because of weak schemas, missing descriptions, bad error handling, or risky tool surfaces.

MCP Doctor connects to your server and runs a checklist:

| Check | Purpose |
| --- | --- |
| Handshake | Connect + initialize |
| Ping | Protocol ping |
| Tool schemas | Names, descriptions, `inputSchema` |
| Duplicate names | Fail on collisions |
| Resources / prompts | List when advertised |
| Malformed input | Required args must reject `{}` |
| Latency | `listTools` timing |
| Permissions | Risk-ranked tool manifest |

## Monorepo

```text
apps/web          → Next.js landing + /audit UI
packages/core     → shared audit engine
packages/cli      → mcp-doctor binary
action/           → GitHub Action
examples/         → fixture server
```

## CLI

```bash
pnpm --filter @mcp-doctor/core build
pnpm --filter mcp-doctor build

# local server
pnpm --filter mcp-doctor exec node dist/cli.js --stdio "npx -y @modelcontextprotocol/server-everything"

# remote
node packages/cli/dist/cli.js --url https://mcp.example.com/mcp \
  --header "Authorization: Bearer TOKEN"

# reports
node packages/cli/dist/cli.js --stdio "…" --json --out report.json --html report.html
```

Exit codes: `0` no fails · `1` failed checks · `2` connection/CLI error

## Web UI

```bash
pnpm --filter @mcp-doctor/web dev
```

- `/` — product page  
- `/audit` — run the demo fixture or audit a remote URL  

## GitHub Action

```yaml
- uses: bluxio/mcp-doctor/action@main
  with:
    stdio: npx tsx ./my-mcp-server.ts
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Library

```ts
import { connectToTarget, runDoctor } from "@mcp-doctor/core";

const { client, close } = await connectToTarget({
  kind: "stdio",
  label: "my-server",
  command: "node",
  args: ["server.js"],
});

const report = await runDoctor(client, "my-server");
await close();
```

## License

MIT
