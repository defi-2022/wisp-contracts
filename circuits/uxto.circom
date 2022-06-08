pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";

template Uxto() {
    signal input publicKey;
    signal input blinding;
    signal input amount;
    signal input currency;

    signal output commitment;

    component hasher = Poseidon(4);
    hasher.inputs[0] <== publicKey;
    hasher.inputs[1] <== blinding;
    hasher.inputs[2] <== amount;
    hasher.inputs[3] <== currency;

    commitment <== hasher.out;
}