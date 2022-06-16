import "@nomiclabs/hardhat-ethers"
import { ethers } from "hardhat";
import { PoseidonHasher } from "../utils/hasher";
import { IPoseidonHasher, Verifier, Wisp, WispToken } from "../artifacts/contracts/types";
// @ts-ignore
import { buildPoseidon } from "circomlibjs";
import chai from "chai";
import { BigNumber } from "ethers";
import { randomBN } from "../utils/random";
import { MerkleTree } from "fixed-merkle-tree";
import { encryptData } from "../utils/encryption";
import { getEncryptionPublicKey } from "@metamask/eth-sig-util";

describe("Wisp", () => {
  let poseidon: PoseidonHasher;
  let token: WispToken;
  let verifier: Verifier;
  let hasher: IPoseidonHasher;
  let wisp: Wisp;

  before(async () => {
    poseidon = new PoseidonHasher(await buildPoseidon());
  });

  beforeEach(async () => {
    const Token = await ethers.getContractFactory("WispToken");
    token = (await Token.deploy()) as WispToken;

    const amount = ethers.utils.parseEther("100");
    await token.mint(amount);

    const Verifier = await ethers.getContractFactory("Verifier");
    verifier = (await Verifier.deploy()) as Verifier;

    const Hasher = await ethers.getContractFactory("PoseidonHasher");
    hasher = (await Hasher.deploy()) as IPoseidonHasher;

    const Wisp = await ethers.getContractFactory("Wisp");
    wisp = (await Wisp.deploy(10, hasher.address, verifier.address, [token.address])) as Wisp;

    await token.approve(wisp.address, amount);
  });

  it("should have initial index set to 0", async () => {
    const index = await wisp.index();

    chai.expect(index).to.be.equal(0);
  });

  it("should add new commitment when pay method executed", async () => {
    const [signer] = await ethers.getSigners();
    const privateKey = BigNumber.from(ethers.utils.sha256(await signer.signMessage('some message')));
    const encryptionKey = getEncryptionPublicKey(privateKey.toHexString().slice(2));
    const personalPublicKey = poseidon.hash([privateKey, 0]);
    const blinding = randomBN();
    const amount = ethers.utils.parseEther("0.5");
    const commitment = poseidon.hash([personalPublicKey, blinding, amount, BigNumber.from(token.address)]);
    const encryptedData = encryptData(encryptionKey, ethers.utils.toUtf8Bytes(
      personalPublicKey.toHexString() + blinding.toHexString() + amount.toHexString() + token.address
    ));

    await chai.expect(wisp.pay(personalPublicKey.toHexString(), amount, token.address, commitment, encryptedData))
      .to.emit(wisp, "Payment")
      .withArgs(personalPublicKey.toHexString(), amount, token.address, commitment, encryptedData, 0);

    const tree = new MerkleTree(10, [], {
      hashFunction: (a, b) => poseidon.hash([BigNumber.from(a), BigNumber.from(b)]).toString(),
      zeroElement: "8645981980787649023086883978738420856660271013038108762834452721572614684349"
    });
    tree.insert(commitment.toString());

    const root = await wisp.roots(0);

    chai.expect(root).to.be.equal(tree.root);
  });

});