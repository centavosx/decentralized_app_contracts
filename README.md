# Smart contracts

This repo contains all smart contracts that I used for my application.

## EncryptedStorage

This smart contract is designed to store encrypted values securely.

Important Note: Due to the transparent nature of blockchains, on-chain encryption alone is not feasible. While it is possible to implement encryption mechanisms on-chain, they would be ineffective in providing security because the encryption keys and methods would be visible and predictable. Therefore, encryption must be performed off-chain before storing the encrypted data on the blockchain. The blockchain’s transparency means that any on-chain key management or encryption techniques would not be secure, as they could potentially be exploited by observing the transactions and contract code.

Try running some of the following tasks:

### Running local node

```
 $ yarn node:run
```

### Running test

```
 $ yarn test
```

### Local deployment

Execute this command only after the local node has fully started.

```
 $ yarn deploy:encryptedStorage:dev
```
