// SPDX-License-Identifier: MIT
pragma solidity >= 0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "../libraries/Data.sol";
import "../libraries/Bytes.sol";

contract EncryptedStorage is Ownable2Step, ReentrancyGuard {

    using DataArray for Data[];
    using Bytes for bytes;
    using Bytes32 for bytes32;

    address[] private users;
    mapping (address => Data[]) private storedData;
    mapping (address => uint256) private currentAddressStoredIds;
    mapping (address => uint256) private authorizedUsers;
    
    uint256 private subscriptionAmount = 0.001 ether;

    constructor(address initialOwner) Ownable(initialOwner) {}
    
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


    function changeSubscriptionAmount(bytes32 amountInWeiBytes) public onlyOwner {
        uint256 amountInWei = amountInWeiBytes.toUint256();
        subscriptionAmount = amountInWei;
    }

    function renounceOwnership() public view override onlyOwner {
        require(false, "NOT APPLICABLE");
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

    /**
     * @dev Public function to subscribe to this contract
     */
    function subscribe() external nonReentrant payable {
        address owner = owner();
        address signer = msg.sender;

        uint256 time = authorizedUsers[signer];
        bool isEmptyTime = time == 0;
        bool isOwner = signer == owner;

        require(!isOwner && (time < block.timestamp || isEmptyTime), "You are already subscribed.");

        if (isEmptyTime) {
            users.push(signer);
        }

        bool hasSufficientAmount = msg.value == subscriptionAmount;

        // User will automatically subscribe if they pay for it even without having to use the free trial.
        if (!isEmptyTime || hasSufficientAmount) {
            require(hasSufficientAmount, "Insufficient amount (0.001 ETH)");
            (bool success, ) = owner.call{value: msg.value}("");
            require(success, "Transfer failed");
            authorizedUsers[signer] = block.timestamp + 30 days;
            return;
        }

        // 3 days trial for new users
        authorizedUsers[signer] = block.timestamp + 3 days;
    }
    

    /**
     * @dev Public function to store or update data
     */
    function storeOrUpdate(
        bytes memory id,
        StoredData memory data
    ) public isSubscribed {
        bool isValidHex = data.value.isValidAes256Hexadecimal();
        require(isValidHex, "Not a valid hexadecimal value");

        address signer = msg.sender;
        uint256 currentId = currentAddressStoredIds[signer];

        Data[] storage currentData = storedData[signer];

        if (id.length == 0) {
            currentData.push(
                Data({
                    id: currentId,
                    data: data,
                    created: block.timestamp,
                    modified: block.timestamp
                })
            );
            currentAddressStoredIds[signer] += 1;
        }

        bytes32 converted = id.toBytes32();
        (currentId) = converted.toUint256();

        currentData.updateElement(currentId, data);
    }

    /**
     * @dev Public function to remove data by Id
     */
    function removeData (
        bytes32 idBytes
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