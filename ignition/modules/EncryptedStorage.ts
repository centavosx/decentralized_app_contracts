import {buildModule} from '@nomicfoundation/hardhat-ignition/modules';

const EncryptedStorageModule = buildModule('EncryptedStorage', (m) => {
  // Replace with actual address
  const encryptedStorage = m.contract('EncryptedStorage', ['ADDRESS']);

  return {encryptedStorage};
});

export default EncryptedStorageModule;
