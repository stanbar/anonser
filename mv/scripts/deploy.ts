import { ethers } from "hardhat";

async function main() {
  const [deployer, provider1, provider2] = await ethers.getSigners();

  console.log("Deploying DeskGW with account:", deployer.address);

  const serviceDescHash = ethers.keccak256(ethers.toUtf8Bytes("DNA paternity test"));
  const serviceFee = ethers.parseEther("0.1");
  const claimWindow = 3600; // 1 hour
  const completionWindow = 86400; // 24 hours

  const DeskGW = await ethers.getContractFactory("DeskGW");
  const gw = await DeskGW.deploy(serviceDescHash, serviceFee, claimWindow, completionWindow, [
    provider1.address,
    provider2.address,
  ]);

  const address = await gw.getAddress();
  console.log("DeskGW deployed to:", address);
  console.log("Provider 1:", provider1.address);
  console.log("Provider 2:", provider2.address);
  console.log("Service fee:", ethers.formatEther(serviceFee), "ETH");
  console.log("Claim window:", claimWindow, "seconds");
  console.log("Completion window:", completionWindow, "seconds");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
