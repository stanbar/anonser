"use client";

import { useState } from "react";
import { BrowserProvider, Contract, keccak256, toUtf8Bytes, parseEther, formatEther } from "ethers";
import { DESK_GW_ABI, STATUS_LABELS, STATUS_COLORS } from "@/lib/contract";
import { generateEphemeralKey, generateRequestId, encryptPayload, decryptPayload, sha256Hex } from "@/lib/crypto";

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

export default function ClientPage() {
  // ── Connection state ──
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState<Contract | null>(null);
  const [serviceFee, setServiceFee] = useState("");

  // ── New request state ──
  const [ephemeralKey, setEphemeralKey] = useState("");
  const [requestId, setRequestId] = useState("");
  const [payloadText, setPayloadText] = useState("");
  const [txStatus, setTxStatus] = useState("");

  // ── Status check state ──
  const [lookupId, setLookupId] = useState("");
  const [lookupKey, setLookupKey] = useState("");
  const [reqInfo, setReqInfo] = useState<RequestInfo | null>(null);
  const [decryptedResult, setDecryptedResult] = useState("");

  // ── Timeout state ──
  const [timeoutStatus, setTimeoutStatus] = useState("");

  async function connect() {
    if (!(window as any).ethereum) {
      alert("Please install MetaMask or another EVM wallet.");
      return;
    }
    const p = new BrowserProvider((window as any).ethereum);
    const signer = await p.getSigner();
    const addr = await signer.getAddress();
    const c = new Contract(CONTRACT_ADDRESS, DESK_GW_ABI, signer);
    const fee = await c.serviceFee();
    setProvider(p);
    setAccount(addr);
    setContract(c);
    setServiceFee(formatEther(fee));
  }

  // ── Step 1: Create Request ──────────────────────────────────────
  async function handleCreateRequest() {
    if (!contract) return;
    setTxStatus("Preparing...");

    try {
      // Generate ephemeral key and request ID
      const eKey = ephemeralKey || generateEphemeralKey();
      const rId = requestId || generateRequestId();
      setEphemeralKey(eKey);
      setRequestId(rId);

      // Encrypt payload
      const plaintext = new TextEncoder().encode(payloadText || "empty payload");
      const ciphertext = await encryptPayload(plaintext, eKey);

      // Upload to blob store
      setTxStatus("Uploading encrypted payload...");
      const res = await fetch("/api/blob", {
        method: "POST",
        body: ciphertext,
      });
      const { cid } = await res.json();

      // Convert CID (64-char hex) to bytes32
      const payloadCidBytes32 = "0x" + cid;

      // Send transaction
      setTxStatus("Sending request transaction (confirm in wallet)...");
      const fee = await contract.serviceFee();
      const tx = await contract.request(rId, payloadCidBytes32, { value: fee });
      setTxStatus("Waiting for confirmation...");
      await tx.wait();
      setTxStatus(`Request created! ID: ${rId}\nSave your ephemeral key: ${eKey}`);
    } catch (err: any) {
      setTxStatus(`Error: ${err.message || err}`);
    }
  }

  // ── Step 2: Check Status ────────────────────────────────────────
  async function handleCheckStatus() {
    if (!contract) return;
    try {
      const r = await contract.getRequest(lookupId);
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
      setDecryptedResult("");
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }

  // ── Step 3: Decrypt Result ──────────────────────────────────────
  async function handleDecryptResult() {
    if (!reqInfo || !lookupKey) return;
    try {
      const cidHex = reqInfo.resultCid.replace("0x", "");
      const res = await fetch(`/api/blob?cid=${cidHex}`);
      if (!res.ok) {
        setDecryptedResult("Error: result blob not found in store");
        return;
      }
      const ciphertext = new Uint8Array(await res.arrayBuffer());
      const plaintext = await decryptPayload(ciphertext, lookupKey);
      setDecryptedResult(new TextDecoder().decode(plaintext));
    } catch (err: any) {
      setDecryptedResult(`Decryption error: ${err.message}`);
    }
  }

  // ── Step 4: Timeout Refund ──────────────────────────────────────
  async function handleTimeout() {
    if (!contract) return;
    setTimeoutStatus("Sending timeout transaction...");
    try {
      const tx = await contract.timeout(lookupId);
      await tx.wait();
      setTimeoutStatus("Refund successful!");
      handleCheckStatus(); // Refresh status
    } catch (err: any) {
      setTimeoutStatus(`Error: ${err.message}`);
    }
  }

  return (
    <div>
      <h1>Client</h1>

      {!account ? (
        <button onClick={connect} style={btnStyle}>
          Connect Wallet
        </button>
      ) : (
        <p>
          Connected: <code>{account}</code> | Service fee: <strong>{serviceFee} ETH</strong>
        </p>
      )}

      <hr style={{ margin: "24px 0" }} />

      {/* ── New Request ── */}
      <section>
        <h2>1. Open New Request</h2>
        <p>
          Enter your service payload (text). An ephemeral encryption key is generated automatically.
          <br />
          <strong>Save the ephemeral key — you need it to decrypt the result later.</strong>
        </p>
        <textarea
          placeholder="Enter payload (e.g. sample metadata, instructions)..."
          value={payloadText}
          onChange={(e) => setPayloadText(e.target.value)}
          rows={4}
          style={{ width: "100%", padding: 8, fontFamily: "monospace" }}
        />
        <br />
        <button onClick={handleCreateRequest} disabled={!contract} style={btnStyle}>
          Create Request (+ escrow)
        </button>
        {txStatus && (
          <pre style={{ background: "#f5f5f5", padding: 12, whiteSpace: "pre-wrap", borderRadius: 4 }}>
            {txStatus}
          </pre>
        )}
        {ephemeralKey && (
          <div style={{ background: "#fff3e0", padding: 12, borderRadius: 4, marginTop: 8 }}>
            <strong>Ephemeral Key (save this!):</strong>
            <br />
            <code style={{ wordBreak: "break-all" }}>{ephemeralKey}</code>
            <br />
            <strong>Request ID:</strong>
            <br />
            <code style={{ wordBreak: "break-all" }}>{requestId}</code>
          </div>
        )}
      </section>

      <hr style={{ margin: "24px 0" }} />

      {/* ── Check Status ── */}
      <section>
        <h2>2. Check Request Status</h2>
        <input
          type="text"
          placeholder="Request ID (0x...)"
          value={lookupId}
          onChange={(e) => setLookupId(e.target.value)}
          style={{ width: "100%", padding: 8, fontFamily: "monospace", marginBottom: 8 }}
        />
        <br />
        <input
          type="text"
          placeholder="Ephemeral key (hex, for decryption)"
          value={lookupKey}
          onChange={(e) => setLookupKey(e.target.value)}
          style={{ width: "100%", padding: 8, fontFamily: "monospace", marginBottom: 8 }}
        />
        <br />
        <button onClick={handleCheckStatus} disabled={!contract || !lookupId} style={btnStyle}>
          Check Status
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
              <strong>Provider:</strong>{" "}
              <code>{reqInfo.provider === "0x0000000000000000000000000000000000000000" ? "—" : reqInfo.provider}</code>
            </p>
            <p>
              <strong>Payload CID:</strong> <code style={{ wordBreak: "break-all" }}>{reqInfo.payloadCid}</code>
            </p>
            <p>
              <strong>Result CID:</strong>{" "}
              <code style={{ wordBreak: "break-all" }}>
                {reqInfo.resultCid ===
                "0x0000000000000000000000000000000000000000000000000000000000000000"
                  ? "—"
                  : reqInfo.resultCid}
              </code>
            </p>

            {/* Decrypt button */}
            {reqInfo.status === 3 &&
              reqInfo.resultCid !==
                "0x0000000000000000000000000000000000000000000000000000000000000000" && (
                <div style={{ marginTop: 12 }}>
                  <button onClick={handleDecryptResult} disabled={!lookupKey} style={btnStyle}>
                    Decrypt & Download Result
                  </button>
                  {decryptedResult && (
                    <pre
                      style={{
                        background: "#e8f5e9",
                        padding: 12,
                        borderRadius: 4,
                        marginTop: 8,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {decryptedResult}
                    </pre>
                  )}
                </div>
              )}

            {/* Timeout button */}
            {(reqInfo.status === 1 || reqInfo.status === 2) && (
              <div style={{ marginTop: 12 }}>
                <button onClick={handleTimeout} style={{ ...btnStyle, background: "#f44336" }}>
                  Request Timeout Refund
                </button>
                {timeoutStatus && <p>{timeoutStatus}</p>}
              </div>
            )}
          </div>
        )}
      </section>
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
