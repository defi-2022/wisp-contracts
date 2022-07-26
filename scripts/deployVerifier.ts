import "@typechain/hardhat"
import "@nomiclabs/hardhat-ethers"
import { ethers } from "hardhat";
import fs from "fs";

export const deployVerifier = async (path: string, name: string) => {
  if (fs.existsSync(path)) {
    console.log("Verifier already exists");
    return;
  }

  const Verifier = await ethers.getContractFactory(name);
  const verifier = await Verifier.deploy();
  console.log(name, "deployed to:", verifier.address);

  fs.writeFileSync(path, verifier.address);
}