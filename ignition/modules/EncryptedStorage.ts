import {buildModule} from '@nomicfoundation/hardhat-ignition/modules';

const EncryptedStorageModule = buildModule('EncryptedStorage', (module) => {
  // Replace with actual address
  const encryptedStorage = module.contract('EncryptedStorage', ['ADDRESS']);

  return {encryptedStorage};
});

export default EncryptedStorageModule;
