// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./MerkleTree.sol";
import "./interfaces/IDepositVerifier.sol";
import "./interfaces/ITransactionVerifier.sol";

contract Wisp is MerkleTree {

    IDepositVerifier public immutable depositVerifier;
    ITransactionVerifier public immutable transactionVerifier;

    mapping(address => bool) public tokens;

    mapping(uint256 => bool) public spentNullifiers;

    event Payment(uint256 publicKey, uint256 commitment, bytes encryptedData, uint32 index);

    constructor(
        uint8 _levels,
        address _hasher,
        address _depositVerifier,
        address _transactionVerifier,
        address[] memory _tokens
    ) MerkleTree(_levels, _hasher) {
        depositVerifier = IDepositVerifier(_depositVerifier);
        transactionVerifier = ITransactionVerifier(_transactionVerifier);

        for (uint8 i = 0; i < _tokens.length; i++) {
            tokens[_tokens[i]] = true;
        }
    }

    function transaction(
        bytes calldata proof,
        uint256[2] calldata nullifiers,
        uint256 root,
        address recipient,
        address token,
        uint256 withdrawnAmount,
        uint256[2] calldata publicKeys,
        uint256[2] calldata commitments,
        bytes[2] calldata encryptedData
    ) external {
        require(tokens[token], "Token is not supported");
        require(isValidRoot(root), "Root is not valid");
        for (uint256 i = 0; i < nullifiers.length; i++) {
            require(!spentNullifiers[nullifiers[i]], "Nullifier is spent");
            spentNullifiers[nullifiers[i]] = true;
        }
        require(transactionVerifier.verifyProof(proof,
            [nullifiers[0], nullifiers[1], commitments[0], commitments[1],
            uint256(uint160(token)), root, uint256(uint160(recipient)), withdrawnAmount, publicKeys[0], publicKeys[1]]),
            "Transaction is not valid");

        IERC20(token).transfer(recipient, withdrawnAmount);

        for (uint256 i = 0; i < commitments.length; i++) {
            uint32 index = insert(commitments[i]);
            emit Payment(publicKeys[i], commitments[i], encryptedData[i], index);
        }
    }

    function deposit(
        bytes calldata proof,
        uint256 commitment,
        uint256 publicKey,
        uint256 amount,
        address token,
        bytes calldata encryptedData
    ) external {
        require(tokens[token], "Token is not supported");

        uint256 encryptedDataHash = uint256(keccak256(encryptedData)) % FIELD_SIZE;
        require(depositVerifier.verifyProof(proof, [commitment, publicKey, amount, uint256(uint160(token)), encryptedDataHash]),
            "Deposit is not valid");

        IERC20(token).transferFrom(msg.sender, address(this), amount);

        uint32 index = insert(commitment);
        emit Payment(publicKey, commitment, encryptedData, index);
    }
}