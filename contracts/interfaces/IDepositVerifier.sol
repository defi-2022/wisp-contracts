// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IDepositVerifier {
    function verifyProof(bytes memory proof, uint[5] memory input) external view returns (bool);
}
