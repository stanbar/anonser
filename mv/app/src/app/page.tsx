export default function Home() {
  return (
    <div>
      <h1>Anonser-BC<sup>MV</sup> — Anonymous Service Desk</h1>
      <p>
        Minimal PoC for the <strong>digital-verifiable multi-provider</strong> variant of the
        Anonser protocol on EVM.
      </p>

      <div style={{ display: "flex", gap: 24, marginTop: 32 }}>
        <a
          href="/client"
          style={{
            flex: 1,
            display: "block",
            padding: 24,
            background: "#e3f2fd",
            borderRadius: 8,
            textDecoration: "none",
            color: "#1a1a2e",
          }}
        >
          <h2>Client</h2>
          <p>Open a service request with escrow. Upload encrypted payload. Retrieve decrypted result.</p>
        </a>
        <a
          href="/provider"
          style={{
            flex: 1,
            display: "block",
            padding: 24,
            background: "#e8f5e9",
            borderRadius: 8,
            textDecoration: "none",
            color: "#1a1a2e",
          }}
        >
          <h2>Provider</h2>
          <p>Claim open requests. Download payload. Upload encrypted result. Receive payout.</p>
        </a>
      </div>

      <h3 style={{ marginTop: 40 }}>Protocol Flow</h3>
      <ol>
        <li>
          <strong>Deploy</strong> — Owner deploys DeskGW with service definition, fee, time windows,
          and provider allowlist.
        </li>
        <li>
          <strong>Request</strong> — Client generates ephemeral key, encrypts payload, uploads to
          blob store, and calls <code>request()</code> with escrow.
        </li>
        <li>
          <strong>Claim</strong> — An allowed provider calls <code>claim()</code> to commit.
        </li>
        <li>
          <strong>Complete</strong> — Provider processes the payload, encrypts the result, uploads it,
          signs <code>(requestId || resultCid)</code>, and calls <code>complete()</code>.
          Escrow is released.
        </li>
        <li>
          <strong>Timeout</strong> — If no completion within the deadline, the client calls{" "}
          <code>timeout()</code> to reclaim escrow.
        </li>
      </ol>
    </div>
  );
}
