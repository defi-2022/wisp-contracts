// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./MerkleTree.sol";
import "./DepositVerifier.sol";

contract Wisp is MerkleTree {

    DepositVerifier public immutable depositVerifier;

    mapping(address => bool) public tokens;

    event Payment(uint256 publicKey, uint256 commitment, bytes encryptedData, uint32 index);

    constructor(
        uint8 _levels,
        address _hasher,
        address _verifier,
        address[] memory _tokens
    ) MerkleTree(_levels, _hasher) {
        depositVerifier = DepositVerifier(_verifier);

        for (uint8 i = 0; i < _tokens.length; i++) {
            tokens[_tokens[i]] = true;
        }
    }

    function deposit(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256 commitment,
        uint256 publicKey,
        uint256 amount,
        address token,
        bytes calldata encryptedData
    ) external {
        require(tokens[token], "Token is not supported");

        uint256 encryptedDataHash = uint256(keccak256(encryptedData)) % FIELD_SIZE;
        require(depositVerifier.verifyProof(a, b, c, [commitment, publicKey, amount, uint256(uint160(token)), encryptedDataHash]),
            "Deposit is not valid");

        IERC20(token).transferFrom(msg.sender, address(this), amount);

        uint32 index = insert(commitment);
        emit Payment(publicKey, commitment, encryptedData, index);
    }
}