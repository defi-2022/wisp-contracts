import "@nomiclabs/hardhat-ethers"
// @ts-ignore
import { groth16 } from "snarkjs";
// @ts-ignore
import { utils } from "ffjavascript";
import { ethers } from "ethers";

export type TransactionInput = {
  privateKey: string,
  nonce: string[],
  currency: string,
  inBlinding: string[],
  inAmount: string[],
  root: string,
  pathElements: string[][],
  pathIndices: number[][],
  recipient: string,
  withdrawnAmount: string,
  outPublicKey: string[],
  outBlinding: string[],
  outAmount: string[],
}

export const generateTransactionProof = async (input: TransactionInput): Promise<string> => {
  const { proof } = await groth16.fullProve(
    utils.stringifyBigInts(input),
    "./artifacts/circuits/transaction.wasm",
    "./artifacts/circuits/transaction.zkey");

  return ethers.utils.defaultAbiCoder.encode(["uint256[8]"],
    [[
      proof.pi_a[0], proof.pi_a[1],
      proof.pi_b[0][1], proof.pi_b[0][0], proof.pi_b[1][1], proof.pi_b[1][0],
      proof.pi_c[0], proof.pi_c[1]
    ]]);
}

export type DepositInput = {
  publicKey: string,
  blinding: string,
  amount: string,
  currency: string,
  encryptedDataHash: string,
}

export const generateDepositProof = async (input: DepositInput): Promise<string> => {
  const { proof } = await groth16.fullProve(
    utils.stringifyBigInts(input),
    "./artifacts/circuits/deposit.wasm",
    "./artifacts/circuits/deposit.zkey");

  return ethers.utils.defaultAbiCoder.encode(["uint256[8]"],
    [[
      proof.pi_a[0], proof.pi_a[1],
      proof.pi_b[0][1], proof.pi_b[0][0], proof.pi_b[1][1], proof.pi_b[1][0],
      proof.pi_c[0], proof.pi_c[1]
    ]]);
}