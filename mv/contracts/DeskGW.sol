// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title  DeskGW – Desk Gateway for Anonser-BC^MV
 * @notice On-chain state machine for Anonser-BC^MV anonymous service desk.
 *         Matches the pseudocode in Listing lst:anonser-mv-desk-gw of the dissertation.
 *
 * Protocol stages:
 *   Stage 0  → pinService() + registerProvider(): pin (sid, vkZK) + provider allowlist
 *   Stage 1  → postReq():        client posts request with escrow + encrypted payload
 *   Stage 1b → postClaim():      provider commits to fulfil (optional, advisory)
 *   Stage 2  → postCmp():        provider posts result + zkSNARK proof, escrow released
 *   Stage 4  → timeoutRefund():  client reclaims escrow after deadline
 *
 * zkSNARK verification is mocked; replace _verifySNARK with a real verifier in production.
 */
contract DeskGW {
    // ── Job lifecycle states (dissertation: JobStatus) ───────────────
    enum JobStatus { None, Posted, Claimed, Completed, Refunded }

    // ── Service configuration (dissertation: ServiceCfg) ─────────────
    bool   public pinned;
    bytes32 public sid;
    bytes32 public vkZK;          // zkSNARK verification key (mock: bytes32 placeholder)
    uint64  public claimTTL;      // maximum claim window cap (seconds)
    uint256 public serviceFee;    // escrow policy: exact deposit in wei

    address public org;           // organiser (deploys and pins)

    // ── Provider allowlist (dissertation: Map<Address,bool> + index lookup) ──
    address[] public providerList;
    mapping(address => bool) public allowlisted;

    // ── Per-job state (dissertation: Job struct) ─────────────────────
    struct Job {
        JobStatus status;
        address  client;
        bytes32  hMat;        // Hash(mat) – commitment to plaintext payload
        bytes    pkC;         // job-scoped ephemeral client public key
        bytes32  cidMat;      // content address of encrypted payload in Store
        bytes    capV;        // encoded per-provider capsule vector
        uint256  dep;         // escrow deposit held (wei)
        uint64   due;         // absolute deadline (unix timestamp)
        uint64   claimUntil;  // claim expiry (unix timestamp)
        address  claimer;     // address of claiming provider
        bytes32  cidOut;      // content address of encrypted result in Store
        bytes32  hRes;        // Hash(res) – commitment to plaintext result
        bytes    pkDj;        // provider delivery-ephemeral DH public key
        address  provider;    // address of completing provider
    }

    mapping(bytes32 => Job) internal J;

    // ── Events (dissertation notation) ───────────────────────────────
    event ServicePinned(bytes32 sid);
    event ProviderRegistered(address provider);
    event ReqPosted(bytes32 indexed jid, bytes32 sid, address client, bytes32 cidMat, uint256 dep, uint64 due);
    event ClaimPosted(bytes32 indexed jid, address provider, uint64 claimUntil);
    event CmpAccepted(bytes32 indexed jid, address provider, bytes32 cidOut, bytes32 hRes);
    event TimeoutRefund(bytes32 indexed jid, address refundAddr);

    // ── Modifiers ────────────────────────────────────────────────────
    modifier onlyOrg() {
        require(msg.sender == org, "DeskGW: caller is not org");
        _;
    }

    // ── Constructor ──────────────────────────────────────────────────
    constructor() {
        org = msg.sender;
    }

    // ── Stage 0: Service / predicate pinning ─────────────────────────

    /// @notice Organiser pins service parameters. Can only be called once.
    /// @param _sid    Service instance identifier: Hash(f || policy || metadata)
    /// @param _vkZK   zkSNARK verification key for the completion relation
    /// @param _claimTTL Maximum claim window in seconds
    /// @param _serviceFee Escrow policy: exact deposit amount in wei
    function pinService(bytes32 _sid, bytes32 _vkZK, uint64 _claimTTL, uint256 _serviceFee)
        external onlyOrg
    {
        require(!pinned, "DeskGW: already pinned");
        require(_serviceFee > 0, "DeskGW: fee must be > 0");
        pinned = true;
        sid = _sid;
        vkZK = _vkZK;
        claimTTL = _claimTTL;
        serviceFee = _serviceFee;
        emit ServicePinned(_sid);
    }

    /// @notice Organiser registers a provider in the allowlist.
    function registerProvider(address provider) external onlyOrg {
        require(pinned, "DeskGW: not pinned");
        require(!allowlisted[provider], "DeskGW: already registered");
        allowlisted[provider] = true;
        providerList.push(provider);
        emit ProviderRegistered(provider);
    }

    // ── Stage 1: Client request with encrypted payload and escrow ────

    /// @notice Client posts a request. Must send exactly serviceFee as escrow.
    /// @param jid    Fresh job identifier (client-sampled)
    /// @param hMat   Hash(mat) – commitment to plaintext payload
    /// @param pkC    Job-scoped ephemeral client public key
    /// @param cidMat Content address of encrypted payload ciphertext in Store
    /// @param capV   Encoded per-provider capsule vector
    /// @param due    Absolute deadline (unix timestamp)
    function postReq(
        bytes32 jid,
        bytes32 hMat,
        bytes calldata pkC,
        bytes32 cidMat,
        bytes calldata capV,
        uint64 due
    ) external payable {
        require(pinned, "DeskGW: not pinned");
        require(J[jid].status == JobStatus.None, "DeskGW: job already exists");
        require(msg.value == serviceFee, "DeskGW: msg.value must equal serviceFee");
        require(cidMat != bytes32(0), "DeskGW: cidMat required");

        J[jid] = Job({
            status:    JobStatus.Posted,
            client:    msg.sender,
            hMat:      hMat,
            pkC:       pkC,
            cidMat:    cidMat,
            capV:      capV,
            dep:       msg.value,
            due:       due,
            claimUntil: 0,
            claimer:   address(0),
            cidOut:    bytes32(0),
            hRes:      bytes32(0),
            pkDj:      "",
            provider:  address(0)
        });

        emit ReqPosted(jid, sid, msg.sender, cidMat, msg.value, due);
    }

    // ── Stage 1b: Optional claim commitment ─────────────────────────

    /// @notice Provider posts a claim commitment for a job (advisory, does not block others).
    /// @param jid         Job identifier
    /// @param comJ        Claim commitment (advisory, stored off-chain / in event)
    /// @param claimWindow Provider-requested claim window in seconds (capped by claimTTL and due)
    function postClaim(bytes32 jid, bytes32 comJ, uint64 claimWindow) external {
        Job storage j = J[jid];
        require(j.status == JobStatus.Posted || j.status == JobStatus.Claimed,
                "DeskGW: invalid status");
        require(allowlisted[msg.sender], "DeskGW: not allowlisted");

        uint64 _now = uint64(block.timestamp);
        uint64 cappedWindow = claimWindow < claimTTL ? claimWindow : claimTTL;
        uint64 _claimUntil = _now + cappedWindow;
        if (_claimUntil > j.due) _claimUntil = j.due;

        j.status = JobStatus.Claimed;
        j.claimer = msg.sender;
        j.claimUntil = _claimUntil;

        emit ClaimPosted(jid, msg.sender, _claimUntil);
    }

    // ── Stage 2: Provider completion with proof; escrow payout ───────

    /// @notice Provider posts completion with result, zkSNARK proof, and signature.
    ///         Accepts the first valid completion; escrow is released to provider.
    /// @param jid    Job identifier
    /// @param cidOut Content address of encrypted result blob in Store
    /// @param hRes   Hash(res) – commitment to plaintext result
    /// @param pi     zkSNARK proof for R_sid(hMat, hRes) (mocked in this implementation)
    /// @param pkDj   Provider delivery-ephemeral DH public key
    /// @param sigJ   Provider signature: Sig(jid || sid || pkC || cidOut || hRes)
    /// @param j      Provider index in the allowlist
    function postCmp(
        bytes32 jid,
        bytes32 cidOut,
        bytes32 hRes,
        bytes calldata pi,
        bytes calldata pkDj,
        bytes calldata sigJ,
        uint256 j
    ) external {
        Job storage job = J[jid];
        require(job.status == JobStatus.Posted || job.status == JobStatus.Claimed,
                "DeskGW: invalid status");
        require(uint64(block.timestamp) <= job.due, "DeskGW: past deadline");

        address provider = providerList[j];
        require(allowlisted[provider], "DeskGW: not allowlisted");

        // Verify provider signature: Sig_sk_SP_j(jid || sid || pkC || cidOut || hRes)
        bytes32 digest = keccak256(abi.encodePacked(jid, sid, job.pkC, cidOut, hRes));
        require(_recoverSigner(digest, sigJ) == provider, "DeskGW: invalid signature");

        // Verify zkSNARK proof (mocked – replace with real verifier in production)
        require(_verifySNARK(vkZK, job.hMat, hRes, pi), "DeskGW: SNARK verification failed");

        job.status = JobStatus.Completed;
        job.provider = provider;
        job.cidOut = cidOut;
        job.hRes = hRes;
        job.pkDj = pkDj;

        uint256 payout = job.dep;
        job.dep = 0;
        payable(provider).transfer(payout);

        emit CmpAccepted(jid, provider, cidOut, hRes);
    }

    // ── Stage 4: Timeout and refund ─────────────────────────────────

    /// @notice Client reclaims escrow after the deadline has passed.
    /// @param jid        Job identifier
    /// @param refundAddr Address to receive the refund (may differ from client for unlinkability)
    function timeoutRefund(bytes32 jid, address refundAddr) external {
        Job storage job = J[jid];
        require(msg.sender == job.client, "DeskGW: caller is not client");
        require(uint64(block.timestamp) > job.due, "DeskGW: deadline not passed");
        require(job.status != JobStatus.Completed && job.status != JobStatus.Refunded,
                "DeskGW: cannot refund");

        job.status = JobStatus.Refunded;
        uint256 refund = job.dep;
        job.dep = 0;
        payable(refundAddr).transfer(refund);

        emit TimeoutRefund(jid, refundAddr);
    }

    // ── View helpers ────────────────────────────────────────────────

    function getJob(bytes32 jid) external view returns (Job memory) {
        return J[jid];
    }

    function providerCount() external view returns (uint256) {
        return providerList.length;
    }

    // ── Internal: ECDSA recovery ────────────────────────────────────

    function _recoverSigner(bytes32 digest, bytes memory sig) internal pure returns (address) {
        require(sig.length == 65, "DeskGW: invalid signature length");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
        if (v < 27) v += 27;
        require(v == 27 || v == 28, "DeskGW: invalid v value");
        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", digest)
        );
        return ecrecover(ethSignedHash, v, r, s);
    }

    // ── Internal: Mock SNARK verifier ───────────────────────────────

    /// @dev Mock: accepts any non-empty proof. Replace with a real SNARK verifier contract.
    function _verifySNARK(
        bytes32 /*vk*/,
        bytes32 /*hMat*/,
        bytes32 /*hRes*/,
        bytes calldata pi
    ) internal pure returns (bool) {
        return pi.length > 0;
    }
}
