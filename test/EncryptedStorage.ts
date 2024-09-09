import {
  time,
  loadFixture,
} from '@nomicfoundation/hardhat-toolbox/network-helpers';
import {anyValue} from '@nomicfoundation/hardhat-chai-matchers/withArgs';
import {expect} from 'chai';
import hre from 'hardhat';
import {EncryptedStorage} from '../typechain-types';
import {HardhatEthersSigner} from '@nomicfoundation/hardhat-ethers/signers';

describe('Encrypted Storage', function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deploy() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await hre.ethers.getSigners();

    const EncryptedStorage =
      await hre.ethers.getContractFactory('EncryptedStorage');
    const encryptedStorage = await EncryptedStorage.deploy(owner);

    return {encryptedStorage, owner, otherAccount};
  }

  describe('Deployment', function () {
    it('Should set the right owner', async function () {
      const {encryptedStorage, owner} = await loadFixture(deploy);
      expect(await encryptedStorage.owner()).to.equal(owner.address);
    });

    it('Should be able to get the current owner', async function () {
      const {encryptedStorage, owner} = await loadFixture(deploy);
      const storageOwner = await encryptedStorage.owner();
      expect(storageOwner).equals(owner.address);
    });
  });

  describe('Owner Transfership', function () {
    let encryptedStorage: EncryptedStorage;
    let otherAccount: HardhatEthersSigner;
    let owner: HardhatEthersSigner;

    this.beforeAll(async () => {
      let {
        encryptedStorage: _encryptedStorage,
        owner: _owner,
        otherAccount: _otherAccount,
      } = await loadFixture(deploy);
      encryptedStorage = _encryptedStorage;
      otherAccount = _otherAccount;
      owner = _owner;
    });

    it('Should be able to transfer ownership', async function () {
      const data = await encryptedStorage.transferOwnership(
        otherAccount.address
      );
    });
  });
});
