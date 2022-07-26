// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ITransactionVerifier {
    function verifyProof(bytes memory proof, uint[10] memory input) external view returns (bool);
}
