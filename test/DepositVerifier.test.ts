import chai from "chai";
import { ethers } from "hardhat"
import { DepositVerifier } from "../artifacts/contracts/types";
import { BigNumber } from "ethers";
import { PoseidonHasher } from "../utils/hasher";
import { randomBN } from "../utils/random";
// @ts-ignore
import { buildPoseidon } from "circomlibjs";
import { generateDepositProof } from "../utils/proof";

describe("DepositVerifier", () => {
  let poseidon: PoseidonHasher;

  before(async () => {
    poseidon = new PoseidonHasher(await buildPoseidon());
  });

  it("should verify proof", async () => {
    const DepositVerifier = await ethers.getContractFactory("DepositVerifier");
    const verifier = (await DepositVerifier.deploy()) as DepositVerifier;

    const [signer] = await ethers.getSigners();
    const privateKey = BigNumber.from(ethers.utils.sha256(await signer.signMessage('some message')));
    const publicKey = poseidon.hash([privateKey, 0]);
    const blinding = randomBN();
    const amount = ethers.utils.parseEther("0.5");
    const currency = randomBN(20);

    const commitment = poseidon.hash([publicKey, blinding, amount, currency]);

    const encryptedDataHash = randomBN();

    const input = {
      publicKey: publicKey.toString(),
      blinding: blinding.toString(),
      amount: amount.toString(),
      currency: currency.toString(),
      encryptedDataHash: encryptedDataHash.toString(),
    }

    const proof = await generateDepositProof(input);
    const valid = await verifier.verifyProof(proof, [commitment, publicKey, amount, currency, encryptedDataHash]);

    chai.expect(valid).to.be.equal(true);
  });
});