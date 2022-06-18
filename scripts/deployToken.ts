import "@typechain/hardhat"
import "@nomiclabs/hardhat-ethers"
import { ethers } from "hardhat";
import fs from "fs";

export const deployToken = async (path: string) => {
  if (fs.existsSync(path)) {
    console.log("Token already exists");
    return;
  }

  const WispToken = await ethers.getContractFactory("WispToken");
  const wispToken = await WispToken.deploy();

  console.log("WispToken token deployed to:", wispToken.address);

  fs.writeFileSync(path, wispToken.address);
}