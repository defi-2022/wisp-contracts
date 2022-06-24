import { HardhatUserConfig, subtask, task } from "hardhat/config";
import '@typechain/hardhat'
import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-waffle'
import "@nomiclabs/hardhat-etherscan";
import "hardhat-circom";
import * as path from "path";
import { TASK_CIRCOM_TEMPLATE } from "hardhat-circom";
import { Artifact, HardhatRuntimeEnvironment } from "hardhat/types";
import { ZkeyFastFile } from "hardhat-circom/src";
import fs from "fs";
// @ts-ignore
import { poseidonContract } from "circomlibjs";
import { TASK_COMPILE } from "hardhat/builtin-tasks/task-names";

const TASK_COMPILE_HASHER = "compile:hasher";

require("dotenv").config();

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
const TESTNET_PRIVATE_KEY = process.env.TESTNET_PRIVATE_KEY;
const POLYGON_SCAN_API_KEY = process.env.POLYGON_SCAN_API_KEY;

const config: HardhatUserConfig = {
  solidity: "0.8.13",
  circom: {
    inputBasePath: "./circuits",
    outputBasePath: "./artifacts/circuits",
    ptau: "pot15_final.ptau",
    circuits: [{
      name: "transaction",
      input: "input_transaction.json",
      version: 2,
    }, {
      name: "deposit",
      input: "input_deposit.json",
      version: 2,
    }],
  },
  typechain: {
    outDir: "artifacts/contracts/types",
    target: "ethers-v5"
  },
  networks: {
    polygonMumbai: {
      url: `https://polygon-mumbai.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: [`${TESTNET_PRIVATE_KEY}`]
    }
  },
  etherscan: {
    apiKey: {
      polygonMumbai: `${POLYGON_SCAN_API_KEY}`
    }
  }
}

export default config;

type ZKeys = {
  zkeys: ZkeyFastFile[];
}

subtask(TASK_CIRCOM_TEMPLATE, "generate Verifier template shipped by SnarkJS")
  .setAction(async ({ zkeys }: ZKeys, hre: HardhatRuntimeEnvironment) => {
    const base = fs.readFileSync(path.resolve("./circuits/template/base_groth16.sol.ejs"), "utf8");
    for (const zkey of zkeys) {
      const groth16Template = fs.readFileSync(path.resolve(`./circuits/template/${zkey.name}_verifier_groth16.sol.ejs`), "utf8");
      const verifierSol = await hre.snarkjs.zKey.exportSolidityVerifier(zkey, {
        groth16: groth16Template,
        plonk: "",
      });
      const fileName = zkey.name.charAt(0).toUpperCase() + zkey.name.slice(1) + "Verifier.sol";
      fs.writeFileSync("./artifacts/circuits/" + fileName, base + '\n' + verifierSol);
    }
  });

subtask(TASK_COMPILE_HASHER)
  .setAction(async (hre: HardhatRuntimeEnvironment) => {
    const outputPath = path.join(__dirname, "artifacts", "contracts", "PoseidonHasher.sol");
    const outputFile = path.join(outputPath, "PoseidonHasher.json");

    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    const contract: Artifact = {
      _format: "hh-sol-artifact-1",
      contractName: "PoseidonHasher",
      sourceName: "contracts/PoseidonHasher.sol",
      abi: poseidonContract.generateABI(2),
      bytecode: poseidonContract.createCode(2),
      deployedBytecode: "",
      linkReferences: {},
      deployedLinkReferences: {},
    }

    fs.writeFileSync(outputFile, JSON.stringify(contract, null, 2));
  });

task(TASK_COMPILE, "Compiles the entire project, building all artifacts")
  .setAction(async (taskArguments, hre, runSuper) => {
    await runSuper(taskArguments);
    await hre.run(TASK_COMPILE_HASHER);
  });
