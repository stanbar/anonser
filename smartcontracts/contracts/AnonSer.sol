// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract AnonSer {
    struct Provision {
        uint256 issueTime;
        uint256 paymentDeadlineTime;
        uint256 provisionDeadlineTime;
        bool paidWithCash;
        string cid;
        bool exist;
        uint256 dealId;
        string minerId;
    }

    mapping(bytes => mapping(bytes32 => Provision)) public provisions;

    event ProofOfDelivery(
        bytes indexed clientPubKey,
        bytes32 indexed provisionId,
        uint256 issueTime,
        uint256 paymentDeadlineTime,
        uint256 provisionDeadlineTime,
        bool paidWithCash
    );

    // Should the provisionId be of service provider and a clinet?
    // We don't want to allow a client to mess with someone's service
    function proofOfDelivery(
        bytes memory clientPubKey,
        bytes32 provisionId,
        bool didPaidWithCash
    ) public {
        Provision memory provision = Provision({
            exist: true,
            issueTime: block.timestamp,
            paymentDeadlineTime: block.timestamp + 1 days,
            provisionDeadlineTime: block.timestamp + 8 days,
            paidWithCash: didPaidWithCash,
            dealId: 0,
            cid: "",
            minerId: ""
            // should we put here a client's signature?
        });
        provisions[clientPubKey][provisionId] = provision;
        emit ProofOfDelivery(
            clientPubKey,
            provisionId,
            provision.issueTime,
            provision.paymentDeadlineTime,
            provision.provisionDeadlineTime,
            provision.paidWithCash
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
    ) public {
        Provision storage provision = provisions[clientPubKey][provisionId];
        if (!provision.exist) {
            revert("Provision does not exist");
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
