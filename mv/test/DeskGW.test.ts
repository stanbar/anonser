import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("DeskGW", function () {
  // ── Service parameters ────────────────────────────────────────────
  const SID = ethers.keccak256(ethers.toUtf8Bytes("DNA paternity test"));
  const VK_ZK = ethers.keccak256(ethers.toUtf8Bytes("mock-verification-key"));
  const CLAIM_TTL = 3600;          // 1 hour max claim window
  const SERVICE_FEE = ethers.parseEther("0.1");

  // ── Helpers ───────────────────────────────────────────────────────

  async function deployAndPinFixture() {
    const [org, provider1, provider2, client, outsider] = await ethers.getSigners();
    const DeskGW = await ethers.getContractFactory("DeskGW");
    const gw = await DeskGW.deploy();

    // Stage 0: pin service + register providers
    await gw.connect(org).pinService(SID, VK_ZK, CLAIM_TTL, SERVICE_FEE);
    await gw.connect(org).registerProvider(provider1.address);
    await gw.connect(org).registerProvider(provider2.address);

    return { gw, org, provider1, provider2, client, outsider };
  }

  function randomId(): string {
    return ethers.keccak256(ethers.randomBytes(32));
  }

  function fakeCid(data: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(data));
  }

  function fakePkC(): string {
    // 33-byte compressed public key placeholder
    return ethers.hexlify(ethers.randomBytes(33));
  }

  function fakeCapV(): string {
    // Encoded capsule vector placeholder
    return ethers.hexlify(ethers.randomBytes(64));
  }

  function fakePi(): string {
    // Mock SNARK proof (just needs to be non-empty)
    return ethers.hexlify(ethers.randomBytes(32));
  }

  function fakePkDj(): string {
    // 33-byte compressed delivery-ephemeral public key placeholder
    return ethers.hexlify(ethers.randomBytes(33));
  }

  // Deadline: now + offset seconds
  async function deadlineFrom(offset: number): Promise<number> {
    const latest = await time.latest();
    return latest + offset;
  }

  // Provider signs: Sig(jid || sid || pkC || cidOut || hRes)
  async function signCompletion(
    signer: Awaited<ReturnType<typeof ethers.getSigners>>[0],
    jid: string,
    _sid: string,
    pkC: string,
    cidOut: string,
    hRes: string,
  ): Promise<string> {
    const digest = ethers.keccak256(
      ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes", "bytes32", "bytes32"],
        [jid, _sid, pkC, cidOut, hRes],
      ),
    );
    return signer.signMessage(ethers.getBytes(digest));
  }

  // ─── Stage 0: Service pinning ────────────────────────────────────
  describe("Stage 0: pinService + registerProvider", function () {
    it("pins service parameters", async function () {
      const { gw } = await deployAndPinFixture();
      expect(await gw.pinned()).to.be.true;
      expect(await gw.sid()).to.equal(SID);
      expect(await gw.vkZK()).to.equal(VK_ZK);
      expect(await gw.claimTTL()).to.equal(CLAIM_TTL);
      expect(await gw.serviceFee()).to.equal(SERVICE_FEE);
    });

    it("emits ServicePinned event", async function () {
      const [org] = await ethers.getSigners();
      const gw = await (await ethers.getContractFactory("DeskGW")).deploy();
      await expect(gw.connect(org).pinService(SID, VK_ZK, CLAIM_TTL, SERVICE_FEE))
        .to.emit(gw, "ServicePinned")
        .withArgs(SID);
    });

    it("reverts if already pinned", async function () {
      const { gw, org } = await deployAndPinFixture();
      await expect(
        gw.connect(org).pinService(SID, VK_ZK, CLAIM_TTL, SERVICE_FEE),
      ).to.be.revertedWith("DeskGW: already pinned");
    });

    it("reverts if fee is 0", async function () {
      const [org] = await ethers.getSigners();
      const gw = await (await ethers.getContractFactory("DeskGW")).deploy();
      await expect(
        gw.connect(org).pinService(SID, VK_ZK, CLAIM_TTL, 0),
      ).to.be.revertedWith("DeskGW: fee must be > 0");
    });

    it("registers providers and emits events", async function () {
      const { gw, provider1, provider2, outsider } = await deployAndPinFixture();
      expect(await gw.allowlisted(provider1.address)).to.be.true;
      expect(await gw.allowlisted(provider2.address)).to.be.true;
      expect(await gw.allowlisted(outsider.address)).to.be.false;
      expect(await gw.providerCount()).to.equal(2);
    });

    it("reverts registerProvider before pin", async function () {
      const [org, p1] = await ethers.getSigners();
      const gw = await (await ethers.getContractFactory("DeskGW")).deploy();
      await expect(
        gw.connect(org).registerProvider(p1.address),
      ).to.be.revertedWith("DeskGW: not pinned");
    });

    it("reverts duplicate provider registration", async function () {
      const { gw, org, provider1 } = await deployAndPinFixture();
      await expect(
        gw.connect(org).registerProvider(provider1.address),
      ).to.be.revertedWith("DeskGW: already registered");
    });

    it("only org can pin or register", async function () {
      const { gw, client, outsider } = await deployAndPinFixture();
      await expect(
        gw.connect(client).registerProvider(outsider.address),
      ).to.be.revertedWith("DeskGW: caller is not org");
    });
  });

  // ─── Stage 1: Client request ─────────────────────────────────────
  describe("Stage 1: postReq", function () {
    it("posts a request with correct escrow", async function () {
      const { gw, client } = await deployAndPinFixture();
      const jid = randomId();
      const cidMat = fakeCid("encrypted-payload-1");
      const hMat = fakeCid("plaintext-hash");
      const pkC = fakePkC();
      const capV = fakeCapV();
      const due = await deadlineFrom(86400);

      await expect(
        gw.connect(client).postReq(jid, hMat, pkC, cidMat, capV, due, { value: SERVICE_FEE }),
      )
        .to.emit(gw, "ReqPosted")
        .withArgs(jid, SID, client.address, cidMat, SERVICE_FEE, due);

      const job = await gw.getJob(jid);
      expect(job.cidMat).to.equal(cidMat);
      expect(job.hMat).to.equal(hMat);
      expect(job.client).to.equal(client.address);
      expect(job.dep).to.equal(SERVICE_FEE);
      expect(job.status).to.equal(1); // Posted
    });

    it("reverts on wrong escrow amount", async function () {
      const { gw, client } = await deployAndPinFixture();
      await expect(
        gw.connect(client).postReq(randomId(), fakeCid("h"), fakePkC(), fakeCid("c"), fakeCapV(), await deadlineFrom(86400), {
          value: ethers.parseEther("0.05"),
        }),
      ).to.be.revertedWith("DeskGW: msg.value must equal serviceFee");
    });

    it("reverts on duplicate jid", async function () {
      const { gw, client } = await deployAndPinFixture();
      const jid = randomId();
      const due = await deadlineFrom(86400);
      await gw.connect(client).postReq(jid, fakeCid("h"), fakePkC(), fakeCid("a"), fakeCapV(), due, { value: SERVICE_FEE });
      await expect(
        gw.connect(client).postReq(jid, fakeCid("h"), fakePkC(), fakeCid("b"), fakeCapV(), due, { value: SERVICE_FEE }),
      ).to.be.revertedWith("DeskGW: job already exists");
    });

    it("reverts if cidMat is zero", async function () {
      const { gw, client } = await deployAndPinFixture();
      await expect(
        gw.connect(client).postReq(randomId(), fakeCid("h"), fakePkC(), ethers.ZeroHash, fakeCapV(), await deadlineFrom(86400), {
          value: SERVICE_FEE,
        }),
      ).to.be.revertedWith("DeskGW: cidMat required");
    });
  });

  // ─── Stage 1b: Claim commitment ──────────────────────────────────
  describe("Stage 1b: postClaim", function () {
    it("provider claims a posted job", async function () {
      const { gw, client, provider1 } = await deployAndPinFixture();
      const jid = randomId();
      const due = await deadlineFrom(86400);
      await gw.connect(client).postReq(jid, fakeCid("h"), fakePkC(), fakeCid("p"), fakeCapV(), due, { value: SERVICE_FEE });

      const comJ = ethers.keccak256(ethers.toUtf8Bytes("claim-commitment"));
      await expect(gw.connect(provider1).postClaim(jid, comJ, 1800))
        .to.emit(gw, "ClaimPosted");

      const job = await gw.getJob(jid);
      expect(job.claimer).to.equal(provider1.address);
      expect(job.status).to.equal(2); // Claimed
    });

    it("allows re-claiming (another provider takes over)", async function () {
      const { gw, client, provider1, provider2 } = await deployAndPinFixture();
      const jid = randomId();
      const due = await deadlineFrom(86400);
      await gw.connect(client).postReq(jid, fakeCid("h"), fakePkC(), fakeCid("p"), fakeCapV(), due, { value: SERVICE_FEE });

      const comJ = ethers.keccak256(ethers.toUtf8Bytes("commit"));
      await gw.connect(provider1).postClaim(jid, comJ, 1800);
      await gw.connect(provider2).postClaim(jid, comJ, 1800);

      const job = await gw.getJob(jid);
      expect(job.claimer).to.equal(provider2.address);
    });

    it("caps claimWindow at claimTTL", async function () {
      const { gw, client, provider1 } = await deployAndPinFixture();
      const jid = randomId();
      const due = await deadlineFrom(86400);
      await gw.connect(client).postReq(jid, fakeCid("h"), fakePkC(), fakeCid("p"), fakeCapV(), due, { value: SERVICE_FEE });

      // Request a window larger than claimTTL
      const comJ = ethers.keccak256(ethers.toUtf8Bytes("commit"));
      await gw.connect(provider1).postClaim(jid, comJ, CLAIM_TTL * 10);

      const job = await gw.getJob(jid);
      const now = await time.latest();
      // claimUntil should be capped at now + claimTTL (not now + claimTTL*10)
      expect(Number(job.claimUntil)).to.be.at.most(now + CLAIM_TTL + 1);
    });

    it("reverts if caller is not allowlisted", async function () {
      const { gw, client, outsider } = await deployAndPinFixture();
      const jid = randomId();
      const due = await deadlineFrom(86400);
      await gw.connect(client).postReq(jid, fakeCid("h"), fakePkC(), fakeCid("p"), fakeCapV(), due, { value: SERVICE_FEE });

      await expect(
        gw.connect(outsider).postClaim(jid, ethers.ZeroHash, 1800),
      ).to.be.revertedWith("DeskGW: not allowlisted");
    });

    it("reverts if job is completed", async function () {
      const { gw, client, provider1 } = await deployAndPinFixture();
      const jid = randomId();
      const pkC = fakePkC();
      const cidOut = fakeCid("result");
      const hRes = fakeCid("reshash");
      const due = await deadlineFrom(86400);
      await gw.connect(client).postReq(jid, fakeCid("h"), pkC, fakeCid("p"), fakeCapV(), due, { value: SERVICE_FEE });

      // Complete the job
      const sig = await signCompletion(provider1, jid, SID, pkC, cidOut, hRes);
      await gw.connect(provider1).postCmp(jid, cidOut, hRes, fakePi(), fakePkDj(), sig, 0);

      await expect(
        gw.connect(provider1).postClaim(jid, ethers.ZeroHash, 1800),
      ).to.be.revertedWith("DeskGW: invalid status");
    });
  });

  // ─── Stage 2: Provider completion ─────────────────────────────────
  describe("Stage 2: postCmp", function () {
    it("provider completes with valid proof and signature, receives payout", async function () {
      const { gw, client, provider1 } = await deployAndPinFixture();
      const jid = randomId();
      const pkC = fakePkC();
      const cidOut = fakeCid("encrypted-result-1");
      const hRes = fakeCid("result-hash");
      const due = await deadlineFrom(86400);
      await gw.connect(client).postReq(jid, fakeCid("h"), pkC, fakeCid("p"), fakeCapV(), due, { value: SERVICE_FEE });

      // Provider signs (jid || sid || pkC || cidOut || hRes)
      const sig = await signCompletion(provider1, jid, SID, pkC, cidOut, hRes);
      const balBefore = await ethers.provider.getBalance(provider1.address);

      const tx = await gw.connect(provider1).postCmp(jid, cidOut, hRes, fakePi(), fakePkDj(), sig, 0);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const balAfter = await ethers.provider.getBalance(provider1.address);
      expect(balAfter - balBefore + gasUsed).to.equal(SERVICE_FEE);

      const job = await gw.getJob(jid);
      expect(job.status).to.equal(3); // Completed
      expect(job.cidOut).to.equal(cidOut);
      expect(job.hRes).to.equal(hRes);
      expect(job.dep).to.equal(0n);
    });

    it("allows completion without prior claim (Posted status)", async function () {
      const { gw, client, provider1 } = await deployAndPinFixture();
      const jid = randomId();
      const pkC = fakePkC();
      const cidOut = fakeCid("result");
      const hRes = fakeCid("reshash");
      const due = await deadlineFrom(86400);
      await gw.connect(client).postReq(jid, fakeCid("h"), pkC, fakeCid("p"), fakeCapV(), due, { value: SERVICE_FEE });

      // Complete directly without claiming
      const sig = await signCompletion(provider1, jid, SID, pkC, cidOut, hRes);
      await expect(gw.connect(provider1).postCmp(jid, cidOut, hRes, fakePi(), fakePkDj(), sig, 0))
        .to.emit(gw, "CmpAccepted")
        .withArgs(jid, provider1.address, cidOut, hRes);
    });

    it("emits CmpAccepted event", async function () {
      const { gw, client, provider1 } = await deployAndPinFixture();
      const jid = randomId();
      const pkC = fakePkC();
      const cidOut = fakeCid("result-2");
      const hRes = fakeCid("reshash-2");
      const due = await deadlineFrom(86400);
      await gw.connect(client).postReq(jid, fakeCid("h"), pkC, fakeCid("p"), fakeCapV(), due, { value: SERVICE_FEE });

      const sig = await signCompletion(provider1, jid, SID, pkC, cidOut, hRes);
      await expect(gw.connect(provider1).postCmp(jid, cidOut, hRes, fakePi(), fakePkDj(), sig, 0))
        .to.emit(gw, "CmpAccepted")
        .withArgs(jid, provider1.address, cidOut, hRes);
    });

    it("reverts if provider not allowlisted", async function () {
      const { gw, client, outsider, org } = await deployAndPinFixture();
      const jid = randomId();
      const pkC = fakePkC();
      const cidOut = fakeCid("r");
      const hRes = fakeCid("rh");
      const due = await deadlineFrom(86400);
      await gw.connect(client).postReq(jid, fakeCid("h"), pkC, fakeCid("p"), fakeCapV(), due, { value: SERVICE_FEE });

      // Register outsider, then remove — or just use bad index
      // Use provider index 0 but sign with outsider key → sig mismatch
      const sig = await signCompletion(outsider, jid, SID, pkC, cidOut, hRes);
      await expect(
        gw.connect(outsider).postCmp(jid, cidOut, hRes, fakePi(), fakePkDj(), sig, 0),
      ).to.be.revertedWith("DeskGW: invalid signature");
    });

    it("reverts if past deadline", async function () {
      const { gw, client, provider1 } = await deployAndPinFixture();
      const jid = randomId();
      const pkC = fakePkC();
      const cidOut = fakeCid("r");
      const hRes = fakeCid("rh");
      const due = await deadlineFrom(3600);
      await gw.connect(client).postReq(jid, fakeCid("h"), pkC, fakeCid("p"), fakeCapV(), due, { value: SERVICE_FEE });

      await time.increase(3601);

      const sig = await signCompletion(provider1, jid, SID, pkC, cidOut, hRes);
      await expect(
        gw.connect(provider1).postCmp(jid, cidOut, hRes, fakePi(), fakePkDj(), sig, 0),
      ).to.be.revertedWith("DeskGW: past deadline");
    });

    it("reverts on invalid signature (wrong signer)", async function () {
      const { gw, client, provider1, outsider } = await deployAndPinFixture();
      const jid = randomId();
      const pkC = fakePkC();
      const cidOut = fakeCid("r");
      const hRes = fakeCid("rh");
      const due = await deadlineFrom(86400);
      await gw.connect(client).postReq(jid, fakeCid("h"), pkC, fakeCid("p"), fakeCapV(), due, { value: SERVICE_FEE });

      // Sign with wrong key
      const badSig = await signCompletion(outsider, jid, SID, pkC, cidOut, hRes);
      await expect(
        gw.connect(provider1).postCmp(jid, cidOut, hRes, fakePi(), fakePkDj(), badSig, 0),
      ).to.be.revertedWith("DeskGW: invalid signature");
    });

    it("reverts with empty SNARK proof", async function () {
      const { gw, client, provider1 } = await deployAndPinFixture();
      const jid = randomId();
      const pkC = fakePkC();
      const cidOut = fakeCid("r");
      const hRes = fakeCid("rh");
      const due = await deadlineFrom(86400);
      await gw.connect(client).postReq(jid, fakeCid("h"), pkC, fakeCid("p"), fakeCapV(), due, { value: SERVICE_FEE });

      const sig = await signCompletion(provider1, jid, SID, pkC, cidOut, hRes);
      await expect(
        gw.connect(provider1).postCmp(jid, cidOut, hRes, "0x", fakePkDj(), sig, 0),
      ).to.be.revertedWith("DeskGW: SNARK verification failed");
    });
  });

  // ─── Stage 4: Timeout / Refund ────────────────────────────────────
  describe("Stage 4: timeoutRefund", function () {
    it("client refunds to a specified address after deadline", async function () {
      const { gw, client, outsider } = await deployAndPinFixture();
      const jid = randomId();
      const due = await deadlineFrom(3600);
      await gw.connect(client).postReq(jid, fakeCid("h"), fakePkC(), fakeCid("p"), fakeCapV(), due, { value: SERVICE_FEE });

      await time.increase(3601);

      // Refund to a different address (anonymity-preserving)
      const refundAddr = outsider.address;
      const balBefore = await ethers.provider.getBalance(refundAddr);

      await expect(gw.connect(client).timeoutRefund(jid, refundAddr))
        .to.emit(gw, "TimeoutRefund")
        .withArgs(jid, refundAddr);

      const balAfter = await ethers.provider.getBalance(refundAddr);
      expect(balAfter - balBefore).to.equal(SERVICE_FEE);

      const job = await gw.getJob(jid);
      expect(job.status).to.equal(4); // Refunded
      expect(job.dep).to.equal(0n);
    });

    it("works when job is in Claimed status past deadline", async function () {
      const { gw, client, provider1 } = await deployAndPinFixture();
      const jid = randomId();
      const due = await deadlineFrom(3600);
      await gw.connect(client).postReq(jid, fakeCid("h"), fakePkC(), fakeCid("p"), fakeCapV(), due, { value: SERVICE_FEE });
      await gw.connect(provider1).postClaim(jid, ethers.ZeroHash, 1800);

      await time.increase(3601);

      await expect(gw.connect(client).timeoutRefund(jid, client.address))
        .to.emit(gw, "TimeoutRefund");
    });

    it("reverts if deadline not passed", async function () {
      const { gw, client } = await deployAndPinFixture();
      const jid = randomId();
      const due = await deadlineFrom(86400);
      await gw.connect(client).postReq(jid, fakeCid("h"), fakePkC(), fakeCid("p"), fakeCapV(), due, { value: SERVICE_FEE });

      await expect(
        gw.connect(client).timeoutRefund(jid, client.address),
      ).to.be.revertedWith("DeskGW: deadline not passed");
    });

    it("reverts if caller is not the client", async function () {
      const { gw, client, outsider } = await deployAndPinFixture();
      const jid = randomId();
      const due = await deadlineFrom(3600);
      await gw.connect(client).postReq(jid, fakeCid("h"), fakePkC(), fakeCid("p"), fakeCapV(), due, { value: SERVICE_FEE });

      await time.increase(3601);

      await expect(
        gw.connect(outsider).timeoutRefund(jid, outsider.address),
      ).to.be.revertedWith("DeskGW: caller is not client");
    });

    it("reverts if already completed", async function () {
      const { gw, client, provider1 } = await deployAndPinFixture();
      const jid = randomId();
      const pkC = fakePkC();
      const cidOut = fakeCid("r");
      const hRes = fakeCid("rh");
      const due = await deadlineFrom(86400);
      await gw.connect(client).postReq(jid, fakeCid("h"), pkC, fakeCid("p"), fakeCapV(), due, { value: SERVICE_FEE });

      const sig = await signCompletion(provider1, jid, SID, pkC, cidOut, hRes);
      await gw.connect(provider1).postCmp(jid, cidOut, hRes, fakePi(), fakePkDj(), sig, 0);

      // Advance past deadline so the deadline check passes, but status check catches it
      await time.increase(86401);

      await expect(
        gw.connect(client).timeoutRefund(jid, client.address),
      ).to.be.revertedWith("DeskGW: cannot refund");
    });

    it("reverts if already refunded", async function () {
      const { gw, client } = await deployAndPinFixture();
      const jid = randomId();
      const due = await deadlineFrom(3600);
      await gw.connect(client).postReq(jid, fakeCid("h"), fakePkC(), fakeCid("p"), fakeCapV(), due, { value: SERVICE_FEE });

      await time.increase(3601);
      await gw.connect(client).timeoutRefund(jid, client.address);

      await expect(
        gw.connect(client).timeoutRefund(jid, client.address),
      ).to.be.revertedWith("DeskGW: cannot refund");
    });
  });

  // ─── Full happy path ──────────────────────────────────────────────
  describe("Full happy path: postReq → postClaim → postCmp", function () {
    it("client escrows, provider claims + completes, result is recorded", async function () {
      const { gw, client, provider1 } = await deployAndPinFixture();
      const jid = randomId();
      const pkC = fakePkC();
      const cidMat = fakeCid("encrypted-payload");
      const hMat = fakeCid("payload-hash");
      const cidOut = fakeCid("encrypted-result");
      const hRes = fakeCid("result-hash");
      const pkDj = fakePkDj();
      const due = await deadlineFrom(86400);

      // Stage 1: Client posts request
      await gw.connect(client).postReq(jid, hMat, pkC, cidMat, fakeCapV(), due, { value: SERVICE_FEE });

      // Stage 1b: Provider claims
      const comJ = ethers.keccak256(ethers.toUtf8Bytes("my-commitment"));
      await gw.connect(provider1).postClaim(jid, comJ, 1800);

      // Stage 2: Provider completes with proof
      const sig = await signCompletion(provider1, jid, SID, pkC, cidOut, hRes);
      await gw.connect(provider1).postCmp(jid, cidOut, hRes, fakePi(), pkDj, sig, 0);

      // Verify final state
      const job = await gw.getJob(jid);
      expect(job.status).to.equal(3); // Completed
      expect(job.cidOut).to.equal(cidOut);
      expect(job.hRes).to.equal(hRes);
      expect(job.hMat).to.equal(hMat);
      expect(job.provider).to.equal(provider1.address);
    });
  });

  // ─── Full timeout path ────────────────────────────────────────────
  describe("Full timeout path: postReq → timeoutRefund", function () {
    it("client posts, deadline passes, refund to separate address", async function () {
      const { gw, client, outsider } = await deployAndPinFixture();
      const jid = randomId();
      const due = await deadlineFrom(7200);

      await gw.connect(client).postReq(jid, fakeCid("h"), fakePkC(), fakeCid("p"), fakeCapV(), due, { value: SERVICE_FEE });

      await time.increase(7201);

      const refundAddr = outsider.address;
      const balBefore = await ethers.provider.getBalance(refundAddr);
      await gw.connect(client).timeoutRefund(jid, refundAddr);
      const balAfter = await ethers.provider.getBalance(refundAddr);

      expect(balAfter - balBefore).to.equal(SERVICE_FEE);
      const job = await gw.getJob(jid);
      expect(job.status).to.equal(4); // Refunded
    });
  });
});
