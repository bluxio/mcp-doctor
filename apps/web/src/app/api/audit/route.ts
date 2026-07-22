import { NextResponse } from "next/server";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  connectToTarget,
  runDoctor,
  type ConnectTarget,
} from "@mcp-doctor/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fixtureTarget(): ConnectTarget {
  const here = path.dirname(fileURLToPath(import.meta.url));
  // apps/web/src/app/api/audit -> repo root
  const root = path.resolve(here, "../../../../../../");
  const server = path.join(root, "examples/fixture-server/server.ts");
  return {
    kind: "stdio",
    label: "demo-fixture",
    command: "npx",
    args: ["tsx", server],
    timeoutMs: 30_000,
  };
}

export async function POST(req: Request) {
  let connected;
  try {
    const body = (await req.json()) as {
      mode?: "demo" | "url";
      url?: string;
      header?: string;
    };

    let target: ConnectTarget;
    if (body.mode === "url") {
      if (!body.url?.trim()) {
        return NextResponse.json({ error: "URL is required" }, { status: 400 });
      }
      let parsed: URL;
      try {
        parsed = new URL(body.url.trim());
      } catch {
        return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
      }
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return NextResponse.json(
          { error: "Only http(s) URLs are allowed" },
          { status: 400 },
        );
      }

      const headers: Record<string, string> = {};
      if (body.header?.includes(":")) {
        const idx = body.header.indexOf(":");
        headers[body.header.slice(0, idx).trim()] = body.header
          .slice(idx + 1)
          .trim();
      }

      target = {
        kind: "url",
        label: parsed.toString(),
        url: parsed.toString(),
        headers,
        timeoutMs: 25_000,
      };
    } else {
      target = fixtureTarget();
    }

    connected = await connectToTarget(target);
    const report = await runDoctor(connected.client, target.label);
    return NextResponse.json({ report });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  } finally {
    if (connected) {
      try {
        await connected.close();
      } catch {
        // ignore
      }
    }
  }
}
