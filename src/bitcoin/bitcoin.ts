import config from "./config";
import Client from "bitcoin-core";

function createClient(): Client {
  try {
    if (!config.bitcoind.user || !config.bitcoind.pass) {
      throw new Error(
        "Bitcoin RPC username and password must be set in the .env file",
      );
    }

    return new Client({
      network: "testnet",
      host: config.bitcoind.host,
      port: config.bitcoind.port,
      username: config.bitcoind.user,
      password: config.bitcoind.pass,
    });
  } catch (error) {
    console.error("Failed to create Bitcoin RPC client:", error);
    throw new Error(
      "Bitcoin RPC client could not be created. Please check your configuration.",
    );
  }
}

export const client = createClient();

export async function checkBitcoinConnection() {
  try {
    const networkInfo = await client.getNetworkInfo();
    console.log(
      "Successfully connected to Bitcoin node. Version:",
      networkInfo.version,
    );
  } catch (error) {
    console.error("Error connecting to Bitcoin node:", error);
    console.error(
      "Make sure your .env file contains the correct BITCOIND_USER and BITCOIND_PASS values.",
    );
    process.exit(1);
  }
}

export async function getAddressBalance(address: string): Promise<number> {
  try {
    const result = await client.command("scantxoutset", "start", [
      `addr(${address})`,
    ]);
    return result.total_amount;
  } catch (error) {
    console.error("Error fetching address balance:", error);
    throw error;
  }
}

export async function getCurrentBlockHeight(): Promise<number> {
  try {
    return await client.getBlockCount();
  } catch (error) {
    console.error("Error getting current block height:", error);
    throw error;
  }
}
