pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";

include "./keys.circom";
include "./uxto.circom";
include "./merkleproof.circom";

template Transaction(levels, inputCount, outputCount) {

    // input commitments
    signal input privateKey;
    signal input nonce[inputCount];
    signal input currency;
    signal input inBlinding[inputCount];
    signal input inAmount[inputCount];

    // merkle tree
    signal input root;
    signal input pathElements[inputCount][levels];
    signal input pathIndices[inputCount][levels];

    signal output nullifiers[inputCount];

    // withdrawal
    signal input recipient;
    signal input withdrawnAmount;

    // output commitments
    signal input outPublicKey[outputCount];
    signal input outBlinding[outputCount];
    signal input outAmount[outputCount];

    signal output commitments[outputCount];

    component keys[inputCount];
    component inUxto[inputCount];
    component merkleProofs[inputCount];
    component rootComparators[inputCount];
    component pathNumbers[inputCount];
    component nullifierHashers[inputCount];
    var inSum = 0;
    for (var i = 0; i < inputCount; i++) {
        // 1. calculate inCommitments
        keys[i] = Keys();
        keys[i].privateKey <== privateKey;
        keys[i].nonce <== nonce[i];

        inUxto[i] = Uxto();
        inUxto[i].publicKey <== keys[i].publicKey;
        inUxto[i].blinding <== inBlinding[i];
        inUxto[i].amount <== inAmount[i];
        inUxto[i].currency <== currency;

        // 2. check that inCommitments in merkle tree
        merkleProofs[i] = MerkleProof(levels);
        merkleProofs[i].leaf <== inUxto[i].commitment;

        pathNumbers[i] = Bits2Num(levels);
        for (var j = 0; j < levels; j++) {
            merkleProofs[i].pathElements[j] <== pathElements[i][j];
            merkleProofs[i].pathIndices[j] <== pathIndices[i][j];

            pathNumbers[i].in[j] <== pathIndices[i][j];
        }

        rootComparators[i] = ForceEqualIfEnabled();
        rootComparators[i].in[0] <== root;
        rootComparators[i].in[1] <== merkleProofs[i].root;
        rootComparators[i].enabled <== inAmount[i];

        inSum += inAmount[i];

        // 3. generate nullifiers for inCommitments
        nullifierHashers[i] = Poseidon(3);
        nullifierHashers[i].inputs[0] <== privateKey;
        nullifierHashers[i].inputs[1] <== inUxto[i].commitment;
        nullifierHashers[i].inputs[2] <== pathNumbers[i].out;

        nullifiers[i] <== nullifierHashers[i].out;
    }

    // 4. calculate outCommitments
    component outUxto[outputCount];
    var outSum = 0;
    for (var i = 0; i < outputCount; i++) {
        outUxto[i] = Uxto();
        outUxto[i].publicKey <== outPublicKey[i];
        outUxto[i].blinding <== outBlinding[i];
        outUxto[i].amount <== outAmount[i];
        outUxto[i].currency <== currency;

        commitments[i] <== outUxto[i].commitment;

        outSum += outAmount[i];
    }

    // 5. verify sum(inAmount) - withdrawnAmount === sum(outAmounts);
    inSum - withdrawnAmount === outSum;

    signal recipientSquare;
    recipientSquare <== recipient * recipient;
}

component main { public [root, recipient, currency, withdrawnAmount, outPublicKey] } = Transaction(10, 2, 2);