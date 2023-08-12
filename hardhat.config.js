require("@nomiclabs/hardhat-waffle");

module.exports = {
  solidity: "0.8.4",

  networks: {
    mainnet: {
      url: "https://eth-mainnet.g.alchemy.com/v2/GIfIAbfkr4GX1CKh8mZ-y1lYzPobbb3P", // or any other JSON-RPC provider
      accounts: ["0x..."]
    },
  },

  paths: {
    artifacts: "./src/backend/artifacts",
    sources: "./src/backend/contracts",
    cache: "./src/backend/cache",
    tests: "./src/backend/test"
  },
};
