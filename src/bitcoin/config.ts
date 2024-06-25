import dotenv from "dotenv";

const BTC = 100000000;
const mBTC = 100000;

dotenv.config(); // This loads the .env file

const config = {
  bitcoind: {
    host: process.env.BITCOIND_HOST || "localhost",
    port: parseInt(process.env.BITCOIND_PORT || "8332", 10),
    user: process.env.BITCOIND_USER,
    pass: process.env.BITCOIND_PASS,
    cookie: process.env.BITCOIND_COOKIE,
  },
  explorerUrl:
    process.env.EXPLORER_URL || "https://catnet-mempool.btcwild.life/",
};

export default config;
