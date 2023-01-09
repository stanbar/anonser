// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract AnonSer {
    struct Provision {
        uint256 issueTime;
        uint256 paymentDeadlineTime;
        uint256 provisionDeadlineTime;
        bool paidInCash;
        string paymentAddress;
        string cid;
        bool exist;
        uint256 dealId;
        string minerId;
    }

    mapping(bytes => mapping(bytes32 => Provision)) public provisions;

    address private _owner;

    event ProofOfDelivery(
        bytes indexed clientPubKey,
        bytes32 indexed provisionId,
        uint256 issueTime,
        uint256 paymentDeadlineTime,
        uint256 provisionDeadlineTime,
        bool paidInCash,
        string paymentAddress
    );

    constructor() {
        _owner = msg.sender;
    }

    modifier onlyOwner() {
        require(
            _owner == msg.sender,
            "Ownership Assertion: Caller of the function is not the owner."
        );
        _;
    }

    function proofOfDelivery(
        bytes memory clientPubKey,
        bytes32 provisionId,
        bool paidInCash,
        string memory paymentAddress
    ) public onlyOwner {
        if (provisions[clientPubKey][provisionId].exist) {
            revert("Provision already exists");
        }
        if (paidInCash && bytes(paymentAddress).length > 0) {
            revert("Payment address should be empty if paid in cash");
        }
        if (!paidInCash && bytes(paymentAddress).length == 0) {
            revert(
                "Payment address should not be empty if didn't paid in cash"
            );
        }
        Provision memory provision = Provision({
            exist: true,
            issueTime: block.timestamp,
            paymentDeadlineTime: block.timestamp + 1 days,
            provisionDeadlineTime: block.timestamp + 8 days,
            paidInCash: paidInCash,
            paymentAddress: paymentAddress,
            dealId: 0,
            cid: "",
            minerId: ""
        });
        provisions[clientPubKey][provisionId] = provision;
        emit ProofOfDelivery(
            clientPubKey,
            provisionId,
            provision.issueTime,
            provision.paymentDeadlineTime,
            provision.provisionDeadlineTime,
            provision.paidInCash,
            provision.paymentAddress
        );
    }

    event ProofOfProvision(
        bytes indexed clientPubKey,
        bytes32 indexed provisionId,
        string cid,
        uint256 dealId,
        string minerId
    );

    function proofOfProvision(
        bytes memory clientPubKey,
        bytes32 provisionId,
        string memory cid,
        uint256 dealId,
        string memory minerId
    ) public onlyOwner {
        Provision storage provision = provisions[clientPubKey][provisionId];
        if (!provision.exist) {
            revert("Provision must be created with proof of delivery first");
        }

        provision.cid = cid;
        provision.dealId = dealId;
        provision.minerId = minerId;
        emit ProofOfProvision(clientPubKey, provisionId, cid, dealId, minerId);
    }

    function getProvision(bytes memory clientPubKey, bytes32 provisionId)
        public
        view
        returns (Provision memory)
    {
        return provisions[clientPubKey][provisionId];
    }
}
