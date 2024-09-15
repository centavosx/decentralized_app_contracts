import {buildModule} from '@nomicfoundation/hardhat-ignition/modules';

const EncryptedStorageModule = buildModule('EncryptedStorage', (module) => {
  let currentAddress = process.env.WALLET_ADDRESS;

  if (process.env.NODE_ENV !== 'production') {
    currentAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'; // hardhat sample address
  }

  if (!currentAddress) throw new Error('Address not available');

  const encryptedStorage = module.contract('EncryptedStorage', [
    currentAddress,
  ]);

  return {encryptedStorage};
});

export default EncryptedStorageModule;
