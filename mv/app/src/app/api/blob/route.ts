/**
 * Content-addressed blob store API.
 *
 * POST /api/blob         — Upload blob, returns { cid: "<sha256hex>" }
 * GET  /api/blob?cid=xxx — Download blob by CID
 *
 * Files are stored locally in .blobs/ directory.
 * In production, replace with IPFS/Filecoin.
 */
import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const BLOB_DIR = path.resolve(process.cwd(), ".blobs");

function ensureDir() {
  if (!fs.existsSync(BLOB_DIR)) fs.mkdirSync(BLOB_DIR, { recursive: true });
}

export async function POST(request: NextRequest) {
  ensureDir();
  const data = await request.arrayBuffer();
  const buf = Buffer.from(data);
  const cid = crypto.createHash("sha256").update(buf).digest("hex");
  fs.writeFileSync(path.join(BLOB_DIR, cid), buf);
  return NextResponse.json({ cid });
}

export async function GET(request: NextRequest) {
  ensureDir();
  const cid = request.nextUrl.searchParams.get("cid");
  if (!cid || !/^[a-f0-9]{64}$/.test(cid)) {
    return NextResponse.json({ error: "invalid cid" }, { status: 400 });
  }
  const filePath = path.join(BLOB_DIR, cid);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const data = fs.readFileSync(filePath);
  return new NextResponse(data, {
    headers: { "Content-Type": "application/octet-stream" },
  });
}
