pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/bitify.circom";

include "./uxto.circom";

template Deposit() {

    signal input publicKey;
    signal input blinding;
    signal input amount;
    signal input currency;
    signal input encryptedDataHash;

    signal output commitment;

    component amountCheck = Num2Bits_strict();
    amountCheck.in <== amount;

    component utxo = Uxto();
    utxo.publicKey <== publicKey;
    utxo.blinding <== blinding;
    utxo.amount <== amount;
    utxo.currency <== currency;

    commitment <== utxo.commitment;

    signal encryptedDataHashSquare <== encryptedDataHash * encryptedDataHash;
}

component main { public [publicKey, currency, amount, encryptedDataHash] } = Deposit();