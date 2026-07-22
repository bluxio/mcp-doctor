import Link from "next/link";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <Link href="/" className={styles.brand}>
          MCP Doctor
        </Link>
        <nav className={styles.navLinks}>
          <a href="#checks">Checks</a>
          <a href="#cli">CLI</a>
          <Link href="/audit">Live audit</Link>
          <a
            href="https://github.com/bluxio/mcp-doctor"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </nav>
      </header>

      <main>
        <section className={styles.hero}>
          <p className={styles.kicker}>Devtool for the MCP layer</p>
          <h1 className={styles.title}>MCP Doctor</h1>
          <p className={styles.sub}>
            Catch broken schemas, weak permissions, and slow handshakes before
            your server fails inside Claude, Cursor, or ChatGPT.
          </p>
          <div className={styles.ctaRow}>
            <Link href="/audit" className={styles.ctaPrimary}>
              Run a live audit
            </Link>
            <a
              className={styles.ctaSecondary}
              href="https://github.com/bluxio/mcp-doctor"
              target="_blank"
              rel="noreferrer"
            >
              View on GitHub
            </a>
          </div>
          <pre className={styles.heroCode}>{`$ npx mcp-doctor --stdio "npx -y @modelcontextprotocol/server-everything"

PASS  Initialize handshake
PASS  Tool schema quality
PASS  Malformed input handling
WARN  Permission manifest — 2 medium-risk tools
`}</pre>
        </section>

        <section id="checks" className={styles.section}>
          <h2>What it checks</h2>
          <p className={styles.sectionSub}>
            One job: tell you if an MCP server is safe enough to trust in a real
            host.
          </p>
          <div className={styles.grid}>
            {[
              ["Handshake", "Connect and initialize against stdio or HTTP/SSE"],
              ["Schemas", "Tool names, descriptions, and inputSchema shape"],
              ["Bad input", "Required-arg tools must reject empty payloads"],
              ["Permissions", "Risk-ranked manifest of what tools can do"],
              ["Latency", "listTools timing across repeated calls"],
              ["CI ready", "JSON, HTML, and GitHub Action PR comments"],
            ].map(([title, body]) => (
              <article key={title} className={styles.card}>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="cli" className={styles.section}>
          <h2>CLI in 30 seconds</h2>
          <pre className={styles.blockCode}>{`npm install -g mcp-doctor   # or clone the repo

mcp-doctor --stdio "node ./my-server.js"
mcp-doctor --url https://mcp.example.com/mcp --header "Authorization: Bearer …"
mcp-doctor --stdio "…" --json --out report.json --html report.html`}</pre>
        </section>
      </main>

      <footer className={styles.footer}>
        <span>Open source · MIT</span>
        <a href="https://github.com/bluxio/mcp-doctor">bluxio/mcp-doctor</a>
      </footer>
    </div>
  );
}
