// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

// These files are dynamically created at test time
import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/AnonSer.sol";

contract ProvisionCoin {

  function testInitialBalanceUsingDeployedContract() public {
    AnonSer smartContract = AnonSer(DeployedAddresses.AnonSer());
    smartContract.proofOfDelivery(0xFB0B95007725cd50D687F08451228F822078D2A5, false);
  }

  function testInitialBalanceUsingWithNewProvision() public {
    AnonSer smartContract = new AnonSer();
    smartContract.proofOfDelivery(0xFB0B95007725cd50D687F08451228F822078D2A5, false);
  }
  /* function testInitialBalanceWithNewMetaCoin() public { */
  /*   Provision smartContract = new Provision(); */

  /*   uint expected = 10000; */

  /*   Assert.equal(meta.getBalance(tx.origin), expected, "Owner should have 10000 MetaCoin initially"); */
  /* } */

}
