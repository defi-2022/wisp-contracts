import "@nomiclabs/hardhat-ethers"
import chai from "chai";
import { ethers } from "hardhat"
import { Verifier } from "../artifacts/contracts/types"
import { BigNumber } from "ethers";
import { PoseidonHasher } from "../utils/hasher";
import { randomBN } from "../utils/random";
import { MerkleTree } from "fixed-merkle-tree";
// @ts-ignore
import { buildPoseidon } from "circomlibjs";
import { generateProof } from "../utils/proof";

describe("Verifier", () => {
  let poseidon: PoseidonHasher;

  before(async () => {
    poseidon = new PoseidonHasher(await buildPoseidon());
  });

  it("should verify proof", async () => {
    const Verifier = await ethers.getContractFactory("Verifier");
    const verifier = (await Verifier.deploy()) as Verifier;

    const [signer] = await ethers.getSigners();
    const privateKey = BigNumber.from(ethers.utils.sha256(await signer.signMessage('some message')));
    const personalPublicKey = poseidon.hash([privateKey, 0]);
    const currency = randomBN(20);
    const inBlinding = [randomBN(), randomBN()];
    const inAmount = [ethers.utils.parseEther("0.5"), BigNumber.from(0)];

    const inCommitment1 = poseidon.hash([personalPublicKey, inBlinding[0], inAmount[0], currency]);
    const inCommitment2 = poseidon.hash([personalPublicKey, inBlinding[1], inAmount[1], currency]);

    const elements = [];
    for (let i = 0; i < 569; i++) {
      elements.push(randomBN().toString());
    }

    const tree = new MerkleTree(10, elements, {
      hashFunction: (a, b) => poseidon.hash([a, b]).toString(),
      zeroElement: "8645981980787649023086883978738420856660271013038108762834452721572614684349"
    });

    tree.insert(inCommitment1.toString());
    const merkleProof = tree.proof(inCommitment1.toString());

    const withdrawnAmount = ethers.utils.parseEther("0.1");

    const pathAsNumber = [...merkleProof.pathIndices].reverse()
      .reduce((previousValue, currentValue) => previousValue * 2 + currentValue, 0);
    const nullifier1 = poseidon.hash([privateKey, inCommitment1, BigNumber.from(pathAsNumber)]);
    const nullifier2 = poseidon.hash([privateKey, inCommitment2, BigNumber.from(pathAsNumber)]);

    const outBlinding = [randomBN(), randomBN()];
    const outAmount = [ethers.utils.parseEther("0.25"), ethers.utils.parseEther("0.15")];
    const outCommitment1 = poseidon.hash([personalPublicKey, outBlinding[0], outAmount[0], currency]);
    const outCommitment2 = poseidon.hash([personalPublicKey, outBlinding[1], outAmount[1], currency]);

    const input = {
      privateKey: privateKey.toString(),
      nonce: ["0", randomBN().toString()],
      currency: currency.toString(),
      inBlinding: inBlinding.map(it => it.toString()),
      inAmount: inAmount.map(it => it.toString()),
      root: merkleProof.pathRoot.toString(),
      pathElements: [[...merkleProof.pathElements].map(it => it.toString()), [...merkleProof.pathElements].map(it => it.toString())],
      pathIndices: [[...merkleProof.pathIndices], [...merkleProof.pathIndices]],
      recipient: "0",
      withdrawnAmount: withdrawnAmount.toString(),
      outPublicKey: [personalPublicKey.toString(), personalPublicKey.toString()],
      outBlinding: outBlinding.map(it => it.toString()),
      outAmount: outAmount.map(it => it.toString()),
    }

    const proof = await generateProof(input);
    const valid = await verifier.verifyProof(
      [proof.pi_a[0], proof.pi_a[1]],
      [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]],
      [proof.pi_c[0], proof.pi_c[1]],
      [
        nullifier1,
        nullifier2,
        outCommitment1,
        outCommitment2
      ]
    );

    chai.expect(true).to.be.equal(true);
  });

  it("print zero value", async () => {
    const fieldSize = BigNumber.from("21888242871839275222246405745257275088548364400416034343698204186575808495617");
    const hash = BigNumber.from(ethers.utils.id("wisp.finance"));
    console.log("zero value:", poseidon.hash([hash.div(fieldSize)]).toString());
  });
});