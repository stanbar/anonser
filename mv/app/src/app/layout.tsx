import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Anonser-BC^MV – Anonymous Service Desk",
  description: "Digital-verifiable multi-provider anonymous service desk PoC",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#fafafa" }}>
        <header
          style={{
            background: "#1a1a2e",
            color: "#fff",
            padding: "16px 24px",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <a href="/" style={{ color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 20 }}>
            Anonser-BC<sup>MV</sup>
          </a>
          <nav style={{ display: "flex", gap: 16, marginLeft: "auto" }}>
            <a href="/client" style={{ color: "#ccc", textDecoration: "none" }}>
              Client
            </a>
            <a href="/provider" style={{ color: "#ccc", textDecoration: "none" }}>
              Provider
            </a>
          </nav>
        </header>
        <main style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>{children}</main>
      </body>
    </html>
  );
}
