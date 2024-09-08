// SPDX-License-Identifier: MIT
pragma solidity >= 0.8.24;


library Bytes {
    /**
     * @dev Convert bytes to unit256
     */
    function toUint256(bytes memory input) internal pure returns (uint256) {
        require(input.length == 32, "Invalid bytes length");
        return abi.decode(input, (uint256));
    }

    /**
     * @dev Checks if the current byte is a valid aes256 hexadecimal string
     */
    function isValidAes256Hexadecimal(bytes memory input) internal pure returns (bool) {
        // Check if each character is a valid hexadecimal digit
        for (uint i = 0; i < input.length; i++) {
            bytes1 char = input[i];
            if (!((char >= '0' && char <= '9') || 
                (char >= 'a' && char <= 'f') || 
                (char >= 'A' && char <= 'F'))) {
                return false;
            }
        }

        // If hex string is divisible by 32 it means that it is a valid aes256 hex
        return input.length % 32 == 0 && input.length > 0;
    }
}