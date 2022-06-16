// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface IPoseidonHasher {
    function poseidon(uint256[2] calldata inputs) external pure returns (uint256);
}

contract MerkleTree {

    uint256 public constant FIELD_SIZE = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    uint8 public constant ROOT_HISTORY_SIZE = 30;

    IPoseidonHasher public immutable hasher;

    uint8 public levels;
    uint32 public immutable maxSize;

    uint32 public index = 0;
    mapping(uint8 => uint256) public levelHashes;
    mapping(uint256 => uint256) public roots;

    constructor(uint8 _levels, address _hasher) {
        require(_levels > 0, "_levels should be greater than 0");
        require(_levels < 32, "_levels should not be greater than 32");
        levels = _levels;
        hasher = IPoseidonHasher(_hasher);
        maxSize = uint32(2) ** levels;

        for (uint8 i = 0; i < _levels; i++) {
            levelHashes[i] = zeros(i);
        }
    }

    function insert(uint256 leaf) internal returns (uint32) {
        require(index != maxSize, "Merkle tree is full");
        require(leaf < FIELD_SIZE, "Leaf has to be within field size");

        uint32 currentIndex = index;
        uint256 currentLevelHash = leaf;
        uint256 left;
        uint256 right;

        for (uint8 i = 0; i < levels; i++) {
            if (currentIndex % 2 == 0) {
                left = currentLevelHash;
                right = zeros(i);
                levelHashes[i] = currentLevelHash;
            } else {
                left = levelHashes[i];
                right = currentLevelHash;
            }

            currentLevelHash = hasher.poseidon([left, right]);
            currentIndex /= 2;
        }

        roots[index % ROOT_HISTORY_SIZE] = currentLevelHash;

        index++;
        return index - 1;
    }

    function isValidRoot(uint256 root) public view returns (bool) {
        if (root == 0) {
            return false;
        }

        uint32 currentIndex = index % ROOT_HISTORY_SIZE;
        uint32 i = currentIndex;
        do {
            if (roots[i] == root) {
                return true;
            }

            if (i == 0) {
                i = ROOT_HISTORY_SIZE;
            }
            i--;
        }
        while (i != currentIndex);

        return false;
    }

    // zero is poseidon(keccak256("wisp.finance") % FIELD_SIZE)
    function zeros(uint256 i) public pure returns (uint256) {
        if (i == 0) return 0x131d73cf6b30079aca0dff6a561cd0ee50b540879abe379a25a06b24bde2bebd;
        else if (i == 1) return 0x030e41eb4c13eb3c7040201a76ec17a95b0696ae684c8711f643a82434043b85;
        else if (i == 2) return 0x2de9e35e5e66734c46a160df81e56c83d8b7687ea37f6b4a27623a787127fad8;
        else if (i == 3) return 0x1ee3ac3d5ea557aa6d9a6ea46262dc42af62bae8c7864a9cc8dfb493d54bba30;
        else if (i == 4) return 0x0bef9271bdaa22ee892e75171bf1898983a6c8304ab78da111413a4105733219;
        else if (i == 5) return 0x1b4bb8a6696efaa2cd20d4b47bf9dc585280dec286f06aedd01583a58c783f51;
        else if (i == 6) return 0x2aabe03c18f20b72f67ade3063f12d71ad671d375d797ba60dfac9d924f02708;
        else if (i == 7) return 0x2daff101798c30998276c67457a7baaaaed141e6e49a2310deb01a71e3ec107d;
        else if (i == 8) return 0x1cafdb09713bb57e4aed4bee8f6d722a8e22c8ac51dafa7faf3b5585536b443e;
        else if (i == 9) return 0x1d585d8e6fa2b1698a000c733e3c2c8a6baaf40166f82ee0412a266496bab85f;
        else if (i == 10) return 0x2fa8177393423a5b0e68dbb8a555a9085464b5fe55219d377edb5a9a486b4f16;
        else if (i == 11) return 0x1e9dbba95cdde33d36bc0cee03f7ebeddd71cdc633451d996a9cb83bc4faccad;
        else if (i == 12) return 0x0adacfac36026ca9936dd2e4d540a947a1a2cb2ce7114ddcb24a3956eae54880;
        else if (i == 13) return 0x1b08cd6df6cbf993b04b8b2e40882ca9aa48ca3afb074b88e52963f1c63f534b;
        else if (i == 14) return 0x086043d5906d53b339d340d39738f2037541c5440073a481feb8b1f513b1f61e;
        else if (i == 15) return 0x06108b01607231776eb7debff2f99da31dd70f4bcbeccc251843de92456d9464;
        else if (i == 16) return 0x10f9e234e1bb3ab0c5e979c489e0f82b08b74f4177a6fc85e08e5aac314de30e;
        else if (i == 17) return 0x0432ad8ddfeffc1e806be483a4172fd3389aee0d322d5d0211da447be542dc1e;
        else if (i == 18) return 0x06633a6d46c11662e3f69fcd309b73cc20bd47a870d778c20e661915874c2d30;
        else if (i == 19) return 0x01a45cc8ac3691a5cab011322c3768c87051c572235a0cca492dff6909612077;
        else if (i == 20) return 0x279add35717f68d654619ffb44243d67f2e1085ae096b87da5f4e03b12c0198f;
        else if (i == 21) return 0x14abf2e9cc1540de67faffd47b74b2ff21db44fd5909c2c6dc0a7910183672d1;
        else if (i == 22) return 0x014d77e356b2fc343bad244a2c7b82793b1d407624237045b8cdb73e58be4804;
        else if (i == 23) return 0x10e949fa93056d968937b8b3990db726a22596ea35238a41af824cfa44d79309;
        else if (i == 24) return 0x19c69248dcc169fb60a3dc50f25cbcfeff75f9876e76a76c7cc3356eee4746ba;
        else if (i == 25) return 0x126f559140de04a5b3074e0ecbb46c942fbf0fc1118e4cab0e509ec7942acdf4;
        else if (i == 26) return 0x015a03f1243d220d72e914a76f815a66d0fae19bf83f7ed126124bb718b45638;
        else if (i == 27) return 0x0d234d5a13d6451120bf427a97a64a01b86122bc7056c9db235b4708d6257fd9;
        else if (i == 28) return 0x258f2eb745d4c7f43f7555fcd719408e4d484ed8ed1cf0a367410f24df079be0;
        else if (i == 29) return 0x2a7a8cb5c71e208c985ef3da812d40201012fdb07883372822b0a5c8c5e46a6d;
        else if (i == 30) return 0x02dfa7a6426b9c6700075ef9d9a2a964f9e54e5643c78b14a6fddcff44e81e41;
        else if (i == 31) return 0x136e847efd90cf461eac4b58b7f0fde18cf8564730c0b56ee7919be0816679a5;
        else revert("Index out of bounds");
    }
}