import { ethers } from "hardhat";
import { PoseidonHasher } from "../utils/hasher";
import { DepositVerifier, TransactionVerifier, Wisp, WispToken } from "../artifacts/contracts/types";
// @ts-ignore
import { buildPoseidon } from "circomlibjs";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { randomBN } from "../utils/random";
import { encryptData } from "../utils/encryption";
import { getEncryptionPublicKey } from "@metamask/eth-sig-util";
import { generateDepositProof, generateTransactionProof } from "../utils/proof";
import { MerkleTree } from "fixed-merkle-tree";

describe("Wisp", () => {
  let poseidon: PoseidonHasher;
  let token: WispToken;
  let depositVerifier: DepositVerifier;
  let transactionVerifier: TransactionVerifier;
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

    const TransactionVerifier = await ethers.getContractFactory("TransactionVerifier");
    transactionVerifier = (await TransactionVerifier.deploy()) as TransactionVerifier;

    const Hasher = await ethers.getContractFactory("PoseidonHasher");
    const hasher = (await Hasher.deploy());

    const Wisp = await ethers.getContractFactory("Wisp");
    wisp = (await Wisp.deploy(10, hasher.address, depositVerifier.address, transactionVerifier.address, [token.address])) as Wisp;

    await token.approve(wisp.address, amount);
  });

  it("should have initial index set to 0", async () => {
    const index = await wisp.index();

    expect(index).to.be.equal(0);
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
    await expect(depositTransaction)
      .to.emit(wisp, "Payment")
      .withArgs(personalPublicKey.toHexString(), commitment, encryptedData, 0);

    const tree = new MerkleTree(10, [], {
      hashFunction: (a, b) => poseidon.hash([BigNumber.from(a), BigNumber.from(b)]).toString(),
      zeroElement: "8645981980787649023086883978738420856660271013038108762834452721572614684349"
    });
    tree.insert(commitment.toString());

    const root = await wisp.roots(0);

    expect(root).to.be.equal(tree.root);
  }).timeout(5000);

  it("should create a new transaction", async () => {
    const [signer] = await ethers.getSigners();
    const privateKey = poseidon.hash([await signer.signMessage("some message")]);
    const encryptionKey = getEncryptionPublicKey(privateKey.toHexString().slice(2));
    const personalPublicKey = poseidon.hash([privateKey, 0]);

    const depositBlinding = randomBN();
    const depositAmount = ethers.utils.parseEther("0.5");
    const depositCommitment = poseidon.hash([personalPublicKey, depositBlinding, depositAmount, token.address]);
    const depositEncryptedData = encryptData(encryptionKey, Buffer.concat([
      ethers.utils.arrayify(personalPublicKey.toHexString()),
      ethers.utils.arrayify(depositBlinding.toHexString()),
      ethers.utils.arrayify(depositAmount.toHexString()),
      ethers.utils.arrayify(token.address),
    ]));

    const encryptedDataHash = ethers.utils.solidityKeccak256(["bytes"], [depositEncryptedData]);

    const depositProof = await generateDepositProof({
      publicKey: personalPublicKey.toString(),
      blinding: depositBlinding.toString(),
      amount: depositAmount.toString(),
      currency: BigNumber.from(token.address).toString(),
      encryptedDataHash: encryptedDataHash,
    });

    const depositTransaction = await wisp.deposit(depositProof, depositCommitment, personalPublicKey,
      depositAmount, token.address, depositEncryptedData);
    await depositTransaction.wait(1);

    // transaction
    const tree = new MerkleTree(10, [], {
      hashFunction: (a, b) => poseidon.hash([a, b]).toString(),
      zeroElement: "8645981980787649023086883978738420856660271013038108762834452721572614684349"
    });
    tree.insert(depositCommitment.toString());

    const merkleProof = tree.proof(depositCommitment.toString());
    const root = merkleProof.pathRoot.toString();
    const pathAsNumber = [...merkleProof.pathIndices].reverse()
      .reduce((previousValue, currentValue) => previousValue * 2 + currentValue, 0);
    const nullifier1 = poseidon.hash([privateKey, depositCommitment, BigNumber.from(pathAsNumber)]);

    const randomNonce = randomBN();
    const randomPublicKey = poseidon.hash([privateKey, randomNonce]);
    const randomBlinding = randomBN();
    const zeroAmount = BigNumber.from(0);
    const zeroCommitment = poseidon.hash([randomPublicKey, randomBlinding, zeroAmount, token.address]);
    const nullifier2 = poseidon.hash([privateKey, zeroCommitment, BigNumber.from(pathAsNumber)]);
    const recipient = ethers.Wallet.createRandom().address;

    const outBlinding1 = randomBN();
    const outBlinding2 = randomBN();

    const outCommitment1 = poseidon.hash([personalPublicKey, outBlinding1, zeroAmount, token.address]);
    const outCommitment2 = poseidon.hash([personalPublicKey, outBlinding2, zeroAmount, token.address]);

    const input = {
      privateKey: privateKey.toString(),
      nonce: ["0", randomNonce.toString()],
      currency: token.address.toString(),
      inBlinding: [depositBlinding.toString(), randomBlinding.toString()],
      inAmount: [depositAmount.toString(), zeroAmount.toString()],
      root: root,
      pathElements: [[...merkleProof.pathElements].map(it => it.toString()), [...merkleProof.pathElements].map(it => it.toString())],
      pathIndices: [[...merkleProof.pathIndices], [...merkleProof.pathIndices]],
      recipient: recipient,
      withdrawnAmount: depositAmount.toString(),
      outPublicKey: [personalPublicKey.toString(), personalPublicKey.toString()],
      outBlinding: [outBlinding1, outBlinding2].map(it => it.toString()),
      outAmount: [zeroAmount.toString(), zeroAmount.toString()],
    }

    const proof = await generateTransactionProof(input);

    const transaction = await wisp.transaction(proof, [nullifier1, nullifier2], root, recipient, token.address, depositAmount,
      [personalPublicKey, personalPublicKey], [outCommitment1, outCommitment2], ["0x00", "0x00"]);
    await transaction.wait(1);

    const recipientBalance = await token.balanceOf(recipient);
    expect(recipientBalance).to.be.equal(depositAmount);
  }).timeout(10000);

});