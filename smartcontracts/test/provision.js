const AnonSer = artifacts.require("AnonSer");

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract("Provision", function(accounts) {
  const catchRevert = require("./exceptions.js").catchRevert;

  it("Shuld be deployed", async function() {
    await AnonSer.deployed();
    return assert.isTrue(true);
  });

  it("proof of delivery", async function() {
    const anonSerInstance = await AnonSer.deployed();

    const result = await anonSerInstance.proofOfDelivery(accounts[1], false, {
      from: accounts[0],
    });
    const provisionId = result.logs[0].args.provisionId;
    console.log(provisionId);

    const provision = await anonSerInstance.getProvision(
      accounts[1],
      provisionId,
    );
    assert.isTrue(provision.issueTime < Date.now());
    assert.isTrue(provision.issueTime < provision.paymentDeadlineTime);
    assert.isTrue(provision.issueTime < provision.provisionDeadlineTime);
    assert.isTrue(
      provision.paymentDeadlineTime < provision.provisionDeadlineTime,
    );
    assert.isFalse(provision.paidWithCash);
    assert.equal(provision.dealId, "");
    assert.equal(provision.cid, "");
    assert.isTrue(provision.exist);
  });

  it("proof of provision without started provision", async function() {
    const anonSerInstance = await AnonSer.deployed();

    const provisionId = "0x0000000000000000000000000000000000000001111111111111111111111111";

    await catchRevert(anonSerInstance.proofOfProvision(
      accounts[1],
      provisionId,
      "cid",
      "dealId",
      { from: accounts[0] },
    ));
  });

  it("proof of provision", async function() {
    const anonSerInstance = await AnonSer.deployed();

    const result = await anonSerInstance.proofOfDelivery(accounts[1], false, {
      from: accounts[0],
    });

    const provisionId = result.logs[0].args.provisionId;

    await anonSerInstance.proofOfProvision(
      accounts[1],
      provisionId,
      "cid",
      "dealId",
      { from: accounts[0] },
    );

    const provision = await anonSerInstance.getProvision(
      accounts[1],
      provisionId,
    );
    assert.isTrue(provision.issueTime < Date.now());
    assert.isTrue(provision.issueTime < provision.paymentDeadlineTime);
    assert.isTrue(provision.issueTime < provision.provisionDeadlineTime);
    assert.isTrue(
      provision.paymentDeadlineTime < provision.provisionDeadlineTime,
    );
    assert.isFalse(provision.paidWithCash);
    assert.equal(provision.dealId, "dealId");
    assert.equal(provision.cid, "cid");
    assert.isTrue(provision.exist);
  });

});
