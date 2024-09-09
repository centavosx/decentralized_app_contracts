import {
  time,
  loadFixture,
} from '@nomicfoundation/hardhat-toolbox/network-helpers';
import {anyValue} from '@nomicfoundation/hardhat-chai-matchers/withArgs';
import {AssertionError, expect} from 'chai';
import hre, {ethers} from 'hardhat';
import {EncryptedStorage} from '../typechain-types';
import {HardhatEthersSigner} from '@nomicfoundation/hardhat-ethers/signers';

describe('Encrypted Storage', function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deploy() {
    // Contracts are deployed using the first signer/account by default
    const [owner, ...rest] = await hre.ethers.getSigners();

    const EncryptedStorage =
      await hre.ethers.getContractFactory('EncryptedStorage');
    const encryptedStorage = await EncryptedStorage.deploy(owner);

    return {encryptedStorage, owner, otherAccounts: rest};
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
    let otherAccounts: HardhatEthersSigner[] = [];
    let owner: HardhatEthersSigner;

    this.beforeAll(async () => {
      let {
        encryptedStorage: _encryptedStorage,
        owner: _owner,
        otherAccounts: _otherAccounts,
      } = await loadFixture(deploy);
      encryptedStorage = _encryptedStorage;
      // We dont want to pass the `_otherAccounts` reference
      for (const account of _otherAccounts) {
        otherAccounts.push(account);
      }
      owner = _owner;
    });

    it('Should not transfer ownership for not owner', async function () {
      try {
        await encryptedStorage
          .connect(otherAccounts[0])
          .transferOwnership(otherAccounts[1].address);

        expect.fail();
      } catch (err) {
        expect(err).not.instanceOf(AssertionError);
      }
    });

    it('Should be able to request transfer ownership', async function () {
      await encryptedStorage
        .connect(owner)
        .transferOwnership(otherAccounts[0].address);
      const pendingOwner = await encryptedStorage.pendingOwner();
      expect(pendingOwner).equals(otherAccounts[0].address);
    });

    it('Should be able to accept transfer ownership', async function () {
      const signer = otherAccounts[0];
      await encryptedStorage.connect(signer).acceptOwnership();
      const pendingOwner = await encryptedStorage.pendingOwner();
      expect(pendingOwner).not.equals(signer.address);
      const currentOwner = await encryptedStorage.owner();
      expect(currentOwner).equals(signer.address);
      const tempOwner = owner;
      owner = signer;
      otherAccounts[0] = tempOwner;
    });

    it('Should not renounce ownership', async function () {
      try {
        await encryptedStorage.connect(owner).renounceOwnership();
        expect.fail();
      } catch (err) {
        expect(err).not.instanceOf(
          AssertionError,
          'Should not renounce transfership'
        );
      }
    });
  });

  describe('Subscription', function () {
    let encryptedStorage: EncryptedStorage;
    let subscriber: HardhatEthersSigner;
    let owner: HardhatEthersSigner;

    this.beforeAll(async () => {
      let {
        encryptedStorage: _encryptedStorage,
        owner: _owner,
        otherAccounts: _otherAccounts,
      } = await loadFixture(deploy);
      encryptedStorage = _encryptedStorage;
      subscriber = _otherAccounts[0];
      owner = _owner;
    });

    it('Should not subscribe for owner', async () => {
      try {
        await encryptedStorage.connect(owner).subscribe({
          value: ethers.parseEther('0.001'),
        });
        expect.fail();
      } catch (err) {
        expect(err).not.instanceOf(
          AssertionError,
          'Owner should not be able to subscribe'
        );
      }
    });

    it('Should be able to subscribe for free trial for three days', async () => {
      await encryptedStorage.connect(subscriber).subscribe({
        value: ethers.parseEther('0.001'),
      });
      await time.increase(259200); // Increased to 3 days
    });

    it('Should not be able to subscribe with insufficient or more fee', async () => {
      const fees = [0, 1, 2, 3, 4, 5];
      for (const fee of fees) {
        try {
          await encryptedStorage.connect(subscriber).subscribe({
            value: ethers.parseEther(fee.toString()),
          });
          expect.fail();
        } catch (err) {
          expect(err).not.instanceOf(
            AssertionError,
            `Should not be able to subscribe with ${fee} fee (Expected fee = 0.001 ETH)`
          );
        }
      }
    });

    it('Should be able to subscribe', async () => {
      await encryptedStorage.connect(subscriber).subscribe({
        value: ethers.parseEther('0.001'),
      });
    });

    it('Should not be able to subscribe multiple times', async () => {
      try {
        await encryptedStorage.connect(subscriber).subscribe({
          value: ethers.parseEther('0.001'),
        });
      } catch (err) {
        expect(err).not.instanceOf(
          AssertionError,
          `Wallet ${subscriber.address} should not be able to subscribe again`
        );
      }
    });
  });

  describe('Store and update', function () {});
});
