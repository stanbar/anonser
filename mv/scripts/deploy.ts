import { ethers } from "hardhat";

async function main() {
  const [deployer, provider1, provider2] = await ethers.getSigners();

  console.log("Deploying DeskGW with account:", deployer.address);

  // Deploy contract (org = deployer)
  const DeskGW = await ethers.getContractFactory("DeskGW");
  const gw = await DeskGW.deploy();
  const address = await gw.getAddress();
  console.log("DeskGW deployed to:", address);

  // Stage 0: Pin service parameters
  const sid = ethers.keccak256(ethers.toUtf8Bytes("DNA paternity test"));
  const vkZK = ethers.keccak256(ethers.toUtf8Bytes("mock-verification-key"));
  const claimTTL = 3600; // 1 hour max claim window
  const serviceFee = ethers.parseEther("0.1");

  await gw.pinService(sid, vkZK, claimTTL, serviceFee);
  console.log("Service pinned:");
  console.log("  sid:", sid);
  console.log("  vkZK:", vkZK);
  console.log("  claimTTL:", claimTTL, "seconds");
  console.log("  serviceFee:", ethers.formatEther(serviceFee), "ETH");

  // Register providers
  await gw.registerProvider(provider1.address);
  await gw.registerProvider(provider2.address);
  console.log("Provider 1:", provider1.address);
  console.log("Provider 2:", provider2.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
