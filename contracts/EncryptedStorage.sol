// SPDX-License-Identifier: MIT
pragma solidity >= 0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

struct StoredPassword {
    uint256 id;
    bytes name;
    bytes value;
    bytes description;
    uint256 created;
    uint256 modified;
}

contract EncryptedStorage is Ownable2Step, ReentrancyGuard {
    address[] private users;
    mapping (address => StoredPassword[]) private storedPasswords;
    mapping (address => uint256) private currentAddressStoredIds;
    mapping (address => uint256) private authorizedUsers;

    uint256 private subscriptionAmount = 0.001 ether;

    constructor(address initialOwner) Ownable(initialOwner) {}
    

    modifier isSignatureValid(
        bytes32 messageHash,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) {
        // Recover the address from the signature
        address recoveredAddress = ecrecover(messageHash, v, r, s);

        // Ensure the recovered address matches the expected signer
        require(recoveredAddress == msg.sender, "Not a valid signer");

        // Continue with the function execution
        _;
    }
    
    modifier isSubscribed() {
        address signer = msg.sender;
        uint256 time = authorizedUsers[signer];
        require(signer == owner() || time > block.timestamp, "You are not subscribed");
        _;
    }

    function isValidAes256Hexadecimal(bytes memory input) private pure returns (bool) {
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

    function removeElement(uint256 id) private {
        StoredPassword[] storage passwords = storedPasswords[msg.sender];

        for (uint256 index = 0; index < passwords.length; index++) {
            if (passwords[index].id == id) {
                // Shift elements to the left
                for (uint256 currentIndex = index; currentIndex < passwords.length - 1; currentIndex++) {
                    passwords[currentIndex] = passwords[currentIndex + 1];
                }
                // Remove the last element (now a duplicate)
                passwords.pop();
                break;
            }
        }
    }

    function updateElement(
        uint256 id,
        bytes memory name,
        bytes memory value,
        bytes memory description
    ) private {
        StoredPassword[] storage passwords = storedPasswords[msg.sender];

        for (uint256 index = 0; index < passwords.length; index++) {
            if (passwords[index].id == id) {
            uint256 created = passwords[index].created;
            passwords[index] = StoredPassword({
                    id: id,
                    name: name,
                    value: value,
                    description: description,
                    created: created,
                    modified: block.timestamp
                });
                break;
            }
        }
    }

    function bytesToUint256(bytes memory b) private pure returns (uint256) {
        require(b.length == 32, "Invalid bytes length");
        return abi.decode(b, (uint256));
    }

    function changeSubscriptionAmount(bytes memory amountInWeiBytes) public onlyOwner {
        uint256 amountInWei = bytesToUint256(amountInWeiBytes);
        subscriptionAmount = amountInWei;
    }

    // NOTE: Remove in production/mainnet use
    function clearAllData() public onlyOwner {
        for (uint256 i = 0; i<users.length; i++) {
            address userAddress = users[i];
            delete storedPasswords[userAddress];
            delete currentAddressStoredIds[userAddress];
            delete authorizedUsers[userAddress];
        }
        
        delete users;
    }

    function subscribe() external nonReentrant payable  {
        address owner = owner();
        address signer = msg.sender;
        uint256 time = authorizedUsers[signer];
        require(time < block.timestamp && signer != owner, "You are already subscribed.");
        require(msg.value == subscriptionAmount, "Insufficient amount (0.001 ETH)");

        (bool success, ) = owner.call{value: msg.value}("");
        payable(owner).transfer(msg.value);
        require(success, "Transfer failed");


        if (authorizedUsers[signer] == 0) {
            users.push(signer);
        }
        
        authorizedUsers[signer] = block.timestamp + 30 days;
    }

    function storeOrUpdate(
        bytes32 messageHash,
        uint8 v,
        bytes32 r,  
        bytes32 s,
        bytes memory id,
        bytes memory name,
        bytes memory value,
        bytes memory description
    ) public isSubscribed isSignatureValid(messageHash, v, r, s)  {

        require(isValidAes256Hexadecimal(value), "Not a valid hexadecimal value");
        address signer = msg.sender;
        uint256 currentId = currentAddressStoredIds[signer];

        if (id.length == 0) {
            storedPasswords[signer].push(StoredPassword({
                id: currentId,
                name: name,
                value: value,
                description: description,
                created: block.timestamp,
                modified: block.timestamp
            }));
            currentAddressStoredIds[signer] += 1;
            
        }
        (currentId) = bytesToUint256(id);
        updateElement(currentId, name, value, description);
    }

    function removeData (
        uint256 id
    ) public isSubscribed {
        removeElement(id);
    }

    function getStoredPasswords() public isSubscribed view returns (StoredPassword[] memory)  {
        return storedPasswords[msg.sender];
    }
}