/**
 * DeskGW contract ABI and helpers.
 * ABI is extracted from the compiled artifact at build time.
 */

export const DESK_GW_ABI = [
  "constructor(bytes32 _serviceDescHash, uint256 _serviceFee, uint256 _claimWindow, uint256 _completionWindow, address[] _providers)",
  "function serviceDescHash() view returns (bytes32)",
  "function serviceFee() view returns (uint256)",
  "function claimWindow() view returns (uint256)",
  "function completionWindow() view returns (uint256)",
  "function owner() view returns (address)",
  "function allowedProviders(address) view returns (bool)",
  "function request(bytes32 requestId, bytes32 payloadCid) payable",
  "function claim(bytes32 requestId)",
  "function complete(bytes32 requestId, bytes32 resultCid, bytes proof)",
  "function timeout(bytes32 requestId)",
  "function addProvider(address provider)",
  "function removeProvider(address provider)",
  "function getRequest(bytes32 requestId) view returns (bytes32 payloadCid, address client, uint256 escrow, uint256 openedAt, uint256 claimedAt, address provider, bytes32 resultCid, bytes completionProof, uint8 status)",
  "event RequestOpened(bytes32 indexed requestId, bytes32 payloadCid, address indexed client, uint256 escrow)",
  "event RequestClaimed(bytes32 indexed requestId, address indexed provider)",
  "event RequestCompleted(bytes32 indexed requestId, bytes32 resultCid, address indexed provider)",
  "event RequestRefunded(bytes32 indexed requestId, address indexed client)",
  "event ProviderAdded(address indexed provider)",
  "event ProviderRemoved(address indexed provider)",
] as const;

export const STATUS_LABELS: Record<number, string> = {
  0: "None",
  1: "Open",
  2: "Claimed",
  3: "Completed",
  4: "Refunded",
};

export const STATUS_COLORS: Record<number, string> = {
  0: "#888",
  1: "#2196f3",
  2: "#ff9800",
  3: "#4caf50",
  4: "#9c27b0",
};
