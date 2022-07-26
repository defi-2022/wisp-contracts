### Useful commands

Deploy
```shell
npx hardhat run ./scripts/deploy.ts --network polygonMumbai
```

Verify
```shell
npx hardhat verify <address> --network polygonMumbai --constructor-args ./scripts/out/polygonMumbai/constructor.ts
```