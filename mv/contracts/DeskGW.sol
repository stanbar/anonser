// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title  DeskGW – Desk Gateway for Anonser-BC^MV
 * @notice Minimal anonymous service-desk flow (digital-verifiable, multi-provider).
 *
 * Protocol (maps to dissertation algorithms):
 *   alg:anonser-deploy   → constructor(): pin service descriptor, fee, windows, allowlist
 *   alg:anonser-request  → request():     client opens request with escrow + encrypted payload CID
 *   alg:anonser-claim    → claim():       allowed provider commits to fulfil the request
 *   alg:anonser-complete → complete():    provider posts result CID + proof, receives payout
 *   alg:anonser-timeout  → timeout():     client reclaims escrow after deadline
 *
 * Anonymity assumptions (operational):
 *   - Client uses an ephemeral EOA (fresh address per request) to break linkability.
 *   - Payload and result blobs are E2E encrypted (ECDH + AES-CTR) and stored off-chain.
 *   - On-chain data contains only opaque hashes / CIDs.
 *   - Network-layer anonymity (Tor / VPN) is the client's responsibility.
 */
contract DeskGW {
    // ── Service pin ─────────────────────────────────────────────────
    bytes32 public serviceDescHash;   // keccak256 of human-readable service description
    uint256 public serviceFee;        // exact escrow amount in wei
    uint256 public claimWindow;       // seconds after open in which a provider must claim
    uint256 public completionWindow;  // seconds after claim in which provider must complete

    address public owner;

    // ── Provider allowlist ──────────────────────────────────────────
    mapping(address => bool) public allowedProviders;

    // ── Request lifecycle ───────────────────────────────────────────
    enum Status { None, Open, Claimed, Completed, Refunded }

    struct Request {
        bytes32 payloadCid;       // content-addressed ref to encrypted client payload
        address client;           // ephemeral address (for refund path)
        uint256 escrow;           // wei held
        uint256 openedAt;         // block.timestamp when opened
        uint256 claimedAt;        // block.timestamp when claimed (0 if unclaimed)
        address provider;         // address of claiming provider
        bytes32 resultCid;        // content-addressed ref to encrypted result
        bytes   completionProof;  // provider signature over (requestId ‖ resultCid)
        Status  status;
    }

    mapping(bytes32 => Request) public requests;

    // ── Events ──────────────────────────────────────────────────────
    event RequestOpened(bytes32 indexed requestId, bytes32 payloadCid, address indexed client, uint256 escrow);
    event RequestClaimed(bytes32 indexed requestId, address indexed provider);
    event RequestCompleted(bytes32 indexed requestId, bytes32 resultCid, address indexed provider);
    event RequestRefunded(bytes32 indexed requestId, address indexed client);
    event ProviderAdded(address indexed provider);
    event ProviderRemoved(address indexed provider);

    // ── Modifiers ───────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "DeskGW: caller is not owner");
        _;
    }

    modifier onlyAllowedProvider() {
        require(allowedProviders[msg.sender], "DeskGW: not an allowed provider");
        _;
    }

    // ── alg:anonser-deploy ──────────────────────────────────────────
    constructor(
        bytes32 _serviceDescHash,
        uint256 _serviceFee,
        uint256 _claimWindow,
        uint256 _completionWindow,
        address[] memory _providers
    ) {
        require(_serviceFee > 0, "DeskGW: fee must be > 0");
        require(_claimWindow > 0, "DeskGW: claimWindow must be > 0");
        require(_completionWindow > 0, "DeskGW: completionWindow must be > 0");

        owner = msg.sender;
        serviceDescHash = _serviceDescHash;
        serviceFee = _serviceFee;
        claimWindow = _claimWindow;
        completionWindow = _completionWindow;

        for (uint256 i = 0; i < _providers.length; i++) {
            allowedProviders[_providers[i]] = true;
            emit ProviderAdded(_providers[i]);
        }
    }

    // ── alg:anonser-request ─────────────────────────────────────────
    /// @notice Client opens a request. Must send exactly `serviceFee` as escrow.
    /// @param requestId   Unique identifier (client-generated, e.g. keccak256 of random nonce)
    /// @param payloadCid  Content-addressed reference to the encrypted service payload
    function request(bytes32 requestId, bytes32 payloadCid) external payable {
        require(requests[requestId].status == Status.None, "DeskGW: request already exists");
        require(msg.value == serviceFee, "DeskGW: msg.value must equal serviceFee");
        require(payloadCid != bytes32(0), "DeskGW: payloadCid required");

        requests[requestId] = Request({
            payloadCid: payloadCid,
            client: msg.sender,
            escrow: msg.value,
            openedAt: block.timestamp,
            claimedAt: 0,
            provider: address(0),
            resultCid: bytes32(0),
            completionProof: "",
            status: Status.Open
        });

        emit RequestOpened(requestId, payloadCid, msg.sender, msg.value);
    }

    // ── alg:anonser-claim ───────────────────────────────────────────
    /// @notice An allowed provider claims the request (optional commitment step).
    function claim(bytes32 requestId) external onlyAllowedProvider {
        Request storage r = requests[requestId];
        require(r.status == Status.Open, "DeskGW: request not open");
        require(block.timestamp <= r.openedAt + claimWindow, "DeskGW: claim window expired");

        r.provider = msg.sender;
        r.claimedAt = block.timestamp;
        r.status = Status.Claimed;

        emit RequestClaimed(requestId, msg.sender);
    }

    // ── alg:anonser-complete ────────────────────────────────────────
    /// @notice Provider posts result and proof; escrow is released to provider.
    /// @param resultCid  Content-addressed reference to the encrypted result blob
    /// @param proof      Signature: sign(keccak256(requestId ‖ resultCid), providerKey)
    function complete(bytes32 requestId, bytes32 resultCid, bytes calldata proof) external {
        Request storage r = requests[requestId];
        require(r.status == Status.Claimed, "DeskGW: request not claimed");
        require(msg.sender == r.provider, "DeskGW: caller is not assigned provider");
        require(block.timestamp <= r.claimedAt + completionWindow, "DeskGW: completion window expired");
        require(resultCid != bytes32(0), "DeskGW: resultCid required");
        require(proof.length > 0, "DeskGW: proof required");

        // Verify the provider's signature over (requestId ‖ resultCid)
        bytes32 digest = keccak256(abi.encodePacked(requestId, resultCid));
        require(_recoverSigner(digest, proof) == r.provider, "DeskGW: invalid completion proof");

        r.resultCid = resultCid;
        r.completionProof = proof;
        r.status = Status.Completed;

        uint256 payout = r.escrow;
        r.escrow = 0;
        payable(r.provider).transfer(payout);

        emit RequestCompleted(requestId, resultCid, msg.sender);
    }

    // ── alg:anonser-timeout ─────────────────────────────────────────
    /// @notice Client reclaims escrow when claim or completion window has elapsed.
    function timeout(bytes32 requestId) external {
        Request storage r = requests[requestId];
        require(msg.sender == r.client, "DeskGW: caller is not client");
        require(
            r.status == Status.Open || r.status == Status.Claimed,
            "DeskGW: cannot refund in current status"
        );

        if (r.status == Status.Open) {
            require(block.timestamp > r.openedAt + claimWindow, "DeskGW: claim window not yet expired");
        } else {
            require(block.timestamp > r.claimedAt + completionWindow, "DeskGW: completion window not yet expired");
        }

        r.status = Status.Refunded;
        uint256 refund = r.escrow;
        r.escrow = 0;
        payable(r.client).transfer(refund);

        emit RequestRefunded(requestId, r.client);
    }

    // ── Provider management ─────────────────────────────────────────
    function addProvider(address provider) external onlyOwner {
        allowedProviders[provider] = true;
        emit ProviderAdded(provider);
    }

    function removeProvider(address provider) external onlyOwner {
        allowedProviders[provider] = false;
        emit ProviderRemoved(provider);
    }

    // ── View helpers ────────────────────────────────────────────────
    function getRequest(bytes32 requestId)
        external
        view
        returns (
            bytes32 payloadCid,
            address client,
            uint256 escrow,
            uint256 openedAt,
            uint256 claimedAt,
            address provider,
            bytes32 resultCid,
            bytes memory completionProof,
            Status status
        )
    {
        Request storage r = requests[requestId];
        return (
            r.payloadCid, r.client, r.escrow,
            r.openedAt, r.claimedAt, r.provider,
            r.resultCid, r.completionProof, r.status
        );
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
        // Use Ethereum signed-message prefix for standard wallet compatibility
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest));
        return ecrecover(ethSignedHash, v, r, s);
    }
}
