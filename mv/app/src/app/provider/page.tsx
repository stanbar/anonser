"use client";

import { useState } from "react";
import { BrowserProvider, Contract, formatEther, keccak256, solidityPacked } from "ethers";
import { DESK_GW_ABI, STATUS_LABELS, STATUS_COLORS } from "@/lib/contract";
import { encryptPayload, sha256Hex } from "@/lib/crypto";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_DESKGW_ADDRESS || "";

type RequestInfo = {
  payloadCid: string;
  client: string;
  escrow: bigint;
  openedAt: bigint;
  claimedAt: bigint;
  provider: string;
  resultCid: string;
  completionProof: string;
  status: number;
};

export default function ProviderPage() {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState<Contract | null>(null);
  const [isAllowed, setIsAllowed] = useState(false);

  // ── Request lookup ──
  const [requestId, setRequestId] = useState("");
  const [reqInfo, setReqInfo] = useState<RequestInfo | null>(null);
  const [payloadData, setPayloadData] = useState<string>("");

  // ── Claim state ──
  const [claimStatus, setClaimStatus] = useState("");

  // ── Complete state ──
  const [resultText, setResultText] = useState("");
  const [encryptionKey, setEncryptionKey] = useState("");
  const [completeStatus, setCompleteStatus] = useState("");

  async function connect() {
    if (!(window as any).ethereum) {
      alert("Please install MetaMask or another EVM wallet.");
      return;
    }
    const p = new BrowserProvider((window as any).ethereum);
    const signer = await p.getSigner();
    const addr = await signer.getAddress();
    const c = new Contract(CONTRACT_ADDRESS, DESK_GW_ABI, signer);
    const allowed = await c.allowedProviders(addr);
    setProvider(p);
    setAccount(addr);
    setContract(c);
    setIsAllowed(allowed);
  }

  async function handleLookup() {
    if (!contract || !requestId) return;
    try {
      const r = await contract.getRequest(requestId);
      setReqInfo({
        payloadCid: r[0],
        client: r[1],
        escrow: r[2],
        openedAt: r[3],
        claimedAt: r[4],
        provider: r[5],
        resultCid: r[6],
        completionProof: r[7],
        status: Number(r[8]),
      });
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }

  async function handleDownloadPayload() {
    if (!reqInfo) return;
    try {
      const cidHex = reqInfo.payloadCid.replace("0x", "");
      const res = await fetch(`/api/blob?cid=${cidHex}`);
      if (!res.ok) {
        setPayloadData("Error: payload not found in blob store");
        return;
      }
      const data = new Uint8Array(await res.arrayBuffer());
      // Show raw hex (provider would decrypt if they have the shared key)
      setPayloadData(
        `Raw encrypted payload (${data.length} bytes):\n${Array.from(data.slice(0, 64))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")}${data.length > 64 ? "..." : ""}`
      );
    } catch (err: any) {
      setPayloadData(`Error: ${err.message}`);
    }
  }

  async function handleClaim() {
    if (!contract) return;
    setClaimStatus("Sending claim transaction...");
    try {
      const tx = await contract.claim(requestId);
      await tx.wait();
      setClaimStatus("Claimed successfully!");
      handleLookup(); // Refresh
    } catch (err: any) {
      setClaimStatus(`Error: ${err.message}`);
    }
  }

  async function handleComplete() {
    if (!contract || !provider || !encryptionKey) return;
    setCompleteStatus("Preparing...");

    try {
      // Encrypt result
      const plaintext = new TextEncoder().encode(resultText || "empty result");
      const ciphertext = await encryptPayload(plaintext, encryptionKey);

      // Upload to blob store
      setCompleteStatus("Uploading encrypted result...");
      const res = await fetch("/api/blob", { method: "POST", body: ciphertext });
      const { cid } = await res.json();
      const resultCidBytes32 = "0x" + cid;

      // Sign (requestId || resultCid) as completion proof
      setCompleteStatus("Signing completion proof...");
      const digest = keccak256(solidityPacked(["bytes32", "bytes32"], [requestId, resultCidBytes32]));
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(
        Uint8Array.from(Buffer.from(digest.slice(2), "hex"))
      );

      // Submit completion
      setCompleteStatus("Sending complete transaction (confirm in wallet)...");
      const tx = await contract.complete(requestId, resultCidBytes32, signature);
      await tx.wait();
      setCompleteStatus("Completed! Payout received.");
      handleLookup(); // Refresh
    } catch (err: any) {
      setCompleteStatus(`Error: ${err.message}`);
    }
  }

  return (
    <div>
      <h1>Provider</h1>

      {!account ? (
        <button onClick={connect} style={btnStyle}>
          Connect Wallet
        </button>
      ) : (
        <div>
          <p>
            Connected: <code>{account}</code>
          </p>
          <p>
            Allowlist status:{" "}
            <span style={{ color: isAllowed ? "#4caf50" : "#f44336", fontWeight: 700 }}>
              {isAllowed ? "ALLOWED" : "NOT ALLOWED"}
            </span>
          </p>
        </div>
      )}

      <hr style={{ margin: "24px 0" }} />

      {/* ── Lookup Request ── */}
      <section>
        <h2>1. Look Up Request</h2>
        <input
          type="text"
          placeholder="Request ID (0x...)"
          value={requestId}
          onChange={(e) => setRequestId(e.target.value)}
          style={{ width: "100%", padding: 8, fontFamily: "monospace", marginBottom: 8 }}
        />
        <br />
        <button onClick={handleLookup} disabled={!contract || !requestId} style={btnStyle}>
          Look Up
        </button>

        {reqInfo && (
          <div style={{ background: "#f5f5f5", padding: 16, borderRadius: 4, marginTop: 12 }}>
            <p>
              <strong>Status:</strong>{" "}
              <span style={{ color: STATUS_COLORS[reqInfo.status], fontWeight: 700 }}>
                {STATUS_LABELS[reqInfo.status]}
              </span>
            </p>
            <p>
              <strong>Client:</strong> <code>{reqInfo.client}</code>
            </p>
            <p>
              <strong>Escrow:</strong> {formatEther(reqInfo.escrow)} ETH
            </p>
            <p>
              <strong>Payload CID:</strong>{" "}
              <code style={{ wordBreak: "break-all" }}>{reqInfo.payloadCid}</code>
            </p>

            <button onClick={handleDownloadPayload} style={{ ...btnStyle, background: "#555" }}>
              Download Payload
            </button>
            {payloadData && (
              <pre style={{ background: "#fff3e0", padding: 8, borderRadius: 4, marginTop: 8, whiteSpace: "pre-wrap" }}>
                {payloadData}
              </pre>
            )}
          </div>
        )}
      </section>

      <hr style={{ margin: "24px 0" }} />

      {/* ── Claim ── */}
      {reqInfo && reqInfo.status === 1 && (
        <section>
          <h2>2. Claim Request</h2>
          <p>Commit to fulfilling this request. Only allowed providers can claim.</p>
          <button onClick={handleClaim} disabled={!isAllowed} style={btnStyle}>
            Claim Request
          </button>
          {claimStatus && <p>{claimStatus}</p>}
        </section>
      )}

      {/* ── Complete ── */}
      {reqInfo && reqInfo.status === 2 && (
        <section>
          <h2>3. Complete Request</h2>
          <p>
            Enter the service result and the shared encryption key.
            The result will be encrypted, stored, and submitted on-chain.
            Escrow will be released to you on success.
          </p>
          <textarea
            placeholder="Result text..."
            value={resultText}
            onChange={(e) => setResultText(e.target.value)}
            rows={4}
            style={{ width: "100%", padding: 8, fontFamily: "monospace", marginBottom: 8 }}
          />
          <br />
          <input
            type="text"
            placeholder="Encryption key (shared with client, hex)"
            value={encryptionKey}
            onChange={(e) => setEncryptionKey(e.target.value)}
            style={{ width: "100%", padding: 8, fontFamily: "monospace", marginBottom: 8 }}
          />
          <br />
          <button onClick={handleComplete} disabled={!encryptionKey} style={btnStyle}>
            Upload Result & Complete
          </button>
          {completeStatus && (
            <pre style={{ background: "#f5f5f5", padding: 8, borderRadius: 4, marginTop: 8, whiteSpace: "pre-wrap" }}>
              {completeStatus}
            </pre>
          )}
        </section>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "10px 20px",
  background: "#1a1a2e",
  color: "#fff",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 14,
  marginTop: 8,
};
