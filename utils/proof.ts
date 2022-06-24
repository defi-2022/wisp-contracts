import "@nomiclabs/hardhat-ethers"
// @ts-ignore
import { groth16 } from "snarkjs";
// @ts-ignore
import { utils } from "ffjavascript";

export type Proof = {
  pi_a: string[3],
  pi_b: string[3][2],
  pi_c: string[2],
  protocol: string,
  curve: string
}

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

export const generateTransactionProof = async (input: TransactionInput): Promise<Proof> => {
  const { proof } = await groth16.fullProve(
    utils.stringifyBigInts(input),
    "./artifacts/circuits/transaction.wasm",
    "./artifacts/circuits/transaction.zkey");

  return proof;
}

export type DepositInput = {
  publicKey: string,
  blinding: string,
  amount: string,
  currency: string,
  encryptedDataHash: string,
}

export const generateDepositProof = async (input: DepositInput): Promise<Proof> => {
  const { proof } = await groth16.fullProve(
    utils.stringifyBigInts(input),
    "./artifacts/circuits/deposit.wasm",
    "./artifacts/circuits/deposit.zkey");

  return proof;
}