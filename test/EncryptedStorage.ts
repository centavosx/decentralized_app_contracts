import {
  time,
  loadFixture,
} from '@nomicfoundation/hardhat-toolbox/network-helpers';
import {anyValue} from '@nomicfoundation/hardhat-chai-matchers/withArgs';
import {AssertionError, expect} from 'chai';
import hre, {ethers} from 'hardhat';
import {EncryptedStorage} from '../typechain-types';
import {HardhatEthersSigner} from '@nomicfoundation/hardhat-ethers/signers';
import Cryptr from 'cryptr';
import randomString from 'randomstring';
import {ContractTransactionResponse} from 'ethers';
import {DataStructOutput} from '../typechain-types/contracts/EncryptedStorage';

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
    let nonSubscriber: HardhatEthersSigner;

    this.beforeAll(async () => {
      let {
        encryptedStorage: _encryptedStorage,
        owner: _owner,
        otherAccounts: _otherAccounts,
      } = await loadFixture(deploy);
      encryptedStorage = _encryptedStorage;
      subscriber = _otherAccounts[0];
      nonSubscriber = _otherAccounts[1];
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
      const data = await encryptedStorage.connect(subscriber).subscribe();
      expect(data).instanceOf(ContractTransactionResponse);
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
      const data = await encryptedStorage.connect(subscriber).subscribe({
        value: ethers.parseEther('0.001'),
      });
      expect(data).instanceOf(ContractTransactionResponse);
    });

    it('Should not be able to subscribe multiple times', async () => {
      try {
        await encryptedStorage.connect(subscriber).subscribe({
          value: ethers.parseEther('0.001'),
        });
        expect.fail();
      } catch (err) {
        expect(err).not.instanceOf(
          AssertionError,
          `Wallet ${subscriber.address} should not be able to subscribe again`
        );
      }
    });

    it('Should be able to change subscription amount for non owner', async () => {
      try {
        await encryptedStorage
          .connect(subscriber)
          .changeSubscriptionAmount(
            ethers.zeroPadBytes(ethers.toBeArray(2), 32)
          );
        expect.fail();
      } catch (err) {
        expect(err).not.instanceOf(AssertionError);
        expect((err as Error).message).includes('OwnableUnauthorizedAccount');
      }
    });

    it('Should be able to change subscription amount for owner', async () => {
      const currentFee = ethers.parseEther('0.002');
      const result = await encryptedStorage
        .connect(owner)
        .changeSubscriptionAmount(
          ethers.zeroPadBytes(ethers.toBeArray(currentFee), 32)
        );
      expect(result).instanceOf(ContractTransactionResponse);
      const result2 = await encryptedStorage
        .connect(nonSubscriber)
        .subscribe({value: currentFee});
      expect(result2).instanceOf(ContractTransactionResponse);
    });
  });

  describe('Get Store and update', function () {
    let encryptedStorage: EncryptedStorage;
    let subscriber: HardhatEthersSigner;
    let unsubscribedUser: HardhatEthersSigner;
    let owner: HardhatEthersSigner;
    let randomPrivateKey: string;
    let randomStrings: string[];

    this.beforeAll(async () => {
      let {
        encryptedStorage: _encryptedStorage,
        owner: _owner,
        otherAccounts: _otherAccounts,
      } = await loadFixture(deploy);

      encryptedStorage = _encryptedStorage;
      subscriber = _otherAccounts[0];
      unsubscribedUser = _otherAccounts[1];
      owner = _owner;
      const wallet = ethers.Wallet.createRandom();
      randomPrivateKey = wallet.privateKey;

      await encryptedStorage.connect(subscriber).subscribe({
        value: ethers.parseEther('0.001'),
      });

      randomStrings = Array(5)
        .fill(null)
        .map(() => randomString.generate());
    });

    describe('storeOrUpdate (Saving)', () => {
      it('Should throw an error when passing non bytes value', async () => {
        const data = [
          ['0x', {name: 'one', description: 'two', value: 'three'}],
          [
            'test',
            {
              name: ethers.toUtf8Bytes('test'),
              description: ethers.toUtf8Bytes('test'),
              value: ethers.toUtf8Bytes('test'),
            },
          ],
          [
            '0x',
            {
              name: ethers.toUtf8Bytes('test'),
              description: 'test',
              value: 'test',
            },
          ],
          [
            '0x',
            {
              name: 'test',
              description: ethers.toUtf8Bytes('test'),
              value: 'test',
            },
          ],
        ];

        for (const value of data) {
          try {
            await encryptedStorage
              .connect(subscriber)
              .storeOrUpdate(...(value as any));
            expect.fail();
          } catch (error) {
            expect(error).not.instanceOf(AssertionError);
            expect(error).instanceOf(TypeError);
          }
        }
      });
      it('Should not be able to store invalid aes256 value', async () => {
        try {
          await encryptedStorage.connect(subscriber).storeOrUpdate('0x', {
            name: ethers.toUtf8Bytes('name'),
            description: ethers.toUtf8Bytes('description'),
            value: ethers.toUtf8Bytes('encryptedValue'),
          });
          expect.fail();
        } catch (err) {
          expect(err).not.instanceOf(AssertionError);
          expect(err).instanceOf(Error);
          expect((err as Error).message).includes(
            'Not a valid hexadecimal value'
          );
        }
      });
      it('Should not be able to store for unsubscribed user', async () => {
        try {
          await encryptedStorage.connect(unsubscribedUser).storeOrUpdate('0x', {
            name: ethers.toUtf8Bytes('name'),
            description: ethers.toUtf8Bytes('description'),
            value: ethers.toUtf8Bytes('encryptedValue'),
          });
          expect.fail();
        } catch (err) {
          expect(err).not.instanceOf(AssertionError);
          expect(err).instanceOf(Error);
          expect((err as Error).message).includes('You are not subscribed');
        }
      });
      it('Should be able to store values', async () => {
        const cryptr = new Cryptr(randomPrivateKey);
        for (const value of randomStrings) {
          const data = await encryptedStorage
            .connect(owner)
            .storeOrUpdate('0x', {
              name: ethers.toUtf8Bytes('name'),
              description: ethers.toUtf8Bytes('description'),
              value: ethers.toUtf8Bytes(cryptr.encrypt(value)),
            });
          expect(data).instanceOf(ContractTransactionResponse);
          const subscriberData = await encryptedStorage
            .connect(subscriber)
            .storeOrUpdate('0x', {
              name: ethers.toUtf8Bytes('name'),
              description: ethers.toUtf8Bytes('description'),
              value: ethers.toUtf8Bytes(cryptr.encrypt(value)),
            });
          expect(subscriberData).instanceOf(ContractTransactionResponse);
        }
      });
    });
    describe('getStoredPasswords', () => {
      it('Should throw an error when passing non uint256 values', async () => {
        try {
          await encryptedStorage
            .connect(subscriber)
            .getStoredPasswords('Test', 'test');
          await encryptedStorage
            .connect(subscriber)
            .getStoredPasswords(0, 'test');
          await encryptedStorage
            .connect(subscriber)
            .getStoredPasswords('test', 1);
          expect.fail();
        } catch (err) {
          expect(err).not.instanceOf(AssertionError);
          expect(err).instanceOf(TypeError);
        }
      });
      it('Should not be get values for unsubscribed user', async () => {
        try {
          await encryptedStorage
            .connect(unsubscribedUser)
            .getStoredPasswords(0, 1);
          expect.fail();
        } catch (err) {
          expect(err).not.instanceOf(AssertionError);
          expect(err).instanceOf(Error);
          expect((err as Error).message).includes('You are not subscribed');
        }
      });
      it('Should not be able get values over 255 limit', async () => {
        try {
          await encryptedStorage.connect(subscriber).getStoredPasswords(0, 256);
          await encryptedStorage
            .connect(subscriber)
            .getStoredPasswords(0, 1000);
          await encryptedStorage.connect(subscriber).getStoredPasswords(0, 500);
          expect.fail();
        } catch (err) {
          expect(err).instanceOf(TypeError);
          expect((err as TypeError).message).includes('value out-of-bounds');
        }
      });
      it('Should be able get values and return the actual data', async () => {
        const limit = 2;
        const cryptr = new Cryptr(randomPrivateKey);

        const check = async (
          currentSubscriber: HardhatEthersSigner,
          pageIndex: number,
          currentStrings: string[]
        ) => {
          const data = await encryptedStorage
            .connect(currentSubscriber)
            .getStoredPasswords(pageIndex, limit);

          expect(data.length).equal(currentStrings.length);

          for (let index in data) {
            const currentData = data[index];
            const currentString = currentStrings[index];
            const byteStringValue = currentData?.[1]?.[1];
            expect(typeof byteStringValue).equal('string');
            const decodedString = ethers.toUtf8String(byteStringValue);
            const decryptedData = cryptr.decrypt(decodedString);
            expect(decryptedData).equals(currentString);
          }
        };

        for (let pageIndex = 0; pageIndex < 10; pageIndex++) {
          const currentPageOffset = pageIndex * limit;
          const currentStrings = randomStrings.slice(
            currentPageOffset,
            currentPageOffset + limit
          );

          await check(subscriber, pageIndex, currentStrings);
          await check(owner, pageIndex, currentStrings);
        }
      });
    });

    describe('storeOrUpdate (Updating)', () => {
      it('Should throw an error when passing non bytes value', async () => {
        const data = await encryptedStorage
          .connect(subscriber)
          .getStoredPasswords(0, 10);

        for (const value of data) {
          const [id] = value;
          const bytesStringId = '0x' + id.toString(16);
          try {
            await encryptedStorage
              .connect(subscriber)
              .storeOrUpdate(bytesStringId, {
                name: 'd',
                description: 'd',
                value: 'd',
              });
            expect.fail();
          } catch (error) {
            expect(error).not.instanceOf(AssertionError);
            expect(error).instanceOf(TypeError);
          }
        }
      });
      it('Should not be able to store invalid aes256 value', async () => {
        const data = await encryptedStorage
          .connect(subscriber)
          .getStoredPasswords(0, 10);

        for (const value of data) {
          const [id] = value;
          const bytesId = ethers.zeroPadBytes(ethers.toBeArray(id), 32);

          try {
            await encryptedStorage.connect(subscriber).storeOrUpdate(bytesId, {
              name: ethers.toUtf8Bytes('name'),
              description: ethers.toUtf8Bytes('description'),
              value: ethers.toUtf8Bytes('encryptedValue'),
            });
            expect.fail();
          } catch (err) {
            expect(err).not.instanceOf(AssertionError);
            expect(err).instanceOf(Error);
            expect((err as Error).message).includes(
              'Not a valid hexadecimal value'
            );
          }
        }
      });
      it('Should not be able to store for unsubscribed user', async () => {
        try {
          const data = await encryptedStorage
            .connect(subscriber)
            .getStoredPasswords(0, 1);

          const currentData = data[0];
          const [id] = currentData;
          const bytesId = ethers.zeroPadBytes(ethers.toBeArray(id), 32);

          await encryptedStorage
            .connect(unsubscribedUser)
            .storeOrUpdate(bytesId, {
              name: ethers.toUtf8Bytes('name'),
              description: ethers.toUtf8Bytes('description'),
              value: ethers.toUtf8Bytes('encryptedValue'),
            });

          expect.fail();
        } catch (err) {
          expect(err).not.instanceOf(AssertionError);
          expect(err).instanceOf(Error);
          expect((err as Error).message).includes('You are not subscribed');
        }
      });
      it('Should update user values', async () => {
        const cryptr = new Cryptr(randomPrivateKey);
        const data = await encryptedStorage
          .connect(subscriber)
          .getStoredPasswords(0, 10);

        const currentUpdatedData = new Map<
          BigInt,
          {name: string; description: string; value: string}
        >();

        for (const value of data) {
          const [id] = value;
          const bytesId = ethers.zeroPadValue(ethers.toBeArray(id), 32);
          const updatedName = randomString.generate();
          const updatedDescription = randomString.generate();
          const updatedValue = randomString.generate();

          const result = await encryptedStorage
            .connect(subscriber)
            .storeOrUpdate(bytesId, {
              name: ethers.toUtf8Bytes(updatedName),
              description: ethers.toUtf8Bytes(updatedDescription),
              value: ethers.toUtf8Bytes(cryptr.encrypt(updatedValue)),
            });

          expect(result).instanceOf(ContractTransactionResponse);

          currentUpdatedData.set(id, {
            name: updatedName,
            description: updatedDescription,
            value: updatedValue,
          });
        }

        const updatedData = await encryptedStorage
          .connect(subscriber)
          .getStoredPasswords(0, 10);

        for (const item of updatedData) {
          const [id, data] = item;
          const [name, value, description] = data;
          const decodedName = ethers.toUtf8String(name);
          const decodedDescription = ethers.toUtf8String(description);
          const decodedValue = ethers.toUtf8String(value);

          const decryptedValue = cryptr.decrypt(decodedValue);

          const currentData = currentUpdatedData.get(id);

          expect(currentData?.name).equal(decodedName);
          expect(currentData?.description).equal(decodedDescription);
          expect(currentData?.value).equal(decryptedValue);
        }
      });
    });

    describe('removeData', () => {
      it('Should throw an error when passing non bytes32 value', async () => {
        try {
          await encryptedStorage.connect(subscriber).removeData('0');
          expect.fail();
        } catch (error) {
          expect(error).not.instanceOf(AssertionError);
          expect(error).instanceOf(TypeError);
        }
      });
      it('Should not be able to remove for unsubscribed user', async () => {
        try {
          const bytesId = ethers.zeroPadBytes(ethers.toBeArray(1), 32);
          await encryptedStorage.connect(unsubscribedUser).removeData(bytesId);
          expect.fail();
        } catch (err) {
          expect(err).not.instanceOf(AssertionError);
          expect(err).instanceOf(Error);
          expect((err as Error).message).includes('You are not subscribed');
        }
      });
      it('Should remove user data', async () => {
        const data = await encryptedStorage
          .connect(subscriber)
          .getStoredPasswords(0, 10);

        for (const value of data) {
          const [id] = value;
          const bytesId = ethers.zeroPadValue(ethers.toBeArray(id), 32);

          const result = await encryptedStorage
            .connect(subscriber)
            .removeData(bytesId);

          expect(result).instanceOf(ContractTransactionResponse);
        }

        const updatedData = await encryptedStorage
          .connect(subscriber)
          .getStoredPasswords(0, 10);

        expect(updatedData.length).equals(0);
      });
    });
  });
});
