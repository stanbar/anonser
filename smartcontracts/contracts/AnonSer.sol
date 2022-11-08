// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract AnonSer {

  struct Provision {
    uint256 issueTime;
    uint256 paymentDeadlineTime;
    uint256 provisionDeadlineTime;
    bool paidWithCash;
    string dealId;
    string cid;
    bool exist;
  }

	mapping (address => mapping (bytes32 => Provision)) provisions;

  event ProofOfDelivery(address indexed clientPubKey, 
                        bytes32 indexed provisionId);

  // Should the provisionId be of service provider and a clinet?
  // We don't want to allow a client to mess with someone's service
  function proofOfDelivery(address clientPubKey, bool didPaidWithCash) public returns (bytes32 provisionId) {

    provisionId = keccak256(abi.encodePacked(clientPubKey, blockhash(block.number - 1)));

    provisions[clientPubKey][provisionId] = Provision({
      exist: true,
      issueTime: block.timestamp,
      paymentDeadlineTime: block.timestamp + 1 days,
      provisionDeadlineTime: block.timestamp + 8 days,
      paidWithCash: didPaidWithCash,
      dealId: "",
      cid: ""
      // should we put here a client's signature?
    });
    emit ProofOfDelivery(clientPubKey, provisionId);
  }

  event ProofOfProvision(address indexed clientPubKey, 
                        bytes32 indexed provisionId,
                        string cid,
                        string dealId
                        );

  function proofOfProvision(address clientPubKey, bytes32 provisionId, string memory cid, string memory dealId) public {
    Provision storage provision = provisions[clientPubKey][provisionId];
    if (!provision.exist) {
      revert("Provision does not exist");
    }

    provision.cid = cid;
    provision.dealId = dealId;
    emit ProofOfProvision(clientPubKey, provisionId, cid, dealId);
  }

  function getProvision(address clientPubKey, bytes32 provisionId) public view returns (Provision memory) {
    return provisions[clientPubKey][provisionId];
  }
}
