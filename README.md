# MCP Doctor

Ship MCP servers that actually work in production hosts.

```bash
npx tsx src/cli.ts --stdio "npx -y @modelcontextprotocol/server-everything"
```

MCP Doctor connects to a local or remote MCP server and runs protocol, schema, error-handling, and latency checks — then prints a CI-friendly report.

## Quick start

```bash
git clone https://github.com/bluxio/mcp-doctor.git
cd mcp-doctor
npm install
npm run build

# audit any stdio server
node dist/cli.js --stdio "npx -y @modelcontextprotocol/server-everything"

# audit a remote endpoint (Streamable HTTP, SSE fallback)
node dist/cli.js --url https://your-server.example/mcp \
  --header "Authorization: Bearer TOKEN"

# JSON for CI
node dist/cli.js --stdio "node server.js" --json --out report.json
```

### Demo fixture

```bash
npm run doctor:fixture
```

```text
MCP Doctor
Target: tsx examples/fixture-server/server.ts
Server: mcp-doctor-fixture@0.1.0

PASS  Initialize handshake
PASS  Ping
WARN  Tool schema quality
      weak_tool: missing description
PASS  Resources listing
SKIP  Prompts listing
PASS  Malformed input handling
PASS  listTools latency

Summary: 5 pass · 1 warn · 0 fail · 1 skip
```

## Checks

| Check | What it does |
| --- | --- |
| Handshake | Connect + initialize |
| Ping | Protocol ping support |
| Tool schemas | Names, descriptions, `inputSchema` shape |
| Resources / prompts | List when capability is advertised |
| Malformed input | Call a required-arg tool with `{}` |
| Latency | `listTools` timing over 3 samples |

**Exit codes:** `0` no failures · `1` failed checks · `2` connection/CLI error

## Why this exists

MCP adoption is ahead of MCP ops. Servers often work on your laptop, then fail in Claude, Cursor, VS Code, or ChatGPT because of weak schemas, missing descriptions, bad error handling, or timeouts.

Catch those before users do.

## Library use

```ts
import { connectToTarget, runDoctor } from "mcp-doctor";

const { client, close } = await connectToTarget({
  kind: "stdio",
  label: "my-server",
  command: "node",
  args: ["server.js"],
});

const report = await runDoctor(client, "my-server");
console.log(report.summary);
await close();
```

## Roadmap

- [x] CLI + core checks + fixture
- [ ] GitHub Action / PR comment
- [ ] Auth smoke tests for remote OAuth servers
- [ ] Host compatibility notes (Claude / Copilot / Cursor)
- [ ] Hosted run history (optional)

## Contributing

Issues and PRs welcome. If you maintain an MCP server and want a free audit, open an issue with your `--stdio` / `--url` setup.

## License

MIT
