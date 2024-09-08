// SPDX-License-Identifier: MIT
pragma solidity >= 0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "../libraries/Data.sol";
import "../libraries/Bytes.sol";


contract EncryptedStorage is Ownable2Step, ReentrancyGuard {

    using DataArray for Data[];
    using Bytes for bytes;

    address[] private users;
    mapping (address => Data[]) private storedData;
    mapping (address => uint256) private currentAddressStoredIds;
    mapping (address => uint256) private authorizedUsers;
    
    uint256 private subscriptionAmount = 0.001 ether;

    constructor(address initialOwner) Ownable(initialOwner) {}
    
    /**
     * @dev A modifier to check if signature is valid
     */
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
    
    /**
     * @dev A modifier to check if the address is already subscribed.
     * It will check if time is greater than the current timestamp.
     */
    modifier isSubscribed() {
        address signer = msg.sender;
        uint256 time = authorizedUsers[signer];
        require(signer == owner() || time > block.timestamp, "You are not subscribed");
        _;
    }


    function changeSubscriptionAmount(bytes memory amountInWeiBytes) public onlyOwner {
        uint256 amountInWei = amountInWeiBytes.toUint256();
        subscriptionAmount = amountInWei;
    }

    // NOTE: Remove in production/mainnet use
    function clearAllData() public onlyOwner {
        for (uint256 i = 0; i<users.length; i++) {
            address userAddress = users[i];
            delete storedData[userAddress];
            delete currentAddressStoredIds[userAddress];
            delete authorizedUsers[userAddress];
        }
        
        delete users;
    }

    function subscribe() external nonReentrant payable {
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

    /**
     * @dev Public function to store or update data
     */
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
        bool isValidHex = value.isValidAes256Hexadecimal();
        require(isValidHex, "Not a valid hexadecimal value");

        address signer = msg.sender;
        uint256 currentId = currentAddressStoredIds[signer];

        Data[] storage currentData = storedData[signer];

        if (id.length == 0) {
            currentData.push(
                Data({
                    id: currentId,
                    data: StoredData({
                        name: name,
                        value: value,
                        description: description
                    }),
                    created: block.timestamp,
                    modified: block.timestamp
                })
            );
            currentAddressStoredIds[signer] += 1;
            return;
        }

        (currentId) = id.toUint256();

        currentData.updateElement(currentId, StoredData({
            name: name,
            value: value,
            description: description
        }));
    }


    /**
     * @dev Public function to remove data by Id
     */
    function removeData (
        bytes memory idBytes
    ) public isSubscribed {
        uint256 id = idBytes.toUint256();
        storedData[msg.sender].removeElement(id);
    }


    /**
     * @dev Public function to get all stored data
     */
    function getStoredPasswords(uint256 offset, uint8 limit) public isSubscribed view returns (Data[] memory)  {
        require(limit > 0 && limit <= 255, "Limit should be greater than zero and less than or equals 255");

        Data[] storage currentData = storedData[msg.sender];

        return currentData.getOffset(offset, limit);
    }
}