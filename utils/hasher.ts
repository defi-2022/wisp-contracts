import { BigNumber, BigNumberish } from "ethers";

export class PoseidonHasher {
  poseidon: any;

  constructor(poseidon: any) {
    this.poseidon = poseidon;
  }

  hash(items: BigNumberish[]) {
    const hash = this.poseidon(items);
    return BigNumber.from(this.poseidon.F.toString(hash));
  }
}