// SPDX-License-Identifier: MIT
pragma solidity >= 0.8.24;

struct Data  {
    uint256 id;
    StoredData data;
    uint256 created;
    uint256 modified;
}

struct StoredData {
    bytes name;
    bytes value;
    bytes description;
}

library DataArray {
    /**
     * @dev Removes specific element by id in the data array
     */
    function removeElement(Data[] storage data, uint256 id) internal {
        for (uint256 index = 0; index < data.length; index++) {
            if (data[index].id == id) {
                for (uint256 currentIndex = index; currentIndex < data.length - 1; currentIndex++) {
                    data[currentIndex] = data[currentIndex + 1];
                }
                data.pop();
                break;
            }
        }
    }

    /**
     * @dev Updates a specific element stored data by id in the data array
     */
    function updateElement(
        Data[] storage data,
        uint256 id,
        StoredData memory newData
    ) internal {
        for (uint256 index = 0; index < data.length; index++) {
            if (data[index].id == id) {
                uint256 created = data[index].created;
                data[index] = Data({
                    id: id,
                    data: newData,
                    created: created,
                    modified: block.timestamp
                });
                break;
            }
        }
    }


    /**
     * @dev Used to paginate or get data based on offset and limit
     */
    function getOffset(Data[] storage data, uint256 offset, uint8 limit) internal view returns (Data[] memory) {
        uint256 currentDataSize = data.length; 
        uint256 currentPage =  offset * limit;

        if (currentPage >= currentDataSize) return new Data[](0);

        uint256 remainingElements = currentDataSize - currentPage;
        uint256 elementsSize = limit > remainingElements ? remainingElements : limit;
        uint256 targetLimit = currentPage + elementsSize;
        
        Data[] memory searchData = new Data[](elementsSize);

        for (uint256 currentIndex = currentPage; currentIndex < targetLimit; currentIndex++) {
            searchData[currentIndex - currentPage] = data[currentIndex];
        }

        return searchData;
    }
}