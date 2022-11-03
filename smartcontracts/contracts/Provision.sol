// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract AnonSer {

  struct Provision {
    uint256 issueTime;
    uint256 paymentDeadlineTime;
    uint256 provisionDeadlineTime;
    uint price;
    uint paid;
    uint256 dealId;
    uint256 cid;
    uint256 paidTxid;
  }

	mapping (address => mapping (bytes20 => Provision)) provisions;

  function proofOfDelivery(uint256 paidWithCash) public returns (bytes20 provisionId) {
    Provision provision = new Provision({
      issue_time: block.timestamp,
      payment_deadline_time: block.timestamp + 1 days,
      provision_deadline_time: block.timestamp + 8 days,
      price: 1_000_000,
      paid: paidWithCash
    });
    provisionId = bytes20(keccak256(msg.sender, block.blockhash(block.number - 1)));
    provisions[msg.sender][provisionId] = provision;
  }

  function proofOfDelivery() public returns (bytes20 provisionId) {
    return proofOfDelivery(0);
  }

  function paymentWithEther(address serviceProvider, uint256 provisionId) public {
    Provision provision = provisions[serviceProvider][provisionId];
    if(provision.length == 0) {
      return;
    }
    provision.paid += msg.value;
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

	function sendCoin(address receiver, uint amount) public returns(bool sufficient) {
		if (balances[msg.sender] < amount) return false;
		balances[msg.sender] -= amount;
		balances[receiver] += amount;
		emit Transfer(msg.sender, receiver, amount);
		return true;
	}

	function getBalance(address addr) public view returns(uint) {
		return balances[addr];
	}
}
