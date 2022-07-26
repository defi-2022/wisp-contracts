import "@typechain/hardhat"
import "@nomiclabs/hardhat-ethers"
import hre, { ethers } from "hardhat";
import fs from "fs";
import { deployVerifier } from "./deployVerifier";
import { deployHasher } from "./deployHasher";

const deploy = async () => {
  const outDir = `./scripts/out/${hre.network.name}/`;

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const depositVerifierPath = `${outDir}deposit_verifier.address`;
  if (!fs.existsSync(depositVerifierPath)) {
    await deployVerifier(depositVerifierPath, "DepositVerifier");
  }

  const transactionVerifierPath = `${outDir}transaction_verifier.address`;
  if (!fs.existsSync(transactionVerifierPath)) {
    await deployVerifier(transactionVerifierPath, "TransactionVerifier");
  }

  const hasherPath = `${outDir}hasher.address`;
  if (!fs.existsSync(hasherPath)) {
    await deployHasher(hasherPath);
  }

  const hasherAddress = fs.readFileSync(hasherPath, "utf8");
  const depositVerifierAddress = fs.readFileSync(depositVerifierPath, "utf8");
  const transactionVerifierAddress = fs.readFileSync(transactionVerifierPath, "utf8");
  const tokenAddresses = [
    '0x06f875b02a7a42ce6677360159b0c5598fb1eab1',
    '0x0ffc5e6846d639b11a937d91e4ab62e05e2a642b',
    '0xc3d804b24f3ae0bcc9455c384ab31c783297f285'
  ];

  const Wisp = await ethers.getContractFactory("Wisp");
  const wisp = await Wisp.deploy(10, hasherAddress, depositVerifierAddress, transactionVerifierAddress, tokenAddresses);
  console.log("Wisp deployed to:", wisp.address);

  fs.writeFileSync(`${outDir}wisp.address`, wisp.address);
}

deploy()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });