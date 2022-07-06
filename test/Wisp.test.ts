import "@nomiclabs/hardhat-ethers"
import { ethers } from "hardhat";
import { PoseidonHasher } from "../utils/hasher";
import { DepositVerifier, IPoseidonHasher, Wisp, WispToken } from "../artifacts/contracts/types";
// @ts-ignore
import { buildPoseidon } from "circomlibjs";
import chai from "chai";
import { BigNumber } from "ethers";
import { randomBN } from "../utils/random";
import { encryptData } from "../utils/encryption";
import { getEncryptionPublicKey } from "@metamask/eth-sig-util";
import { generateDepositProof } from "../utils/proof";
import { MerkleTree } from "fixed-merkle-tree";

describe("Wisp", () => {
  let poseidon: PoseidonHasher;
  let token: WispToken;
  let depositVerifier: DepositVerifier;
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

    const DepositVerifier = await ethers.getContractFactory("DepositVerifier");
    depositVerifier = (await DepositVerifier.deploy()) as DepositVerifier;

    const Hasher = await ethers.getContractFactory("PoseidonHasher");
    hasher = (await Hasher.deploy()) as unknown as IPoseidonHasher;

    const Wisp = await ethers.getContractFactory("Wisp");
    wisp = (await Wisp.deploy(10, hasher.address, depositVerifier.address, [token.address])) as Wisp;

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
    const commitment = poseidon.hash([personalPublicKey, blinding, amount, token.address]);
    const encryptedData = encryptData(encryptionKey, Buffer.concat([
      ethers.utils.arrayify(personalPublicKey.toHexString()),
      ethers.utils.arrayify(blinding.toHexString()),
      ethers.utils.arrayify(amount.toHexString()),
      ethers.utils.arrayify(token.address),
    ]));

    const encryptedDataHash = ethers.utils.solidityKeccak256(["bytes"], [encryptedData]);

    const proof = await generateDepositProof({
      publicKey: personalPublicKey.toString(),
      blinding: blinding.toString(),
      amount: amount.toString(),
      currency: BigNumber.from(token.address).toString(),
      encryptedDataHash: encryptedDataHash,
    });

    const depositTransaction = wisp.deposit(proof, commitment, personalPublicKey, amount, token.address, encryptedData);
    await chai.expect(depositTransaction)
      .to.emit(wisp, "Payment")
      .withArgs(personalPublicKey.toHexString(), commitment, encryptedData, 0);

    const tree = new MerkleTree(10, [], {
      hashFunction: (a, b) => poseidon.hash([BigNumber.from(a), BigNumber.from(b)]).toString(),
      zeroElement: "8645981980787649023086883978738420856660271013038108762834452721572614684349"
    });
    tree.insert(commitment.toString());

    const root = await wisp.roots(0);

    chai.expect(root).to.be.equal(tree.root);
  });

});