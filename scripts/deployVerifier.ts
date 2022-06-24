import "@typechain/hardhat"
import "@nomiclabs/hardhat-ethers"
import { ethers } from "hardhat";
import fs from "fs";

export const deployVerifier = async (path: string) => {
  if (fs.existsSync(path)) {
    console.log("Verifier already exists");
    return;
  }

  const DepositVerifier = await ethers.getContractFactory("DepositVerifier");
  const depositVerifier = await DepositVerifier.deploy();
  console.log("DepositVerifier deployed to:", depositVerifier.address);

  fs.writeFileSync(path, depositVerifier.address);
}