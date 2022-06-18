import "@typechain/hardhat"
import "@nomiclabs/hardhat-ethers"
import hre, { ethers } from "hardhat";
import fs from "fs";
import { deployToken } from "./deployToken";
import { deployVerifier } from "./deployVerifier";
import { deployHasher } from "./deployHasher";

const deploy = async () => {
  const outDir = `./scripts/out/${hre.network.name}/`;

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const tokenPath = `${outDir}token.address`;
  if (!fs.existsSync(tokenPath)) {
    await deployToken(tokenPath);
  }

  const verifierPath = `${outDir}verifier.address`;
  if (!fs.existsSync(verifierPath)) {
    await deployVerifier(verifierPath);
  }

  const hasherPath = `${outDir}hasher.address`;
  if (!fs.existsSync(hasherPath)) {
    await deployHasher(hasherPath);
  }

  const tokenAddress = fs.readFileSync(tokenPath, "utf8");
  const verifierAddress = fs.readFileSync(verifierPath, "utf8");
  const hasherAddress = fs.readFileSync(hasherPath, "utf8");

  const Wisp = await ethers.getContractFactory("Wisp");
  const wisp = await Wisp.deploy(10, hasherAddress, verifierAddress, [tokenAddress]);
  console.log("Wisp deployed to:", wisp.address);

  fs.writeFileSync(`${outDir}wisp.address`, wisp.address);
}

deploy()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });