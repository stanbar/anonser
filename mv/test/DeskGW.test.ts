import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("DeskGW", function () {
  const SERVICE_DESC_HASH = ethers.keccak256(ethers.toUtf8Bytes("DNA paternity test"));
  const SERVICE_FEE = ethers.parseEther("0.1");
  const CLAIM_WINDOW = 3600; // 1 hour
  const COMPLETION_WINDOW = 86400; // 24 hours

  async function deployFixture() {
    const [owner, provider1, provider2, client, outsider] = await ethers.getSigners();
    const DeskGW = await ethers.getContractFactory("DeskGW");
    const gw = await DeskGW.deploy(
      SERVICE_DESC_HASH,
      SERVICE_FEE,
      CLAIM_WINDOW,
      COMPLETION_WINDOW,
      [provider1.address, provider2.address]
    );
    return { gw, owner, provider1, provider2, client, outsider };
  }

  // Helper: generate a random request ID
  function randomId(): string {
    return ethers.keccak256(ethers.randomBytes(32));
  }

  // Helper: generate a fake payload CID
  function fakeCid(data: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(data));
  }

  // Helper: provider signs (requestId || resultCid) for completion proof
  async function signCompletion(
    signer: Awaited<ReturnType<typeof ethers.getSigners>>[0],
    requestId: string,
    resultCid: string
  ): Promise<string> {
    const digest = ethers.keccak256(ethers.solidityPacked(["bytes32", "bytes32"], [requestId, resultCid]));
    return signer.signMessage(ethers.getBytes(digest));
  }

  // ─── Deployment ───────────────────────────────────────────────────
  describe("Deployment (alg:anonser-deploy)", function () {
    it("stores service parameters", async function () {
      const { gw } = await deployFixture();
      expect(await gw.serviceDescHash()).to.equal(SERVICE_DESC_HASH);
      expect(await gw.serviceFee()).to.equal(SERVICE_FEE);
      expect(await gw.claimWindow()).to.equal(CLAIM_WINDOW);
      expect(await gw.completionWindow()).to.equal(COMPLETION_WINDOW);
    });

    it("registers initial providers in the allowlist", async function () {
      const { gw, provider1, provider2, outsider } = await deployFixture();
      expect(await gw.allowedProviders(provider1.address)).to.be.true;
      expect(await gw.allowedProviders(provider2.address)).to.be.true;
      expect(await gw.allowedProviders(outsider.address)).to.be.false;
    });

    it("emits ProviderAdded events on deploy", async function () {
      const [owner, p1] = await ethers.getSigners();
      const DeskGW = await ethers.getContractFactory("DeskGW");
      const gw = await DeskGW.deploy(SERVICE_DESC_HASH, SERVICE_FEE, CLAIM_WINDOW, COMPLETION_WINDOW, [p1.address]);
      const receipt = await gw.deploymentTransaction()!.wait();
      const iface = gw.interface;
      const addedEvents = receipt!.logs
        .map((log: any) => { try { return iface.parseLog(log); } catch { return null; } })
        .filter((e: any) => e && e.name === "ProviderAdded");
      expect(addedEvents.length).to.equal(1);
      expect(addedEvents[0]!.args[0]).to.equal(p1.address);
    });

    it("reverts if fee is 0", async function () {
      const [owner, p1] = await ethers.getSigners();
      const DeskGW = await ethers.getContractFactory("DeskGW");
      await expect(
        DeskGW.deploy(SERVICE_DESC_HASH, 0, CLAIM_WINDOW, COMPLETION_WINDOW, [p1.address])
      ).to.be.revertedWith("DeskGW: fee must be > 0");
    });
  });

  // ─── Request ──────────────────────────────────────────────────────
  describe("Request (alg:anonser-request)", function () {
    it("opens a request with correct escrow", async function () {
      const { gw, client } = await deployFixture();
      const reqId = randomId();
      const payloadCid = fakeCid("encrypted-payload-1");

      await expect(gw.connect(client).request(reqId, payloadCid, { value: SERVICE_FEE }))
        .to.emit(gw, "RequestOpened")
        .withArgs(reqId, payloadCid, client.address, SERVICE_FEE);

      const r = await gw.getRequest(reqId);
      expect(r.payloadCid).to.equal(payloadCid);
      expect(r.client).to.equal(client.address);
      expect(r.escrow).to.equal(SERVICE_FEE);
      expect(r.status).to.equal(1); // Open
    });

    it("reverts on wrong escrow amount", async function () {
      const { gw, client } = await deployFixture();
      await expect(
        gw.connect(client).request(randomId(), fakeCid("x"), { value: ethers.parseEther("0.05") })
      ).to.be.revertedWith("DeskGW: msg.value must equal serviceFee");
    });

    it("reverts on duplicate requestId", async function () {
      const { gw, client } = await deployFixture();
      const reqId = randomId();
      await gw.connect(client).request(reqId, fakeCid("a"), { value: SERVICE_FEE });
      await expect(
        gw.connect(client).request(reqId, fakeCid("b"), { value: SERVICE_FEE })
      ).to.be.revertedWith("DeskGW: request already exists");
    });

    it("reverts if payloadCid is zero", async function () {
      const { gw, client } = await deployFixture();
      await expect(
        gw.connect(client).request(randomId(), ethers.ZeroHash, { value: SERVICE_FEE })
      ).to.be.revertedWith("DeskGW: payloadCid required");
    });
  });

  // ─── Claim ────────────────────────────────────────────────────────
  describe("Claim (alg:anonser-claim)", function () {
    it("allowed provider claims an open request", async function () {
      const { gw, client, provider1 } = await deployFixture();
      const reqId = randomId();
      await gw.connect(client).request(reqId, fakeCid("p"), { value: SERVICE_FEE });

      await expect(gw.connect(provider1).claim(reqId))
        .to.emit(gw, "RequestClaimed")
        .withArgs(reqId, provider1.address);

      const r = await gw.getRequest(reqId);
      expect(r.provider).to.equal(provider1.address);
      expect(r.status).to.equal(2); // Claimed
    });

    it("reverts if caller is not an allowed provider", async function () {
      const { gw, client, outsider } = await deployFixture();
      const reqId = randomId();
      await gw.connect(client).request(reqId, fakeCid("p"), { value: SERVICE_FEE });

      await expect(gw.connect(outsider).claim(reqId)).to.be.revertedWith(
        "DeskGW: not an allowed provider"
      );
    });

    it("reverts if claim window expired", async function () {
      const { gw, client, provider1 } = await deployFixture();
      const reqId = randomId();
      await gw.connect(client).request(reqId, fakeCid("p"), { value: SERVICE_FEE });

      await time.increase(CLAIM_WINDOW + 1);

      await expect(gw.connect(provider1).claim(reqId)).to.be.revertedWith(
        "DeskGW: claim window expired"
      );
    });

    it("reverts if request is not open", async function () {
      const { gw, client, provider1, provider2 } = await deployFixture();
      const reqId = randomId();
      await gw.connect(client).request(reqId, fakeCid("p"), { value: SERVICE_FEE });
      await gw.connect(provider1).claim(reqId);

      await expect(gw.connect(provider2).claim(reqId)).to.be.revertedWith(
        "DeskGW: request not open"
      );
    });
  });

  // ─── Complete ─────────────────────────────────────────────────────
  describe("Complete (alg:anonser-complete)", function () {
    it("provider completes with valid proof, receives payout", async function () {
      const { gw, client, provider1 } = await deployFixture();
      const reqId = randomId();
      const resultCid = fakeCid("encrypted-result-1");
      await gw.connect(client).request(reqId, fakeCid("p"), { value: SERVICE_FEE });
      await gw.connect(provider1).claim(reqId);

      const proof = await signCompletion(provider1, reqId, resultCid);
      const balBefore = await ethers.provider.getBalance(provider1.address);

      const tx = await gw.connect(provider1).complete(reqId, resultCid, proof);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const balAfter = await ethers.provider.getBalance(provider1.address);
      expect(balAfter - balBefore + gasUsed).to.equal(SERVICE_FEE);

      const r = await gw.getRequest(reqId);
      expect(r.status).to.equal(3); // Completed
      expect(r.resultCid).to.equal(resultCid);
      expect(r.escrow).to.equal(0n);
    });

    it("emits RequestCompleted event", async function () {
      const { gw, client, provider1 } = await deployFixture();
      const reqId = randomId();
      const resultCid = fakeCid("result-2");
      await gw.connect(client).request(reqId, fakeCid("p"), { value: SERVICE_FEE });
      await gw.connect(provider1).claim(reqId);
      const proof = await signCompletion(provider1, reqId, resultCid);

      await expect(gw.connect(provider1).complete(reqId, resultCid, proof))
        .to.emit(gw, "RequestCompleted")
        .withArgs(reqId, resultCid, provider1.address);
    });

    it("reverts if not the assigned provider", async function () {
      const { gw, client, provider1, provider2 } = await deployFixture();
      const reqId = randomId();
      const resultCid = fakeCid("r");
      await gw.connect(client).request(reqId, fakeCid("p"), { value: SERVICE_FEE });
      await gw.connect(provider1).claim(reqId);
      const proof = await signCompletion(provider2, reqId, resultCid);

      await expect(gw.connect(provider2).complete(reqId, resultCid, proof)).to.be.revertedWith(
        "DeskGW: caller is not assigned provider"
      );
    });

    it("reverts if completion window expired", async function () {
      const { gw, client, provider1 } = await deployFixture();
      const reqId = randomId();
      const resultCid = fakeCid("r");
      await gw.connect(client).request(reqId, fakeCid("p"), { value: SERVICE_FEE });
      await gw.connect(provider1).claim(reqId);

      await time.increase(COMPLETION_WINDOW + 1);

      const proof = await signCompletion(provider1, reqId, resultCid);
      await expect(gw.connect(provider1).complete(reqId, resultCid, proof)).to.be.revertedWith(
        "DeskGW: completion window expired"
      );
    });

    it("reverts if proof is invalid (wrong signer)", async function () {
      const { gw, client, provider1, outsider } = await deployFixture();
      const reqId = randomId();
      const resultCid = fakeCid("r");
      await gw.connect(client).request(reqId, fakeCid("p"), { value: SERVICE_FEE });
      await gw.connect(provider1).claim(reqId);

      // Sign with wrong key
      const badProof = await signCompletion(outsider, reqId, resultCid);
      await expect(gw.connect(provider1).complete(reqId, resultCid, badProof)).to.be.revertedWith(
        "DeskGW: invalid completion proof"
      );
    });

    it("reverts if resultCid is zero", async function () {
      const { gw, client, provider1 } = await deployFixture();
      const reqId = randomId();
      await gw.connect(client).request(reqId, fakeCid("p"), { value: SERVICE_FEE });
      await gw.connect(provider1).claim(reqId);
      const proof = await signCompletion(provider1, reqId, ethers.ZeroHash);

      await expect(
        gw.connect(provider1).complete(reqId, ethers.ZeroHash, proof)
      ).to.be.revertedWith("DeskGW: resultCid required");
    });
  });

  // ─── Timeout / Refund ─────────────────────────────────────────────
  describe("Timeout (alg:anonser-timeout)", function () {
    it("client refunds after claim window expires (no provider claimed)", async function () {
      const { gw, client } = await deployFixture();
      const reqId = randomId();
      await gw.connect(client).request(reqId, fakeCid("p"), { value: SERVICE_FEE });

      await time.increase(CLAIM_WINDOW + 1);

      const balBefore = await ethers.provider.getBalance(client.address);
      const tx = await gw.connect(client).timeout(reqId);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
      const balAfter = await ethers.provider.getBalance(client.address);

      expect(balAfter - balBefore + gasUsed).to.equal(SERVICE_FEE);

      const r = await gw.getRequest(reqId);
      expect(r.status).to.equal(4); // Refunded
      expect(r.escrow).to.equal(0n);
    });

    it("client refunds after completion window expires (provider claimed but didn't complete)", async function () {
      const { gw, client, provider1 } = await deployFixture();
      const reqId = randomId();
      await gw.connect(client).request(reqId, fakeCid("p"), { value: SERVICE_FEE });
      await gw.connect(provider1).claim(reqId);

      await time.increase(COMPLETION_WINDOW + 1);

      await expect(gw.connect(client).timeout(reqId))
        .to.emit(gw, "RequestRefunded")
        .withArgs(reqId, client.address);

      const r = await gw.getRequest(reqId);
      expect(r.status).to.equal(4);
    });

    it("reverts if claim window has NOT yet expired (Open status)", async function () {
      const { gw, client } = await deployFixture();
      const reqId = randomId();
      await gw.connect(client).request(reqId, fakeCid("p"), { value: SERVICE_FEE });

      await expect(gw.connect(client).timeout(reqId)).to.be.revertedWith(
        "DeskGW: claim window not yet expired"
      );
    });

    it("reverts if completion window has NOT yet expired (Claimed status)", async function () {
      const { gw, client, provider1 } = await deployFixture();
      const reqId = randomId();
      await gw.connect(client).request(reqId, fakeCid("p"), { value: SERVICE_FEE });
      await gw.connect(provider1).claim(reqId);

      await expect(gw.connect(client).timeout(reqId)).to.be.revertedWith(
        "DeskGW: completion window not yet expired"
      );
    });

    it("reverts if caller is not the client", async function () {
      const { gw, client, outsider } = await deployFixture();
      const reqId = randomId();
      await gw.connect(client).request(reqId, fakeCid("p"), { value: SERVICE_FEE });

      await time.increase(CLAIM_WINDOW + 1);

      await expect(gw.connect(outsider).timeout(reqId)).to.be.revertedWith(
        "DeskGW: caller is not client"
      );
    });

    it("reverts if request is already completed", async function () {
      const { gw, client, provider1 } = await deployFixture();
      const reqId = randomId();
      const resultCid = fakeCid("r");
      await gw.connect(client).request(reqId, fakeCid("p"), { value: SERVICE_FEE });
      await gw.connect(provider1).claim(reqId);
      const proof = await signCompletion(provider1, reqId, resultCid);
      await gw.connect(provider1).complete(reqId, resultCid, proof);

      await expect(gw.connect(client).timeout(reqId)).to.be.revertedWith(
        "DeskGW: cannot refund in current status"
      );
    });
  });

  // ─── Provider management ──────────────────────────────────────────
  describe("Provider management", function () {
    it("owner can add a provider", async function () {
      const { gw, owner, outsider } = await deployFixture();
      await expect(gw.connect(owner).addProvider(outsider.address))
        .to.emit(gw, "ProviderAdded")
        .withArgs(outsider.address);
      expect(await gw.allowedProviders(outsider.address)).to.be.true;
    });

    it("owner can remove a provider", async function () {
      const { gw, owner, provider1 } = await deployFixture();
      await gw.connect(owner).removeProvider(provider1.address);
      expect(await gw.allowedProviders(provider1.address)).to.be.false;
    });

    it("non-owner cannot add a provider", async function () {
      const { gw, client, outsider } = await deployFixture();
      await expect(gw.connect(client).addProvider(outsider.address)).to.be.revertedWith(
        "DeskGW: caller is not owner"
      );
    });
  });

  // ─── Full happy-path integration ─────────────────────────────────
  describe("Full happy path: request → claim → complete", function () {
    it("client escrows, provider completes, client can read result CID", async function () {
      const { gw, client, provider1 } = await deployFixture();
      const reqId = randomId();
      const payloadCid = fakeCid("encrypted-payload");
      const resultCid = fakeCid("encrypted-result");

      // 1. Client opens request with escrow
      await gw.connect(client).request(reqId, payloadCid, { value: SERVICE_FEE });

      // 2. Provider claims
      await gw.connect(provider1).claim(reqId);

      // 3. Provider completes with proof
      const proof = await signCompletion(provider1, reqId, resultCid);
      await gw.connect(provider1).complete(reqId, resultCid, proof);

      // 4. Client reads result
      const r = await gw.getRequest(reqId);
      expect(r.status).to.equal(3); // Completed
      expect(r.resultCid).to.equal(resultCid);
      expect(r.provider).to.equal(provider1.address);
    });
  });
});
