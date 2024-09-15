// SPDX-License-Identifier: MIT
pragma solidity >= 0.8.24;


library Bytes {
    /**
     * @dev Convert bytes to bytes32
     */
    function toBytes32(bytes memory input) internal pure returns (bytes32) {
        require(input.length <= 32, "Input bytes exceed 32 bytes");
        
        // Create a temporary bytes32 variable to hold the result
        bytes32 tempBytes32;

        // Copy the bytes to the bytes32 variable
        assembly {
            tempBytes32 := mload(add(input, 32))
        }

        // Return the result
        return tempBytes32;
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

        return input.length > 0;
    }
}

library Bytes32 {
    /**
     * @dev Convert byte32s to unit256
     */
    function toUint256(bytes32 input) internal pure returns (uint256) {
        return abi.decode(abi.encodePacked(input), (uint256));
    }
}