pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";

template Keys() {
    signal input privateKey;
    signal input nonce;

    signal output publicKey;

    component hasher = Poseidon(2);
    hasher.inputs[0] <== privateKey;
    hasher.inputs[1] <== nonce;

    publicKey <== hasher.out;
}