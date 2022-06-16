// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./MerkleTree.sol";

contract Wisp is MerkleTree {

    address public immutable verifier;

    mapping(address => bool) public tokens;

    event Payment(bytes32 publicKey, uint256 amount, address token, uint256 commitment, bytes encryptedData, uint32 index);

    constructor(
        uint8 _levels,
        address _hasher,
        address _verifier,
        address[] memory _tokens
    ) MerkleTree(_levels, _hasher) {
        verifier = _verifier;

        for (uint8 i = 0; i < _tokens.length; i++) {
            tokens[_tokens[i]] = true;
        }
    }

    function pay(bytes32 publicKey, uint256 amount, address token, uint256 commitment, bytes calldata encryptedData) external {
        require(tokens[token], "Token is not supported");

        IERC20(token).transferFrom(msg.sender, address(this), amount);
        uint32 index = insert(commitment);
        emit Payment(publicKey, amount, token, commitment, encryptedData, index);
    }
}