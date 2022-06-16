// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract WispToken is ERC20, Ownable {
    constructor() ERC20("Wisp Token", "WISP") {
    }

    function mint(uint256 amount) public {
        _mint(msg.sender, amount);
    }
}
