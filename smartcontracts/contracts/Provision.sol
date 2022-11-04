// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract AnonSer {

  struct Provision {
    uint256 issueTime;
    uint256 paymentDeadlineTime;
    uint256 provisionDeadlineTime;
    bool paidWithCash;
    bytes proofOfPayment;
    uint256 dealId;
    uint256 cid;
    uint256 paidTxid;
  }

	mapping (address => mapping (uint256 => Provision)) provisions;

  // Should the provisionId be of service provider and a clinet?
  // We don't want to allow a client to mess with someone's service
  function proofOfDelivery(bool didPaidWithCash) public returns (uint256 provisionId) {
    provisionId = keccak256(msg.sender, block.blockhash(block.number - 1));
    provisions[msg.sender][provisionId] = Provision({
      issue_time: block.timestamp,
      payment_deadline_time: block.timestamp + 1 days,
      provision_deadline_time: block.timestamp + 8 days,
      paidWithCash: didPaidWithCash
    });
  }

  function proofOfDelivery() public returns (bytes20 provisionId) {
    return proofOfDelivery(0);
  }

  // https://ethereum.stackexchange.com/a/74443/33935
  function proofOfPayment(address serviceProvider, uint256 provisionId, bytes memory proofOfPayment) public {
    Provision storage provision = provisions[serviceProvider][provisionId];
    if(provision.length == 0) {
      return;
    }
    provision.proofOfPayment = proofOfPayment;
  }

  function paymentWithExternal(uint256 txid, address serviceProvider, uint256 provisionId) public {
    Provision provision = provisions[serviceProvider][provisionId];
    if(provision.length == 0) {
      return;
    }
    provision.paidTxid = txid;
  }

  function proofOfProvision() public {
  }

  function withdrawToServiceProvider(address serviceProvider, uint256 provisionId) public {
    Provision provision = provisions[serviceProvider][provisionId];
    if(provision.length == 0) {
      return;
    }

    if(provision.paid >= provision.price) {
      payable(serviceProvider).transfer(provision.paid);
    }
  }

}
